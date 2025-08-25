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
import { updateCommentAction, deleteCommentAction } from '@/lib/actions';
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
    onReplySuccess?: () => void;
    onOptimisticAdd?: (comment: Comment) => void;
    onOptimisticUpdate?: (id: number, content: string) => void;
    onOptimisticDelete?: (id: number) => void;
    className?: string;
}

export const CommentItem: React.FC<CommentItemProps> = ({
    comment,
    postAuthorId,
    isReply = false,
    onReplySuccess,
    onOptimisticAdd,
    onOptimisticUpdate,
    onOptimisticDelete,
    className,
}) => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isReplying, setIsReplying] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);

    const isAuthor = user?.id === comment.author_id;
    const isPostAuthor = comment.author_id === postAuthorId;

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault(); // 기본 form 제출 방지

        const formData = new FormData(e.target as HTMLFormElement);
        const newContent = formData.get('content') as string;

        // 1. 낙관적 업데이트: 즉시 UI에 반영
        onOptimisticUpdate?.(comment.id, newContent);
        setIsEditing(false); // 편집 모드 종료

        try {
            // 2. 서버 액션 호출
            formData.append('comment_id', comment.id.toString());
            formData.append('post_id', comment.post_id.toString());

            await updateCommentAction(formData);
            toast.success('댓글이 수정되었습니다.');
            // 성공 시: 낙관적 업데이트를 신뢰 (추가 작업 없음)
        } catch (error) {
            console.error('댓글 수정 실패:', error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : '댓글 수정 중 오류가 발생했습니다.'
            );
            // 실패 시: 편집 모드로 되돌리고 데이터 새로고침
            setIsEditing(true);
            onReplySuccess?.(); // 실패 시에만 새로고침
        }
    };

    const handleDelete = async () => {
        if (!confirm('댓글을 삭제하시겠습니까?')) {
            return;
        }

        // 낙관적 업데이트: 즉시 UI에서 제거
        onOptimisticDelete?.(comment.id);

        try {
            const formData = new FormData();
            formData.append('comment_id', comment.id.toString());
            formData.append('post_id', comment.post_id.toString());

            await deleteCommentAction(formData);
            toast.success('댓글이 삭제되었습니다.');
            // 성공 시에는 낙관적 업데이트를 신뢰 (새로고침 안 함)
        } catch (error) {
            console.error('댓글 삭제 실패:', error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : '댓글 삭제 중 오류가 발생했습니다.'
            );
            // 실패 시에만 데이터 새로고침으로 원래 상태로 복원
            onReplySuccess?.(); // 실패 시에만 새로고침
        }
    };

    const handleReplySuccess = () => {
        setIsReplying(false);
        // 대댓글 작성 성공 시에는 폼만 닫고 데이터 새로고침은 하지 않음
    };

    const handleReplyFailure = () => {
        // 대댓글 작성 실패 시: 폼 다시 열기 및 데이터 새로고침
        setIsReplying(true);
        onReplySuccess?.(); // 데이터 새로고침으로 UI 원복
    };

    return (
        <div className={`${isReply ? 'mt-2 ml-8' : 'mt-4'} ${className || ''}`}>
            <Card
                className={`p-4 ${isReply ? 'border-l-2 border-l-blue-200' : ''}`}
            >
                {/* 댓글 헤더 */}
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
                        {/* 대댓글 버튼 */}
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

                        {/* 작성자 메뉴 */}
                        {isAuthor && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
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

                {/* 댓글 내용 */}
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
                                >
                                    취소
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={editContent.trim().length === 0}
                                >
                                    수정
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

            {/* 대댓글 폼 */}
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
                        onOptimisticAdd={onOptimisticAdd}
                        className="border-dashed"
                    />
                </div>
            )}
        </div>
    );
};
