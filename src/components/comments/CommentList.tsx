'use client';

import React from 'react';
import { Comment } from '@/types';
import { CommentItem } from './CommentItem';
import { Card } from '@/components/ui/card';

interface CommentListProps {
    comments: Comment[];
    postAuthorId?: string;
    onReplySuccess?: () => void;
    onOptimisticAdd?: (comment: Comment) => void;
    onOptimisticUpdate?: (id: number, content: string) => void;
    onOptimisticDelete?: (id: number) => void;
    className?: string;
}

export const CommentList: React.FC<CommentListProps> = ({
    comments,
    postAuthorId,
    onReplySuccess,
    onOptimisticAdd,
    onOptimisticUpdate,
    onOptimisticDelete,
    className,
}) => {
    if (comments.length === 0) {
        return (
            <Card className={`p-8 text-center ${className || ''}`}>
                <div className="text-muted-foreground">
                    <div className="mb-4 text-4xl">💬</div>
                    <p className="mb-2 text-lg font-medium">
                        아직 댓글이 없습니다
                    </p>
                    <p className="text-sm">첫 번째 댓글을 작성해보세요!</p>
                </div>
            </Card>
        );
    }

    // 부모 댓글과 대댓글을 구분
    const parentComments = comments.filter((comment) => !comment.parent_id);
    const childComments = comments.filter((comment) => comment.parent_id);

    return (
        <div className={`space-y-0 ${className || ''}`}>
            {parentComments.map((parentComment) => {
                // 해당 부모 댓글의 대댓글들 찾기
                const replies = childComments.filter(
                    (child) => child.parent_id === parentComment.id
                );

                return (
                    <div key={parentComment.id}>
                        {/* 부모 댓글 */}
                        <CommentItem
                            comment={parentComment}
                            postAuthorId={postAuthorId}
                            onReplySuccess={onReplySuccess}
                            onOptimisticAdd={onOptimisticAdd}
                            onOptimisticUpdate={onOptimisticUpdate}
                            onOptimisticDelete={onOptimisticDelete}
                        />

                        {/* 대댓글들 */}
                        {replies.map((reply) => (
                            <CommentItem
                                key={reply.id}
                                comment={reply}
                                postAuthorId={postAuthorId}
                                isReply={true}
                                onReplySuccess={onReplySuccess}
                                onOptimisticAdd={onOptimisticAdd}
                                onOptimisticUpdate={onOptimisticUpdate}
                                onOptimisticDelete={onOptimisticDelete}
                            />
                        ))}
                    </div>
                );
            })}
        </div>
    );
};
