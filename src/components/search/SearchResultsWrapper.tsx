'use client';

import { PostCard } from '@/components/post-card';
import { Post } from '@/types';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getPostsAction } from '@/lib/actions';
import { PAGE_SIZE } from '@/constants';
import { Card, CardContent } from '@/components/ui/card';
import { useInView } from 'react-intersection-observer';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { SinglePostCardSkeleton } from '@/components/ui/search-results-skeleton';

interface SearchResultsWrapperProps {
    initialPosts: Post[];
    searchQuery: string;
    totalResults: number;
}

function SearchEmptyHint({ searchQuery }: { searchQuery: string }) {
    return (
        <Card className="flex min-h-[400px] items-center justify-center">
            <CardContent className="p-12 text-center">
                <Search className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                <h2 className="mb-4 text-xl font-semibold">
                    검색 결과가 없습니다
                </h2>
                <p className="text-muted-foreground mb-6">
                    &quot;{searchQuery}&quot;에 대한 검색 결과를 찾을 수
                    없습니다.
                </p>
                <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">
                        다음을 확인해보세요:
                    </p>
                    <ul className="text-muted-foreground space-y-1 text-sm">
                        <li>• 검색어의 철자가 정확한지 확인</li>
                        <li>• 다른 키워드로 검색해보기</li>
                        <li>• 더 일반적인 용어로 검색해보기</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}

function SearchInitialState() {
    return (
        <Card className="flex min-h-[400px] items-center justify-center">
            <CardContent className="p-12 text-center">
                <Search className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                <h2 className="mb-4 text-xl font-semibold">
                    검색어를 입력해주세요
                </h2>
                <p className="text-muted-foreground text-sm">
                    제목이나 내용에 포함된 키워드로 검색할 수 있습니다.
                </p>
            </CardContent>
        </Card>
    );
}

export function SearchResultsWrapper({
    initialPosts,
    searchQuery,
    totalResults,
}: SearchResultsWrapperProps) {
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isError } =
        useInfiniteQuery({
            queryKey: ['search', searchQuery],
            queryFn: ({ pageParam }) =>
                getPostsAction(pageParam, 'latest', undefined, searchQuery),
            initialPageParam: 1,
            initialData: {
                pages: [{ posts: initialPosts, total: totalResults }],
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
            refetchOnWindowFocus: false, // 검색 결과는 윈도우 포커스 시 재조회 불필요
            refetchOnMount: false, // 마운트 시 재조회 불필요
            refetchOnReconnect: true, // 네트워크 재연결 시 재조회
            refetchInterval: false, // 검색 결과는 자동 업데이트 불필요
            // 재시도 전략
            retry: 2,
            retryDelay: (attemptIndex) =>
                Math.min(1000 * 2 ** attemptIndex, 30000),
        });

    // 메모이제이션으로 불필요한 리렌더링 방지
    const posts = useMemo(
        () => data?.pages.flatMap((page) => page.posts) || [],
        [data?.pages]
    );

    const { ref } = useInView({
        threshold: 0.1, // 10% 보일 때 트리거
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
            <Card className="flex min-h-[400px] items-center justify-center">
                <CardContent className="p-12 text-center">
                    <p className="text-destructive mb-4">
                        검색 결과를 불러오는 중 오류가 발생했습니다.
                    </p>
                    <Button onClick={() => window.location.reload()}>
                        다시 시도
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="min-h-[400px] transition-all duration-300 ease-in-out">
            {!searchQuery ? (
                <SearchInitialState />
            ) : posts.length === 0 ? (
                <SearchEmptyHint searchQuery={searchQuery} />
            ) : (
                <div className="space-y-6">
                    {/* 검색 결과 요약 */}
                    <p className="text-muted-foreground text-xl">
                        총{' '}
                        <span className="text-foreground font-semibold">
                            {totalResults}
                        </span>
                        개의 검색 결과를 찾았습니다.
                    </p>

                    {/* 검색 결과 목록 */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {posts.map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))}
                    </div>

                    {/* 무한 스크롤 트리거 */}
                    {hasNextPage && (
                        <div ref={ref} className="py-8 text-center">
                            {isFetchingNextPage && (
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {Array.from({ length: 3 }).map(
                                        (_, index) => (
                                            <SinglePostCardSkeleton
                                                key={index}
                                            />
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 모든 결과 로드 완료 */}
                    {!hasNextPage && posts.length > 0 && (
                        <div className="py-8 text-center">
                            <p className="text-muted-foreground text-sm">
                                모든 검색 결과를 불러왔습니다.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
