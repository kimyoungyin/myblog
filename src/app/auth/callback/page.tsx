'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
        'loading'
    );
    const [message, setMessage] = useState('인증 처리 중...');

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                // URL의 hash fragment에서 access_token 추출
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash);
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken && refreshToken) {
                    // Supabase 세션 설정
                    const { data, error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (error) {
                        throw error;
                    }

                    if (data.session) {
                        setStatus('success');
                        setMessage('로그인 성공! 메인 페이지로 이동합니다...');

                        // 잠시 후 메인 페이지로 리디렉션
                        setTimeout(() => {
                            router.push('/');
                        }, 2000);
                    } else {
                        throw new Error('세션을 설정할 수 없습니다.');
                    }
                } else {
                    throw new Error('인증 토큰을 찾을 수 없습니다.');
                }
            } catch (error) {
                console.error('Auth callback error:', error);
                setStatus('error');
                setMessage('로그인 처리 중 오류가 발생했습니다.');

                // 오류 발생 시 로그인 페이지로 리디렉션
                setTimeout(() => {
                    router.push('/test-auth');
                }, 3000);
            }
        };

        handleAuthCallback();
    }, [router]);

    return (
        <div className="bg-background flex min-h-screen items-center justify-center">
            <div className="mx-auto max-w-md p-6 text-center">
                {status === 'loading' && (
                    <>
                        <div className="border-primary mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-2"></div>
                        <h1 className="mb-2 text-2xl font-bold">
                            인증 처리 중
                        </h1>
                        <p className="text-muted-foreground">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="mb-4 text-6xl text-green-500">✓</div>
                        <h1 className="mb-2 text-2xl font-bold text-green-600">
                            로그인 성공!
                        </h1>
                        <p className="text-muted-foreground">{message}</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="mb-4 text-6xl text-red-500">✗</div>
                        <h1 className="mb-2 text-2xl font-bold text-red-600">
                            로그인 실패
                        </h1>
                        <p className="text-muted-foreground">{message}</p>
                        <button
                            onClick={() => router.push('/test-auth')}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded px-4 py-2 transition-colors"
                        >
                            다시 시도
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
