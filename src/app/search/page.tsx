import React, { Suspense } from 'react';
import Link from 'next/link';
import { getPostsAction } from '@/lib/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search } from 'lucide-react';
import { SearchResultsWrapper } from '@/components/search/SearchResultsWrapper';
import { SearchBar } from '@/components/ui/search-bar';

interface SearchPageProps {
    searchParams: Promise<{
        q?: string;
        page?: string;
    }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const { q: searchQuery, page } = await searchParams;
    const currentPage = Number(page) || 1;
    const query = searchQuery || '';

    return (
        <div className="bg-background min-h-screen">
            {/* 검색바 (최상단 고정) */}
            <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-16 z-40 border-b backdrop-blur">
                <div className="container mx-auto px-4 py-6">
                    <div className="w-full">
                        <SearchBar />
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

                    {/* 페이지 제목: screen reader 접근성을 위해 요소는 살리되 화면에 표시하지 않음 */}
                    <h1 className="hidden text-3xl font-bold">
                        {query ? '검색 결과' : '검색'}
                    </h1>
                </div>

                {/* 검색 결과 표시 */}
                <Suspense
                    key={`${query}-${currentPage}`}
                    fallback={
                        <div className="flex min-h-[400px] items-center justify-center">
                            <div className="flex items-center gap-2">
                                <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
                                <span className="text-muted-foreground text-sm">
                                    검색 결과를 불러오는 중...
                                </span>
                            </div>
                        </div>
                    }
                >
                    <SearchResultsSection searchQuery={query} />
                </Suspense>
            </div>
        </div>
    );
}

// 검색 결과 섹션 컴포넌트
async function SearchResultsSection({ searchQuery }: { searchQuery: string }) {
    try {
        // 검색 결과 조회 (최신순으로만 정렬)
        const result = searchQuery
            ? await getPostsAction(1, 'latest', undefined, searchQuery)
            : { posts: [], total: 0 };

        return (
            <SearchResultsWrapper
                initialPosts={result.posts}
                searchQuery={searchQuery}
                totalResults={result.total}
            />
        );
    } catch (error) {
        console.error('검색 결과 로딩 실패:', error);
        return (
            <Card className="flex min-h-[400px] items-center justify-center">
                <CardContent className="p-12 text-center">
                    <p className="text-destructive mb-4 text-lg">
                        검색 결과를 불러오는 중 오류가 발생했습니다.
                    </p>
                    <Button onClick={() => window.location.reload()}>
                        다시 시도
                    </Button>
                </CardContent>
            </Card>
        );
    }
}
