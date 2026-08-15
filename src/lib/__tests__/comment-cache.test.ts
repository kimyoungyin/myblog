import { describe, expect, it } from 'vitest';
import {
    appendComment,
    removeCommentTree,
    updateCommentContent,
} from '../comment-cache';
import { commentsQueryKey } from '../queries';
import { invalidateClientQueriesForEvent } from '../query-invalidation';
import { QueryClient } from '@tanstack/react-query';
import type { Comment } from '@/types';

function makeComment(id: number, parentId?: number): Comment {
    return {
        id,
        content: `comment-${id}`,
        post_id: 42,
        author_id: `author-${id}`,
        parent_id: parentId,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
    };
}

describe('comment cache updates', () => {
    it('댓글을 목록 끝에 추가한다', () => {
        const existing = [makeComment(1)];
        const next = makeComment(2, 1);

        expect(appendComment(existing, next)).toEqual([...existing, next]);
    });

    it('댓글 내용과 수정 시간을 갱신한다', () => {
        const existing = [makeComment(1)];

        expect(
            updateCommentContent(
                existing,
                1,
                'updated',
                '2026-01-02T00:00:00.000Z'
            )
        ).toEqual([
            {
                ...existing[0],
                content: 'updated',
                updated_at: '2026-01-02T00:00:00.000Z',
            },
        ]);
    });

    it('댓글과 모든 하위 답글을 제거한다', () => {
        const existing = [
            makeComment(1),
            makeComment(2, 1),
            makeComment(3, 2),
            makeComment(4),
        ];

        expect(removeCommentTree(existing, 1)).toEqual([existing[3]]);
    });
});

describe('comment query invalidation', () => {
    it('게시글별 댓글 Query만 댓글 목록으로 무효화한다', async () => {
        const queryClient = new QueryClient();
        const targetKey = commentsQueryKey(42);
        const otherKey = commentsQueryKey(7);

        queryClient.setQueryData(targetKey, []);
        queryClient.setQueryData(otherKey, []);

        await invalidateClientQueriesForEvent(queryClient, {
            type: 'comment-created',
            postId: 42,
        });

        expect(queryClient.getQueryState(targetKey)?.isInvalidated).toBe(true);
        expect(queryClient.getQueryState(otherKey)?.isInvalidated).not.toBe(
            true
        );
    });
});
