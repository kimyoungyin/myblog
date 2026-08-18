import { CACHE_TAGS } from './cache-tags';

export type CacheInvalidationEvent =
    | { type: 'post-created' }
    | { type: 'post-updated'; postId: number }
    | { type: 'post-deleted'; postId: number }
    | { type: 'comment-created'; postId: number }
    | { type: 'comment-updated'; postId: number }
    | { type: 'comment-deleted'; postId: number }
    | { type: 'like-toggled'; postId: number };

export type ClientInvalidationScope =
    | { type: 'post-lists' }
    | { type: 'search' }
    | { type: 'comments'; postId: number };

export type CacheInvalidationPlan = {
    server: {
        tags: string[];
        paths: string[];
    };
    client: {
        scopes: ClientInvalidationScope[];
    };
};

export function getCacheInvalidationPlan(
    event: CacheInvalidationEvent
): CacheInvalidationPlan {
    switch (event.type) {
        case 'post-created':
            return {
                server: {
                    tags: [CACHE_TAGS.posts, CACHE_TAGS.hashtags],
                    paths: ['/posts', '/'],
                },
                client: { scopes: [] },
            };
        case 'post-updated':
            return {
                server: {
                    tags: [
                        CACHE_TAGS.posts,
                        CACHE_TAGS.post(event.postId),
                        CACHE_TAGS.hashtags,
                    ],
                    paths: [
                        `/admin/posts/${event.postId}/edit`,
                        `/posts/${event.postId}`,
                        '/posts',
                        '/',
                    ],
                },
                client: { scopes: [] },
            };
        case 'post-deleted':
            return {
                server: {
                    tags: [
                        CACHE_TAGS.posts,
                        CACHE_TAGS.post(event.postId),
                        CACHE_TAGS.hashtags,
                    ],
                    paths: ['/posts', '/'],
                },
                client: { scopes: [] },
            };
        case 'comment-created':
        case 'comment-updated':
        case 'comment-deleted':
            return {
                server: {
                    tags: [
                        CACHE_TAGS.comments(event.postId),
                        CACHE_TAGS.post(event.postId),
                        CACHE_TAGS.posts,
                    ],
                    paths: [`/posts/${event.postId}`, '/posts', '/'],
                },
                client: {
                    scopes: [
                        { type: 'comments', postId: event.postId },
                        { type: 'post-lists' },
                        { type: 'search' },
                    ],
                },
            };
        case 'like-toggled':
            return {
                server: {
                    tags: [CACHE_TAGS.post(event.postId), CACHE_TAGS.posts],
                    paths: [`/posts/${event.postId}`, '/posts', '/'],
                },
                client: {
                    scopes: [{ type: 'post-lists' }, { type: 'search' }],
                },
            };
    }
}
