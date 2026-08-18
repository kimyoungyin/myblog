import type { Comment } from '@/types';

export function appendComment(
    comments: Comment[],
    comment: Comment
): Comment[] {
    return [...comments, comment];
}

export function updateCommentContent(
    comments: Comment[],
    commentId: number,
    content: string,
    updatedAt = new Date().toISOString()
): Comment[] {
    return comments.map((comment) =>
        comment.id === commentId
            ? { ...comment, content, updated_at: updatedAt }
            : comment
    );
}

export function removeCommentTree(
    comments: Comment[],
    commentId: number
): Comment[] {
    const removedIds = new Set([commentId]);

    let foundChild = true;
    while (foundChild) {
        foundChild = false;

        for (const comment of comments) {
            if (comment.parent_id && removedIds.has(comment.parent_id)) {
                if (!removedIds.has(comment.id)) {
                    removedIds.add(comment.id);
                    foundChild = true;
                }
            }
        }
    }

    return comments.filter((comment) => !removedIds.has(comment.id));
}
