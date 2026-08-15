'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useCommentMutations } from '@/hooks/useComments';
import { toast } from 'sonner';

interface CommentFormProps {
    isReplying?: boolean;
    postId: number;
    parentId?: number;
    onSuccess?: () => void;
    onCancel?: () => void;
    onFailure?: () => void;
    placeholder?: string;
    className?: string;
}

export const CommentForm: React.FC<CommentFormProps> = ({
    isReplying,
    postId,
    parentId,
    onSuccess,
    onCancel,
    onFailure,
    placeholder = '댓글을 작성해주세요...',
    className,
}) => {
    const { user, isLoading: authLoading } = useAuth();
    const { createComment, isCreating } = useCommentMutations(postId, user);
    const [content, setContent] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            toast.error('로그인이 필요합니다.');
            return;
        }

        const commentContent = content.trim();
        if (!commentContent) {
            toast.error('댓글 내용을 입력해주세요.');
            return;
        }

        setContent('');

        try {
            await createComment({
                content: commentContent,
                parentId,
            });
            toast.success(
                parentId ? '대댓글이 작성되었습니다.' : '댓글이 작성되었습니다.'
            );
            onSuccess?.();
        } catch (error) {
            console.error('댓글 작성 실패:', error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : '댓글 작성 중 오류가 발생했습니다.'
            );
            setContent(commentContent);
            onFailure?.();
        }
    };

    if (authLoading) {
        return (
            <Card className={`p-4 ${className || ''}`}>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className={`${parentId ? 'h-20' : 'h-24'}`} />
                        <div className="flex justify-end">
                            <Skeleton className="h-3 w-12" />
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        {parentId && <Skeleton className="h-8 w-12" />}
                        <Skeleton className="h-8 w-20" />
                    </div>
                </div>
            </Card>
        );
    }

    if (!user) {
        return (
            <Card className={`border-dashed p-4 ${className || ''}`}>
                <div className="py-8 text-center">
                    <p className="text-muted-foreground mb-4">
                        댓글을 작성하려면 로그인이 필요합니다.
                    </p>
                    <Button asChild variant="outline">
                        <Link href="/auth/login">로그인하기</Link>
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <Card
            className={`${isReplying ? 'mt-2 ml-8' : 'mt-4'} p-4 ${className || ''}`}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label htmlFor="content" className="sr-only">
                        {parentId ? '대댓글 작성' : '댓글 작성'}
                    </label>
                    <Textarea
                        id="content"
                        name="content"
                        placeholder={placeholder}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={parentId ? 3 : 4}
                        className="resize-none"
                        required
                        maxLength={1000}
                    />
                    <div className="text-muted-foreground text-right text-xs">
                        {content.length}/1000
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                    {parentId && onCancel && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onCancel}
                            disabled={isCreating}
                        >
                            취소
                        </Button>
                    )}
                    <Button
                        type="submit"
                        size="sm"
                        disabled={
                            content.trim().length === 0 || isCreating
                        }
                    >
                        {isCreating
                            ? '작성 중...'
                            : parentId
                              ? '대댓글 작성'
                              : '댓글 작성'}
                    </Button>
                </div>
            </form>
        </Card>
    );
};
