import { createServiceRoleClient } from '@/lib/supabase-server';
import { createHashtags, type Hashtag } from './hashtags';

export interface Post {
    id: number;
    title: string;
    content: string;
    content_markdown: string;
    thumbnail_url: string | null;
    view_count: number;
    likes_count: number;
    comments_count: number;
    created_at: string;
    updated_at: string;
}

export interface CreatePostData {
    title: string;
    content: string;
    hashtags: string[];
}

export interface UpdatePostData {
    title?: string;
    content?: string;
    hashtags?: string[];
}

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

        // 2. 글 생성
        const supabase = createServiceRoleClient();

        const { data: post, error: postError } = await supabase
            .from('posts')
            .insert([
                {
                    title: data.title,
                    content: data.content,
                    content_markdown: data.content, // 마크다운 내용을 그대로 저장
                    thumbnail_url: null,
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

        // 3. 글-해시태그 연결 생성 (필수)
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
    data: UpdatePostData
): Promise<Post | null> {
    try {
        // Service Role Supabase 클라이언트 생성 (RLS 우회)
        const supabase = createServiceRoleClient();

        // 1. 기존 글 정보 조회
        const { data: existingPost, error: fetchError } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();

        if (fetchError || !existingPost) {
            throw new Error('기존 글을 찾을 수 없습니다.');
        }

        // 2. 글 정보 업데이트
        const updateData: Partial<Post> = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.content !== undefined) {
            updateData.content = data.content;
            updateData.content_markdown = data.content;
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

        // 3. 해시태그가 변경된 경우에만 처리
        if (data.hashtags !== undefined) {
            // 기존 해시태그 연결 삭제
            await supabase.from('post_hashtags').delete().eq('post_id', postId);

            // 해시태그가 필수이므로 빈 배열이면 에러
            if (!data.hashtags || data.hashtags.length === 0) {
                throw new Error(
                    '해시태그는 필수입니다. 최소 1개 이상의 해시태그를 입력해주세요.'
                );
            }

            // 새 해시태그 처리 및 연결 생성
            const hashtagResults = await createHashtags(data.hashtags);
            if (!hashtagResults.length) {
                throw new Error('해시태그 처리에 실패했습니다.');
            }

            const postHashtagData = hashtagResults.map((hashtag) => ({
                post_id: postId,
                hashtag_id: hashtag.id,
            }));

            const { error: hashtagError } = await supabase
                .from('post_hashtags')
                .insert(postHashtagData);

            if (hashtagError) {
                throw new Error('해시태그 연결에 실패했습니다.');
            }
        }

        return updatedPost;
    } catch (error) {
        throw error;
    }
}

/**
 * 글 삭제
 */
export async function deletePost(postId: number): Promise<boolean> {
    try {
        // Service Role Supabase 클라이언트 생성 (RLS 우회)
        const supabase = createServiceRoleClient();

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
 * 글 목록 조회 (페이지네이션)
 */
export async function getPosts(
    page: number = 1,
    limit: number = 10,
    hashtag?: string
): Promise<{ posts: Post[]; total: number }> {
    try {
        // Service Role Supabase 클라이언트 생성 (RLS 우회)
        const supabase = createServiceRoleClient();

        const query = supabase.from('posts').select('*', { count: 'exact' });

        // 해시태그 필터링 (현재는 기본 조회만 구현, 추후 확장)
        // if (hashtag) {
        //   query = query
        //     .select(`
        //       *,
        //       post_hashtags!inner(
        //         hashtags!inner(name)
        //       )
        //     `)
        //     .eq('post_hashtags.hashtags.name', hashtag);
        // }

        const {
            data: posts,
            error,
            count,
        } = await query
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        if (error) {
            throw new Error('글 목록 조회에 실패했습니다.');
        }

        return {
            posts: posts || [],
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
        const supabase = createServiceRoleClient();

        const { data: post, error } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();

        if (error) {
            return null;
        }

        return post;
    } catch (error) {
        return null;
    }
}
