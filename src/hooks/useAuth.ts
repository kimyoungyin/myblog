'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';

export function useAuth() {
    const { user, isAuthenticated, isLoading, setUser, setLoading, clearAuth } =
        useAuthStore();
    const queryClient = useQueryClient();

    // 현재 세션 가져오기
    const { data: session } = useQuery({
        queryKey: ['auth', 'session'],
        queryFn: async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            return session;
        },
        staleTime: Infinity,
        gcTime: Infinity,
    });

    // 사용자 프로필 가져오기
    const { data: profile, error: profileError } = useQuery({
        queryKey: ['auth', 'profile', session?.user?.id],
        queryFn: async () => {
            if (!session?.user?.id) return null;

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (error) {
                    // profiles 테이블이 존재하지 않는 경우 기본 사용자 정보 반환
                    if (
                        error.code === 'PGRST116' ||
                        error.message?.includes('profiles')
                    ) {
                        return {
                            id: session.user.id,
                            email: session.user.email || '',
                            full_name:
                                session.user.user_metadata?.full_name || null,
                            avatar_url:
                                session.user.user_metadata?.avatar_url || null,
                            is_admin: false,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        };
                    }
                    throw error;
                }
                return data;
            } catch (error) {
                // 에러가 발생해도 기본 사용자 정보 반환
                return {
                    id: session.user.id,
                    email: session.user.email || '',
                    full_name: session.user.user_metadata?.full_name || null,
                    avatar_url: session.user.user_metadata?.avatar_url || null,
                    is_admin: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
            }
        },
        enabled: !!session?.user?.id,
        staleTime: 5 * 60 * 1000, // 5분
        retry: false, // 재시도 비활성화
    });

    useEffect(() => {
        if (profile) {
            setUser(profile);
        } else if (session === null) {
            clearAuth();
        } else if (profileError && session?.user?.id) {
            // 에러가 발생했지만 세션이 있는 경우 기본 사용자 정보로 설정
            const defaultUser = {
                id: session.user.id,
                email: session.user.email || '',
                full_name: session.user.user_metadata?.full_name || null,
                avatar_url: session.user.user_metadata?.avatar_url || null,
                is_admin: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            setUser(defaultUser);
        }
    }, [profile, profileError, session, setUser, clearAuth]);

    // 로그인
    const signIn = async (provider: 'google' | 'github') => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) throw error;
        } finally {
            setLoading(false);
        }
    };

    // 로그아웃
    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            clearAuth();
            // 모든 인증 관련 캐시 무효화
            queryClient.removeQueries({ queryKey: ['auth'] });
        } catch (error) {
            // 에러 무시 (로그아웃 실패 시에도 로컬 상태 정리)
        }
    };

    // Admin 권한 확인
    const isAdmin = user?.is_admin ?? false;

    return {
        user,
        isAuthenticated,
        loading: isLoading,
        isAdmin,
        signIn,
        signOut,
    };
}
