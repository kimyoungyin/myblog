'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import type { User } from '@/types';

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
    const { data: profile } = useQuery({
        queryKey: ['auth', 'profile', session?.user?.id],
        queryFn: async () => {
            if (!session?.user?.id) return null;

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!session?.user?.id,
        staleTime: 5 * 60 * 1000, // 5분
    });

    useEffect(() => {
        if (profile) {
            setUser(profile);
        } else if (session === null) {
            clearAuth();
        }
    }, [profile, session, setUser, clearAuth]);

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
            console.error('로그아웃 오류:', error);
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
