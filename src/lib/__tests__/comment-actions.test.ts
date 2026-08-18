import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServiceRoleClientMock } = vi.hoisted(() => ({
    createServiceRoleClientMock: vi.fn(),
}));

vi.mock('@/utils/supabase/server', () => ({
    createServiceRoleClient: createServiceRoleClientMock,
}));

import { deleteComment } from '../comments';

describe('deleteComment', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        const query = {
            delete: vi.fn(() => query),
            eq: vi.fn(() => query),
            select: vi.fn(() => query),
            single: vi
                .fn()
                .mockResolvedValue({ data: { post_id: 42 }, error: null }),
        };

        createServiceRoleClientMock.mockReturnValue({
            from: vi.fn(() => query),
            rpc: vi.fn().mockResolvedValue({ error: null }),
        });
    });

    it('삭제 전에 확인한 게시글 ID를 반환한다', async () => {
        await expect(deleteComment(7, 'author-1')).resolves.toBe(42);
    });
});
