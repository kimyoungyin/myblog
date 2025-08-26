'use client';

import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toggleLikeAction } from '@/lib/actions';
import { useAuth } from '@/hooks/useAuth';
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
    const [isLiked, setIsLiked] = useState(initialIsLiked);
    const [likesCount, setLikesCount] = useState(initialLikesCount);
    const [isPending, startTransition] = useTransition();

    const handleToggleLike = async () => {
        if (!user) {
            return;
        }

        // 낙관적 업데이트: 즉시 UI에 반영
        const newIsLiked = !isLiked;
        const newLikesCount = newIsLiked
            ? likesCount + 1
            : Math.max(0, likesCount - 1);

        setIsLiked(newIsLiked);
        setLikesCount(newLikesCount);

        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.append('post_id', postId.toString());

                const result = await toggleLikeAction(formData);

                // 서버 결과로 최종 상태 업데이트
                setIsLiked(result.is_liked);
                setLikesCount(result.likes_count);
            } catch {
                // 실패 시 원래 상태로 복원
                setIsLiked(!newIsLiked);
                setLikesCount(initialLikesCount);
            }
        });
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
                        {showCount && <span>{likesCount}</span>}
                    </Button>
                </Link>
                {!showCount && (
                    <span className="text-muted-foreground text-sm">
                        {likesCount}
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
