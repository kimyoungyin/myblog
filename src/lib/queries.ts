import type { QueryKey } from '@tanstack/react-query';
import type { PostSort } from '@/types';

// ---------------------------------------------------------------------------
// Posts list (infinite) - /posts 페이지, prefetch + PostWrapper
// ---------------------------------------------------------------------------

/**
 * 글 목록 infinite query의 queryKey.
 * prefetch(서버)와 useInfiniteQuery(클라이언트)에서 동일 키 보장.
 */
export function postsListQueryKey(
    sort: PostSort,
    tagId?: string
): QueryKey {
    return ['posts', { sort, tag: tagId }];
}

// ---------------------------------------------------------------------------
// Auth - useAuth 세션/프로필, 로그아웃 시 removeQueries
// ---------------------------------------------------------------------------

export const authQueryKeys = {
    /** 로그아웃 시 removeQueries({ queryKey: authQueryKeys.all })용 */
    all: ['auth'] as const,
    session: () => [...authQueryKeys.all, 'session'] as const,
    profile: (userId: string | undefined) =>
        [...authQueryKeys.all, 'profile', userId] as const,
};

// ---------------------------------------------------------------------------
// Search results (infinite) - SearchResultsWrapper
// ---------------------------------------------------------------------------

/**
 * 검색 결과 infinite query의 queryKey.
 * searchQuery + hashtagIds 조합으로 캐시 분리.
 */
export function searchResultsQueryKey(
    searchQuery: string,
    hashtagIds?: number[]
): QueryKey {
    const tag =
        hashtagIds && hashtagIds.length > 0
            ? [...hashtagIds].sort((a, b) => a - b).join(',')
            : undefined;
    return ['search', { q: searchQuery, tag }];
}

// ---------------------------------------------------------------------------
// Likes — LikeButton (세션 기반, Data Cache 미사용)
// ---------------------------------------------------------------------------

/**
 * 글 상세 좋아요 상태. userId로 탭·계정 전환 시 캐시 분리.
 */
export function likeStatusQueryKey(
    postId: number,
    userId: string | undefined
): QueryKey {
    return ['likes', 'status', postId, userId ?? ''];
}
