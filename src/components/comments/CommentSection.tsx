'use client';

import React from 'react';
import type { Comment } from '@/types';
import { useComments } from '@/hooks/useComments';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';
import { CommentSkeleton } from './CommentSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CommentSectionProps {
    postId: number;
    postAuthorId?: string;
    initialComments?: Comment[];
    className?: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
    postId,
    postAuthorId,
    initialComments = [],
    className,
}) => {
    const {
        data: comments = [],
        error,
        isError,
        isFetching,
        isLoading,
        refetch,
    } = useComments(postId, initialComments);

    const errorMessage =
        error instanceof Error
            ? error.message
            : '댓글을 불러오는 중 오류가 발생했습니다.';

    return (
        <div className={`space-y-6 ${className || ''}`}>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5" />
                            {comments.length}개의 댓글
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void refetch()}
                            disabled={isFetching}
                            className="h-8 px-2"
                        >
                            <RefreshCw
                                className={`h-3 w-3 ${
                                    isFetching ? 'animate-spin' : ''
                                }`}
                            />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <CommentForm postId={postId} />

                    {isError && (
                        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
                            <p>{errorMessage}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void refetch()}
                                className="mt-2"
                            >
                                다시 시도
                            </Button>
                        </div>
                    )}

                    {isLoading && <CommentSkeleton count={3} />}

                    {!isLoading && !isError && (
                        <CommentList
                            comments={comments}
                            postAuthorId={postAuthorId}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
