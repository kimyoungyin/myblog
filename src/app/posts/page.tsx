import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getPostsAction, getHashtagsWithCountAction } from '@/lib/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, X } from 'lucide-react';
import { SortSelector, type SortOption } from '@/components/ui/sort-selector';
import PostWrapper from '@/components/posts/PostWrapper';
import { HashtagSidebar } from '@/components/hashtags/HashtagSidebar';

interface PostsPageProps {
    searchParams: Promise<{
        sort?: string;
        tag?: string;
    }>;
}

// 글 목록 페이지 동적 메타데이터 생성
export async function generateMetadata({
    searchParams,
}: PostsPageProps): Promise<Metadata> {
    const { sort, tag } = await searchParams;

    // 정렬 방식에 따른 제목 생성
    const getSortTitle = (sortType: string) => {
        switch (sortType) {
            case 'popular':
                return '인기 글';
            case 'likes':
                return '좋아요 순';
            case 'oldest':
                return '오래된 글';
            case 'latest':
            default:
                return '최신 글';
        }
    };

    // 해시태그 정보 조회
    let tagInfo = null;
    if (tag?.trim()) {
        const tagId = parseInt(tag.trim(), 10);
        if (!isNaN(tagId) && tagId > 0) {
            try {
                const { getHashtagByIdAction } = await import('@/lib/actions');
                tagInfo = await getHashtagByIdAction(tagId);
            } catch (error) {
                console.error('해시태그 정보 조회 실패:', error);
            }
        }
    }

    // 동적 제목 생성
    const sortTitle = getSortTitle(sort || 'latest');
    const baseTitle = tagInfo ? `#${tagInfo.name} ${sortTitle}` : sortTitle;

    // 동적 설명 생성
    const baseDescription = tagInfo
        ? `${tagInfo.name} 해시태그가 포함된 글들을 ${sortTitle} 순으로 정렬하여 보여줍니다.`
        : `모든 글을 ${sortTitle} 순으로 정렬하여 보여줍니다.`;

    // 키워드 생성
    const keywords = ['블로그', '글 목록', sortTitle];
    if (tagInfo) {
        keywords.push(tagInfo.name, `#${tagInfo.name}`);
    }

    return {
        title: baseTitle,
        description: `${baseDescription} 김영인의 기술 블로그에서 개발 경험과 지식을 공유합니다.`,
        keywords,

        // Open Graph 최적화
        openGraph: {
            title: `${baseTitle} | MyBlog`,
            description: baseDescription,
            url: `/posts${tag ? `?tag=${tag}` : ''}${sort ? `${tag ? '&' : '?'}sort=${sort}` : ''}`,
            type: 'website',
        },

        // Twitter Card 최적화
        twitter: {
            title: `${baseTitle} | MyBlog`,
            description: baseDescription,
        },

        // canonical URL
        alternates: {
            canonical: '/posts',
        },

        // 글 목록 페이지 전용 메타데이터
        other: {
            'page-type': 'blog-list',
            'sort-order': sort || 'latest',
            ...(tagInfo && { 'filtered-hashtag': tagInfo.name }),
        },
    };
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

        // 해시태그 필터 처리 (ID 기반만 허용)
        let activeTagId: number | undefined;
        let activeTagName: string | undefined;

        if (tag?.trim()) {
            const tagParam = tag.trim();
            // 숫자인지 확인 (ID 기반만 허용)
            const tagId = parseInt(tagParam, 10);
            if (!isNaN(tagId) && tagId > 0) {
                // ID 기반 필터링
                activeTagId = tagId;
                // 해시태그 이름 조회 (UI 표시용)
                const { getHashtagByIdAction } = await import('@/lib/actions');
                const hashtagInfo = await getHashtagByIdAction(tagId);
                if (hashtagInfo) {
                    activeTagName = hashtagInfo.name;
                } else {
                    // 존재하지 않는 해시태그 ID인 경우 URL에서 tag 파라미터 제거
                    const { redirect } = await import('next/navigation');
                    const newUrl = new URL(
                        `/posts?sort=${validSortBy}`,
                        'http://localhost'
                    );
                    redirect(newUrl.pathname + newUrl.search);
                }
            } else {
                // 숫자가 아닌 tag 파라미터인 경우 URL에서 제거
                const { redirect } = await import('next/navigation');
                const newUrl = new URL(
                    `/posts?sort=${validSortBy}`,
                    'http://localhost'
                );
                redirect(newUrl.pathname + newUrl.search);
            }
        }

        // 모든 글과 인기 해시태그 조회를 병렬로 실행
        const [result, popularHashtags] = await Promise.all([
            getPostsAction(
                1,
                validSortBy,
                activeTagId ? [activeTagId] : undefined
            ),
            getHashtagsWithCountAction(15), // 상위 15개 해시태그
        ]);
        const posts = result.posts;

        return (
            <div className="bg-background min-h-screen">
                {/* 전체 레이아웃 컨테이너 */}
                <div className="relative mx-auto max-w-7xl px-4 py-8">
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
                                {activeTagName && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground text-sm">
                                            해시태그 필터:
                                        </span>
                                        <span className="bg-accent rounded-full px-3 py-1 text-sm">
                                            #{activeTagName}
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
                                currentTagId={activeTagId?.toString()}
                            />
                        </div>
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
                            {/* 태블릿 이하: 해시태그 사이드바를 헤더 아래에 배치 */}
                            <div className="mb-8 xl:hidden">
                                <HashtagSidebar
                                    hashtags={popularHashtags}
                                    showCount={true}
                                />
                            </div>

                            {/* 글 목록 */}
                            <PostWrapper
                                initialPosts={posts}
                                sort={validSortBy}
                                tagId={activeTagId?.toString() || undefined}
                            />
                        </div>
                    </div>
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
