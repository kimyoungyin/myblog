-- 성능 분석을 위한 RPC 함수들 생성
-- Supabase 공식 문서의 성능 모니터링 가이드라인 기반

-- 1. 인덱스 사용률 분석 함수
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE (
    table_name name,
    percent_of_times_index_used numeric,
    rows_in_table bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        relname as table_name,
        CASE 
            WHEN seq_scan + idx_scan = 0 THEN 0
            ELSE ROUND(100 * idx_scan::numeric / (seq_scan + idx_scan), 2)
        END as percent_of_times_index_used,
        n_live_tup as rows_in_table
    FROM pg_stat_user_tables
    WHERE seq_scan + idx_scan > 0
    ORDER BY n_live_tup DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 캐시 히트율 분석 함수
CREATE OR REPLACE FUNCTION analyze_cache_hit_rate()
RETURNS TABLE (
    cache_type text,
    hit_rate_percent numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        'index hit rate' as cache_type,
        ROUND((sum(idx_blks_hit)::numeric / NULLIF(sum(idx_blks_hit + idx_blks_read), 0)) * 100, 2) as hit_rate_percent
    FROM pg_statio_user_indexes
    UNION ALL
    SELECT
        'table hit rate' as cache_type,
        ROUND((sum(heap_blks_hit)::numeric / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0)) * 100, 2) as hit_rate_percent
    FROM pg_statio_user_tables;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 테이블 및 인덱스 크기 분석 함수
CREATE OR REPLACE FUNCTION analyze_table_sizes()
RETURNS TABLE (
    table_name name,
    table_size text,
    index_size text,
    total_size text
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        relname as table_name,
        pg_size_pretty(pg_total_relation_size(relid)) as table_size,
        pg_size_pretty(pg_indexes_size(relid)) as index_size,
        pg_size_pretty(pg_relation_size(relid)) as total_size
    FROM pg_catalog.pg_statio_user_tables
    ORDER BY pg_total_relation_size(relid) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 해시태그 관련 쿼리 성능 분석 함수
CREATE OR REPLACE FUNCTION analyze_hashtag_performance()
RETURNS TABLE (
    operation_type text,
    avg_execution_time numeric,
    total_calls bigint,
    total_time numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE 
            WHEN query ILIKE '%post_hashtags%' AND query ILIKE '%JOIN%' THEN 'hashtag_join'
            WHEN query ILIKE '%get_posts_with_all_hashtags%' THEN 'hashtag_filter_rpc'
            WHEN query ILIKE '%hashtags%' AND query ILIKE '%ILIKE%' THEN 'hashtag_search'
            ELSE 'other_hashtag_ops'
        END as operation_type,
        ROUND(mean_exec_time::numeric, 2) as avg_execution_time,
        calls as total_calls,
        ROUND(total_exec_time::numeric, 2) as total_time
    FROM pg_stat_statements
    WHERE query ILIKE '%hashtag%' OR query ILIKE '%post_hashtag%'
    ORDER BY total_exec_time DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 설정: 인증된 사용자와 익명 사용자 모두 접근 가능 (읽기 전용)
GRANT EXECUTE ON FUNCTION analyze_index_usage TO anon, authenticated;
GRANT EXECUTE ON FUNCTION analyze_cache_hit_rate TO anon, authenticated;
GRANT EXECUTE ON FUNCTION analyze_table_sizes TO anon, authenticated;
GRANT EXECUTE ON FUNCTION analyze_hashtag_performance TO anon, authenticated;

-- 함수 설명 추가
COMMENT ON FUNCTION analyze_index_usage IS '테이블별 인덱스 사용률을 분석하여 성능 최적화 포인트를 식별합니다.';
COMMENT ON FUNCTION analyze_cache_hit_rate IS '인덱스와 테이블의 캐시 히트율을 분석하여 메모리 효율성을 확인합니다.';
COMMENT ON FUNCTION analyze_table_sizes IS '테이블과 인덱스의 스토리지 사용량을 분석합니다.';
COMMENT ON FUNCTION analyze_hashtag_performance IS '해시태그 관련 쿼리의 성능 통계를 분석합니다.';
