'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import {
    AlertTriangle,
    Home,
    RefreshCw,
    ArrowLeft,
    Bug,
    Lightbulb,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface ErrorPageProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // 에러 로깅 (개발 환경에서만)
        if (process.env.NODE_ENV === 'development') {
            console.error('Error boundary caught an error:', error);
        }
    }, [error]);

    if (!mounted) {
        return null;
    }

    return (
        <div className="from-background via-background to-muted/20 flex min-h-[calc(100vh-9rem)] items-center justify-center bg-gradient-to-br p-4 md:min-h-[calc(100vh-10rem)]">
            <div className="w-full max-w-2xl space-y-8">
                {/* 메인 에러 카드 */}
                <Card className="border-destructive/20 shadow-xl">
                    <CardHeader className="pb-4 text-center">
                        <div className="bg-destructive/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                            <AlertTriangle className="text-destructive h-8 w-8" />
                        </div>
                        <CardTitle className="text-foreground text-2xl font-bold">
                            예상치 못한 오류가 발생했습니다
                        </CardTitle>
                        <p className="text-muted-foreground mt-2 text-base">
                            죄송합니다. 요청을 처리하는 중에 문제가
                            발생했습니다.
                            <br />
                            잠시 후 다시 시도해 주세요.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* 액션 버튼들 */}
                        <div className="flex flex-col justify-center gap-3 sm:flex-row">
                            <Button
                                onClick={reset}
                                className="flex items-center gap-2"
                                size="lg"
                            >
                                <RefreshCw className="h-4 w-4" />
                                다시 시도
                            </Button>
                            <Button
                                variant="outline"
                                asChild
                                className="flex items-center gap-2"
                                size="lg"
                            >
                                <Link href="/">
                                    <Home className="h-4 w-4" />
                                    홈으로 돌아가기
                                </Link>
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => window.history.back()}
                                className="flex items-center gap-2"
                                size="lg"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                이전 페이지
                            </Button>
                        </div>

                        {/* 구분선 */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card text-muted-foreground px-2">
                                    또는
                                </span>
                            </div>
                        </div>

                        {/* 도움말 섹션 */}
                        <div className="bg-muted/30 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <Lightbulb className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
                                <div className="space-y-2">
                                    <h3 className="text-sm font-medium">
                                        이런 방법들을 시도해보세요:
                                    </h3>
                                    <ul className="text-muted-foreground space-y-1 text-sm">
                                        <li>• 페이지를 새로고침해보세요</li>
                                        <li>
                                            • 인터넷 연결 상태를 확인해보세요
                                        </li>
                                        <li>• 잠시 후 다시 접속해보세요</li>
                                        <li>
                                            • 문제가 지속되면 관리자에게
                                            문의해주세요
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* 개발 환경에서만 에러 정보 표시 */}
                        {process.env.NODE_ENV === 'development' && error && (
                            <details className="bg-destructive/5 border-destructive/20 rounded-lg border p-4">
                                <summary className="text-destructive flex cursor-pointer items-center gap-2 text-sm font-medium">
                                    <Bug className="h-4 w-4" />
                                    개발자 정보 (개발 환경에서만 표시)
                                </summary>
                                <div className="mt-3 space-y-2">
                                    <div className="text-sm">
                                        <strong>에러 메시지:</strong>
                                        <pre className="bg-destructive/10 mt-1 overflow-auto rounded p-2 text-xs">
                                            {error.message}
                                        </pre>
                                    </div>
                                    {error.digest && (
                                        <div className="text-sm">
                                            <strong>에러 ID:</strong>
                                            <code className="bg-destructive/10 ml-2 rounded px-2 py-1 text-xs">
                                                {error.digest}
                                            </code>
                                        </div>
                                    )}
                                    {error.stack && (
                                        <div className="text-sm">
                                            <strong>스택 트레이스:</strong>
                                            <pre className="bg-destructive/10 mt-1 max-h-40 overflow-auto rounded p-2 text-xs">
                                                {error.stack}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}
                    </CardContent>
                </Card>

                {/* 추가 도움말 링크 */}
                <div className="space-y-4 text-center">
                    <div className="text-muted-foreground flex items-center justify-center gap-4 text-sm">
                        <Link
                            href="/posts"
                            className="hover:text-primary underline underline-offset-4 transition-colors"
                        >
                            최신 글 보기
                        </Link>
                        <span>•</span>
                        <Link
                            href="/search"
                            className="hover:text-primary underline underline-offset-4 transition-colors"
                        >
                            검색하기
                        </Link>
                        <span>•</span>
                        <Link
                            href="/about"
                            className="hover:text-primary underline underline-offset-4 transition-colors"
                        >
                            소개 페이지
                        </Link>
                    </div>
                    <p className="text-muted-foreground text-xs">
                        MyBlog - 김영인의 기술 블로그
                    </p>
                </div>
            </div>
        </div>
    );
}
