import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import {
    authQueryKeys,
    commentsQueryKey,
    postsListQueryKey,
    postsQueryKey,
    likeStatusQueryKey,
    searchResultsQueryKey,
    searchQueryKey,
} from '../queries';
import { invalidateClientQueriesForEvent } from '../query-invalidation';

describe('invalidateClientQueriesForEvent', () => {
    it('게시글 목록과 검색 Query만 무효화한다', async () => {
        const queryClient = new QueryClient();

        const postsKey = postsListQueryKey('latest');
        const searchKey = searchResultsQueryKey('next');

        queryClient.setQueryData(postsKey, []);
        queryClient.setQueryData(searchKey, []);
        queryClient.setQueryData(authQueryKeys.all, {});

        await invalidateClientQueriesForEvent(queryClient, {
            type: 'like-toggled',
            postId: 42,
        });

        expect(queryClient.getQueryState(postsKey)?.isInvalidated).toBe(true);
        expect(queryClient.getQueryState(searchKey)?.isInvalidated).toBe(true);
        expect(postsKey[0]).toBe(postsQueryKey[0]);
        expect(searchKey[0]).toBe(searchQueryKey[0]);

        expect(
            queryClient.getQueryState(authQueryKeys.all)?.isInvalidated
        ).not.toBe(true);
    });
    it('댓글 이벤트는 관련 댓글·목록·검색 Query만 무효화한다', async () => {
        const queryClient = new QueryClient();
        const targetCommentsKey = commentsQueryKey(42);
        const otherCommentsKey = commentsQueryKey(7);
        const likeStatusKey = likeStatusQueryKey(42, 'user-1');

        queryClient.setQueryData(targetCommentsKey, []);
        queryClient.setQueryData(otherCommentsKey, []);
        queryClient.setQueryData(postsListQueryKey('latest'), []);
        queryClient.setQueryData(searchResultsQueryKey('next'), []);
        queryClient.setQueryData(authQueryKeys.all, {});
        queryClient.setQueryData(likeStatusKey, {});

        await invalidateClientQueriesForEvent(queryClient, {
            type: 'comment-created',
            postId: 42,
        });

        expect(
            queryClient.getQueryState(targetCommentsKey)?.isInvalidated
        ).toBe(true);
        expect(
            queryClient.getQueryState(postsListQueryKey('latest'))
                ?.isInvalidated
        ).toBe(true);
        expect(
            queryClient.getQueryState(searchResultsQueryKey('next'))
                ?.isInvalidated
        ).toBe(true);
        expect(
            queryClient.getQueryState(otherCommentsKey)?.isInvalidated
        ).not.toBe(true);
        expect(
            queryClient.getQueryState(authQueryKeys.all)?.isInvalidated
        ).not.toBe(true);
        expect(
            queryClient.getQueryState(likeStatusKey)?.isInvalidated
        ).not.toBe(true);
    });
});
