import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata } from 'next';
import {
    getPostAction,
    incrementViewCountAction,
    getCommentsAction,
    getLikeStatusAction,
} from '@/lib/actions';
import { MarkdownRenderer } from '@/components/editor/MarkdownRenderer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import ToEditButton from '@/components/ui/toEditButton';
import { AlertTriangle } from 'lucide-react';
import { HashtagLink } from '@/components/ui/hashtag-link';
import { CommentSection } from '@/components/comments/CommentSection';
import { LikeButton } from '@/components/likes/LikeButton';

interface PostPageProps {
    params: Promise<{
        id: string;
    }>;
}

// 동적 메타데이터 생성 함수
export async function generateMetadata(
    { params }: PostPageProps,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const postId = parseInt((await params).id);

    if (isNaN(postId)) {
        return {
            title: '글을 찾을 수 없습니다 | MyBlog',
            description: '요청하신 글을 찾을 수 없습니다.',
        };
    }

    try {
        // 글 데이터 조회 (generateMetadata에서 fetch는 자동으로 메모이제이션됨)
        const post = await getPostAction(postId);

        if (!post) {
            return {
                title: '글을 찾을 수 없습니다 | MyBlog',
                description: '요청하신 글을 찾을 수 없습니다.',
            };
        }

        // 부모 메타데이터에서 기본 이미지 가져오기
        const previousImages = (await parent).openGraph?.images || [];

        // 글 내용에서 첫 200자 추출 (마크다운 제거)
        const contentPreview = post.content_markdown
            .replace(/[#*`_~\[\]()]/g, '') // 마크다운 문법 제거
            .replace(/\n+/g, ' ') // 개행 문자를 공백으로 변환
            .trim()
            .substring(0, 200);

        // 해시태그를 키워드로 변환
        const keywords = post.hashtags?.map((tag) => tag.name) || [];

        // 기본 사이트 URL (환경변수에서 가져오거나 기본값 사용)
        const baseUrl =
            process.env.NEXT_PUBLIC_SITE_URL || 'https://myblog.vercel.app';
        const postUrl = `${baseUrl}/posts/${post.id}`;

        return {
            title: `${post.title} | MyBlog`,
            description:
                contentPreview ||
                '김영인의 기술 블로그에서 공유하는 개발 경험과 지식입니다.',
            keywords: ['개발', '블로그', '기술', '프로그래밍', ...keywords],
            authors: [{ name: '김영인' }],
            creator: '김영인',
            publisher: 'MyBlog',

            // Open Graph 메타데이터
            openGraph: {
                title: post.title,
                description:
                    contentPreview ||
                    '김영인의 기술 블로그에서 공유하는 개발 경험과 지식입니다.',
                url: postUrl,
                siteName: 'MyBlog - 김영인의 기술 블로그',
                locale: 'ko_KR',
                type: 'article',
                publishedTime: post.created_at,
                modifiedTime: post.updated_at,
                authors: ['김영인'],
                tags: keywords,
                images: post.thumbnail_url
                    ? [
                          {
                              url: post.thumbnail_url,
                              width: 1200,
                              height: 630,
                              alt: post.title,
                          },
                          // 카카오톡 최적화를 위한 정사각형 이미지 (권장: 800x800)
                          {
                              url: post.thumbnail_url,
                              width: 800,
                              height: 800,
                              alt: post.title,
                          },
                          ...previousImages,
                      ]
                    : previousImages,
            },

            // Twitter Card 메타데이터
            twitter: {
                card: 'summary_large_image',
                title: post.title,
                description:
                    contentPreview ||
                    '김영인의 기술 블로그에서 공유하는 개발 경험과 지식입니다.',
                creator: '@kimyoungin', // 실제 트위터 핸들로 변경 필요
                images: post.thumbnail_url ? [post.thumbnail_url] : undefined,
            },

            // 카카오톡 및 한국 플랫폼 최적화를 위한 추가 메타데이터
            other: {
                // 카카오톡에서 사용하는 추가 메타태그들
                'og:image:width': '1200',
                'og:image:height': '630',
                'og:rich_attachment': 'true',
                // 네이버 블로그 등에서 활용하는 메타태그
                'article:section': keywords.length > 0 ? keywords[0] : '기술',
                'article:tag': keywords.join(','),
                // 한국어 콘텐츠임을 명시
                'content-language': 'ko',
                language: 'Korean',
            },

            // 추가 메타데이터
            category: 'technology',
            robots: {
                index: true,
                follow: true,
                nocache: false,
                googleBot: {
                    index: true,
                    follow: true,
                    noimageindex: false,
                    'max-video-preview': -1,
                    'max-image-preview': 'large',
                    'max-snippet': -1,
                },
            },

            // 대체 URL (canonical)
            alternates: {
                canonical: postUrl,
            },
        };
    } catch (error) {
        console.error('메타데이터 생성 실패:', error);
        return {
            title: '글을 찾을 수 없습니다 | MyBlog',
            description: '요청하신 글을 찾을 수 없습니다.',
        };
    }
}

export default async function PostPage({ params }: PostPageProps) {
    const postId = parseInt((await params).id);

    if (isNaN(postId)) {
        notFound();
    }

    try {
        // 글, 댓글, 좋아요 상태를 병렬로 조회
        const [post, initialComments, likeStatus] = await Promise.all([
            getPostAction(postId),
            getCommentsAction(postId).catch(() => []), // 댓글 조회 실패해도 글은 표시
            getLikeStatusAction(postId).catch(() => ({
                post_id: postId,
                is_liked: false,
                likes_count: 0,
            })), // 좋아요 상태 조회 실패해도 글은 표시
        ]);

        if (!post) {
            notFound();
        }

        // 조회수 증가 시도 (실패해도 글은 표시)
        let viewCountError = false;
        let viewCountErrorMessage = '';
        try {
            const viewCountResult = await incrementViewCountAction(postId);
            if (!viewCountResult.success) {
                viewCountError = true;
                viewCountErrorMessage = '조회수 증가에 실패했습니다.';
            }
        } catch (error) {
            console.error('조회수 증가 실패:', error);
            viewCountError = true;
            // actions.ts에서 던진 에러 메시지를 그대로 사용
            if (error instanceof Error) {
                viewCountErrorMessage = error.message;
            } else {
                viewCountErrorMessage = '조회수 증가 중 오류가 발생했습니다.';
            }
        }

        return (
            <div className="bg-background min-h-screen">
                <div className="container mx-auto max-w-4xl px-4 py-8">
                    {/* 조회수 증가 실패 경고 */}
                    {viewCountError && (
                        <div className="mb-6 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
                            <p className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                {viewCountErrorMessage} 이는 일시적인 문제일 수
                                있습니다.
                            </p>
                        </div>
                    )}

                    {/* 헤더 */}
                    <div className="mb-6 flex items-center justify-between">
                        <Button
                            variant="outline"
                            asChild
                            className="flex items-center gap-2"
                        >
                            <Link href="/posts">
                                <ArrowLeft className="h-4 w-4" />글 목록으로
                            </Link>
                        </Button>

                        {/* Admin 수정 버튼 */}
                        <ToEditButton postId={postId} />
                    </div>

                    <article className="space-y-6">
                        {/* 글 헤더 */}
                        <div className="space-y-4">
                            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                {post.title}
                            </h1>

                            {/* 메타 정보 */}
                            <div className="flex flex-wrap items-start justify-between gap-4 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex flex-col gap-1">
                                    <span>
                                        작성일: {formatDate(post.created_at)}
                                    </span>
                                    {post.updated_at !== post.created_at && (
                                        <span className="text-xs">
                                            (마지막 수정:{' '}
                                            {formatDate(post.updated_at)})
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    <span>조회수: {post.view_count}</span>
                                    <LikeButton
                                        postId={postId}
                                        initialLikesCount={
                                            likeStatus.likes_count
                                        }
                                        initialIsLiked={likeStatus.is_liked}
                                        size="sm"
                                    />
                                </div>
                            </div>

                            {/* 해시태그 */}
                            {post.hashtags && post.hashtags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {post.hashtags
                                        .sort((a, b) =>
                                            a.name.localeCompare(b.name)
                                        )
                                        .map((hashtag) => (
                                            <HashtagLink
                                                key={hashtag.id}
                                                hashtag={hashtag}
                                            />
                                        ))}
                                </div>
                            )}
                        </div>
                        {/* 글 내용 */}
                        <Card>
                            <CardContent className="pt-6">
                                <MarkdownRenderer
                                    content={post.content_markdown}
                                    className="prose-lg max-w-none"
                                />
                            </CardContent>
                        </Card>

                        {/* 댓글 섹션 */}
                        <CommentSection
                            postId={postId}
                            postAuthorId={undefined} // 글 작성자 ID는 현재 구조에서 사용할 수 없음
                            initialComments={initialComments}
                        />
                    </article>

                    {/* JSON-LD 구조화 데이터 */}
                    <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{
                            __html: JSON.stringify({
                                '@context': 'https://schema.org',
                                '@type': 'BlogPosting',
                                headline: post.title,
                                description: post.content_markdown
                                    .replace(/[#*`_~\[\]()]/g, '')
                                    .replace(/\n+/g, ' ')
                                    .trim()
                                    .substring(0, 200),
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
                                datePublished: post.created_at,
                                dateModified: post.updated_at,
                                image: post.thumbnail_url || undefined,
                                url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://myblog.vercel.app'}/posts/${post.id}`,
                                keywords:
                                    post.hashtags
                                        ?.map((tag) => tag.name)
                                        .join(', ') || '',
                                wordCount:
                                    post.content_markdown.split(/\s+/).length,
                                inLanguage: 'ko-KR',
                                mainEntityOfPage: {
                                    '@type': 'WebPage',
                                    '@id': `${process.env.NEXT_PUBLIC_SITE_URL || 'https://myblog.vercel.app'}/posts/${post.id}`,
                                },
                                interactionStatistic: [
                                    {
                                        '@type': 'InteractionCounter',
                                        interactionType:
                                            'https://schema.org/ReadAction',
                                        userInteractionCount: post.view_count,
                                    },
                                    {
                                        '@type': 'InteractionCounter',
                                        interactionType:
                                            'https://schema.org/LikeAction',
                                        userInteractionCount: post.likes_count,
                                    },
                                    {
                                        '@type': 'InteractionCounter',
                                        interactionType:
                                            'https://schema.org/CommentAction',
                                        userInteractionCount:
                                            post.comments_count,
                                    },
                                ],
                            }),
                        }}
                    />
                </div>
            </div>
        );
    } catch (error) {
        console.error('글 조회 실패:', error);
        notFound();
    }
}
