import { createServiceRoleClient } from '@/utils/supabase/server';
import { createHashtags, type Hashtag } from './hashtags';
import {
    extractImagePathsFromMarkdown,
    updateImageUrlsInMarkdown,
    FILE_UPLOAD_CONFIG,
} from './file-upload';
import {
    moveTempFilesToPermanentServer,
    clearTempFolder,
} from './file-upload-server';
import { CreatePostData, UpdatePostData } from './schemas';
import { Post, type PostSort } from '@/types';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * 새 글 생성
 */
export async function createPost(data: CreatePostData): Promise<Post | null> {
    try {
        // 1. 해시태그 처리 (필수)
        if (!data.hashtags || data.hashtags.length === 0) {
            throw new Error(
                '해시태그는 필수입니다. 최소 1개 이상의 해시태그를 입력해주세요.'
            );
        }

        const hashtagResults = await createHashtags(data.hashtags);

        if (!hashtagResults.length) {
            throw new Error('해시태그 처리에 실패했습니다.');
        }

        // 2. 이미지 파일 처리
        let processedContent = data.content;
        let thumbnailUrl: string | null = null;

        // 마크다운에서 이미지 경로 추출
        const tempImagePaths = extractImagePathsFromMarkdown(data.content);

        if (tempImagePaths.length > 0) {
            // temp 파일들을 permanent로 이동
            const moveResult =
                await moveTempFilesToPermanentServer(tempImagePaths);

            if (moveResult.success && moveResult.permanentPaths.length > 0) {
                // 마크다운 내용의 이미지 URL을 permanent 경로로 업데이트
                processedContent = updateImageUrlsInMarkdown(
                    data.content,
                    moveResult.permanentPaths
                );

                // 첫 번째 이미지를 썸네일로 설정
                const firstPermanentPath = moveResult.permanentPaths[0];
                if (firstPermanentPath) {
                    // permanent 경로를 공개 URL로 변환하여 저장
                    thumbnailUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${FILE_UPLOAD_CONFIG.storageBucket}/${firstPermanentPath}`;
                }
            } else {
                throw new Error('이미지 이동 실패', {
                    cause: moveResult.error,
                });
            }
        }
        // 글에 이미지 없는 경우 통과

        // 3. 글 생성
        const supabase = await createServiceRoleClient();

        const { data: post, error: postError } = await supabase
            .from('posts')
            .insert([
                {
                    title: data.title,
                    content: processedContent, // 처리된 내용 사용
                    content_markdown: processedContent, // 마크다운 내용을 그대로 저장
                    thumbnail_url: thumbnailUrl, // 썸네일 URL 설정
                    view_count: 0,
                    likes_count: 0,
                    comments_count: 0,
                },
            ])
            .select('*')
            .single();

        if (postError) {
            throw new Error('글 생성에 실패했습니다.');
        }

        // 4. 글-해시태그 연결 생성 (필수)
        const postHashtagData = hashtagResults.map((hashtag) => ({
            post_id: post.id,
            hashtag_id: hashtag.id,
        }));

        const { error: hashtagError } = await supabase
            .from('post_hashtags')
            .insert(postHashtagData);

        if (hashtagError) {
            // 글은 생성되었지만 해시태그 연결 실패 시 글 삭제
            await supabase.from('posts').delete().eq('id', post.id);
            throw new Error('해시태그 연결에 실패했습니다.');
        }

        // 5. 사용되지 않는 temp 파일들 정리
        if (tempImagePaths.length > 0) {
            await clearTempFolder(); // 서버 전용 함수 사용
        }

        return post;
    } catch (error) {
        throw error;
    }
}

/**
 * 글 수정
 */
export async function updatePost(
    postId: number,
    data: UpdatePostData,
    existingPost: Post,
    thumbnailUrl?: string | null
): Promise<Post | null> {
    try {
        // Service Role Supabase 클라이언트 생성 (RLS 우회)
        const supabase = await createServiceRoleClient();

        // 글 정보 업데이트
        const updateData: Partial<Post> = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.content !== undefined) {
            updateData.content = data.content;
            updateData.content_markdown = data.content;
        }
        if (thumbnailUrl !== undefined) {
            updateData.thumbnail_url = thumbnailUrl;
        }
        updateData.updated_at = new Date().toISOString();

        const { data: updatedPost, error: updateError } = await supabase
            .from('posts')
            .update(updateData)
            .eq('id', postId)
            .select('*')
            .single();

        if (updateError) {
            throw new Error('글 수정에 실패했습니다.');
        }

        // 해시태그가 변경된 경우에만 처리
        if (data.hashtags !== undefined) {
            // 기존 해시태그 연결 삭제
            await supabase.from('post_hashtags').delete().eq('post_id', postId);

            // 새 해시태그 생성 및 연결
            if (data.hashtags.length > 0) {
                const hashtagResults = await createHashtags(data.hashtags);

                if (hashtagResults.length > 0) {
                    const hashtagConnections = hashtagResults.map(
                        (hashtag) => ({
                            post_id: postId,
                            hashtag_id: hashtag.id,
                        })
                    );

                    const { error: connectionError } = await supabase
                        .from('post_hashtags')
                        .insert(hashtagConnections);

                    if (connectionError) {
                        throw new Error('해시태그 연결 실패', {
                            cause: connectionError,
                        });
                    }
                }
            }
        }

        // 업데이트된 글 반환
        return updatedPost;
    } catch (error) {
        console.error('글 수정 중 오류:', error);
        throw error;
    }
}

/**
 * 글 삭제
 */
export async function deletePost(postId: number): Promise<boolean> {
    try {
        // Service Role Supabase 클라이언트 생성 (RLS 우회)
        const supabase = await createServiceRoleClient();

        // 1. 글-해시태그 연결 삭제 (CASCADE로 자동 삭제되지만 명시적으로 처리)
        await supabase.from('post_hashtags').delete().eq('post_id', postId);

        // 2. 글 삭제
        const { error: deleteError } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId);

        if (deleteError) {
            throw new Error('글 삭제에 실패했습니다.');
        }

        return true;
    } catch (error) {
        throw error;
    }
}

/**
 * 글 목록 조회 (정렬 기능 포함)
 */
export async function getPosts(
    page: number = 1,
    limit: number = 10,
    sortBy: PostSort = 'latest',
    hashtag?: string
): Promise<{ posts: Post[]; total: number }> {
    try {
        // Service Role Supabase 클라이언트 생성 (RLS 우회)
        const supabase = await createServiceRoleClient();

        // 글과 해시태그 정보를 함께 조회
        let query = supabase.from('posts').select(
            `
                *,
                post_hashtags!inner(
                    hashtags!inner(
                        id,
                        name,
                        created_at
                    )
                )
            `,
            { count: 'exact' }
        );

        // 해시태그 필터링
        if (hashtag && hashtag.trim().length > 0) {
            query = query.eq('post_hashtags.hashtags.name', hashtag.trim());
        }

        // 정렬 기준에 따른 쿼리 구성
        let sortedQuery = query;
        switch (sortBy) {
            case 'latest':
                sortedQuery = query.order('created_at', { ascending: false });
                break;
            case 'oldest':
                sortedQuery = query.order('created_at', { ascending: true });
                break;
            case 'popular':
                sortedQuery = query.order('view_count', { ascending: false });
                break;
            case 'likes':
                sortedQuery = query.order('likes_count', { ascending: false });
                break;
            default:
                sortedQuery = query.order('created_at', { ascending: false });
        }

        const {
            data: posts,
            error,
            count,
        } = await sortedQuery.range((page - 1) * limit, page * limit - 1);

        if (error) {
            throw new Error('글 목록 조회에 실패했습니다.');
        }

        // 해시태그 정보를 Post 객체에 추가
        const postsWithHashtags = (posts || []).map((post) => {
            if (post.post_hashtags) {
                const hashtags = post.post_hashtags.map(
                    (ph: { hashtags: Hashtag }) => ph.hashtags
                );
                return {
                    ...post,
                    hashtags,
                };
            }
            return post;
        });

        return {
            posts: postsWithHashtags,
            total: count || 0,
        };
    } catch (error) {
        throw error;
    }
}

/**
 * 글 상세 조회
 */
export async function getPost(postId: number): Promise<Post | null> {
    try {
        // Service Role Supabase 클라이언트 생성 (RLS 우회)
        const supabase = await createServiceRoleClient();

        // 글과 해시태그 정보를 함께 조회
        const { data: post, error } = await supabase
            .from('posts')
            .select(
                `
                *,
                post_hashtags!inner(
                    hashtags!inner(
                        id,
                        name,
                        created_at
                    )
                )
            `
            )
            .eq('id', postId)
            .single();

        if (error) {
            const pgError = error as PostgrestError;
            // PostgREST에서 .single() 사용 시 행이 없으면 오류가 발생함
            // 해당 케이스는 404/406 또는 PGRST116 코드로 보고될 수 있으므로 방어적으로 체크
            const isNoRow =
                pgError?.code === 'PGRST116' ||
                pgError?.details?.toLowerCase?.().includes('0 rows') ||
                pgError?.message?.toLowerCase?.().includes('no rows');
            if (isNoRow) {
                return null;
            }
            throw new Error('글 상세 조회에 실패했습니다.', { cause: error });
        }

        // 해시태그 정보를 Post 객체에 추가
        if (post && post.post_hashtags) {
            const hashtags = post.post_hashtags.map(
                (ph: { hashtags: Hashtag }) => ph.hashtags
            );
            return {
                ...post,
                hashtags,
            };
        }

        return post;
    } catch (error) {
        throw error;
    }
}
