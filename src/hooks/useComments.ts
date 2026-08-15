'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createCommentAction,
    deleteCommentAction,
    getCommentsAction,
    updateCommentAction,
} from '@/lib/actions';
import {
    appendComment,
    removeCommentTree,
    updateCommentContent,
} from '@/lib/comment-cache';
import { commentsQueryKey } from '@/lib/queries';
import { invalidateClientQueriesForEvent } from '@/lib/query-invalidation';
import type { Comment, User } from '@/types';

export interface CreateCommentInput {
    content: string;
    parentId?: number;
}

export interface UpdateCommentInput {
    commentId: number;
    content: string;
}

export interface DeleteCommentInput {
    commentId: number;
}

export function useComments(postId: number, initialComments: Comment[] = []) {
    return useQuery({
        queryKey: commentsQueryKey(postId),
        queryFn: () => getCommentsAction(postId),
        initialData: initialComments,
        staleTime: 60 * 1000,
    });
}

export function useCommentMutations(postId: number, user?: User | null) {
    const queryClient = useQueryClient();
    const queryKey = commentsQueryKey(postId);

    const createMutation = useMutation({
        mutationFn: async ({ content, parentId }: CreateCommentInput) => {
            const formData = new FormData();
            formData.append('post_id', postId.toString());
            formData.append('content', content);
            if (parentId) {
                formData.append('parent_id', parentId.toString());
            }

            return createCommentAction(formData);
        },
        onMutate: async ({ content, parentId }) => {
            await queryClient.cancelQueries({ queryKey });

            const previous =
                queryClient.getQueryData<Comment[]>(queryKey) ?? [];

            if (user) {
                const now = new Date().toISOString();
                const optimisticComment: Comment = {
                    id: -Date.now(),
                    content,
                    post_id: postId,
                    author_id: user.id,
                    parent_id: parentId,
                    created_at: now,
                    updated_at: now,
                    author: user,
                };

                queryClient.setQueryData(
                    queryKey,
                    appendComment(previous, optimisticComment)
                );
            }

            return { previous };
        },
        onError: (_error, _variables, context) => {
            if (context) {
                queryClient.setQueryData(queryKey, context.previous);
            }
        },
        onSettled: () =>
            invalidateClientQueriesForEvent(queryClient, {
                type: 'comment-created',
                postId,
            }),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ commentId, content }: UpdateCommentInput) => {
            const formData = new FormData();
            formData.append('comment_id', commentId.toString());
            formData.append('post_id', postId.toString());
            formData.append('content', content);

            return updateCommentAction(formData);
        },
        onMutate: async ({ commentId, content }) => {
            await queryClient.cancelQueries({ queryKey });

            const previous =
                queryClient.getQueryData<Comment[]>(queryKey) ?? [];
            queryClient.setQueryData(
                queryKey,
                updateCommentContent(previous, commentId, content)
            );

            return { previous };
        },
        onError: (_error, _variables, context) => {
            if (context) {
                queryClient.setQueryData(queryKey, context.previous);
            }
        },
        onSettled: () =>
            invalidateClientQueriesForEvent(queryClient, {
                type: 'comment-updated',
                postId,
            }),
    });

    const deleteMutation = useMutation({
        mutationFn: async ({ commentId }: DeleteCommentInput) => {
            const formData = new FormData();
            formData.append('comment_id', commentId.toString());
            formData.append('post_id', postId.toString());

            return deleteCommentAction(formData);
        },
        onMutate: async ({ commentId }) => {
            await queryClient.cancelQueries({ queryKey });

            const previous =
                queryClient.getQueryData<Comment[]>(queryKey) ?? [];
            queryClient.setQueryData(
                queryKey,
                removeCommentTree(previous, commentId)
            );

            return { previous };
        },
        onError: (_error, _variables, context) => {
            if (context) {
                queryClient.setQueryData(queryKey, context.previous);
            }
        },
        onSettled: () =>
            invalidateClientQueriesForEvent(queryClient, {
                type: 'comment-deleted',
                postId,
            }),
    });

    return {
        createComment: createMutation.mutateAsync,
        updateComment: updateMutation.mutateAsync,
        deleteComment: deleteMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
}
