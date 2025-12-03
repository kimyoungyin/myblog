# Phase 6 학습정리: 글 목록 및 상세 페이지 시스템

## 개요

Phase 6에서는 **사용자 대면 콘텐츠 소비 시스템**을 구축했습니다. 무한 스크롤 기반의 **글 목록 페이지**와 **상세 페이지**, **조회수 자동 증가 시스템**을 통해 완전한 블로그 읽기 경험을 완성했으며, **정렬 및 필터링 기능**으로 사용자가 원하는 콘텐츠를 쉽게 찾을 수 있는 환경을 구현했습니다.

특히 **React Query의 useInfiniteQuery**를 활용한 성능 최적화된 무한 스크롤과 **PostgreSQL RPC 함수**를 통한 원자적 조회수 증가 시스템을 구축하여, 대용량 콘텐츠 서비스에 적합한 확장 가능한 아키텍처를 완성했습니다.

---

## 핵심 학습 내용

### 1. 무한 스크롤 시스템 구현

#### React Query useInfiniteQuery 활용

```typescript
// src/hooks/useInfinitePosts.ts - 무한 스크롤 훅
import { useInfiniteQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import type { Post, PostSort } from '@/types';

interface UseInfinitePostsOptions {
    sort?: PostSort;
    hashtag?: string;
    limit?: number;
}

interface PostsPage {
    posts: Post[];
    nextCursor: number | null;
    hasMore: boolean;
}

export function useInfinitePosts({
    sort = 'latest',
    hashtag,
    limit = 12,
}: UseInfinitePostsOptions = {}) {
    const supabase = createClient();

    return useInfiniteQuery({
        queryKey: ['posts', 'infinite', { sort, hashtag, limit }],

        queryFn: async ({ pageParam = 0 }): Promise<PostsPage> => {
            let query = supabase
                .from('posts')
                .select(
                    `
                    id,
                    title,
                    content_markdown,
                    thumbnail_url,
                    view_count,
                    likes_count,
                    comments_count,
                    created_at,
                    updated_at,
                    profiles:author_id (
                        full_name,
                        avatar_url
                    ),
                    hashtags:post_hashtags (
                        hashtag:hashtags (
                            id,
                            name
                        )
                    )
                `
                )
                .range(pageParam * limit, (pageParam + 1) * limit - 1);

            // 정렬 적용
            switch (sort) {
                case 'latest':
                    query = query.order('created_at', { ascending: false });
                    break;
                case 'oldest':
                    query = query.order('created_at', { ascending: true });
                    break;
                case 'popular':
                    query = query.order('view_count', { ascending: false });
                    break;
                case 'likes':
                    query = query.order('likes_count', { ascending: false });
                    break;
            }

            // 2차 정렬로 일관성 보장 (React key 중복 방지)
            query = query.order('id', { ascending: false });

            // 해시태그 필터링
            if (hashtag) {
                query = query.contains('hashtags.hashtag.name', [hashtag]);
            }

            const { data, error } = await query;

            if (error) {
                console.error('글 목록 조회 오류:', error);
                throw new Error('글 목록을 불러오는데 실패했습니다.');
            }

            const posts = data || [];
            const hasMore = posts.length === limit;
            const nextCursor = hasMore ? pageParam + 1 : null;

            return {
                posts,
                nextCursor,
                hasMore,
            };
        },

        getNextPageParam: (lastPage) => lastPage.nextCursor,

        staleTime: 5 * 60 * 1000, // 5분간 캐시
        gcTime: 30 * 60 * 1000, // 30분간 메모리 유지

        // 에러 재시도 설정
        retry: (failureCount, error) => {
            if (error.message?.includes('network')) return failureCount < 3;
            return failureCount < 1;
        },

        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });
}
```

**학습한 핵심 개념:**

- **페이지네이션 패턴**: 커서 기반 페이지네이션으로 일관된 데이터 제공
- **쿼리 키 설계**: 정렬, 필터 옵션을 포함한 세밀한 캐시 관리
- **2차 정렬**: `id` 기준 추가 정렬로 React key 중복 방지
- **에러 처리**: 네트워크 오류와 서버 오류 구분하여 재시도 전략 적용

#### Intersection Observer 기반 스크롤 감지

```typescript
// src/components/posts/InfinitePostsList.tsx - 무한 스크롤 컴포넌트
'use client';

import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { PostCard } from './PostCard';
import { PostCardSkeleton } from './PostCardSkeleton';
import { useInfinitePosts } from '@/hooks/useInfinitePosts';
import type { PostSort } from '@/types';

interface InfinitePostsListProps {
    sort?: PostSort;
    hashtag?: string;
    className?: string;
}

export function InfinitePostsList({
    sort = 'latest',
    hashtag,
    className
}: InfinitePostsListProps) {
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        error,
    } = useInfinitePosts({ sort, hashtag });

    // Intersection Observer로 스크롤 감지
    const { ref: loadMoreRef, inView } = useInView({
        threshold: 0.1,
        rootMargin: '100px', // 100px 전에 미리 로드
    });

    // 화면에 보이면 다음 페이지 로드
    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    // 로딩 상태
    if (isLoading) {
        return (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <PostCardSkeleton key={i} />
                ))}
            </div>
        );
    }

    // 에러 상태
    if (isError) {
        return (
            <div className="text-center py-12">
                <div className="text-red-600 mb-4">
                    {error?.message || '글 목록을 불러오는데 실패했습니다.'}
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                    다시 시도
                </button>
            </div>
        );
    }

    // 데이터 없음
    const allPosts = data?.pages.flatMap(page => page.posts) || [];
    if (allPosts.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">
                    {hashtag ? `'${hashtag}' 해시태그의 글이 없습니다.` : '아직 글이 없습니다.'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* 글 목록 그리드 */}
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
                {allPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                ))}
            </div>

            {/* 로딩 트리거 및 상태 표시 */}
            <div ref={loadMoreRef} className="flex justify-center py-8">
                {isFetchingNextPage ? (
                    <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span className="text-muted-foreground">더 많은 글을 불러오는 중...</span>
                    </div>
                ) : hasNextPage ? (
                    <div className="text-muted-foreground">스크롤하여 더 많은 글 보기</div>
                ) : allPosts.length > 0 ? (
                    <div className="text-muted-foreground">모든 글을 불러왔습니다.</div>
                ) : null}
            </div>
        </div>
    );
}
```

**학습 포인트:**

- **Intersection Observer**: 스크롤 이벤트보다 성능이 좋은 뷰포트 감지
- **프리로딩**: `rootMargin`으로 사용자가 도달하기 전에 미리 데이터 로드
- **상태 관리**: 로딩, 에러, 빈 데이터 상태에 대한 적절한 UI 제공
- **성능 최적화**: 불필요한 API 호출 방지를 위한 조건부 실행

### 2. 정렬 및 필터링 시스템

#### 다중 정렬 옵션 구현

```typescript
// src/types/index.ts - 정렬 타입 정의
export type PostSort = 'latest' | 'oldest' | 'popular' | 'likes';

export interface PostSortOption {
    value: PostSort;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}
```

```typescript
// src/components/posts/PostSortSelector.tsx - 정렬 선택기
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, TrendingUp, Heart, Clock } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { PostSort, PostSortOption } from '@/types';

const sortOptions: PostSortOption[] = [
    {
        value: 'latest',
        label: '최신순',
        description: '최근에 작성된 글부터',
        icon: Calendar,
    },
    {
        value: 'popular',
        label: '인기순',
        description: '조회수가 많은 글부터',
        icon: TrendingUp,
    },
    {
        value: 'likes',
        label: '좋아요순',
        description: '좋아요가 많은 글부터',
        icon: Heart,
    },
    {
        value: 'oldest',
        label: '오래된순',
        description: '오래된 글부터',
        icon: Clock,
    },
];

interface PostSortSelectorProps {
    currentSort: PostSort;
    className?: string;
}

export function PostSortSelector({ currentSort, className }: PostSortSelectorProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleSortChange = (newSort: PostSort) => {
        const params = new URLSearchParams(searchParams);

        if (newSort === 'latest') {
            params.delete('sort'); // 기본값은 URL에서 제거
        } else {
            params.set('sort', newSort);
        }

        // 정렬 변경 시 페이지는 1로 리셋
        params.delete('page');

        const newUrl = params.toString() ? `?${params.toString()}` : '';
        router.push(`/posts${newUrl}`);
    };

    const currentOption = sortOptions.find(option => option.value === currentSort);

    return (
        <div className={className}>
            <Select value={currentSort} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue>
                        <div className="flex items-center space-x-2">
                            {currentOption && (
                                <>
                                    <currentOption.icon className="h-4 w-4" />
                                    <span>{currentOption.label}</span>
                                </>
                            )}
                        </div>
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center space-x-2">
                                <option.icon className="h-4 w-4" />
                                <div>
                                    <div className="font-medium">{option.label}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {option.description}
                                    </div>
                                </div>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
```

**학습한 핵심 개념:**

- **URL 상태 관리**: 검색 파라미터를 통한 정렬 상태 유지
- **사용자 경험**: 아이콘과 설명으로 직관적인 정렬 옵션 제공
- **기본값 처리**: 기본 정렬은 URL에서 제거하여 깔끔한 URL 유지
- **상태 동기화**: URL 변경 시 컴포넌트 상태 자동 업데이트

#### 해시태그 필터링 시스템

```typescript
// src/components/posts/HashtagFilter.tsx - 해시태그 필터
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface HashtagFilterProps {
    currentHashtag?: string;
    className?: string;
}

export function HashtagFilter({ currentHashtag, className }: HashtagFilterProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const clearHashtagFilter = () => {
        const params = new URLSearchParams(searchParams);
        params.delete('hashtag');
        params.delete('page'); // 필터 변경 시 페이지 리셋

        const newUrl = params.toString() ? `?${params.toString()}` : '';
        router.push(`/posts${newUrl}`);
    };

    if (!currentHashtag) return null;

    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            <span className="text-sm text-muted-foreground">필터:</span>
            <Badge variant="secondary" className="flex items-center space-x-1">
                <span>#{currentHashtag}</span>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent"
                    onClick={clearHashtagFilter}
                >
                    <X className="h-3 w-3" />
                </Button>
            </Badge>
        </div>
    );
}
```

```typescript
// src/components/posts/HashtagLink.tsx - 재사용 가능한 해시태그 링크
'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface HashtagLinkProps {
    hashtag: string;
    variant?: 'default' | 'secondary' | 'outline';
    className?: string;
}

export function HashtagLink({
    hashtag,
    variant = 'outline',
    className
}: HashtagLinkProps) {
    return (
        <Badge variant={variant} className={className} asChild>
            <Link
                href={`/posts?hashtag=${encodeURIComponent(hashtag)}`}
                className="hover:bg-primary hover:text-primary-foreground transition-colors"
            >
                #{hashtag}
            </Link>
        </Badge>
    );
}
```

**학습 포인트:**

- **재사용성**: 해시태그 링크를 독립적인 컴포넌트로 분리
- **URL 인코딩**: 특수문자가 포함된 해시태그의 안전한 URL 처리
- **필터 상태**: 현재 적용된 필터를 명확하게 표시하고 제거 기능 제공
- **네비게이션**: Link 컴포넌트로 SPA 네비게이션 최적화

### 3. 조회수 자동 증가 시스템

#### PostgreSQL RPC 함수 구현

```sql
-- supabase/migrations/20241220_create_increment_view_count_function.sql
-- 원자적 조회수 증가 함수
CREATE OR REPLACE FUNCTION increment_view_count(post_id INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE posts
    SET
        view_count = view_count + 1,
        updated_at = NOW()
    WHERE id = post_id;

    -- 글이 존재하지 않는 경우에도 에러를 발생시키지 않음
    -- 조회수 증가 실패가 사용자 경험을 해치지 않도록 함
END;
$$;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION increment_view_count(INTEGER) TO anon, authenticated, service_role;
```

#### Server Action 기반 조회수 증가

```typescript
// src/lib/actions.ts - 조회수 증가 Server Action
'use server';

import { createServiceClient } from '@/utils/supabase/service';

export async function incrementViewCountAction(postId: number) {
    try {
        // 입력 검증
        if (!postId || isNaN(postId) || postId <= 0) {
            throw new Error('유효하지 않은 글 ID입니다.');
        }

        // Service Role 클라이언트로 RLS 우회
        const supabase = createServiceClient();

        // PostgreSQL RPC 함수 호출로 원자적 증가
        const { error } = await supabase.rpc('increment_view_count', {
            post_id: postId,
        });

        if (error) {
            console.error('조회수 증가 오류:', error);
            throw new Error('조회수 증가에 실패했습니다.');
        }

        // 성공적으로 증가됨
        return { success: true };
    } catch (error) {
        console.error('조회수 증가 Server Action 오류:', error);

        // 사용자에게는 비파괴적 에러로 처리
        // 조회수 증가 실패가 글 읽기를 방해하지 않음
        return {
            success: false,
            error: error instanceof Error ? error.message : '알 수 없는 오류',
        };
    }
}
```

**학습한 핵심 개념:**

- **원자적 연산**: PostgreSQL 함수로 경쟁 조건(race condition) 방지
- **Service Role**: RLS를 우회하여 비로그인 사용자도 조회수 증가 가능
- **비파괴적 에러**: 조회수 증가 실패가 글 읽기 경험을 방해하지 않음
- **보안 고려**: 서버에서만 실행되는 안전한 데이터 변경

#### 클라이언트 사이드 조회수 증가 처리

```typescript
// src/components/posts/ViewCountTracker.tsx - 조회수 추적 컴포넌트
'use client';

import { useEffect, useState } from 'react';
import { incrementViewCountAction } from '@/lib/actions';

interface ViewCountTrackerProps {
    postId: number;
    className?: string;
}

export function ViewCountTracker({ postId, className }: ViewCountTrackerProps) {
    const [error, setError] = useState<string | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);

    useEffect(() => {
        let mounted = true;

        const incrementViewCount = async () => {
            try {
                const result = await incrementViewCountAction(postId);

                if (!result.success && mounted) {
                    setError(result.error || '조회수 증가에 실패했습니다.');
                }
            } catch (error) {
                if (mounted) {
                    console.error('조회수 증가 오류:', error);
                    setError('조회수 증가에 실패했습니다.');
                }
            }
        };

        // 컴포넌트 마운트 시 한 번만 실행
        incrementViewCount();

        return () => {
            mounted = false;
        };
    }, [postId]);

    const handleRetry = async () => {
        setIsRetrying(true);
        setError(null);

        try {
            const result = await incrementViewCountAction(postId);

            if (!result.success) {
                setError(result.error || '조회수 증가에 실패했습니다.');
            }
        } catch (error) {
            console.error('조회수 재시도 오류:', error);
            setError('조회수 증가에 실패했습니다.');
        } finally {
            setIsRetrying(false);
        }
    };

    // 에러가 있을 때만 UI 표시 (비파괴적)
    if (error) {
        return (
            <div className={`bg-yellow-50 border border-yellow-200 rounded-md p-3 ${className}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="text-yellow-600 text-sm">
                            ⚠️ 조회수 기록에 실패했습니다.
                        </div>
                    </div>
                    <button
                        onClick={handleRetry}
                        disabled={isRetrying}
                        className="text-yellow-600 hover:text-yellow-700 text-sm underline disabled:opacity-50"
                    >
                        {isRetrying ? '재시도 중...' : '재시도'}
                    </button>
                </div>
            </div>
        );
    }

    // 성공 시에는 아무것도 렌더링하지 않음
    return null;
}
```

**학습 포인트:**

- **마운트 시 실행**: 페이지 방문 시 한 번만 조회수 증가
- **메모리 누수 방지**: cleanup 함수로 언마운트된 컴포넌트 상태 업데이트 방지
- **사용자 경험**: 에러 발생 시에만 비파괴적 경고 표시
- **재시도 기능**: 사용자가 수동으로 조회수 증가 재시도 가능

### 4. 글 상세 페이지 구현

#### 서버 컴포넌트 기반 상세 페이지

```typescript
// src/app/posts/[id]/page.tsx - 글 상세 페이지
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Calendar, Eye, Heart, MessageCircle, User } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MarkdownRenderer } from '@/components/editor/MarkdownRenderer';
import { HashtagLink } from '@/components/posts/HashtagLink';
import { ViewCountTracker } from '@/components/posts/ViewCountTracker';
import { getPostAction } from '@/lib/actions';
import { formatDate } from '@/lib/utils';

interface PostPageProps {
    params: { id: string };
}

// 메타데이터 생성 (SEO 최적화)
export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
    try {
        const postId = parseInt(params.id);
        if (isNaN(postId)) return { title: '글을 찾을 수 없습니다' };

        const post = await getPostAction(postId);
        if (!post) return { title: '글을 찾을 수 없습니다' };

        const description = post.content_markdown
            .substring(0, 160)
            .replace(/[#*`]/g, '') // 마크다운 문법 제거
            .trim();

        return {
            title: post.title,
            description,
            openGraph: {
                title: post.title,
                description,
                type: 'article',
                publishedTime: post.created_at,
                modifiedTime: post.updated_at,
                authors: [post.profiles?.full_name || '작성자'],
                images: post.thumbnail_url ? [post.thumbnail_url] : undefined,
            },
            twitter: {
                card: 'summary_large_image',
                title: post.title,
                description,
                images: post.thumbnail_url ? [post.thumbnail_url] : undefined,
            },
        };
    } catch (error) {
        console.error('메타데이터 생성 오류:', error);
        return { title: '글을 찾을 수 없습니다' };
    }
}

export default async function PostPage({ params }: PostPageProps) {
    try {
        const postId = parseInt(params.id);

        if (isNaN(postId)) {
            notFound();
        }

        const post = await getPostAction(postId);

        if (!post) {
            notFound();
        }

        return (
            <article className="container mx-auto max-w-4xl py-8 px-4">
                {/* 조회수 추적 (비파괴적) */}
                <ViewCountTracker postId={post.id} className="mb-4" />

                {/* 글 헤더 */}
                <header className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">
                        {post.title}
                    </h1>

                    {/* 메타 정보 */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <time dateTime={post.created_at}>
                                {formatDate(post.created_at)}
                            </time>
                        </div>

                        <div className="flex items-center space-x-1">
                            <User className="h-4 w-4" />
                            <span>{post.profiles?.full_name || '작성자'}</span>
                        </div>

                        <div className="flex items-center space-x-1">
                            <Eye className="h-4 w-4" />
                            <span>조회 {post.view_count.toLocaleString()}</span>
                        </div>

                        <div className="flex items-center space-x-1">
                            <Heart className="h-4 w-4" />
                            <span>좋아요 {post.likes_count.toLocaleString()}</span>
                        </div>

                        <div className="flex items-center space-x-1">
                            <MessageCircle className="h-4 w-4" />
                            <span>댓글 {post.comments_count.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* 해시태그 */}
                    {post.hashtags && post.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                            {post.hashtags.map((hashtagRelation) => (
                                <HashtagLink
                                    key={hashtagRelation.hashtag.id}
                                    hashtag={hashtagRelation.hashtag.name}
                                />
                            ))}
                        </div>
                    )}
                </header>

                {/* 글 본문 */}
                <Card>
                    <CardContent className="pt-6">
                        <MarkdownRenderer
                            content={post.content_markdown}
                            className="prose-lg"
                        />
                    </CardContent>
                </Card>

                {/* 작성자 정보 */}
                {post.profiles && (
                    <Card className="mt-8">
                        <CardHeader>
                            <div className="flex items-center space-x-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage
                                        src={post.profiles.avatar_url || undefined}
                                        alt={post.profiles.full_name || '작성자'}
                                    />
                                    <AvatarFallback>
                                        {post.profiles.full_name?.charAt(0) || 'A'}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-semibold">
                                        {post.profiles.full_name || '작성자'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        블로그 작성자
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>
                )}
            </article>
        );

    } catch (error) {
        console.error('글 상세 페이지 오류:', error);
        throw error; // error.tsx에서 처리
    }
}
```

**학습한 핵심 개념:**

- **서버 컴포넌트**: 데이터 페칭을 서버에서 처리하여 SEO 최적화
- **메타데이터 생성**: 동적 메타데이터로 소셜 미디어 공유 최적화
- **구조화된 데이터**: 의미론적 HTML로 검색 엔진 최적화
- **에러 처리**: `notFound()`와 `error.tsx`를 활용한 적절한 에러 처리

#### 에러 경계 구현

```typescript
// src/app/posts/[id]/error.tsx - 글 상세 페이지 에러 처리
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function PostError({ error, reset }: ErrorProps) {
    useEffect(() => {
        // 에러 로깅 (실제로는 Sentry 등 에러 추적 서비스 사용)
        console.error('글 상세 페이지 에러:', error);
    }, [error]);

    return (
        <div className="container mx-auto max-w-2xl py-12 px-4">
            <Card>
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <CardTitle>글을 불러올 수 없습니다</CardTitle>
                    <CardDescription>
                        요청하신 글을 불러오는 중 오류가 발생했습니다.
                        잠시 후 다시 시도해 주세요.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={reset} variant="default">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        다시 시도
                    </Button>
                    <Button onClick={() => window.location.href = '/'} variant="outline">
                        <Home className="h-4 w-4 mr-2" />
                        홈으로 가기
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
```

```typescript
// src/app/posts/[id]/not-found.tsx - 404 페이지
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileX, Home, Search } from 'lucide-react';

export default function PostNotFound() {
    return (
        <div className="container mx-auto max-w-2xl py-12 px-4">
            <Card>
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <FileX className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <CardTitle>글을 찾을 수 없습니다</CardTitle>
                    <CardDescription>
                        요청하신 글이 존재하지 않거나 삭제되었을 수 있습니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild>
                        <Link href="/posts">
                            <Search className="h-4 w-4 mr-2" />
                            글 목록 보기
                        </Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/">
                            <Home className="h-4 w-4 mr-2" />
                            홈으로 가기
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
```

**학습 포인트:**

- **에러 경계**: React 에러 경계로 예상치 못한 오류 처리
- **사용자 경험**: 명확한 에러 메시지와 복구 옵션 제공
- **에러 로깅**: 개발자를 위한 상세한 에러 정보 기록
- **네비게이션**: 사용자가 다른 페이지로 쉽게 이동할 수 있는 옵션 제공

---

## 고민했던 부분과 해결책

### 1. 무한 스크롤 vs 페이지네이션

**문제**: 사용자 경험과 성능 사이의 균형점 찾기

**고려한 옵션들**:

1. **전통적인 페이지네이션**:

```typescript
// ❌ 사용자 경험이 단절적
const PostsWithPagination = ({ currentPage, totalPages }) => (
    <div>
        <PostList posts={posts} />
        <Pagination
            current={currentPage}
            total={totalPages}
            onChange={handlePageChange}
        />
    </div>
);
```

2. **무한 스크롤 (선택된 방식)**:

```typescript
// ✅ 자연스러운 사용자 경험
const InfinitePostsList = () => {
    const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
        queryKey: ['posts', 'infinite'],
        queryFn: ({ pageParam = 0 }) => fetchPosts(pageParam),
        getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

    const { ref } = useInView({
        onChange: (inView) => {
            if (inView && hasNextPage) fetchNextPage();
        },
    });
};
```

3. **하이브리드 접근 (향후 고려)**:

```typescript
// 🔮 무한 스크롤 + 페이지 URL
const HybridPagination = () => {
    // URL에 페이지 정보 유지하면서 무한 스크롤 제공
    const [page, setPage] = useState(1);

    useEffect(() => {
        // 페이지 변경 시 해당 위치까지 자동 로드
        loadPagesUpTo(page);
    }, [page]);
};
```

**학습한 내용**:

- **사용자 행동**: 블로그 콘텐츠는 연속적 소비 패턴에 적합
- **성능 고려**: React Query의 페이지 캐싱으로 메모리 효율성 확보
- **SEO 영향**: 무한 스크롤의 SEO 단점을 서버 컴포넌트로 보완

### 2. 조회수 증가 타이밍과 중복 방지

**문제**: 언제, 어떻게 조회수를 증가시킬 것인가?

**고려한 시나리오들**:

1. **페이지 로드 시 즉시 증가 (현재 방식)**:

```typescript
// ✅ 간단하고 직관적
useEffect(() => {
    incrementViewCount(postId);
}, [postId]);
```

2. **스크롤 기반 증가**:

```typescript
// 🤔 복잡하지만 더 정확
const { ref } = useInView({
    threshold: 0.5, // 50% 이상 보일 때
    onChange: (inView) => {
        if (inView && !hasViewed) {
            incrementViewCount(postId);
            setHasViewed(true);
        }
    },
});
```

3. **시간 기반 증가**:

```typescript
// 🤔 사용자 참여도 측정
useEffect(() => {
    const timer = setTimeout(() => {
        incrementViewCount(postId);
    }, 10000); // 10초 후 증가

    return () => clearTimeout(timer);
}, [postId]);
```

**중복 방지 전략**:

```typescript
// 세션 스토리지로 중복 방지
const hasViewedPost = (postId: number): boolean => {
    const viewedPosts = JSON.parse(
        sessionStorage.getItem('viewedPosts') || '[]'
    );
    return viewedPosts.includes(postId);
};

const markPostAsViewed = (postId: number): void => {
    const viewedPosts = JSON.parse(
        sessionStorage.getItem('viewedPosts') || '[]'
    );
    if (!viewedPosts.includes(postId)) {
        viewedPosts.push(postId);
        sessionStorage.setItem('viewedPosts', JSON.stringify(viewedPosts));
    }
};
```

**학습한 내용**:

- **사용자 의도**: 페이지 방문 자체가 조회 의도로 해석 가능
- **중복 방지**: 세션 기반 중복 방지로 새로고침 시 중복 증가 방지
- **성능 고려**: RPC 함수로 데이터베이스 레벨에서 원자적 처리

### 3. React Query 캐시 무효화 전략

**문제**: 글 목록과 상세 페이지 간의 데이터 동기화

**발생 시나리오**:

```typescript
// 1. 글 목록에서 조회수 100인 글 확인
// 2. 글 상세 페이지 방문 → 조회수 101로 증가
// 3. 뒤로가기 → 글 목록에서 여전히 조회수 100 표시 (캐시된 데이터)
```

**해결책**:

```typescript
// 조회수 증가 후 관련 캐시 무효화
const incrementViewCount = async (postId: number) => {
    await incrementViewCountAction(postId);

    // 관련 쿼리 캐시 무효화
    queryClient.invalidateQueries({
        queryKey: ['posts'], // 모든 글 목록 쿼리
    });

    queryClient.invalidateQueries({
        queryKey: ['post', postId], // 해당 글 상세 쿼리
    });
};
```

**최적화된 접근**:

```typescript
// 낙관적 업데이트로 즉시 UI 반영
const incrementViewCountOptimistic = async (postId: number) => {
    // 1. 즉시 UI 업데이트
    queryClient.setQueryData(['post', postId], (old: Post) => ({
        ...old,
        view_count: old.view_count + 1,
    }));

    // 2. 서버 업데이트
    try {
        await incrementViewCountAction(postId);
    } catch (error) {
        // 3. 실패 시 롤백
        queryClient.invalidateQueries({ queryKey: ['post', postId] });
        throw error;
    }
};
```

**학습한 내용**:

- **캐시 일관성**: 관련된 모든 쿼리의 캐시 무효화 필요
- **낙관적 업데이트**: 즉시 UI 반영으로 사용자 경험 향상
- **에러 복구**: 실패 시 캐시 롤백으로 데이터 일관성 유지

### 4. 정렬과 필터링의 URL 상태 관리

**문제**: 복잡한 쿼리 파라미터의 타입 안전한 관리

**초기 구현 (타입 안전성 부족)**:

```typescript
// ❌ 타입 검증 없는 URL 파라미터 처리
const searchParams = useSearchParams();
const sort = searchParams.get('sort'); // string | null
const hashtag = searchParams.get('hashtag'); // string | null
```

**개선된 구현**:

```typescript
// ✅ Zod 스키마로 URL 파라미터 검증
const SearchParamsSchema = z.object({
    sort: z.enum(['latest', 'oldest', 'popular', 'likes']).default('latest'),
    hashtag: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
});

const useValidatedSearchParams = () => {
    const searchParams = useSearchParams();

    const rawParams = {
        sort: searchParams.get('sort'),
        hashtag: searchParams.get('hashtag'),
        page: searchParams.get('page'),
    };

    const validatedParams = SearchParamsSchema.parse(rawParams);
    return validatedParams;
};
```

**URL 업데이트 헬퍼**:

```typescript
// URL 상태 업데이트 유틸리티
const useUpdateSearchParams = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    return useCallback(
        (updates: Partial<SearchParams>) => {
            const params = new URLSearchParams(searchParams);

            Object.entries(updates).forEach(([key, value]) => {
                if (value === undefined || value === null) {
                    params.delete(key);
                } else {
                    params.set(key, String(value));
                }
            });

            const newUrl = params.toString() ? `?${params.toString()}` : '';
            router.push(`/posts${newUrl}`);
        },
        [router, searchParams]
    );
};
```

**학습한 내용**:

- **타입 안전성**: Zod 스키마로 URL 파라미터 검증
- **기본값 처리**: 스키마 레벨에서 기본값 정의
- **URL 정규화**: 기본값은 URL에서 제거하여 깔끔한 URL 유지

---

## 기존 Phase에서 활용한 기술

### Phase 1-5 기반 기술의 확장

#### React Query 고급 패턴 활용

- **Phase 2-4**: 기본 쿼리와 뮤테이션
- **Phase 6**: useInfiniteQuery와 복잡한 캐시 관리
- **확장 내용**: 무한 스크롤, 낙관적 업데이트, 캐시 무효화 전략

#### Server Actions 보안 강화

- **Phase 5**: 관리자 전용 글 작성 기능
- **Phase 6**: 비로그인 사용자도 사용 가능한 조회수 증가
- **확장 내용**: Service Role 클라이언트와 RLS 우회 패턴

#### UI 컴포넌트 재사용성 향상

- **Phase 3-5**: 기본 UI 컴포넌트
- **Phase 6**: 복잡한 상태를 가진 무한 스크롤과 필터링 UI
- **확장 내용**: 스켈레톤 UI, 에러 경계, 상태 기반 조건부 렌더링

#### PostgreSQL 고급 기능 활용

- **Phase 2**: 기본 RLS 정책
- **Phase 6**: RPC 함수와 원자적 연산
- **확장 내용**: 경쟁 조건 방지와 성능 최적화된 데이터베이스 함수

---

## 핵심 의사결정과 그 이유

### 1. 무한 스크롤 vs 페이지네이션

**결정**: 무한 스크롤 구현

**이유**:

- **사용자 경험**: 블로그 콘텐츠의 연속적 소비 패턴에 적합
- **모바일 친화적**: 터치 기반 스크롤 인터페이스에 자연스러움
- **성능**: React Query의 페이지 캐싱으로 효율적인 메모리 관리
- **확장성**: 향후 개인화 추천 시스템 도입 시 유리

### 2. PostgreSQL RPC vs 클라이언트 사이드 업데이트

**결정**: PostgreSQL RPC 함수 사용

**이유**:

- **원자성**: 경쟁 조건 없는 안전한 카운터 증가
- **성능**: 데이터베이스 레벨에서 처리로 네트워크 오버헤드 최소화
- **일관성**: 여러 클라이언트에서 동시 접근 시에도 정확한 카운팅
- **확장성**: 향후 복잡한 비즈니스 로직 추가 시 유연성 확보

### 3. 조회수 증가 타이밍

**결정**: 페이지 로드 시 즉시 증가

**이유**:

- **단순성**: 구현과 디버깅이 간단함
- **일관성**: 모든 사용자에게 동일한 기준 적용
- **성능**: 추가적인 이벤트 리스너나 타이머 불필요
- **사용자 의도**: 페이지 방문 자체가 조회 의도로 해석 가능

### 4. URL 기반 상태 관리

**결정**: 검색 파라미터로 정렬/필터 상태 관리

**이유**:

- **공유 가능성**: URL로 특정 필터/정렬 상태 공유 가능
- **브라우저 호환성**: 뒤로가기/앞으로가기 버튼 지원
- **SEO**: 검색 엔진이 다양한 정렬/필터 상태 인덱싱 가능
- **사용자 경험**: 새로고침 시에도 상태 유지

---

## 성능 및 사용자 경험 고려사항

### 성능 최적화

#### 무한 스크롤 최적화

```typescript
// Intersection Observer 최적화
const { ref } = useInView({
    threshold: 0.1, // 10%만 보여도 트리거
    rootMargin: '100px', // 100px 전에 미리 로드
    triggerOnce: false, // 여러 번 트리거 가능
});

// 디바운싱으로 과도한 API 호출 방지
const debouncedFetchNextPage = useMemo(
    () => debounce(fetchNextPage, 300),
    [fetchNextPage]
);
```

#### 이미지 최적화

```typescript
// Next.js Image 컴포넌트 활용
<Image
    src={post.thumbnail_url}
    alt={post.title}
    width={400}
    height={300}
    className="rounded-lg object-cover"
    loading="lazy" // 지연 로딩
    placeholder="blur" // 블러 플레이스홀더
    blurDataURL="data:image/jpeg;base64,..." // 블러 이미지
/>
```

#### 캐시 전략 최적화

```typescript
// 계층적 캐시 전략
const cacheConfig = {
    // 글 목록: 5분간 신선, 30분간 백그라운드 업데이트
    postsList: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    },
    // 글 상세: 10분간 신선, 1시간간 백그라운드 업데이트
    postDetail: {
        staleTime: 10 * 60 * 1000,
        gcTime: 60 * 60 * 1000,
    },
};
```

### 사용자 경험 향상

#### 로딩 상태 개선

```typescript
// 스켈레톤 UI로 로딩 경험 향상
const PostCardSkeleton = () => (
    <Card>
        <CardHeader>
            <div className="h-6 bg-muted animate-pulse rounded w-3/4 mb-2" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
        </CardHeader>
        <CardContent>
            <div className="space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded w-full" />
                <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
                <div className="h-4 bg-muted animate-pulse rounded w-4/6" />
            </div>
        </CardContent>
    </Card>
);
```

#### 에러 복구 기능

```typescript
// 사용자 친화적 에러 처리
const ErrorBoundary = ({ error, reset }: ErrorBoundaryProps) => (
    <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">문제가 발생했습니다</h2>
        <p className="text-muted-foreground mb-4">
            {getErrorMessage(error)}
        </p>
        <div className="space-x-2">
            <Button onClick={reset}>다시 시도</Button>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
                홈으로 가기
            </Button>
        </div>
    </div>
);
```

#### 접근성 개선

```typescript
// ARIA 속성과 키보드 네비게이션
<button
    onClick={handleLoadMore}
    disabled={isFetchingNextPage}
    aria-label={isFetchingNextPage ? '글을 불러오는 중' : '더 많은 글 불러오기'}
    className="focus:outline-none focus:ring-2 focus:ring-primary"
>
    {isFetchingNextPage ? '로딩 중...' : '더 보기'}
</button>

// 스크린 리더를 위한 상태 안내
<div aria-live="polite" className="sr-only">
    {isFetchingNextPage && '새로운 글을 불러오고 있습니다.'}
    {!hasNextPage && '모든 글을 불러왔습니다.'}
</div>
```

---

## 향후 개선 방향

### 1. 고급 검색 기능

#### 전문 검색 구현

```typescript
// PostgreSQL Full Text Search 활용
const searchPosts = async (query: string) => {
    const { data } = await supabase
        .from('posts')
        .select('*')
        .textSearch('title_content', query, {
            type: 'websearch',
            config: 'korean', // 한국어 검색 최적화
        })
        .order('ts_rank', { ascending: false });

    return data;
};

// 검색 결과 하이라이팅
const highlightSearchTerm = (text: string, query: string) => {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
};
```

#### 고급 필터링

```typescript
// 다중 조건 필터링
interface AdvancedFilters {
    hashtags: string[];
    dateRange: { start: Date; end: Date };
    author: string;
    minViewCount: number;
    hasImages: boolean;
}

const useAdvancedFilters = (filters: AdvancedFilters) => {
    return useQuery({
        queryKey: ['posts', 'advanced', filters],
        queryFn: () => fetchPostsWithFilters(filters),
        enabled: Object.values(filters).some(Boolean),
    });
};
```

### 2. 개인화 추천 시스템

#### 사용자 행동 추적

```typescript
// 사용자 관심사 분석
interface UserInteraction {
    postId: number;
    action: 'view' | 'like' | 'comment' | 'share';
    duration: number; // 체류 시간
    timestamp: Date;
}

const trackUserInteraction = async (interaction: UserInteraction) => {
    await supabase.from('user_interactions').insert(interaction);

    // 실시간 추천 업데이트
    updateRecommendations(interaction.userId);
};
```

#### 콘텐츠 기반 추천

```typescript
// 유사 글 추천 알고리즘
const getSimilarPosts = async (postId: number) => {
    // 1. 현재 글의 해시태그 추출
    const currentPost = await getPost(postId);
    const hashtags = currentPost.hashtags.map((h) => h.name);

    // 2. 유사한 해시태그를 가진 글 검색
    const { data } = await supabase
        .from('posts')
        .select('*, hashtags(*)')
        .neq('id', postId)
        .overlaps('hashtags.name', hashtags)
        .order('created_at', { ascending: false })
        .limit(5);

    return data;
};
```

### 3. 성능 모니터링 및 최적화

#### Core Web Vitals 추적

```typescript
// 성능 메트릭 수집
const trackWebVitals = (metric: Metric) => {
    switch (metric.name) {
        case 'CLS':
        case 'FID':
        case 'FCP':
        case 'LCP':
        case 'TTFB':
            // 성능 데이터를 분석 서비스로 전송
            analytics.track('web-vital', {
                name: metric.name,
                value: metric.value,
                page: window.location.pathname,
            });
            break;
    }
};

// Next.js에서 Web Vitals 추적
export function reportWebVitals(metric: NextWebVitalsMetric) {
    trackWebVitals(metric);
}
```

#### 이미지 최적화 고도화

```typescript
// 적응형 이미지 로딩
const AdaptiveImage = ({ src, alt, ...props }) => {
    const [imageSrc, setImageSrc] = useState(src);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // 네트워크 상태에 따른 이미지 품질 조정
        const connection = navigator.connection;
        if (connection && connection.effectiveType === '2g') {
            setImageSrc(src.replace('/w_800/', '/w_400/')); // 저화질
        }
    }, [src]);

    return (
        <Image
            src={imageSrc}
            alt={alt}
            onLoad={() => setIsLoading(false)}
            className={`transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            {...props}
        />
    );
};
```

### 4. 소셜 기능 확장

#### 공유 기능 고도화

```typescript
// 네이티브 공유 API 활용
const sharePost = async (post: Post) => {
    if (navigator.share) {
        try {
            await navigator.share({
                title: post.title,
                text: post.content_markdown.substring(0, 100),
                url: `${window.location.origin}/posts/${post.id}`,
            });
        } catch (error) {
            // 폴백: 클립보드 복사
            await navigator.clipboard.writeText(
                `${window.location.origin}/posts/${post.id}`
            );
        }
    }
};
```

#### 댓글 시스템 고도화

```typescript
// 실시간 댓글 시스템
const useRealtimeComments = (postId: number) => {
    const [comments, setComments] = useState<Comment[]>([]);

    useEffect(() => {
        const subscription = supabase
            .channel(`post-${postId}-comments`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'comments',
                    filter: `post_id=eq.${postId}`,
                },
                (payload) => {
                    setComments((prev) => [...prev, payload.new as Comment]);
                }
            )
            .subscribe();

        return () => subscription.unsubscribe();
    }, [postId]);

    return comments;
};
```

---

## 결론

Phase 6 글 목록 및 상세 페이지 시스템 구축을 통해 **완전한 블로그 읽기 경험**을 제공하는 사용자 대면 시스템을 완성할 수 있었습니다.

특히 **React Query의 useInfiniteQuery**를 활용한 성능 최적화된 무한 스크롤과 **PostgreSQL RPC 함수**를 통한 원자적 조회수 증가 시스템을 통해 대용량 트래픽에도 안정적으로 동작하는 확장 가능한 아키텍처를 구축했습니다.

**정렬 및 필터링 시스템**과 **URL 기반 상태 관리**를 통해 사용자가 원하는 콘텐츠를 쉽게 찾을 수 있는 환경을 제공했으며, **에러 경계와 스켈레톤 UI**를 통해 견고하고 사용자 친화적인 인터페이스를 완성했습니다.

이러한 경험은 향후 **대규모 콘텐츠 플랫폼 구축**과 **복잡한 상태 관리가 필요한 사용자 인터페이스 설계**에서도 활용할 수 있는 실무 역량이 될 것입니다.

---

## 다음 단계 (Phase 7)

### Phase 7에서 구현할 기능들

#### 1. 좋아요 시스템 구현

- 사용자별 좋아요 상태 관리
- 낙관적 업데이트로 즉시 UI 반영
- PostgreSQL RPC 함수로 원자적 좋아요 토글

#### 2. 댓글 시스템 기본 구조

- 댓글 작성, 수정, 삭제 기능
- 실시간 댓글 업데이트
- 댓글 수 자동 동기화

#### 3. 사용자 상호작용 최적화

- 인증 상태 기반 UI 조건부 렌더링
- 로그인 유도 모달 및 플로우
- 상호작용 피드백 애니메이션

**Phase 6에서 구축한 기반이 Phase 7에서 활용되는 방식:**

- 조회수 시스템 → 좋아요/댓글 수 동기화 패턴 재사용
- 무한 스크롤 → 댓글 목록 페이지네이션 적용
- 에러 처리 → 상호작용 실패 시 적절한 사용자 피드백
- React Query 캐싱 → 좋아요/댓글 상태 실시간 동기화

---

## 참고 자료

### 공식 문서

- [React Query Infinite Queries](https://tanstack.com/query/latest/docs/react/guides/infinite-queries) - 무한 스크롤 구현
- [React Intersection Observer](https://github.com/thebuilder/react-intersection-observer) - 스크롤 감지
- [Next.js Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling) - 에러 경계
- [PostgreSQL Functions](https://www.postgresql.org/docs/current/sql-createfunction.html) - RPC 함수

### 성능 & UX

- [Core Web Vitals](https://web.dev/vitals/) - 웹 성능 메트릭
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) - 뷰포트 감지
- [React Performance](https://react.dev/learn/render-and-commit) - React 렌더링 최적화
- [Web Accessibility](https://www.w3.org/WAI/WCAG21/quickref/) - 접근성 가이드라인

### 데이터베이스 & 백엔드

- [Supabase RPC](https://supabase.com/docs/guides/database/functions) - PostgreSQL 함수 호출
- [PostgreSQL Performance](https://wiki.postgresql.org/wiki/Performance_Optimization) - 데이터베이스 최적화
- [Database Indexing](https://use-the-index-luke.com/) - 인덱스 최적화 가이드

### 사용자 경험

- [Infinite Scroll UX](https://www.nngroup.com/articles/infinite-scrolling/) - 무한 스크롤 UX 가이드
- [Loading States](https://uxdesign.cc/good-to-great-ui-animation-tips-7850805c12e5) - 로딩 상태 UX
- [Error Message Design](https://uxwritinghub.com/error-message-examples/) - 에러 메시지 작성법
