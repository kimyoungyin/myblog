'use client';

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Comment } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useCommentMutations } from '@/hooks/useComments';
import { CommentForm } from './CommentForm';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Reply, Edit, Trash2 } from 'lucide-react';

interface CommentItemProps {
    comment: Comment;
    postAuthorId?: string;
    isReply?: boolean;
    className?: string;
}

export const CommentItem: React.FC<CommentItemProps> = ({
    comment,
    postAuthorId,
    isReply = false,
    className,
}) => {
    const { user } = useAuth();
    const {
        updateComment,
        deleteComment,
        isUpdating,
        isDeleting,
    } = useCommentMutations(comment.post_id, user);
    const [isEditing, setIsEditing] = useState(false);
    const [isReplying, setIsReplying] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);

    const isAuthor = user?.id === comment.author_id;
    const isPostAuthor = comment.author_id === postAuthorId;

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();

        const newContent = editContent.trim();
        if (!newContent) {
            return;
        }

        setIsEditing(false);

        try {
            await updateComment({
                commentId: comment.id,
                content: newContent,
            });
            toast.success('댓글이 수정되었습니다.');
        } catch {
            toast.error('댓글 수정 중 오류가 발생했습니다.');
            setIsEditing(true);
        }
    };

    const handleDelete = async () => {
        if (!confirm('댓글을 삭제하시겠습니까?')) {
            return;
        }

        try {
            await deleteComment({ commentId: comment.id });
            toast.success('댓글이 삭제되었습니다.');
        } catch {
            toast.error('댓글 삭제 중 오류가 발생했습니다.');
        }
    };

    const handleReplySuccess = () => {
        setIsReplying(false);
    };

    const handleReplyFailure = () => {
        setIsReplying(true);
    };

    return (
        <div className={`${isReply ? 'mt-2 ml-8' : 'mt-4'} ${className || ''}`}>
            <Card
                className={`p-4 ${isReply ? 'border-l-2 border-l-blue-200' : ''}`}
            >
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                                {comment.author?.full_name ||
                                    comment.author?.email ||
                                    '알 수 없는 사용자'}
                            </span>
                            {isPostAuthor && (
                                <Badge variant="secondary" className="text-xs">
                                    작성자
                                </Badge>
                            )}
                        </div>
                        <span className="text-muted-foreground text-xs">
                            {formatDistanceToNow(new Date(comment.created_at), {
                                addSuffix: true,
                                locale: ko,
                            })}
                        </span>
                        {comment.updated_at !== comment.created_at && (
                            <span className="text-muted-foreground text-xs">
                                (수정됨)
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        {!isReply && user && !isReplying && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsReplying(!isReplying)}
                                className="h-8 px-2"
                            >
                                <Reply className="mr-1 h-3 w-3" />
                                답글
                            </Button>
                        )}

                        {isAuthor && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        disabled={isUpdating || isDeleting}
                                    >
                                        <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setIsEditing(true);
                                            setEditContent(comment.content);
                                        }}
                                    >
                                        <Edit className="mr-2 h-3 w-3" />
                                        수정
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="text-destructive"
                                    >
                                        <Trash2 className="mr-2 h-3 w-3" />
                                        삭제
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                {isEditing ? (
                    <form onSubmit={handleEdit} className="space-y-3">
                        <Textarea
                            name="content"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            className="resize-none"
                            required
                            maxLength={1000}
                        />
                        <div className="flex items-center justify-between">
                            <div className="text-muted-foreground text-xs">
                                {editContent.length}/1000
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditContent(comment.content);
                                    }}
                                    disabled={isUpdating}
                                >
                                    취소
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={
                                        editContent.trim().length === 0 ||
                                        isUpdating
                                    }
                                >
                                    {isUpdating ? '수정 중...' : '수정'}
                                </Button>
                            </div>
                        </div>
                    </form>
                ) : (
                    <div className="text-sm break-words whitespace-pre-wrap">
                        {comment.content}
                    </div>
                )}
            </Card>

            {isReplying && (
                <div className="mt-3">
                    <CommentForm
                        isReplying={isReplying}
                        postId={comment.post_id}
                        parentId={comment.parent_id || comment.id}
                        placeholder={`${
                            comment.author?.full_name ||
                            comment.author?.email ||
                            '사용자'
                        }님에게 답글 작성...`}
                        onSuccess={handleReplySuccess}
                        onCancel={() => setIsReplying(false)}
                        onFailure={handleReplyFailure}
                        className="border-dashed"
                    />
                </div>
            )}
        </div>
    );
};
