'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createPost, updatePost, deletePost, getPosts, getPost } from './posts';
import {
    createClient,
    createServiceRoleClient,
    checkIsAdmin,
} from '@/utils/supabase/server';
import { type PostSort } from '@/types';
import {
    CreatePostSchema,
    UpdatePostSchema,
    SearchHashtagSchema,
    PostIdSchema,
    ToggleLikeSchema,
} from './schemas';
import {
    updateImageUrlsInMarkdown,
    extractImagePathsFromMarkdown,
} from './file-upload';
import { PAGE_SIZE } from '@/constants';

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
        redirect(`/posts/${post.id}`);
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
            const { error: deleteError } = await supabase.storage
                .from('files')
                .remove(removedImages);

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

// 홈페이지 최신 글 조회 Server Action
export async function getRecentPostsAction() {
    try {
        return await getPosts(1, 6);
    } catch (error) {
        throw error;
    }
}

// 글 목록 조회 Server Action (읽기 전용, 정렬 기능 포함)
export async function getPostsAction(
    page: number = 1,
    sortBy: PostSort = 'latest',
    hashtag?: string,
    hashtagIds?: number[],
    searchQuery?: string
) {
    try {
        // 읽기 전용이므로 인증 불필요
        return await getPosts(
            page,
            PAGE_SIZE,
            sortBy,
            hashtag,
            hashtagIds,
            searchQuery
        );
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
    } catch {
        return [];
    }
}

// 해시태그 ID로 해시태그 정보 조회 Server Action (읽기 전용)
export async function getHashtagsByIdsAction(ids: number[]) {
    try {
        // 읽기 전용이므로 인증 불필요
        const supabase = await createClient();

        if (!ids || ids.length === 0) {
            return [];
        }

        // 유효한 ID만 필터링
        const validIds = ids.filter((id) => Number.isInteger(id) && id > 0);

        if (validIds.length === 0) {
            return [];
        }

        const { data, error } = await supabase
            .from('hashtags')
            .select('id, name')
            .in('id', validIds)
            .order('name');

        if (error) {
            console.error('해시태그 조회 오류:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('해시태그 조회 중 예외 발생:', error);
        return [];
    }
}

// 조회수 증가 Server Action (읽기 전용, 원자적 업데이트)
export async function incrementViewCountAction(postId: number) {
    try {
        // Service Role 클라이언트 사용 (비로그인 사용자도 증가 가능)
        const supabase = await createServiceRoleClient();

        // postId 검증 (문자열 스키마이므로 문자열로 변환해 검증 후 숫자 획득)
        const validation = PostIdSchema.safeParse({ id: String(postId) });
        if (!validation.success) {
            const err = new Error('잘못된 글 ID 입니다.');
            err.name = 'VIEW_COUNT_ERROR';
            throw err;
        }
        const validPostId = validation.data.id; // number

        // PostgreSQL RPC 함수 호출로 원자적 증가 수행
        const { data, error } = await supabase.rpc('increment_view_count', {
            post_id: validPostId,
        });

        if (error) {
            const err = new Error('조회수 증가 RPC 호출에 실패했습니다.');
            err.name = 'VIEW_COUNT_ERROR';
            err.cause = error;
            throw err;
        }

        // RPC가 false 반환 → 해당 글을 찾지 못함
        if (data === false) {
            const err = new Error('해당 글을 찾을 수 없습니다.');
            err.name = 'VIEW_COUNT_ERROR';
            throw err;
        }

        return { success: true };
    } catch (error) {
        // 상위에서 error.name === 'VIEW_COUNT_ERROR'로 분기 가능하도록 통일
        if (error instanceof Error && error.name === 'VIEW_COUNT_ERROR') {
            throw error;
        }
        const err = new Error('조회수 증가 중 알 수 없는 오류가 발생했습니다.');
        err.name = 'VIEW_COUNT_ERROR';
        err.cause = error;
        throw err;
    }
}

// =====================================================
// 댓글 관련 Server Actions
// =====================================================

/**
 * 댓글 목록 조회 Server Action
 */
export async function getCommentsAction(postId: number) {
    try {
        const { getComments } = await import('./comments');
        return await getComments(postId);
    } catch (error) {
        console.error('댓글 목록 조회 실패:', error);
        throw error;
    }
}

/**
 * 댓글 생성 Server Action
 */
export async function createCommentAction(formData: FormData) {
    try {
        // 인증 확인
        const supabase = await createClient();
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
            throw new Error('댓글을 작성하려면 로그인이 필요합니다.');
        }

        // 폼 데이터 추출
        const rawData = {
            content: formData.get('content') as string,
            post_id: parseInt(formData.get('post_id') as string, 10),
            parent_id: formData.get('parent_id')
                ? parseInt(formData.get('parent_id') as string, 10)
                : null,
        };

        // Zod 스키마로 검증
        const { CreateCommentSchema } = await import('./schemas');
        const validationResult = CreateCommentSchema.safeParse(rawData);

        if (!validationResult.success) {
            const errorMessage = validationResult.error.issues
                .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                .join(', ');
            throw new Error(`데이터 검증 실패: ${errorMessage}`);
        }

        // 댓글 생성
        const { createComment } = await import('./comments');
        const comment = await createComment(
            validationResult.data,
            session.user.id
        );

        // 캐시 무효화
        revalidatePath(`/posts/${rawData.post_id}`);

        return comment;
    } catch (error) {
        console.error('댓글 생성 실패:', error);
        throw error;
    }
}

/**
 * 댓글 수정 Server Action
 */
export async function updateCommentAction(formData: FormData) {
    try {
        // 인증 확인
        const supabase = await createClient();
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
            throw new Error('댓글을 수정하려면 로그인이 필요합니다.');
        }

        // 폼 데이터 추출
        const rawData = {
            content: formData.get('content') as string,
            comment_id: parseInt(formData.get('comment_id') as string, 10),
            post_id: parseInt(formData.get('post_id') as string, 10),
        };

        // Zod 스키마로 검증
        const { UpdateCommentSchema } = await import('./schemas');
        const validationResult = UpdateCommentSchema.safeParse({
            content: rawData.content,
        });

        if (!validationResult.success) {
            const errorMessage = validationResult.error.issues
                .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                .join(', ');
            throw new Error(`데이터 검증 실패: ${errorMessage}`);
        }

        // 댓글 수정
        const { updateComment } = await import('./comments');
        const comment = await updateComment(
            rawData.comment_id,
            validationResult.data,
            session.user.id
        );

        // 캐시 무효화
        revalidatePath(`/posts/${rawData.post_id}`);

        return comment;
    } catch (error) {
        console.error('댓글 수정 실패:', error);
        throw error;
    }
}

/**
 * 댓글 삭제 Server Action
 */
export async function deleteCommentAction(formData: FormData) {
    try {
        // 인증 확인
        const supabase = await createClient();
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
            throw new Error('댓글을 삭제하려면 로그인이 필요합니다.');
        }

        // 폼 데이터 추출
        const rawData = {
            comment_id: parseInt(formData.get('comment_id') as string, 10),
            post_id: parseInt(formData.get('post_id') as string, 10),
        };

        // 댓글 삭제
        const { deleteComment } = await import('./comments');
        await deleteComment(rawData.comment_id, session.user.id);

        // 캐시 무효화
        revalidatePath(`/posts/${rawData.post_id}`);

        return { success: true };
    } catch (error) {
        console.error('댓글 삭제 실패:', error);
        throw error;
    }
}

// ============================================================================
// 좋아요 관련 Server Actions
// ============================================================================

/**
 * 좋아요 토글 Server Action
 */
export async function toggleLikeAction(formData: FormData) {
    try {
        // 인증 확인
        const supabase = await createClient();
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
            throw new Error('좋아요를 추가/제거하려면 로그인이 필요합니다.');
        }

        // 폼 데이터 추출
        const rawData = {
            post_id: parseInt(formData.get('post_id') as string, 10),
        };

        // Zod 스키마로 데이터 검증
        const validationResult = ToggleLikeSchema.safeParse(rawData);
        if (!validationResult.success) {
            const errorMessage = validationResult.error.issues
                .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                .join(', ');
            throw new Error(`데이터 검증 실패: ${errorMessage}`);
        }

        // 좋아요 토글
        const { toggleLike } = await import('./likes');
        const result = await toggleLike(validationResult.data, session.user.id);

        if (!result.success) {
            throw new Error(result.error || '좋아요 처리에 실패했습니다.');
        }

        // 관련 페이지 캐시 무효화
        revalidatePath(`/posts/${rawData.post_id}`);
        revalidatePath('/posts');
        revalidatePath('/');

        return {
            success: true,
            is_liked: result.is_liked,
            likes_count: result.likes_count,
        };
    } catch (error) {
        console.error('좋아요 토글 실패:', error);
        throw error;
    }
}

/**
 * 좋아요 상태 조회 Server Action
 */
export async function getLikeStatusAction(postId: number, userId?: string) {
    try {
        // 글 ID 검증
        const validationResult = PostIdSchema.safeParse({
            id: postId.toString(),
        });
        if (!validationResult.success) {
            throw new Error('올바른 글 ID가 아닙니다.');
        }

        // 좋아요 상태 조회
        const { getLikeStatus } = await import('./likes');
        const likeStatus = await getLikeStatus(
            validationResult.data.id,
            userId
        );

        return likeStatus;
    } catch (error) {
        console.error('좋아요 상태 조회 실패:', error);
        throw error;
    }
}

/**
 * 사용자 좋아요 목록 조회 Server Action
 */
export async function getUserLikesAction(
    userId: string,
    page: number = 1,
    limit: number = PAGE_SIZE
) {
    try {
        // 사용자 좋아요 목록 조회
        const { getUserLikes } = await import('./likes');
        const result = await getUserLikes(userId, page, limit);

        return result;
    } catch (error) {
        console.error('사용자 좋아요 목록 조회 실패:', error);
        throw error;
    }
}
