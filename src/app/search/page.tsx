import React, { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getPostsAction } from '@/lib/actions';
import getQueryClient from '@/lib/get-query-client';
import { searchResultsQueryKey } from '@/lib/queries';
import { PAGE_SIZE } from '@/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { SearchResultsWrapper } from '@/components/search/SearchResultsWrapper';
import { SearchBar } from '@/components/ui/search-bar';
import { HashtagSearch } from '@/components/search/HashtagSearch';
import { SearchResultsSkeleton } from '@/components/ui/search-results-skeleton';
import { toSiteUrl } from '@/lib/site-config';

interface SearchPageProps {
    searchParams: Promise<{
        q?: string;
        page?: string;
        tag?: string;
    }>;
}

// 검색 페이지 동적 메타데이터 생성
export async function generateMetadata({
    searchParams,
}: SearchPageProps): Promise<Metadata> {
    const { q: searchQuery, tag } = await searchParams;

    // 해시태그 정보 조회
    const hashtagNames: string[] = [];
    if (tag?.trim()) {
        const hashtagIds = tag
            .split(',')
            .map((id) => parseInt(id))
            .filter((id) => !isNaN(id));

        if (hashtagIds.length > 0) {
            try {
                const { getHashtagByIdAction } = await import('@/lib/actions');
                const hashtagPromises = hashtagIds.map((id) =>
                    getHashtagByIdAction(id)
                );
                const hashtags = await Promise.all(hashtagPromises);
                hashtagNames.push(
                    ...hashtags.filter(Boolean).map((tag) => tag!.name)
                );
            } catch (error) {
                console.error('해시태그 정보 조회 실패:', error);
            }
        }
    }

    // 동적 제목 생성
    let title = '검색';
    let description = '김영인의 기술 블로그에서 원하는 글을 검색해보세요.';

    if (searchQuery && hashtagNames.length > 0) {
        title = `"${searchQuery}" + #${hashtagNames.join(' #')} 검색 결과`;
        description = `"${searchQuery}" 키워드와 ${hashtagNames.join(', ')} 해시태그로 검색한 결과입니다.`;
    } else if (searchQuery) {
        title = `"${searchQuery}" 검색 결과`;
        description = `"${searchQuery}" 키워드로 검색한 결과입니다.`;
    } else if (hashtagNames.length > 0) {
        title = `#${hashtagNames.join(' #')} 검색 결과`;
        description = `${hashtagNames.join(', ')} 해시태그로 검색한 결과입니다.`;
    }

    // 키워드 생성
    const keywords = ['검색', '블로그 검색'];
    if (searchQuery) keywords.push(searchQuery);
    if (hashtagNames.length > 0) keywords.push(...hashtagNames);

    const searchPath = `/search${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}${tag ? `${searchQuery ? '&' : '?'}tag=${encodeURIComponent(tag)}` : ''}`;

    return {
        title,
        description,
        keywords,

        // 검색 결과는 얇은/중복 콘텐츠로 판정될 수 있어 색인에서 제외.
        // 단, 링크는 따라가도록 하여 개별 글은 크롤링되게 함.
        robots: {
            index: false,
            follow: true,
        },

        // Open Graph 최적화
        openGraph: {
            title: `${title} | MyBlog`,
            description,
            url: toSiteUrl(searchPath),
            type: 'website',
        },

        // Twitter Card 최적화
        twitter: {
            title: `${title} | MyBlog`,
            description,
        },

        // canonical URL
        alternates: {
            canonical: toSiteUrl('/search'),
        },

        // 검색 페이지 전용 메타데이터
        other: {
            'page-type': 'search-results',
            ...(searchQuery && { 'search-query': searchQuery }),
            ...(hashtagNames.length > 0 && {
                'search-hashtags': hashtagNames.join(','),
            }),
        },
    };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const { q: searchQuery, page, tag } = await searchParams;
    const currentPage = Number(page) || 1;
    const query = searchQuery || '';
    const hashtagIds = tag
        ? tag
              .split(',')
              .map((id) => parseInt(id))
              .filter((id) => !isNaN(id))
              .sort()
        : undefined;

    return (
        <div className="bg-background min-h-screen">
            {/* 검색바 (최상단 고정) */}
            <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-16 z-40 border-b backdrop-blur">
                <div className="container mx-auto px-4 py-6">
                    <div className="space-y-4">
                        <div className="w-full">
                            <SearchBar />
                        </div>
                        <div className="w-full">
                            <HashtagSearch />
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                {/* 헤더 */}
                <div className="mb-8 space-y-4">
                    {/* 뒤로가기 버튼 */}
                    <div className="flex justify-start">
                        <Button
                            variant="outline"
                            asChild
                            className="flex items-center gap-2"
                        >
                            <Link href="/posts">
                                <ArrowLeft className="h-4 w-4" />글 목록으로
                            </Link>
                        </Button>
                    </div>

                    <h1 className="sr-only">{query ? '검색 결과' : '검색'}</h1>
                </div>

                {/* 검색 결과 표시 */}
                <Suspense
                    key={`${query}-${hashtagIds ? hashtagIds.join(',') : ''}-${currentPage}`}
                    fallback={<SearchResultsSkeleton count={6} />}
                >
                    <SearchResultsSection
                        searchQuery={query}
                        hashtagIds={hashtagIds}
                    />
                </Suspense>
            </div>
        </div>
    );
}

function searchRetryHref(searchQuery: string, hashtagIds?: number[]) {
    const params = new URLSearchParams();
    const q = searchQuery.trim();
    if (q) params.set('q', q);
    if (hashtagIds?.length) params.set('tag', hashtagIds.join(','));
    const qs = params.toString();
    return qs ? `/search?${qs}` : '/search';
}

// 검색 결과 섹션: 첫 페이지 prefetch 후 HydrationBoundary로 전달
async function SearchResultsSection({
    searchQuery,
    hashtagIds,
}: {
    searchQuery: string;
    hashtagIds?: number[];
}) {
    try {
        const queryClient = getQueryClient();
        const hasFilters =
            Boolean(searchQuery.trim()) ||
            Boolean(hashtagIds && hashtagIds.length > 0);

        if (hasFilters) {
            await queryClient.prefetchInfiniteQuery({
                queryKey: searchResultsQueryKey(searchQuery, hashtagIds),
                queryFn: ({ pageParam }) =>
                    getPostsAction(
                        pageParam,
                        'latest',
                        hashtagIds,
                        searchQuery.trim() || undefined
                    ),
                initialPageParam: 1,
                getNextPageParam: (
                    lastPage: Awaited<ReturnType<typeof getPostsAction>>,
                    pages: Awaited<ReturnType<typeof getPostsAction>>[]
                ) => {
                    const hasMorePosts =
                        lastPage.posts.length === PAGE_SIZE;
                    return hasMorePosts ? pages.length + 1 : undefined;
                },
            });
        }

        const dehydratedState = dehydrate(queryClient);

        return (
            <HydrationBoundary state={dehydratedState}>
                <SearchResultsWrapper
                    searchQuery={searchQuery}
                    hashtagIds={hashtagIds}
                />
            </HydrationBoundary>
        );
    } catch (error) {
        console.error('검색 결과 로딩 실패:', error);
        return (
            <Card className="flex min-h-[400px] items-center justify-center">
                <CardContent className="p-12 text-center">
                    <p className="text-destructive mb-4 text-lg">
                        검색 결과를 불러오는 중 오류가 발생했습니다.
                    </p>
                    <Button asChild variant="outline">
                        <Link
                            href={searchRetryHref(searchQuery, hashtagIds)}
                        >
                            다시 시도
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }
}
