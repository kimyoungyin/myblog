import React from 'react';
import Link from 'next/link';
import { getPostsAction } from '@/lib/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PostCard } from '@/components/post-card';
import { SortSelector, type SortOption } from '@/components/ui/sort-selector';

interface PostsPageProps {
    searchParams: {
        sort?: string;
    };
}

export default async function PostsPage({ searchParams }: PostsPageProps) {
    try {
        // URL 파라미터에서 정렬 옵션 추출 (기본값: latest)
        const sortBy = (searchParams.sort as SortOption) || 'latest';

        // 정렬 옵션 유효성 검사
        const validSortOptions: SortOption[] = [
            'latest',
            'popular',
            'likes',
            'oldest',
        ];
        const validSortBy = validSortOptions.includes(sortBy)
            ? sortBy
            : 'latest';

        // 모든 글 조회 (최대 50개, 정렬 적용)
        const result = await getPostsAction(1, 50, validSortBy);
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

                        {/* 제목과 정렬 선택기 */}
                        <div className="flex items-center justify-between gap-4">
                            <h1 className="text-3xl font-bold">모든 글</h1>

                            {/* 정렬 선택기 */}
                            <SortSelector currentSort={validSortBy} />
                        </div>
                    </div>

                    {/* 글 목록 */}
                    {posts.length === 0 ? (
                        <Card>
                            <CardContent className="p-12 text-center">
                                <p className="text-muted-foreground mb-4 text-lg">
                                    아직 작성된 글이 없습니다.
                                </p>
                                <p className="text-muted-foreground">
                                    첫 번째 글을 작성해보세요!
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {posts.map((post) => (
                                <PostCard key={post.id} post={post} />
                            ))}
                        </div>
                    )}
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
