'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAuth?: boolean;
    requireAdmin?: boolean;
    fallback?: React.ReactNode;
}

export function ProtectedRoute({
    children,
    requireAuth = false,
    requireAdmin = false,
    fallback,
}: ProtectedRouteProps) {
    const { user, loading, isAdmin, isAuthenticated } = useAuth();
    const router = useRouter();

    const redirectToLogin = useCallback(() => {
        router.push('/auth/login');
    }, [router]);

    const redirectToHome = useCallback(() => {
        router.push('/');
    }, [router]);

    useEffect(() => {
        if (!loading) {
            if (requireAuth && !isAuthenticated) {
                redirectToLogin();
            } else if (requireAdmin && (!isAuthenticated || !isAdmin)) {
                redirectToHome();
            }
        }
    }, [
        loading,
        isAuthenticated,
        isAdmin,
        requireAuth,
        requireAdmin,
        redirectToLogin,
        redirectToHome,
    ]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
            </div>
        );
    }

    if (requireAuth && !isAuthenticated) {
        return (
            fallback || (
                <div className="flex min-h-screen items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>로그인이 필요합니다</CardTitle>
                            <CardDescription>
                                이 페이지에 접근하려면 로그인이 필요합니다.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={() => router.push('/auth/login')}
                                className="w-full"
                            >
                                로그인하기
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )
        );
    }

    if (requireAdmin && (!isAuthenticated || !isAdmin)) {
        return (
            fallback || (
                <div className="flex min-h-screen items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>접근 권한이 없습니다</CardTitle>
                            <CardDescription>
                                이 페이지에 접근하려면 관리자 권한이 필요합니다.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={() => router.push('/')}
                                className="w-full"
                            >
                                홈으로 돌아가기
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )
        );
    }

    return <>{children}</>;
}
