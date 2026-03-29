/**
 * Next.js Data Cache `revalidateTag`와 `unstable_cache`의 tags에 공통으로 사용.
 */
export const CACHE_TAGS = {
    posts: 'posts',
    post: (id: number) => `post-${id}`,
    hashtags: 'hashtags',
    comments: (postId: number) => `comments-${postId}`,
} as const;
