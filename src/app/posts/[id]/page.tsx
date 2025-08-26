import React from 'react';
import { notFound } from 'next/navigation';
import {
    getPostAction,
    incrementViewCountAction,
    getCommentsAction,
    getLikeStatusAction,
} from '@/lib/actions';
import { MarkdownRenderer } from '@/components/editor/MarkdownRenderer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import ToEditButton from '@/components/ui/toEditButton';
import { AlertTriangle } from 'lucide-react';
import { HashtagLink } from '@/components/ui/hashtag-link';
import { CommentSection } from '@/components/comments/CommentSection';
import { LikeButton } from '@/components/likes/LikeButton';

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
        // 글, 댓글, 좋아요 상태를 병렬로 조회
        const [post, initialComments, likeStatus] = await Promise.all([
            getPostAction(postId),
            getCommentsAction(postId).catch(() => []), // 댓글 조회 실패해도 글은 표시
            getLikeStatusAction(postId).catch(() => ({
                post_id: postId,
                is_liked: false,
                likes_count: 0,
            })), // 좋아요 상태 조회 실패해도 글은 표시
        ]);

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
                                <div className="flex items-center gap-4">
                                    <span>조회수: {post.view_count}</span>
                                    <LikeButton
                                        postId={postId}
                                        initialLikesCount={
                                            likeStatus.likes_count
                                        }
                                        initialIsLiked={likeStatus.is_liked}
                                        size="sm"
                                    />
                                </div>
                            </div>

                            {/* 해시태그 */}
                            {post.hashtags && post.hashtags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {post.hashtags
                                        .sort((a, b) =>
                                            a.name.localeCompare(b.name)
                                        )
                                        .map((hashtag) => (
                                            <HashtagLink
                                                key={hashtag.id}
                                                hashtag={hashtag}
                                            />
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

                        {/* 댓글 섹션 */}
                        <CommentSection
                            postId={postId}
                            postAuthorId={undefined} // 글 작성자 ID는 현재 구조에서 사용할 수 없음
                            initialComments={initialComments}
                        />
                    </article>
                </div>
            </div>
        );
    } catch (error) {
        console.error('글 조회 실패:', error);
        notFound();
    }
}
