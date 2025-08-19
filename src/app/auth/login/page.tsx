'use client';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';
import { Github, MailIcon } from 'lucide-react';

export default function LoginPage() {
    const handleGoogleLogin = async () => {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (data.url) {
            window.location.href = data.url; // 브라우저 이동
        } else {
            console.error('OAuth 로그인 실패:', error);
        }
    };
    const handleGithubLogin = async () => {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (data.url) {
            window.location.href = data.url; // 브라우저 이동
        } else {
            console.error('OAuth 로그인 실패:', error);
        }
    };
    return (
        <div className="bg-background flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-center text-2xl">
                        로그인
                    </CardTitle>
                    <CardDescription className="text-center">
                        로그인하세요
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <input type="hidden" name="provider" value="google" />
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleGoogleLogin}
                    >
                        <MailIcon className="mr-2 h-4 w-4" />
                        Google로 로그인
                    </Button>

                    <input type="hidden" name="provider" value="github" />
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleGithubLogin}
                    >
                        <Github className="mr-2 h-4 w-4" />
                        GitHub로 로그인
                    </Button>

                    <div className="text-muted-foreground text-center text-sm">
                        로그인 후 원래 페이지로 돌아갑니다
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
