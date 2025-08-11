'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

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
        } else {
            setUser(null);
        }
        setLoading(false);
    }, [profile]);

    // 로그인
    const signIn = async (provider: 'google' | 'github') => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) throw error;
    };

    // 로그아웃
    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        setUser(null);
    };

    // Admin 권한 확인
    const isAdmin = user?.is_admin ?? false;

    return {
        user,
        loading,
        isAdmin,
        signIn,
        signOut,
    };
}
