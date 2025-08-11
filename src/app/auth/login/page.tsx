'use client';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Github, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
    const { user, loading, signIn } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user && !loading) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
            </div>
        );
    }

    if (user) {
        return null; // 이미 로그인된 경우 리다이렉트
    }

    return (
        <div className="bg-background flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-center text-2xl">
                        로그인
                    </CardTitle>
                    <CardDescription className="text-center">
                        계정에 로그인하여 블로그를 이용하세요
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => signIn('google')}
                    >
                        <Mail className="mr-2 h-4 w-4" />
                        Google로 로그인
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => signIn('github')}
                    >
                        <Github className="mr-2 h-4 w-4" />
                        GitHub로 로그인
                    </Button>
                    <div className="text-muted-foreground text-center text-sm">
                        로그인하면 댓글 작성과 좋아요가 가능합니다
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
