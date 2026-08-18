'use client';

import React from 'react';
import type { Comment } from '@/types';
import { CommentItem } from './CommentItem';
import { Card } from '@/components/ui/card';

interface CommentListProps {
    comments: Comment[];
    postAuthorId?: string;
    className?: string;
}

export const CommentList: React.FC<CommentListProps> = ({
    comments,
    postAuthorId,
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

    const parentComments = comments.filter((comment) => !comment.parent_id);
    const childComments = comments.filter((comment) => comment.parent_id);

    return (
        <div className={`space-y-0 ${className || ''}`}>
            {parentComments.map((parentComment) => {
                const replies = childComments.filter(
                    (child) => child.parent_id === parentComment.id
                );

                return (
                    <div key={parentComment.id}>
                        <CommentItem
                            comment={parentComment}
                            postAuthorId={postAuthorId}
                        />

                        {replies.map((reply) => (
                            <CommentItem
                                key={reply.id}
                                comment={reply}
                                postAuthorId={postAuthorId}
                                isReply={true}
                            />
                        ))}
                    </div>
                );
            })}
        </div>
    );
};
