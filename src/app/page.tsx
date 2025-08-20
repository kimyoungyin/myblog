import React from 'react';
import Link from 'next/link';
import { getRecentPostsAction } from '@/lib/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { PostCard } from '@/components/post-card';

export default async function HomePage() {
    try {
        // 최신 글 10개 조회
        const result = await getRecentPostsAction();
        const posts = result.posts;

        return (
            <div className="bg-background min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    {/* 헤더 */}
                    <div className="mb-12 text-center">
                        <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                            김영인의 기술 블로그
                        </h1>
                        <p className="mx-auto max-w-2xl text-xl text-gray-600 dark:text-gray-400">
                            개발 과정에서 배운 것들과 경험을 나만의 방식으로
                            정리하여 공유합니다.
                        </p>
                    </div>

                    {/* 글 목록 */}
                    <div className="mb-12">
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
