import { Database } from '@/lib/supabase';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );
}

// Service Role 클라이언트 (RLS 우회)
export function createServiceRoleClient() {
    return createSupabaseClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}

// 인증된 사용자 정보 가져오기
export async function getAuthenticatedUser() {
    const supabase = await createClient();

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        throw new Error('인증되지 않은 사용자입니다.');
    }

    return user;
}

// 관리자 권한 확인
export async function checkIsAdmin() {
    const user = await getAuthenticatedUser();

    const supabase = await createClient();

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (error || !profile) {
        throw new Error('사용자 프로필을 찾을 수 없습니다.');
    }

    if (!profile.is_admin) {
        throw new Error('관리자 권한이 필요합니다.');
    }

    return true;
}

// 일반 사용자 권한 확인 (선택적)
export async function requireAuthenticatedUser() {
    const user = await getAuthenticatedUser();

    const supabase = await createClient();

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error || !profile) {
        throw new Error('사용자 프로필을 찾을 수 없습니다.');
    }

    return { user, profile };
}
