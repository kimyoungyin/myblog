'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { createClient } from '@/utils/supabase/client';
import { User } from '@/types';

export function useAuth() {
    const {
        isLoading: storeLoading,
        setLoading,
        clearAuth,
        setUser,
    } = useAuthStore();
    const queryClient = useQueryClient();

    const supabase = createClient();

    // 현재 세션 가져오기
    const { data: session, isLoading: sessionLoading } = useQuery({
        queryKey: ['auth', 'session'],
        queryFn: async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            return session;
        },
        staleTime: 60 * 1000, // 1분 동안 캐시 유지
        gcTime: 10 * 60 * 1000, // 10분
        refetchOnWindowFocus: true, // 보안을 위해 윈도우 포커스 시 세션 상태 확인
        retry: false,
    });

    // 사용자 프로필 가져오기
    const {
        data: profile,
        error: profileError,
        isLoading: profileLoading,
    } = useQuery({
        queryKey: ['auth', 'profile', session?.user?.id],
        queryFn: async (): Promise<User | null> => {
            if (!session?.user?.id) return null;

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error) {
                throw error;
            }
            return data;
        },
        enabled: !!session?.user?.id, // 세션이 변하면 프로필 조회 실행
        staleTime: 5 * 60 * 1000, // 5분
        gcTime: 10 * 60 * 1000, // 10분
        refetchOnWindowFocus: true, // 프로필 변경사항 즉시 반영
        retry: false,
    });

    // 로딩 상태 통합
    const isLoading = useMemo(() => {
        return sessionLoading || profileLoading || storeLoading;
    }, [sessionLoading, profileLoading, storeLoading]);

    // 세션 상태에 따른 인증 정리
    useEffect(() => {
        if (session === null) {
            clearAuth();
        }
    }, [session]);

    // 프로필이 업데이트되면 스토어에 저장
    useEffect(() => {
        if (profile) {
            setUser(profile);
        }
    }, [profile]);

    // 프로필 에러 처리
    useEffect(() => {
        if (profileError && session?.user?.id) {
            console.error('프로필 조회 실패:', profileError);
            clearAuth();
            // Supabase 세션도 정리
            const handleSignOut = async () => {
                try {
                    await supabase.auth.signOut();
                } catch (error) {
                    console.error('세션 정리 중 오류:', error);
                }
            };
            handleSignOut();
        }
    }, [profileError]);

    // 로그인
    const signIn = useCallback(
        async (provider: 'google' | 'github'): Promise<void> => {
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
        },
        [setLoading]
    );

    // 로그아웃
    const signOut = useCallback(async (): Promise<void> => {
        try {
            // 클라이언트 세션 정리
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            clearAuth();
            // 모든 인증 관련 캐시 무효화
            queryClient.removeQueries({ queryKey: ['auth'] });
        } catch {
            // 에러가 발생해도 로컬 상태는 정리
            clearAuth();
            queryClient.removeQueries({ queryKey: ['auth'] });
        }
    }, [clearAuth]);

    // Admin 권한 확인
    const isAdmin = profile?.is_admin ?? false;

    // ✅ React Query의 profile 데이터를 직접 사용, Zustand store 동기화 제거
    return {
        user: profile,
        isLoading,
        isAdmin,
        signIn,
        signOut,
        setLoading,
        clearAuth,
    };
}
