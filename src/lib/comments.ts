import { createServiceRoleClient } from '@/utils/supabase/server';
import { Comment, User } from '@/types';
import { CreateCommentData, UpdateCommentData } from './schemas';

// Supabase 조인 결과 타입 정의
interface CommentWithAuthor {
    id: number;
    content: string;
    post_id: number;
    author_id: string;
    parent_id: number | null;
    created_at: string;
    updated_at: string;
    author: User | User[] | null;
}

// Author 타입을 안전하게 변환하는 유틸리티 함수
function extractAuthor(author: User | User[] | null): User {
    if (Array.isArray(author) && author.length > 0) {
        return author[0];
    }
    if (author && !Array.isArray(author)) {
        return author;
    }
    // 기본값 반환 (이런 경우는 실제로 발생하지 않아야 함)
    return {
        id: '',
        email: '',
        full_name: undefined,
        avatar_url: undefined,
        is_admin: false,
        created_at: '',
        updated_at: '',
    };
}

// CommentWithAuthor를 Comment로 변환하는 함수
function convertToComment(commentData: CommentWithAuthor): Comment {
    return {
        id: commentData.id,
        content: commentData.content,
        post_id: commentData.post_id,
        author_id: commentData.author_id,
        parent_id: commentData.parent_id || undefined,
        created_at: commentData.created_at,
        updated_at: commentData.updated_at,
        author: extractAuthor(commentData.author),
    };
}

/**
 * 특정 글의 댓글 목록 조회 (계층 구조 포함)
 */
export async function getComments(postId: number): Promise<Comment[]> {
    try {
        const supabase = createServiceRoleClient();

        // 댓글과 작성자 정보를 함께 조회
        const { data, error } = await supabase
            .from('comments')
            .select(
                `
                id,
                content,
                post_id,
                author_id,
                parent_id,
                created_at,
                updated_at,
                author:profiles(
                    id,
                    email,
                    full_name,
                    avatar_url,
                    is_admin
                )
            `
            )
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) {
            throw new Error(`댓글 조회 실패: ${error.message}`);
        }

        // 계층 구조로 정렬 (부모 댓글 -> 대댓글 순)
        const comments = (data || []) as CommentWithAuthor[];
        const parentComments = comments.filter(
            (comment: CommentWithAuthor) => !comment.parent_id
        );
        const childComments = comments.filter(
            (comment: CommentWithAuthor) => comment.parent_id
        );

        // 부모 댓글에 대댓글 연결
        const result: Comment[] = [];
        for (const parent of parentComments) {
            // 타입 안전한 변환
            const parentComment = convertToComment(parent);
            result.push(parentComment);

            // 해당 부모의 대댓글들을 바로 뒤에 추가
            const children = childComments.filter(
                (child: CommentWithAuthor) => child.parent_id === parent.id
            );

            for (const child of children) {
                const childComment = convertToComment(child);
                result.push(childComment);
            }
        }

        return result;
    } catch (error) {
        console.error('댓글 조회 중 오류:', error);
        throw error;
    }
}

/**
 * 댓글 생성
 */
export async function createComment(
    data: CreateCommentData,
    authorId: string
): Promise<Comment> {
    try {
        const supabase = createServiceRoleClient();

        // 대댓글의 경우 부모 댓글이 존재하는지 확인
        if (data.parent_id) {
            const { data: parentComment, error: parentError } = await supabase
                .from('comments')
                .select('id, parent_id, post_id')
                .eq('id', data.parent_id)
                .eq('post_id', data.post_id)
                .single();

            if (parentError || !parentComment) {
                throw new Error('부모 댓글을 찾을 수 없습니다.');
            }

            // 대댓글의 대댓글인 경우 부모 댓글의 parent_id를 사용
            if (parentComment.parent_id) {
                data.parent_id = parentComment.parent_id;
            }
        }

        // 댓글 생성
        const { data: newComment, error } = await supabase
            .from('comments')
            .insert({
                content: data.content,
                post_id: data.post_id,
                author_id: authorId,
                parent_id: data.parent_id || null,
            })
            .select(
                `
                id,
                content,
                post_id,
                author_id,
                parent_id,
                created_at,
                updated_at,
                author:profiles(
                    id,
                    email,
                    full_name,
                    avatar_url,
                    is_admin
                )
            `
            )
            .single();

        if (error) {
            throw new Error(`댓글 생성 실패: ${error.message}`);
        }

        // 타입 안전하게 변환
        const commentWithAuthor = newComment as CommentWithAuthor;
        const comment = convertToComment(commentWithAuthor);

        return comment;
    } catch (error) {
        console.error('댓글 생성 중 오류:', error);
        throw error;
    }
}

/**
 * 댓글 수정
 */
export async function updateComment(
    commentId: number,
    data: UpdateCommentData,
    authorId: string
): Promise<Comment> {
    try {
        const supabase = createServiceRoleClient();

        // 댓글 수정 (작성자만 가능)
        const { data: updatedComment, error } = await supabase
            .from('comments')
            .update({
                content: data.content,
                updated_at: new Date().toISOString(),
            })
            .eq('id', commentId)
            .eq('author_id', authorId) // 작성자만 수정 가능
            .select(
                `
                id,
                content,
                post_id,
                author_id,
                parent_id,
                created_at,
                updated_at,
                author:profiles(
                    id,
                    email,
                    full_name,
                    avatar_url,
                    is_admin
                )
            `
            )
            .single();

        if (error) {
            throw new Error(`댓글 수정 실패: ${error.message}`);
        }

        if (!updatedComment) {
            throw new Error('댓글을 수정할 권한이 없습니다.');
        }

        // 타입 안전하게 변환
        const commentWithAuthor = updatedComment as CommentWithAuthor;
        const comment = convertToComment(commentWithAuthor);

        return comment;
    } catch (error) {
        console.error('댓글 수정 중 오류:', error);
        throw error;
    }
}

/**
 * 댓글 삭제
 */
export async function deleteComment(
    commentId: number,
    authorId: string
): Promise<void> {
    try {
        const supabase = createServiceRoleClient();

        // 댓글 삭제 (작성자만 가능)
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId)
            .eq('author_id', authorId); // 작성자만 삭제 가능

        if (error) {
            throw new Error(`댓글 삭제 실패: ${error.message}`);
        }
    } catch (error) {
        console.error('댓글 삭제 중 오류:', error);
        throw error;
    }
}

/**
 * 특정 글의 댓글 수 조회
 */
export async function getCommentsCount(postId: number): Promise<number> {
    try {
        const supabase = createServiceRoleClient();

        const { count, error } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);

        if (error) {
            throw new Error(`댓글 수 조회 실패: ${error.message}`);
        }

        return count || 0;
    } catch (error) {
        console.error('댓글 수 조회 중 오류:', error);
        throw error;
    }
}
