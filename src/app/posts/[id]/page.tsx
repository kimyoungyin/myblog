import React from 'react';
import { notFound } from 'next/navigation';
import { getPostAction, incrementViewCountAction } from '@/lib/actions';
import { MarkdownRenderer } from '@/components/editor/MarkdownRenderer';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import ToEditButton from '@/components/ui/toEditButton';
import { AlertTriangle } from 'lucide-react';

interface PostPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function PostPage({ params }: PostPageProps) {
    const postId = parseInt((await params).id);

    if (isNaN(postId)) {
        notFound();
    }

    try {
        const post = await getPostAction(postId);

        if (!post) {
            notFound();
        }

        // 조회수 증가 시도 (실패해도 글은 표시)
        let viewCountError = false;
        let viewCountErrorMessage = '';
        try {
            const viewCountResult = await incrementViewCountAction(postId);
            if (!viewCountResult.success) {
                viewCountError = true;
                viewCountErrorMessage = '조회수 증가에 실패했습니다.';
            }
        } catch (error) {
            console.error('조회수 증가 실패:', error);
            viewCountError = true;
            // actions.ts에서 던진 에러 메시지를 그대로 사용
            if (error instanceof Error) {
                viewCountErrorMessage = error.message;
            } else {
                viewCountErrorMessage = '조회수 증가 중 오류가 발생했습니다.';
            }
        }

        return (
            <div className="bg-background min-h-screen">
                <div className="container mx-auto max-w-4xl px-4 py-8">
                    {/* 조회수 증가 실패 경고 */}
                    {viewCountError && (
                        <div className="mb-6 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
                            <p className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                {viewCountErrorMessage} 이는 일시적인 문제일 수
                                있습니다.
                            </p>
                        </div>
                    )}

                    {/* 헤더 */}
                    <div className="mb-6 flex items-center justify-between">
                        <Button
                            variant="outline"
                            asChild
                            className="flex items-center gap-2"
                        >
                            <Link href="/posts">
                                <ArrowLeft className="h-4 w-4" />글 목록으로
                            </Link>
                        </Button>

                        {/* Admin 수정 버튼 */}
                        <ToEditButton postId={postId} />
                    </div>

                    <article className="space-y-6">
                        {/* 글 헤더 */}
                        <div className="space-y-4">
                            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                {post.title}
                            </h1>

                            {/* 메타 정보 */}
                            <div className="flex flex-wrap items-start justify-between gap-4 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex flex-col gap-1">
                                    <span>
                                        작성일: {formatDate(post.created_at)}
                                    </span>
                                    {post.updated_at !== post.created_at && (
                                        <span className="text-xs">
                                            (마지막 수정:{' '}
                                            {formatDate(post.updated_at)})
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {/* 들어오는 순간 조회수 증가할 것(낙관적 업데이트) */}
                                    <span>조회수: {post.view_count}</span>
                                    <span>좋아요: {post.likes_count}</span>
                                    {/* <span>댓글: {post.comments_count}</span> */}
                                </div>
                            </div>

                            {/* 해시태그 */}
                            {post.hashtags && post.hashtags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {post.hashtags.map((hashtag) => (
                                        <Badge
                                            key={hashtag.id}
                                            variant="secondary"
                                            className="text-xs"
                                        >
                                            #{hashtag.name}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* 글 내용 */}
                        <Card>
                            <CardContent className="pt-6">
                                <MarkdownRenderer
                                    content={post.content_markdown}
                                    className="prose-lg max-w-none"
                                />
                            </CardContent>
                        </Card>

                        {/* 댓글 섹션 (추후 구현) */}
                        <Card>
                            <CardHeader>
                                <CardTitle>댓글</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="py-8 text-center text-gray-500 dark:text-gray-400">
                                    댓글 기능은 추후 구현 예정입니다.
                                </p>
                            </CardContent>
                        </Card>
                    </article>
                </div>
            </div>
        );
    } catch (error) {
        console.error('글 조회 실패:', error);
        notFound();
    }
}
