'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createPost, updatePost, deletePost, getPosts, getPost } from './posts';
import {
    createClient,
    createServiceRoleClient,
    checkIsAdmin,
} from '@/utils/supabase/server';
import {
    CreatePostSchema,
    UpdatePostSchema,
    SearchHashtagSchema,
} from './schemas';
import {
    updateImageUrlsInMarkdown,
    extractImagePathsFromMarkdown,
} from './file-upload';

// 글 생성 Server Action
export async function createPostAction(formData: FormData) {
    try {
        await checkIsAdmin();

        // 폼 데이터 추출 및 Zod 검증
        const rawData = {
            title: formData.get('title') as string,
            content: formData.get('content') as string,
            hashtags:
                (formData.get('hashtags') as string)
                    ?.split(',')
                    .map((tag: string) => tag.trim())
                    .filter((tag: string) => tag.length > 0) || [],
        };

        // Zod 스키마로 데이터 검증
        const validationResult = CreatePostSchema.safeParse(rawData);
        if (!validationResult.success) {
            const errorMessage = validationResult.error.issues
                .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                .join(', ');
            throw new Error(`데이터 검증 실패: ${errorMessage}`);
        }

        const { title, content, hashtags } = validationResult.data;

        // 글 생성
        const post = await createPost({
            title,
            content,
            hashtags,
        });

        if (!post) {
            throw new Error('글 생성에 실패했습니다.');
        }

        // 캐시 무효화 및 리다이렉트
        revalidatePath('/admin/posts');
        revalidatePath('/posts');
        redirect('/admin/posts');
    } catch (error) {
        throw error;
    }
}

// 글 수정 Server Action
export async function updatePostAction(postId: number, formData: FormData) {
    try {
        await checkIsAdmin();

        // 기존 글 데이터 가져오기 (이미지 비교용)
        const existingPost = await getPost(postId);
        if (!existingPost) {
            throw new Error('수정할 글을 찾을 수 없습니다.');
        }

        // 폼 데이터 추출 및 Zod 검증
        const rawData = {
            title: formData.get('title') as string,
            content: formData.get('content') as string,
            hashtags:
                (formData.get('hashtags') as string)
                    ?.split(',')
                    .map((tag: string) => tag.trim())
                    .filter((tag: string) => tag.length > 0) || [],
        };

        // Zod 스키마로 데이터 검증 (수정이므로 partial)
        const validationResult = UpdatePostSchema.safeParse(rawData);
        if (!validationResult.success) {
            const errorMessage = validationResult.error.issues
                .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                .join(', ');
            throw new Error(`데이터 검증 실패: ${errorMessage}`);
        }

        const { title, content, hashtags } = validationResult.data;

        // 이미지 관리 로직
        let thumbnailUrl = existingPost.thumbnail_url;
        let finalContent = content;

        if (content !== undefined) {
            // 1. 이전 글과 비교하여 이미지 파일 관리
            const updatedContent = await manageImageFiles(
                existingPost.content_markdown,
                content
            );
            finalContent = updatedContent;

            // 2. 썸네일 URL 업데이트
            thumbnailUrl = await updateThumbnailUrl(updatedContent, postId);
        }

        // 글 수정 데이터 구성 (썸네일 포함)
        const updateData: {
            title?: string;
            content?: string;
            hashtags?: string[];
            thumbnail_url?: string | null;
        } = {};

        if (title !== undefined) updateData.title = title;
        if (finalContent !== undefined) updateData.content = finalContent;
        if (hashtags !== undefined) updateData.hashtags = hashtags;
        if (thumbnailUrl !== existingPost.thumbnail_url) {
            updateData.thumbnail_url = thumbnailUrl;
        }

        const post = await updatePost(
            postId,
            updateData,
            existingPost,
            thumbnailUrl
        );

        if (!post) {
            throw new Error('글 수정에 실패했습니다.');
        }

        // 캐시 무효화 및 리다이렉트
        revalidatePath('/admin/posts');
        revalidatePath(`/admin/posts/${postId}/edit`);
        revalidatePath(`/posts/${postId}`);
        revalidatePath('/posts');

        // 수정된 글의 상세 페이지로 리다이렉트
        redirect(`/posts/${postId}`);
    } catch (error) {
        throw error;
    }
}

// 이미지 파일 관리 함수
async function manageImageFiles(oldContent: string, newContent: string) {
    try {
        const supabase = createServiceRoleClient();

        // 1. 이전 글에서 사용된 이미지 경로 추출
        const oldImagePaths = extractImagePathsFromMarkdown(oldContent);

        // 2. 새 글에서 사용된 이미지 경로 추출
        const newImagePaths = extractImagePathsFromMarkdown(newContent);

        // 3. 사라진 이미지 찾기 (permanent에서 제거)
        const removedImages = oldImagePaths.filter(
            (oldPath) => !newImagePaths.includes(oldPath)
        );

        if (removedImages.length > 0) {
            // permanent 폴더에서 사라진 이미지들 삭제
            const { data: deleteData, error: deleteError } =
                await supabase.storage.from('files').remove(removedImages);

            if (deleteError) {
                throw new Error(`이미지 삭제 실패: ${deleteError.message}`);
            }
        }

        // 4. 새로 추가된 이미지 처리 (temp → permanent)
        const newTempImages = newImagePaths.filter(
            (path) => path.includes('temp/') && !oldImagePaths.includes(path)
        );

        let updatedContent = newContent;
        const movedTempPaths: string[] = [];

        if (newTempImages.length > 0) {
            // temp 이미지들을 permanent로 이동
            for (const tempPath of newTempImages) {
                const permanentPath = tempPath.replace('temp/', 'permanent/');

                // 파일 복사 (temp → permanent)
                const { error: copyError } = await supabase.storage
                    .from('files')
                    .copy(tempPath, permanentPath);

                if (copyError) {
                    throw new Error(`이미지 복사 실패: ${copyError.message}`);
                } else {
                    // 복사 성공 시 temp 파일 삭제
                    const { error: removeError } = await supabase.storage
                        .from('files')
                        .remove([tempPath]);

                    if (removeError) {
                        // temp 파일 삭제 실패는 무시하고 계속 진행
                    } else {
                        movedTempPaths.push(tempPath); // 이전 temp 경로 저장
                    }
                }
            }

            // 마크다운 내용의 temp URL을 permanent URL로 업데이트
            if (movedTempPaths.length > 0) {
                // temp 경로들을 permanent 경로로 변환하여 전달
                const permanentPaths = movedTempPaths.map((path) =>
                    path.replace('temp/', 'permanent/')
                );
                updatedContent = updateImageUrlsInMarkdown(
                    newContent,
                    permanentPaths
                );
            }
        }

        // 업데이트된 내용 반환
        return updatedContent;
    } catch (error) {
        // 이미지 관리 실패해도 글 수정은 계속 진행
        throw error; // 에러를 상위로 전파하여 사용자에게 알림
    }
}

// 썸네일 URL 업데이트 함수
async function updateThumbnailUrl(
    content: string,
    postId: number
): Promise<string | null> {
    try {
        const supabase = await createClient();
        // 1. 마크다운에서 첫 번째 이미지 경로 추출
        const imagePaths = extractImagePathsFromMarkdown(content);

        if (imagePaths.length === 0) {
            await supabase
                .from('posts')
                .update({ thumbnail_url: null })
                .eq('id', postId);
            return null; // 이미지가 없으면 썸네일 제거
        }

        // 2. 첫 번째 이미지를 썸네일로 설정
        const firstImagePath = imagePaths[0];

        // temp 경로인 경우 permanent 경로로 변환
        let thumbnailPath = firstImagePath;
        if (firstImagePath.includes('temp/')) {
            thumbnailPath = firstImagePath.replace('temp/', 'permanent/');
        }

        // 3. 썸네일 URL 생성
        const thumbnailUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/files/${thumbnailPath}`;

        return thumbnailUrl;
    } catch (error) {
        console.error('썸네일 URL 업데이트 중 오류:', error);
        return null; // 오류 시 썸네일 제거
    }
}

// 글 삭제 Server Action
export async function deletePostAction(postId: number) {
    try {
        // 관리자 권한 확인
        await checkIsAdmin();

        // 글 삭제
        const success = await deletePost(postId);

        if (!success) {
            throw new Error('글 삭제에 실패했습니다.');
        }

        // 캐시 무효화
        revalidatePath('/admin/posts');
        revalidatePath('/posts');

        return { success: true };
    } catch (error) {
        throw error;
    }
}

// 글 목록 조회 Server Action (읽기 전용)
export async function getPostsAction(
    page: number = 1,
    limit: number = 10,
    hashtag?: string
) {
    try {
        // 읽기 전용이므로 인증 불필요
        return await getPosts(page, limit, hashtag);
    } catch (error) {
        throw error;
    }
}

// 글 상세 조회 Server Action (읽기 전용)
export async function getPostAction(postId: number) {
    try {
        // 읽기 전용이므로 인증 불필요
        return await getPost(postId);
    } catch (error) {
        throw error;
    }
}

// 해시태그 검색 Server Action (읽기 전용)
export async function searchHashtagsAction(query: string) {
    try {
        // 읽기 전용이므로 인증 불필요
        const supabase = await createClient();

        // Zod 스키마로 검색어 검증
        const validationResult = SearchHashtagSchema.safeParse({ query });
        if (!validationResult.success) {
            return [];
        }

        const { query: validatedQuery } = validationResult.data;

        // PostgreSQL의 ILIKE를 사용하여 대소문자 구분 없이 검색
        const { data, error } = await supabase
            .from('hashtags')
            .select('id, name')
            .ilike('name', `%${validatedQuery}%`)
            .order('name')
            .limit(10);

        if (error) {
            return [];
        }

        return data || [];
    } catch (error) {
        return [];
    }
}
