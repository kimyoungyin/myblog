'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface ErrorPageProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function PostErrorPage({ error, reset }: ErrorPageProps) {
    const isViewCountError =
        error.message.includes('조회수') ||
        error.message.includes('조회 실패') ||
        error.message.includes('증가 실패');
    const isPostLoadError =
        error.message.includes('글을 불러오는 중') ||
        error.message.includes('글 조회');

    return (
        <div className="bg-background min-h-screen">
            <div className="container mx-auto max-w-2xl px-4 py-8">
                <Card className="border-destructive/50 bg-destructive/5">
                    <CardHeader className="text-center">
                        <div className="bg-destructive/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                            <AlertTriangle className="text-destructive h-8 w-8" />
                        </div>
                        <CardTitle className="text-destructive text-xl">
                            {isViewCountError
                                ? '조회수 관련 오류'
                                : isPostLoadError
                                  ? '글 로딩 실패'
                                  : '오류가 발생했습니다'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 text-center">
                        <div className="space-y-2">
                            <p className="text-muted-foreground">
                                {isViewCountError
                                    ? '글은 정상적으로 불러왔지만, 조회수 증가에 실패했습니다. 이는 일시적인 문제일 수 있습니다.'
                                    : isPostLoadError
                                      ? '글을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
                                      : '예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'}
                            </p>
                            {error.digest && (
                                <p className="text-muted-foreground text-xs">
                                    오류 코드: {error.digest}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <Button
                                variant="outline"
                                asChild
                                className="flex items-center gap-2"
                            >
                                <Link href="/posts">
                                    <ArrowLeft className="h-4 w-4" />글 목록으로
                                </Link>
                            </Button>
                            <Button
                                onClick={reset}
                                className="flex items-center gap-2"
                            >
                                <RefreshCw className="h-4 w-4" />
                                다시 시도
                            </Button>
                        </div>

                        {isViewCountError && (
                            <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
                                <p>
                                    💡 조회수 증가 실패는 일시적인 문제일 수
                                    있습니다. 페이지를 새로고침하거나 잠시 후
                                    다시 방문해보세요.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
