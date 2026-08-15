import { revalidatePath, revalidateTag } from 'next/cache';
import {
    getCacheInvalidationPlan,
    type CacheInvalidationEvent,
} from './cache-invalidation-policy';

export function applyServerInvalidation(event: CacheInvalidationEvent): void {
    const { server } = getCacheInvalidationPlan(event);

    for (const path of server.paths) {
        revalidatePath(path);
    }

    for (const tag of server.tags) {
        revalidateTag(tag);
    }
}
