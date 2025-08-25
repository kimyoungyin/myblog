'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { createCommentAction } from '@/lib/actions';
import { Comment } from '@/types';
import { toast } from 'sonner';

interface CommentFormProps {
    isReplying?: boolean;
    postId: number;
    parentId?: number;
    onSuccess?: () => void;
    onCancel?: () => void;
    onFailure?: () => void; // 실패 시 호출 (대댓글 폼 다시 열기 등)
    onOptimisticAdd?: (comment: Comment) => void;
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
    onOptimisticAdd,
    placeholder = '댓글을 작성해주세요...',
    className,
}) => {
    const { user, isLoading: authLoading } = useAuth();
    const [content, setContent] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // 기본 form 제출 방지

        if (!user) {
            toast.error('로그인이 필요합니다.');
            return;
        }

        const commentContent = content.trim();
        if (!commentContent) {
            toast.error('댓글 내용을 입력해주세요.');
            return;
        }

        // 낙관적 업데이트: 임시 댓글 생성
        const optimisticComment: Comment = {
            id: Date.now(), // 임시 ID (실제 서버에서 받은 ID로 교체됨)
            content: commentContent,
            post_id: postId,
            author_id: user.id,
            parent_id: parentId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            author: user,
        };

        // 1. 즉시 UI에 반영 (낙관적 업데이트)
        onOptimisticAdd?.(optimisticComment);
        setContent(''); // 폼 초기화

        // 2. 대댓글인 경우 즉시 폼 닫기 (낙관적 UI)
        if (parentId) {
            onSuccess?.(); // 대댓글 폼 즉시 닫기
        }

        try {
            // 3. FormData 생성하여 서버 액션 호출 (백그라운드)
            const formData = new FormData();
            formData.append('post_id', postId.toString());
            formData.append('content', commentContent);
            if (parentId) {
                formData.append('parent_id', parentId.toString());
            }

            await createCommentAction(formData);
            toast.success(
                parentId ? '대댓글이 작성되었습니다.' : '댓글이 작성되었습니다.'
            );
            // 성공 시: 추가 작업 없음 (이미 낙관적 업데이트 완료)
        } catch (error) {
            console.error('댓글 작성 실패:', error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : '댓글 작성 중 오류가 발생했습니다.'
            );
            // 실패 시: 내용 복원 및 UI 원복
            setContent(commentContent);

            if (parentId) {
                // 대댓글 실패 시: 폼 다시 열기
                onFailure?.();
            } else {
                // 일반 댓글 실패 시: 데이터 새로고침
                onSuccess?.();
            }
        }
    };

    // 로딩 중일 때
    if (authLoading) {
        return (
            <Card className={`p-4 ${className || ''}`}>
                <div className="space-y-4">
                    {/* 텍스트 영역 스켈레톤 */}
                    <div className="space-y-2">
                        <Skeleton className={`${parentId ? 'h-20' : 'h-24'}`} />
                        {/* 글자수 카운터 스켈레톤 */}
                        <div className="flex justify-end">
                            <Skeleton className="h-3 w-12" />
                        </div>
                    </div>

                    {/* 버튼 영역 스켈레톤 */}
                    <div className="flex items-center justify-end gap-2">
                        {parentId && <Skeleton className="h-8 w-12" />}
                        <Skeleton className="h-8 w-20" />
                    </div>
                </div>
            </Card>
        );
    }

    // 로그인하지 않은 사용자
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
                        >
                            취소
                        </Button>
                    )}
                    <Button
                        type="submit"
                        size="sm"
                        disabled={content.trim().length === 0}
                    >
                        {parentId ? '대댓글 작성' : '댓글 작성'}
                    </Button>
                </div>
            </form>
        </Card>
    );
};
