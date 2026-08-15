import { beforeEach, describe, expect, it, vi } from 'vitest';
import { revalidatePath, revalidateTag } from 'next/cache';
import { applyServerInvalidation } from '../server-cache-invalidation';
import type { CacheInvalidationEvent } from '../cache-invalidation-policy';

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
}));

describe('server cache invalidation adapter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('경로를 먼저, 태그를 나중에 무효화한다', () => {
        applyServerInvalidation({
            type: 'comment-created',
            postId: 42,
        });

        expect(vi.mocked(revalidatePath).mock.calls).toEqual([
            ['/posts/42'],
            ['/posts'],
            ['/'],
        ]);
        expect(vi.mocked(revalidateTag).mock.calls).toEqual([
            ['comments-42'],
            ['post-42'],
            ['posts'],
        ]);
        expect(
            vi.mocked(revalidatePath).mock.invocationCallOrder[0]
        ).toBeLessThan(vi.mocked(revalidateTag).mock.invocationCallOrder[0]);
    });

    it.each([
        {
            name: '게시글 생성',
            event: { type: 'post-created' },
            paths: ['/posts', '/'],
            tags: ['posts', 'hashtags'],
        },
        {
            name: '게시글 수정',
            event: { type: 'post-updated', postId: 42 },
            paths: ['/admin/posts/42/edit', '/posts/42', '/posts', '/'],
            tags: ['posts', 'post-42', 'hashtags'],
        },
        {
            name: '게시글 삭제',
            event: { type: 'post-deleted', postId: 42 },
            paths: ['/posts', '/'],
            tags: ['posts', 'post-42', 'hashtags'],
        },
        {
            name: '댓글 생성',
            event: { type: 'comment-created', postId: 42 },
            paths: ['/posts/42', '/posts', '/'],
            tags: ['comments-42', 'post-42', 'posts'],
        },
        {
            name: '댓글 수정',
            event: { type: 'comment-updated', postId: 42 },
            paths: ['/posts/42', '/posts', '/'],
            tags: ['comments-42', 'post-42', 'posts'],
        },
        {
            name: '댓글 삭제',
            event: { type: 'comment-deleted', postId: 42 },
            paths: ['/posts/42', '/posts', '/'],
            tags: ['comments-42', 'post-42', 'posts'],
        },
        {
            name: '좋아요 토글',
            event: { type: 'like-toggled', postId: 42 },
            paths: ['/posts/42', '/posts', '/'],
            tags: ['post-42', 'posts'],
        },
    ] satisfies Array<{
        name: string;
        event: CacheInvalidationEvent;
        paths: string[];
        tags: string[];
    }>)('$name의 모든 path와 tag를 실행한다', ({ event, paths, tags }) => {
        applyServerInvalidation(event);

        expect(vi.mocked(revalidatePath).mock.calls).toEqual(
            paths.map((path) => [path])
        );
        expect(vi.mocked(revalidateTag).mock.calls).toEqual(
            tags.map((tag) => [tag])
        );
    });
});
