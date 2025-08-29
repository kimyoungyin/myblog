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
 */
export async function getHashtagsWithCount(
    limit: number = 20
): Promise<HashtagWithCount[]> {
    try {
        const supabase = createServiceRoleClient();

        // Supabase aggregate 함수를 사용하여 해시태그별 글 개수 조회
        const { data, error } = await supabase
            .from('hashtags')
            .select(
                `
                id,
                name,
                created_at,
                post_hashtags(count)
            `
            )
            .order('post_hashtags(count)', { ascending: false })
            .order('name', { ascending: true }) // 2차 정렬: 이름 오름차순
            .limit(limit);

        if (error) {
            console.error('해시태그 목록 조회 오류:', error);
            return [];
        }

        // 결과를 HashtagWithCount 형태로 변환
        const hashtagsWithCount = (data || []).map((hashtag) => ({
            id: hashtag.id,
            name: hashtag.name,
            created_at: hashtag.created_at,
            post_count: hashtag.post_hashtags?.[0]?.count || 0,
        }));

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
