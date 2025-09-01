import React from 'react';
import Link from 'next/link';
import {
    getRecentPostsAction,
    getHashtagsWithCountAction,
} from '@/lib/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { PostCard } from '@/components/post-card';
import { HashtagSidebar } from '@/components/hashtags/HashtagSidebar';

export default async function HomePage() {
    try {
        // 최신 글 10개와 인기 해시태그 조회를 병렬로 실행
        const [result, popularHashtags] = await Promise.all([
            getRecentPostsAction(),
            getHashtagsWithCountAction(15), // 상위 15개 해시태그
        ]);
        const posts = result.posts;

        return (
            <div className="bg-background min-h-screen">
                {/* 전체 레이아웃 컨테이너 */}
                <div className="relative mx-auto max-w-7xl px-4 py-8">
                    {/* 헤더 - 전체 너비 */}
                    <div className="mb-12 text-center">
                        <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                            김영인의 기술 블로그
                        </h1>
                        <p className="mx-auto max-w-2xl text-xl text-gray-600 dark:text-gray-400">
                            개발 과정에서 배운 것들과 경험을 나만의 방식으로
                            정리하여 공유합니다.
                        </p>
                    </div>

                    {/* 메인 레이아웃 */}
                    <div className="relative">
                        {/* 데스크톱: 왼쪽 여백에 고정 사이드바 */}
                        <div className="absolute top-0 left-0 hidden w-64 xl:block">
                            <div className="sticky top-8">
                                <HashtagSidebar
                                    hashtags={popularHashtags}
                                    showCount={true}
                                />
                            </div>
                        </div>

                        {/* 메인 컨텐츠 영역 - 사이드바 공간 확보 */}
                        <div className="mx-auto max-w-4xl xl:mr-auto xl:ml-72">
                            {/* 태블릿 이하: 해시태그 사이드바를 제목 아래에 배치 */}
                            <div className="mb-8 xl:hidden">
                                <HashtagSidebar
                                    hashtags={popularHashtags}
                                    showCount={true}
                                />
                            </div>

                            {/* 글 목록 섹션 */}
                            <div className="mb-8 flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    최신 글
                                </h2>
                                <Button asChild variant="outline">
                                    <Link
                                        href="/posts"
                                        className="flex items-center gap-2"
                                    >
                                        모든 글 보기
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>

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
                                    {posts.map((post, index) => (
                                        <PostCard
                                            key={post.id}
                                            post={post}
                                            priority={index < 3}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error('홈페이지 로딩 실패:', error);
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
