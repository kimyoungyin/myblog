import React from 'react';
import Link from 'next/link';
import { getPostsAction } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Eye, Heart, MessageSquare } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default async function PostsPage() {
    try {
        // 모든 글 조회 (최대 50개)
        const result = await getPostsAction(1, 50);
        const posts = result.posts;

        return (
            <div className="bg-background min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    {/* 헤더 */}
                    <div className="mb-8 flex items-center gap-4">
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
                        <h1 className="text-3xl font-bold">모든 글</h1>
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
                                <Card
                                    key={post.id}
                                    className="group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                                >
                                    <Link href={`/posts/${post.id}`}>
                                        <CardHeader className="pb-3">
                                            {/* 썸네일 */}
                                            {post.thumbnail_url && (
                                                <div className="relative mb-4 h-48 w-full overflow-hidden rounded-lg">
                                                    <img
                                                        src={post.thumbnail_url}
                                                        alt={post.title}
                                                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                                    />
                                                </div>
                                            )}

                                            <CardTitle className="group-hover:text-primary line-clamp-2 text-lg transition-colors">
                                                {post.title}
                                            </CardTitle>
                                        </CardHeader>

                                        <CardContent className="pt-0">
                                            {/* 메타 정보 */}
                                            <div className="text-muted-foreground mb-3 flex items-center gap-4 text-sm">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>
                                                        {formatDate(
                                                            post.created_at
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Eye className="h-3 w-3" />
                                                    <span>
                                                        {post.view_count}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Heart className="h-3 w-3" />
                                                    <span>
                                                        {post.likes_count}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MessageSquare className="h-3 w-3" />
                                                    <span>
                                                        {post.comments_count}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* 해시태그 */}
                                            {post.hashtags &&
                                                post.hashtags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {post.hashtags
                                                            .slice(0, 3)
                                                            .map((hashtag) => (
                                                                <Badge
                                                                    key={
                                                                        hashtag.id
                                                                    }
                                                                    variant="secondary"
                                                                    className="text-xs"
                                                                >
                                                                    #
                                                                    {
                                                                        hashtag.name
                                                                    }
                                                                </Badge>
                                                            ))}
                                                        {post.hashtags.length >
                                                            3 && (
                                                            <Badge
                                                                variant="outline"
                                                                className="text-xs"
                                                            >
                                                                +
                                                                {post.hashtags
                                                                    .length - 3}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                )}
                                        </CardContent>
                                    </Link>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* 글 개수 표시 */}
                    {posts.length > 0 && (
                        <div className="text-muted-foreground mt-8 text-center">
                            총 {posts.length}개의 글이 있습니다.
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
