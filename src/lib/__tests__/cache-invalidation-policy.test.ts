import { describe, expect, it } from 'vitest';
import { getCacheInvalidationPlan } from '../cache-invalidation-policy';

describe('cache invalidation policy', () => {
    it('댓글 생성 이벤트의 서버·클라이언트 무효화 계획을 반환한다', () => {
        expect(
            getCacheInvalidationPlan({
                type: 'comment-created',
                postId: 42,
            })
        ).toEqual({
            server: {
                tags: ['comments-42', 'post-42', 'posts'],
                paths: ['/posts/42', '/posts', '/'],
            },
            client: {
                scopes: [
                    { type: 'comments', postId: 42 },
                    { type: 'post-lists' },
                    { type: 'search' },
                ],
            },
        });
    });

    it('게시글 생성 이벤트는 공용 서버 캐시만 무효화한다', () => {
        expect(getCacheInvalidationPlan({ type: 'post-created' })).toEqual({
            server: {
                tags: ['posts', 'hashtags'],
                paths: ['/posts', '/'],
            },
            client: { scopes: [] },
        });
    });

    it('게시글 수정 이벤트는 상세·목록·해시태그 서버 캐시를 무효화한다', () => {
        expect(
            getCacheInvalidationPlan({ type: 'post-updated', postId: 42 })
        ).toEqual({
            server: {
                tags: ['posts', 'post-42', 'hashtags'],
                paths: ['/admin/posts/42/edit', '/posts/42', '/posts', '/'],
            },
            client: { scopes: [] },
        });
    });

    it('게시글 삭제 이벤트는 상세·목록·해시태그 서버 캐시를 무효화한다', () => {
        expect(
            getCacheInvalidationPlan({ type: 'post-deleted', postId: 42 })
        ).toEqual({
            server: {
                tags: ['posts', 'post-42', 'hashtags'],
                paths: ['/posts', '/'],
            },
            client: { scopes: [] },
        });
    });

    it.each(['comment-updated', 'comment-deleted'] as const)(
        '%s 이벤트는 댓글과 게시글 목록을 함께 무효화한다',
        (type) => {
            expect(getCacheInvalidationPlan({ type, postId: 42 })).toEqual({
                server: {
                    tags: ['comments-42', 'post-42', 'posts'],
                    paths: ['/posts/42', '/posts', '/'],
                },
                client: {
                    scopes: [
                        { type: 'comments', postId: 42 },
                        { type: 'post-lists' },
                        { type: 'search' },
                    ],
                },
            });
        }
    );

    it('좋아요 토글 이벤트는 게시글 집계와 목록·검색을 무효화한다', () => {
        expect(
            getCacheInvalidationPlan({ type: 'like-toggled', postId: 42 })
        ).toEqual({
            server: {
                tags: ['post-42', 'posts'],
                paths: ['/posts/42', '/posts', '/'],
            },
            client: {
                scopes: [{ type: 'post-lists' }, { type: 'search' }],
            },
        });
    });
});
