import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
    getRecentPostsAction,
    getHashtagsWithCountAction,
} from '@/lib/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { PostCard } from '@/components/post-card';
import { HashtagSidebar } from '@/components/hashtags/HashtagSidebar';

// 홈페이지 메타데이터
export const metadata: Metadata = {
    title: '홈',
    description:
        '김영인의 기술 블로그입니다. React, Next.js, TypeScript 등 웹 개발 기술과 경험을 공유합니다.',
    keywords: [
        '김영인',
        '기술 블로그',
        '개발 블로그',
        'React',
        'Next.js',
        'TypeScript',
        '웹 개발',
        '프론트엔드',
        '풀스택',
    ],

    // Open Graph 홈페이지 최적화
    openGraph: {
        title: '김영인의 기술 블로그',
        description:
            'React, Next.js, TypeScript 등 웹 개발 기술과 경험을 공유하는 블로그입니다.',
        url: '/',
        type: 'website',
    },

    // Twitter Card 홈페이지 최적화
    twitter: {
        title: '김영인의 기술 블로그',
        description:
            'React, Next.js, TypeScript 등 웹 개발 기술과 경험을 공유하는 블로그입니다.',
    },

    // 홈페이지 전용 추가 메타데이터
    other: {
        // 홈페이지임을 명시
        'page-type': 'homepage',
        // 최신 글 정보 제공
        'content-type': 'blog-homepage',
    },
};

export default async function HomePage() {
    // 최신 글 10개와 인기 해시태그 조회를 병렬로 실행
    const [result, popularHashtags] = await Promise.all([
        getRecentPostsAction(),
        getHashtagsWithCountAction(15), // 상위 15개 해시태그
    ]);
    const posts = result.posts;

    return (
        <div className="bg-background">
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

                {/* JSON-LD WebSite 스키마 */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'WebSite',
                            name: 'MyBlog - 김영인의 기술 블로그',
                            alternateName: '김영인의 기술 블로그',
                            url:
                                process.env.NEXT_PUBLIC_SITE_URL ||
                                'https://myblog.vercel.app',
                            description:
                                '개발 과정에서 배운 것들과 경험을 나만의 방식으로 정리하여 공유하는 기술 블로그입니다.',
                            inLanguage: 'ko-KR',
                            author: {
                                '@type': 'Person',
                                name: '김영인',
                                url:
                                    process.env.NEXT_PUBLIC_SITE_URL ||
                                    'https://myblog.vercel.app',
                            },
                            publisher: {
                                '@type': 'Organization',
                                name: 'MyBlog',
                                url:
                                    process.env.NEXT_PUBLIC_SITE_URL ||
                                    'https://myblog.vercel.app',
                            },
                            potentialAction: {
                                '@type': 'SearchAction',
                                target: {
                                    '@type': 'EntryPoint',
                                    urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://myblog.vercel.app'}/search?q={search_term_string}`,
                                },
                                'query-input':
                                    'required name=search_term_string',
                            },
                            mainEntity: {
                                '@type': 'Blog',
                                name: '김영인의 기술 블로그',
                                description:
                                    'React, Next.js, TypeScript 등 웹 개발 기술과 경험을 공유하는 블로그',
                                author: {
                                    '@type': 'Person',
                                    name: '김영인',
                                },
                                blogPost: posts.map((post) => ({
                                    '@type': 'BlogPosting',
                                    headline: post.title,
                                    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://myblog.vercel.app'}/posts/${post.id}`,
                                    datePublished: post.created_at,
                                    dateModified: post.updated_at,
                                    author: {
                                        '@type': 'Person',
                                        name: '김영인',
                                    },
                                    image: post.thumbnail_url || undefined,
                                    keywords:
                                        post.hashtags
                                            ?.map((tag) => tag.name)
                                            .join(', ') || '',
                                })),
                            },
                        }).replace(/</g, '\\u003c'),
                    }}
                />
            </div>
        </div>
    );
}
