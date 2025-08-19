import React from 'react';
import Link from 'next/link';
import { getPostsAction } from '@/lib/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, X } from 'lucide-react';
import { SortSelector, type SortOption } from '@/components/ui/sort-selector';
import PostWrapper from '@/components/posts/PostWrapper';

interface PostsPageProps {
    searchParams: Promise<{
        sort?: string;
        tag?: string;
    }>;
}

export default async function PostsPage({ searchParams }: PostsPageProps) {
    const { sort, tag } = await searchParams;
    try {
        // URL 파라미터에서 정렬 옵션 추출 (기본값: latest)
        const sortBy = (sort as SortOption) || 'latest';
        const validSortOptions: SortOption[] = [
            'latest',
            'popular',
            'likes',
            'oldest',
        ];
        const validSortBy = validSortOptions.includes(sortBy)
            ? sortBy
            : 'latest';

        // 해시태그 필터
        const activeTag = tag?.trim() || undefined;

        // 모든 글 조회 (최대 50개, 정렬 + 해시태그 필터 적용)
        const result = await getPostsAction(1, validSortBy, activeTag);
        const posts = result.posts;

        return (
            <div className="bg-background min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    {/* 헤더 */}
                    <div className="mb-8 space-y-4">
                        {/* 홈으로 버튼 */}
                        <div className="flex justify-start">
                            <Button
                                variant="outline"
                                asChild
                                className="flex items-center gap-2"
                            >
                                <Link href="/">
                                    <ArrowLeft className="h-4 w-4" />
                                    홈으로
                                </Link>
                            </Button>
                        </div>

                        {/* 제목/정렬/필터 표시 */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-2">
                                <h1 className="text-3xl font-bold">모든 글</h1>
                                {activeTag && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground text-sm">
                                            해시태그 필터:
                                        </span>
                                        <span className="bg-accent rounded-full px-3 py-1 text-sm">
                                            #{activeTag}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            asChild
                                            className="h-7 px-2 text-xs"
                                        >
                                            <Link
                                                href={`/posts?sort=${validSortBy}`}
                                            >
                                                <X className="mr-1 h-3 w-3" />
                                                필터 해제
                                            </Link>
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* 정렬 선택기 */}
                            <SortSelector
                                currentSort={validSortBy}
                                currentTag={activeTag}
                            />
                        </div>
                    </div>

                    {/* 글 목록 */}
                    <PostWrapper
                        initialPosts={posts}
                        sort={validSortBy}
                        tag={activeTag || ''}
                    />
                </div>
            </div>
        );
    } catch (error) {
        console.error('글 목록 로딩 실패:', error);
        return (
            <div className="bg-background min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    <Card>
                        <CardContent className="p-12 text-center">
                            <p className="text-muted-foreground mb-4 text-lg">
                                글 목록을 불러오는 중 오류가 발생했습니다.
                            </p>
                            <Button onClick={() => window.location.reload()}>
                                다시 시도
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }
}
