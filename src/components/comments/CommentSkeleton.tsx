'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface CommentSkeletonProps {
    isReply?: boolean;
    count?: number;
    className?: string;
}

export const CommentSkeleton: React.FC<CommentSkeletonProps> = ({
    isReply = false,
    count = 3,
    className,
}) => {
    return (
        <div className={`space-y-0 ${className || ''}`}>
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className={`${isReply ? 'mt-2 ml-8' : 'mt-4'}`}
                >
                    <Card
                        className={`p-4 ${
                            isReply ? 'border-l-2 border-l-blue-200' : ''
                        }`}
                    >
                        <div className="animate-pulse">
                            {/* 댓글 헤더 스켈레톤 */}
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                                <div className="flex items-center gap-1">
                                    {!isReply && (
                                        <Skeleton className="h-6 w-12" />
                                    )}
                                    <Skeleton className="h-6 w-6" />
                                </div>
                            </div>

                            {/* 댓글 내용 스켈레톤 */}
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                {Math.random() > 0.5 && (
                                    <Skeleton className="h-4 w-1/2" />
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* 대댓글 스켈레톤 (랜덤하게 표시) */}
                    {!isReply && Math.random() > 0.6 && (
                        <div className="mt-2 ml-8">
                            <Card className="border-l-2 border-l-blue-200 p-4">
                                <div className="animate-pulse">
                                    {/* 대댓글 헤더 */}
                                    <div className="mb-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Skeleton className="h-4 w-20" />
                                            <Skeleton className="h-3 w-12" />
                                        </div>
                                        <Skeleton className="h-6 w-6" />
                                    </div>

                                    {/* 대댓글 내용 */}
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-5/6" />
                                        <Skeleton className="h-4 w-2/3" />
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
