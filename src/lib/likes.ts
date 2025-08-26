import { createServiceRoleClient } from '@/utils/supabase/server';
import { Like, LikeStatus, ToggleLikeResult } from '@/types';
import { ToggleLikeData } from './schemas';

/**
 * 특정 글의 좋아요 상태를 조회합니다.
 * @param postId - 글 ID
 * @param userId - 사용자 ID (선택적)
 * @returns 좋아요 상태 정보
 */
export async function getLikeStatus(
    postId: number,
    userId?: string
): Promise<LikeStatus> {
    try {
        const supabase = createServiceRoleClient();

        // 글의 총 좋아요 수 조회
        const { count: likesCount, error: countError } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);

        if (countError) {
            throw new Error('좋아요 수 조회에 실패했습니다.');
        }

        let isLiked = false;

        // 사용자가 로그인한 경우 좋아요 여부 확인
        if (userId) {
            const { data: likeData, error: likeError } = await supabase
                .from('likes')
                .select('id')
                .eq('post_id', postId)
                .eq('user_id', userId)
                .single();

            if (likeError && likeError.code !== 'PGRST116') {
                // PGRST116은 "no rows returned" 에러로, 좋아요가 없는 정상적인 상태
                throw new Error('좋아요 상태 조회에 실패했습니다.');
            }

            isLiked = !!likeData;
        }

        return {
            post_id: postId,
            is_liked: isLiked,
            likes_count: likesCount || 0,
        };
    } catch (error) {
        console.error('좋아요 상태 조회 실패:', error);
        throw error;
    }
}

/**
 * 좋아요를 토글합니다 (추가/제거).
 * PostgreSQL RPC 함수를 사용하여 원자적 연산을 보장합니다.
 * @param data - 좋아요 토글 데이터
 * @param userId - 사용자 ID
 * @returns 좋아요 토글 결과
 */
export async function toggleLike(
    data: ToggleLikeData,
    userId: string
): Promise<ToggleLikeResult> {
    const supabase = createServiceRoleClient();
    try {
        // PostgreSQL RPC 함수를 통한 원자적 좋아요 토글
        const { data: result, error } = await supabase.rpc('toggle_like', {
            p_post_id: data.post_id,
            p_user_id: userId,
        });

        if (error) {
            console.error('좋아요 토글 RPC 에러:', error);
            return {
                success: false,
                is_liked: false,
                likes_count: 0,
                error: error.message || '좋아요 처리에 실패했습니다.',
            };
        }

        // RPC 함수가 반환한 JSON 결과 파싱
        if (!result || typeof result !== 'object') {
            return {
                success: false,
                is_liked: false,
                likes_count: 0,
                error: '서버 응답이 올바르지 않습니다.',
            };
        }

        // RPC 함수에서 에러가 반환된 경우
        if (!result.success) {
            return {
                success: false,
                is_liked: false,
                likes_count: 0,
                error: result.error || '좋아요 처리에 실패했습니다.',
            };
        }

        // 성공적인 결과 반환
        return {
            success: true,
            is_liked: result.is_liked,
            likes_count: result.likes_count,
        };
    } catch (error) {
        console.error('좋아요 토글 실패:', error);
        return {
            success: false,
            is_liked: false,
            likes_count: 0,
            error:
                error instanceof Error
                    ? error.message
                    : '알 수 없는 오류가 발생했습니다.',
        };
    }
}

/**
 * 특정 사용자의 좋아요 목록을 조회합니다.
 * @param userId - 사용자 ID
 * @param page - 페이지 번호 (1부터 시작)
 * @param limit - 페이지당 항목 수
 * @returns 좋아요 목록과 총 개수
 */
export async function getUserLikes(
    userId: string,
    page: number = 1,
    limit: number = 10
): Promise<{ likes: Like[]; total: number }> {
    try {
        const supabase = createServiceRoleClient();
        const offset = (page - 1) * limit;

        // 좋아요 목록 조회 (최신순)
        const { data: likes, error: likesError } = await supabase
            .from('likes')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (likesError) {
            throw new Error('좋아요 목록 조회에 실패했습니다.');
        }

        // 총 개수 조회
        const { count: total, error: countError } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (countError) {
            throw new Error('좋아요 개수 조회에 실패했습니다.');
        }

        return {
            likes: likes || [],
            total: total || 0,
        };
    } catch (error) {
        console.error('사용자 좋아요 목록 조회 실패:', error);
        throw error;
    }
}

/**
 * 특정 글의 좋아요 수를 조회합니다.
 * @param postId - 글 ID
 * @returns 좋아요 수
 */
export async function getLikesCount(postId: number): Promise<number> {
    try {
        const supabase = createServiceRoleClient();

        const { count, error } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);

        if (error) {
            throw new Error('좋아요 수 조회에 실패했습니다.');
        }

        return count || 0;
    } catch (error) {
        console.error('좋아요 수 조회 실패:', error);
        throw error;
    }
}
