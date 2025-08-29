/**
 * 데이터베이스 성능 모니터링 및 분석 도구
 * Supabase 공식 문서의 성능 최적화 가이드라인을 기반으로 구현
 */

import { createServiceRoleClient } from '@/utils/supabase/server';

/**
 * 인덱스 사용률 분석
 * 각 테이블의 인덱스 사용 비율을 확인하여 성능 최적화 필요성 판단
 */
export async function analyzeIndexUsage() {
    try {
        const supabase = createServiceRoleClient();

        const { data, error } = await supabase.rpc('analyze_index_usage');

        if (error) {
            console.error('인덱스 사용률 분석 실패:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('인덱스 사용률 분석 중 예외 발생:', error);
        return null;
    }
}

/**
 * 캐시 히트율 분석
 * 인덱스와 테이블의 캐시 효율성을 확인
 */
export async function analyzeCacheHitRate() {
    try {
        const supabase = createServiceRoleClient();

        const { data, error } = await supabase.rpc('analyze_cache_hit_rate');

        if (error) {
            console.error('캐시 히트율 분석 실패:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('캐시 히트율 분석 중 예외 발생:', error);
        return null;
    }
}

/**
 * 테이블 및 인덱스 크기 분석
 * 스토리지 사용량을 모니터링하여 최적화 필요성 판단
 */
export async function analyzeTableSizes() {
    try {
        const supabase = createServiceRoleClient();

        const { data, error } = await supabase.rpc('analyze_table_sizes');

        if (error) {
            console.error('테이블 크기 분석 실패:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('테이블 크기 분석 중 예외 발생:', error);
        return null;
    }
}

/**
 * 개발 환경에서 성능 분석 실행
 * 프로덕션에서는 사용하지 말 것
 */
export async function runPerformanceAnalysis() {
    if (process.env.NODE_ENV === 'production') {
        console.warn('성능 분석은 개발 환경에서만 실행하세요.');
        return null;
    }

    console.log('🔍 데이터베이스 성능 분석 시작...');

    const results = await Promise.allSettled([
        analyzeIndexUsage(),
        analyzeCacheHitRate(),
        analyzeTableSizes(),
    ]);

    const [indexUsage, cacheHitRate, tableSizes] = results.map((result) =>
        result.status === 'fulfilled' ? result.value : null
    );

    return {
        indexUsage,
        cacheHitRate,
        tableSizes,
        timestamp: new Date().toISOString(),
    };
}

/**
 * 해시태그 관련 쿼리 성능 분석
 * 특정 쿼리 패턴의 성능을 측정
 */
export async function analyzeHashtagQueryPerformance() {
    try {
        const supabase = createServiceRoleClient();

        // 해시태그 필터링 쿼리 성능 분석
        const start = performance.now();

        const { data, error } = await supabase.rpc(
            'get_posts_with_all_hashtags',
            {
                hashtag_ids: [1], // 테스트용 해시태그 ID
                page_offset: 0,
                page_limit: 10,
                sort_by: 'latest',
                search_query: null,
            }
        );

        const end = performance.now();
        const executionTime = end - start;

        if (error) {
            console.error('해시태그 쿼리 성능 분석 실패:', error);
            return null;
        }

        return {
            executionTime: `${executionTime.toFixed(2)}ms`,
            resultCount: data?.length || 0,
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        console.error('해시태그 쿼리 성능 분석 중 예외 발생:', error);
        return null;
    }
}
