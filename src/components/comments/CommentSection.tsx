'use client';

import React, { useEffect, useCallback, useReducer } from 'react';
import { Comment } from '@/types';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';
import { CommentSkeleton } from './CommentSkeleton';
import { getCommentsAction } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CommentSectionProps {
    postId: number;
    postAuthorId?: string;
    initialComments?: Comment[];
    className?: string;
}

// 댓글 상태 관리를 위한 액션 타입 정의
type CommentAction =
    | { type: 'LOAD_START' }
    | { type: 'LOAD_SUCCESS'; comments: Comment[] }
    | { type: 'LOAD_ERROR'; error: string }
    | { type: 'ADD_OPTIMISTIC'; comment: Comment }
    | { type: 'UPDATE_OPTIMISTIC'; id: number; content: string }
    | { type: 'DELETE_OPTIMISTIC'; id: number };

// 댓글 상태 인터페이스
interface CommentState {
    comments: Comment[];
    isLoading: boolean;
    error: string | null;
}

// 댓글 상태 리듀서
function commentReducer(
    state: CommentState,
    action: CommentAction
): CommentState {
    switch (action.type) {
        case 'LOAD_START':
            return {
                ...state,
                isLoading: true,
                error: null,
            };
        case 'LOAD_SUCCESS':
            return {
                ...state,
                comments: action.comments,
                isLoading: false,
                error: null,
            };
        case 'LOAD_ERROR':
            return {
                ...state,
                isLoading: false,
                error: action.error,
            };
        case 'ADD_OPTIMISTIC':
            return {
                ...state,
                comments: [...state.comments, action.comment],
            };
        case 'UPDATE_OPTIMISTIC':
            return {
                ...state,
                comments: state.comments.map((comment) =>
                    comment.id === action.id
                        ? {
                              ...comment,
                              content: action.content,
                              updated_at: new Date().toISOString(),
                          }
                        : comment
                ),
            };
        case 'DELETE_OPTIMISTIC':
            return {
                ...state,
                comments: state.comments.filter(
                    (comment) =>
                        comment.id !== action.id &&
                        comment.parent_id !== action.id
                ),
            };
        default:
            return state;
    }
}

export const CommentSection: React.FC<CommentSectionProps> = ({
    postId,
    postAuthorId,
    initialComments = [],
    className,
}) => {
    // 단일 useReducer로 모든 상태 관리
    const initialState: CommentState = {
        comments: initialComments,
        isLoading: false,
        error: null,
    };

    const [state, dispatch] = useReducer(commentReducer, initialState);
    const { comments, isLoading, error } = state;

    const loadComments = useCallback(async () => {
        dispatch({ type: 'LOAD_START' });
        try {
            const fetchedComments = await getCommentsAction(postId);
            dispatch({ type: 'LOAD_SUCCESS', comments: fetchedComments });
        } catch (err) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : '댓글을 불러오는 중 오류가 발생했습니다.';
            dispatch({ type: 'LOAD_ERROR', error: errorMessage });
        }
    }, [postId]);

    const handleCommentSuccess = () => {
        // 댓글 작성/수정/삭제 후 목록 새로고침
        loadComments();
    };

    // 낙관적 업데이트 핸들러들
    const handleOptimisticAdd = useCallback((comment: Comment) => {
        dispatch({ type: 'ADD_OPTIMISTIC', comment });
    }, []);

    const handleOptimisticUpdate = useCallback(
        (id: number, content: string) => {
            dispatch({ type: 'UPDATE_OPTIMISTIC', id, content });
        },
        []
    );

    const handleOptimisticDelete = useCallback((id: number) => {
        dispatch({ type: 'DELETE_OPTIMISTIC', id });
    }, []);

    // initialComments가 변경될 때 상태 동기화
    useEffect(() => {
        if (initialComments.length > 0) {
            dispatch({ type: 'LOAD_SUCCESS', comments: initialComments });
        }
    }, [initialComments]);

    // 초기 로드 (initialComments가 없을 때만)
    useEffect(() => {
        if (initialComments.length === 0) {
            loadComments();
        }
    }, [initialComments.length, loadComments]);

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
                            onClick={loadComments}
                            disabled={isLoading}
                            className="h-8 px-2"
                        >
                            <RefreshCw
                                className={`h-3 w-3 ${
                                    isLoading ? 'animate-spin' : ''
                                }`}
                            />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* 댓글 작성 폼 */}
                    <CommentForm
                        postId={postId}
                        onSuccess={handleCommentSuccess}
                        onOptimisticAdd={handleOptimisticAdd}
                    />

                    {/* 에러 메시지 */}
                    {error && (
                        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
                            <p>{error}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={loadComments}
                                className="mt-2"
                            >
                                다시 시도
                            </Button>
                        </div>
                    )}

                    {/* 로딩 상태 */}
                    {isLoading && <CommentSkeleton count={3} />}

                    {/* 댓글 목록 */}
                    {!isLoading && !error && (
                        <CommentList
                            comments={comments}
                            postAuthorId={postAuthorId}
                            onReplySuccess={handleCommentSuccess}
                            onOptimisticAdd={handleOptimisticAdd}
                            onOptimisticUpdate={handleOptimisticUpdate}
                            onOptimisticDelete={handleOptimisticDelete}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
