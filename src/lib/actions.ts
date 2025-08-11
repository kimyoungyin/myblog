'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createPost, updatePost, deletePost, getPosts, getPost } from './posts';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import {
    CreatePostSchema,
    UpdatePostSchema,
    SearchHashtagSchema,
    formatZodError,
} from './schemas';

// 글 생성 Server Action
export async function createPostAction(formData: FormData) {
    try {
        // 서버에서 인증 확인 - 직접 쿠키에서 토큰 읽기
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('sb-access-token')?.value;

        if (!accessToken) {
            throw new Error(
                '인증 토큰을 찾을 수 없습니다. 다시 로그인해주세요.'
            );
        }

        // JWT 토큰 직접 검증
        let user: {
            id: string;
            email: string;
            user_metadata: Record<string, unknown>;
        };

        try {
            const payload = JSON.parse(atob(accessToken.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000);

            if (payload.exp < currentTime) {
                throw new Error(
                    '인증 토큰이 만료되었습니다. 다시 로그인해주세요.'
                );
            }

            // 사용자 정보 구성
            user = {
                id: payload.sub,
                email: payload.email,
                user_metadata: payload.user_metadata || {},
            };
        } catch (error) {
            throw new Error(
                '인증 토큰이 유효하지 않습니다. 다시 로그인해주세요.'
            );
        }

        // Supabase 클라이언트 생성 (프로필 조회용)
        const supabase = await createServerClient();

        // 사용자 프로필에서 admin 권한 확인
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (profileError) {
            throw new Error('사용자 프로필을 확인할 수 없습니다.');
        }

        if (!profile?.is_admin) {
            throw new Error('관리자 권한이 필요합니다.');
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

        // Zod 스키마로 데이터 검증
        const validationResult = CreatePostSchema.safeParse(rawData);
        if (!validationResult.success) {
            const errors = formatZodError(validationResult.error);
            const errorMessage = errors
                .map((err) => `${err.field}: ${err.message}`)
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
        // 서버에서 인증 확인
        const supabase = await createServerClient();

        // 현재 세션에서 사용자 정보 직접 가져오기
        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
            throw new Error('세션을 찾을 수 없습니다. 다시 로그인해주세요.');
        }

        const user = session.user;

        // 사용자 프로필에서 admin 권한 확인
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (profileError || !profile?.is_admin) {
            throw new Error('관리자 권한이 필요합니다.');
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
            const errors = formatZodError(validationResult.error);
            const errorMessage = errors
                .map((err) => `${err.field}: ${err.message}`)
                .join(', ');
            throw new Error(`데이터 검증 실패: ${errorMessage}`);
        }

        const { title, content, hashtags } = validationResult.data;

        // 글 수정 (undefined가 아닌 필드만 전달)
        const updateData: {
            title?: string;
            content?: string;
            hashtags?: string[];
        } = {};
        if (title !== undefined) updateData.title = title;
        if (content !== undefined) updateData.content = content;
        if (hashtags !== undefined) updateData.hashtags = hashtags;

        const post = await updatePost(postId, updateData);

        if (!post) {
            throw new Error('글 수정에 실패했습니다.');
        }

        // 캐시 무효화 및 리다이렉트
        revalidatePath('/admin/posts');
        revalidatePath(`/admin/posts/${postId}/edit`);
        revalidatePath(`/posts/${postId}`);
        revalidatePath('/posts');
        redirect('/admin/posts');
    } catch (error) {
        throw error;
    }
}

// 글 삭제 Server Action
export async function deletePostAction(postId: number) {
    try {
        // 서버에서 인증 확인
        const supabase = await createServerClient();

        // 현재 세션에서 사용자 정보 직접 가져오기
        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
            throw new Error('세션을 찾을 수 없습니다. 다시 로그인해주세요.');
        }

        const user = session.user;

        // 사용자 프로필에서 admin 권한 확인
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (profileError || !profile?.is_admin) {
            throw new Error('관리자 권한이 필요합니다.');
        }

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
        const supabase = await createServerClient();

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
