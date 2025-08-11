import { createServiceRoleClient } from '@/lib/supabase-server';

export interface Hashtag {
    id: number;
    name: string;
    created_at: string;
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
            return null;
        }

        return data;
    } catch (error) {
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
        return [];
    }
}
