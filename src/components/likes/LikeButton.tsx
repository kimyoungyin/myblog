'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getLikeStatusAction, toggleLikeAction } from '@/lib/actions';
import { useAuth } from '@/hooks/useAuth';
import { likeStatusQueryKey } from '@/lib/queries';
import { invalidateClientQueriesForEvent } from '@/lib/query-invalidation';
import type { LikeStatus } from '@/types';
import Link from 'next/link';

interface LikeButtonProps {
    postId: number;
    initialLikesCount: number;
    initialIsLiked: boolean;
    className?: string;
    showCount?: boolean;
    size?: 'sm' | 'default' | 'lg';
}

export function LikeButton({
    postId,
    initialLikesCount,
    initialIsLiked,
    className,
    showCount = true,
    size = 'default',
}: LikeButtonProps) {
    const { user, isLoading } = useAuth();
    const queryClient = useQueryClient();

    const { data: likeStatus } = useQuery({
        queryKey: likeStatusQueryKey(postId, user?.id),
        queryFn: () => getLikeStatusAction(postId),
        enabled: !!user,
        staleTime: 0,
        refetchOnWindowFocus: true,
    });

    const isLiked = likeStatus?.is_liked ?? initialIsLiked;
    const likesCount = likeStatus?.likes_count ?? initialLikesCount;

    const likeMutation = useMutation({
        mutationFn: async () => {
            if (!user) {
                throw new Error(
                    '좋아요를 추가/제거하려면 로그인이 필요합니다.'
                );
            }

            const formData = new FormData();
            formData.append('post_id', postId.toString());
            return toggleLikeAction(formData);
        },
        onMutate: async () => {
            const key = likeStatusQueryKey(postId, user?.id);
            await queryClient.cancelQueries({ queryKey: key });

            const previous = queryClient.getQueryData<LikeStatus>(key);
            const nextIsLiked = !isLiked;
            const nextCount = nextIsLiked
                ? likesCount + 1
                : Math.max(0, likesCount - 1);

            queryClient.setQueryData<LikeStatus>(key, {
                post_id: postId,
                is_liked: nextIsLiked,
                likes_count: nextCount,
            });

            return { key, previous };
        },
        onError: (_error, _variables, context) => {
            if (!context) {
                return;
            }

            if (context.previous) {
                queryClient.setQueryData(context.key, context.previous);
                return;
            }

            queryClient.setQueryData<LikeStatus>(context.key, {
                post_id: postId,
                is_liked: initialIsLiked,
                likes_count: initialLikesCount,
            });
        },
        onSuccess: async (result) => {
            const key = likeStatusQueryKey(postId, user?.id);
            queryClient.setQueryData<LikeStatus>(key, {
                post_id: postId,
                is_liked: result.is_liked,
                likes_count: result.likes_count,
            });

            await invalidateClientQueriesForEvent(queryClient, {
                type: 'like-toggled',
                postId,
            });
        },
    });

    const isPending = likeMutation.isPending;

    const handleToggleLike = () => {
        if (!user || isPending) {
            return;
        }

        likeMutation.mutate();
    };

    // 로그인하지 않은 사용자를 위한 UI
    if (!isLoading && !user) {
        return (
            <div className={cn('flex items-center gap-2', className)}>
                <Link href="/auth/login">
                    <Button
                        variant="ghost"
                        size={size}
                        className={cn(
                            'text-muted-foreground flex items-center gap-1 hover:text-red-500',
                            size === 'sm' && 'h-8 px-2 text-xs',
                            size === 'default' && 'h-9 px-3 text-sm',
                            size === 'lg' && 'h-10 px-4 text-base'
                        )}
                    >
                        <Heart
                            className={cn(
                                size === 'sm' && 'h-3 w-3',
                                size === 'default' && 'h-4 w-4',
                                size === 'lg' && 'h-5 w-5'
                            )}
                        />
                        {showCount && <span>{initialLikesCount}</span>}
                    </Button>
                </Link>
                {!showCount && (
                    <span className="text-muted-foreground text-sm">
                        {initialLikesCount}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <Button
                variant="ghost"
                size={size}
                onClick={handleToggleLike}
                disabled={isPending || isLoading}
                className={cn(
                    'flex items-center gap-1 transition-colors duration-200',
                    isLiked
                        ? 'text-red-500 hover:text-red-600'
                        : 'text-muted-foreground hover:text-red-500',
                    size === 'sm' && 'h-8 px-2 text-xs',
                    size === 'default' && 'h-9 px-3 text-sm',
                    size === 'lg' && 'h-10 px-4 text-base',
                    (isPending || isLoading) && 'cursor-not-allowed opacity-50'
                )}
            >
                <Heart
                    className={cn(
                        'transition-all duration-200',
                        size === 'sm' && 'h-3 w-3',
                        size === 'default' && 'h-4 w-4',
                        size === 'lg' && 'h-5 w-5',
                        isLiked && 'fill-current'
                    )}
                />
                {showCount && <span>{likesCount}</span>}
            </Button>

            {!showCount && (
                <span className="text-muted-foreground text-sm">
                    {likesCount}
                </span>
            )}
        </div>
    );
}
