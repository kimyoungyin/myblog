import { createServiceRoleClient } from '@/utils/supabase/server';

export interface Hashtag {
    id: number;
    name: string;
    created_at: string;
}

export interface HashtagWithCount {
    id: number;
    name: string;
    created_at: string;
    post_count: number;
}

/**
 * 해시태그 생성 (중복 방지)
 */
async function createHashtag(name: string): Promise<Hashtag | null> {
    const normalizedName = name.toLowerCase().trim();

    if (!normalizedName) return null;

    try {
        // Service Role Supabase 클라이언트 생성 (RLS 우회)
        const supabase = createServiceRoleClient();

        // 먼저 기존 해시태그가 있는지 확인
        const { data: existing } = await supabase
            .from('hashtags')
            .select('id, name, created_at')
            .eq('name', normalizedName)
            .single();

        if (existing) {
            return existing;
        }

        // 새 해시태그 생성 시도
        const { data, error } = await supabase
            .from('hashtags')
            .insert([{ name: normalizedName }])
            .select('id, name, created_at')
            .single();

        if (error) {
            console.error('해시태그 생성 오류:', error);
            return null;
        }

        return data;
    } catch {
        return null;
    }
}

/**
 * 여러 해시태그 일괄 생성
 */
export async function createHashtags(names: string[]): Promise<Hashtag[]> {
    const normalizedNames = names
        .map((name) => name.toLowerCase().trim())
        .filter((name) => name.length > 0);

    if (normalizedNames.length === 0) return [];

    try {
        // 각 해시태그를 createHashtag로 개별 생성
        const hashtagPromises = normalizedNames.map((name) =>
            createHashtag(name)
        );
        const results = await Promise.all(hashtagPromises);

        // null 값 제거하고 유효한 해시태그만 반환
        return results.filter(
            (hashtag): hashtag is Hashtag => hashtag !== null
        );
    } catch (error) {
        console.error('해시태그 일괄 생성 오류:', error);
        return [];
    }
}

/**
 * 해시태그 목록을 글 개수와 함께 조회 (글 개수 내림차순 정렬)
 * 관계 오류를 피하기 위해 별도 쿼리로 구현
 */
export async function getHashtagsWithCount(
    limit: number = 20
): Promise<HashtagWithCount[]> {
    try {
        const supabase = createServiceRoleClient();

        // 1단계: 모든 해시태그 조회
        const { data: hashtags, error: hashtagsError } = await supabase
            .from('hashtags')
            .select('id, name, created_at')
            .order('name', { ascending: true });

        if (hashtagsError) {
            console.error('해시태그 목록 조회 오류:', hashtagsError);
            return [];
        }

        if (!hashtags || hashtags.length === 0) {
            return [];
        }

        // 2단계: 각 해시태그별 글 개수 조회
        const hashtagIds = hashtags.map((h) => h.id);
        const { data: postCounts, error: countError } = await supabase
            .from('post_hashtags')
            .select('hashtag_id')
            .in('hashtag_id', hashtagIds);

        if (countError) {
            console.error('해시태그 글 개수 조회 오류:', countError);
            return [];
        }

        // 3단계: 해시태그별 글 개수 집계
        const countMap = new Map<number, number>();
        (postCounts || []).forEach((pc) => {
            const current = countMap.get(pc.hashtag_id) || 0;
            countMap.set(pc.hashtag_id, current + 1);
        });

        // 4단계: 결과 조합 및 정렬
        const hashtagsWithCount = hashtags
            .map((hashtag) => ({
                id: hashtag.id,
                name: hashtag.name,
                created_at: hashtag.created_at,
                post_count: countMap.get(hashtag.id) || 0,
            }))
            .sort((a, b) => {
                // 글 개수 내림차순, 같으면 이름 오름차순
                if (b.post_count !== a.post_count) {
                    return b.post_count - a.post_count;
                }
                return a.name.localeCompare(b.name);
            })
            .slice(0, limit); // 상위 limit개만 반환

        return hashtagsWithCount;
    } catch (error) {
        console.error('해시태그 목록 조회 중 예외 발생:', error);
        return [];
    }
}

/**
 * 해시태그 ID로 해시태그 정보 조회
 */
export async function getHashtagById(id: number): Promise<Hashtag | null> {
    try {
        const supabase = createServiceRoleClient();

        const { data, error } = await supabase
            .from('hashtags')
            .select('id, name, created_at')
            .eq('id', id)
            .single();

        if (error) {
            console.error('해시태그 조회 오류:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('해시태그 조회 중 예외 발생:', error);
        return null;
    }
}
