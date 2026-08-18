import type { QueryClient } from '@tanstack/react-query';
import { commentsQueryKey, postsQueryKey, searchQueryKey } from './queries';
import {
    getCacheInvalidationPlan,
    type CacheInvalidationEvent,
    type ClientInvalidationScope,
} from './cache-invalidation-policy';

async function invalidateScope(
    queryClient: QueryClient,
    scope: ClientInvalidationScope
): Promise<void> {
    switch (scope.type) {
        case 'post-lists':
            await queryClient.invalidateQueries({ queryKey: postsQueryKey });
            return;
        case 'search':
            await queryClient.invalidateQueries({ queryKey: searchQueryKey });
            return;
        case 'comments':
            await queryClient.invalidateQueries({
                queryKey: commentsQueryKey(scope.postId),
            });
            return;
    }
}

export async function invalidateClientQueriesForEvent(
    queryClient: QueryClient,
    event: CacheInvalidationEvent
): Promise<void> {
    const { client } = getCacheInvalidationPlan(event);

    await Promise.all(
        client.scopes.map((scope) => invalidateScope(queryClient, scope))
    );
}
