'use client';

import { PostCard } from '@/components/post-card';
import { Post, PostSort } from '@/types';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getPostsAction } from '@/lib/actions';
import { PAGE_SIZE } from '@/constants';
import { Card, CardContent } from '@/components/ui/card';
import { AdminCreateHint } from '@/components/AdminCreateHint';
import { useInView } from 'react-intersection-observer';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { SinglePostCardSkeleton } from '@/components/ui/search-results-skeleton';

function EmptyHint() {
    return (
        <Card>
            <CardContent className="p-12 text-center">
                <p className="text-muted-foreground mb-4 text-lg">
                    {'아직 작성된 글이 없습니다.'}
                </p>
                <AdminCreateHint />
            </CardContent>
        </Card>
    );
}

export default function PostWrapper({
    initialPosts,
    sort,
    tagId,
}: {
    initialPosts: Post[];
    sort: PostSort;
    tagId?: string;
}) {
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isError } =
        useInfiniteQuery({
            queryKey: ['posts', sort, tagId],
            queryFn: ({ pageParam }) =>
                getPostsAction(
                    pageParam,
                    sort,
                    tagId ? [Number(tagId)] : undefined // hashtagIds (ID 배열)
                ),
            initialPageParam: 1,
            initialData: {
                pages: [{ posts: initialPosts, total: initialPosts.length }],
                pageParams: [1],
            },
            getNextPageParam: (lastPage, pages) => {
                const hasMorePosts = lastPage.posts.length === PAGE_SIZE;
                return hasMorePosts ? pages.length + 1 : undefined;
            },
            // 캐싱 전략
            staleTime: 5 * 60 * 1000, // 5분간 데이터를 "신선"하다고 간주
            gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
            // 자동 재조회 전략
            refetchOnWindowFocus: true,
            refetchOnMount: true,
            refetchOnReconnect: true,
            refetchInterval: 2 * 60 * 1000, // 2분마다 백그라운드에서 재조회
            refetchIntervalInBackground: true, // 백그라운드에서도 재조회
            // 재시도 전략
            retry: 3,
            retryDelay: (attemptIndex) =>
                Math.min(1000 * 2 ** attemptIndex, 30000),
        });

    // 메모이제이션으로 불필요한 리렌더링 방지
    const posts = useMemo(
        () => data?.pages.flatMap((page) => page.posts) || [],
        [data?.pages]
    );

    const { ref } = useInView({
        threshold: 0.1, // 10% 보일 때 트리거 (더 일찍 감지)
        rootMargin: '100px', // 뷰포트 하단 100px 전에 트리거
        triggerOnce: false, // 여러 번 트리거 허용
        delay: 0, // 지연 제거로 즉시 반응
        onChange: (inView) => {
            if (inView && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        },
    });

    // 에러 상태 처리
    if (isError) {
        return (
            <Card>
                <CardContent className="p-12 text-center">
                    <p className="text-destructive mb-4">
                        글을 불러오는 중 오류가 발생했습니다.
                    </p>
                    <Button onClick={() => window.location.reload()}>
                        다시 시도
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            {posts.length === 0 ? (
                <EmptyHint />
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                    ))}

                    {/* 무한 스크롤 로딩 Skeleton */}
                    {isFetchingNextPage &&
                        Array.from({ length: 3 }).map((_, index) => (
                            <SinglePostCardSkeleton key={`skeleton-${index}`} />
                        ))}
                </div>
            )}

            {hasNextPage && (
                <div ref={ref} className="py-8 text-center">
                    {isFetchingNextPage && (
                        <div className="flex items-center justify-center gap-2">
                            <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
                            <span className="text-muted-foreground text-sm">
                                더 많은 글을 불러오는 중...
                            </span>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
