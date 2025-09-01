-- Phase 9: 해시태그 관련 성능 최적화를 위한 인덱스 생성
-- 참고: Supabase 공식 문서의 인덱스 최적화 가이드라인 적용

-- 1. post_hashtags 테이블의 JOIN 컬럼들에 인덱스 생성
-- JOIN 성능 향상을 위해 외래 키 컬럼들에 인덱스 필요
CREATE INDEX IF NOT EXISTS idx_post_hashtags_post_id 
ON post_hashtags (post_id);

CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag_id 
ON post_hashtags (hashtag_id);

-- 2. 복합 인덱스: post_id + hashtag_id (unique constraint 지원 및 JOIN 최적화)
-- 이미 unique constraint가 있지만 성능을 위해 명시적 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_post_hashtags_composite 
ON post_hashtags (post_id, hashtag_id);

-- 3. hashtags 테이블의 name 컬럼 인덱스 (검색 최적화)
-- 해시태그 검색 시 ILIKE 연산 최적화
CREATE INDEX IF NOT EXISTS idx_hashtags_name 
ON hashtags (name);

-- 4. posts 테이블의 정렬 관련 컬럼들 인덱스
-- 정렬 성능 향상을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_posts_created_at 
ON posts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_view_count 
ON posts (view_count DESC);

CREATE INDEX IF NOT EXISTS idx_posts_likes_count 
ON posts (likes_count DESC);

-- 5. 복합 인덱스: 정렬 + ID (2차 정렬 최적화)
-- 정렬 안정성을 위한 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_posts_created_at_id 
ON posts (created_at DESC, id ASC);

CREATE INDEX IF NOT EXISTS idx_posts_view_count_id 
ON posts (view_count DESC, id ASC);

CREATE INDEX IF NOT EXISTS idx_posts_likes_count_id 
ON posts (likes_count DESC, id ASC);

-- 6. 검색 최적화를 위한 텍스트 컬럼 인덱스
-- 전문 검색을 위한 인덱스 (ILIKE 연산 최적화)
-- 한국어 설정이 없으므로 'simple' 사용 (언어 무관 토큰화)
CREATE INDEX IF NOT EXISTS idx_posts_title_search 
ON posts USING gin (to_tsvector('simple', title));

CREATE INDEX IF NOT EXISTS idx_posts_content_search 
ON posts USING gin (to_tsvector('simple', content_markdown));

-- 7. 해시태그 개수 집계를 위한 최적화
-- getHashtagsWithCount 함수 성능 향상
-- post_hashtags.hashtag_id에 대한 인덱스는 이미 위에서 생성됨

-- 인덱스 생성 완료 후 통계 업데이트
ANALYZE posts;
ANALYZE hashtags;
ANALYZE post_hashtags;

-- 인덱스 사용률 확인을 위한 뷰 (개발/디버깅용)
COMMENT ON INDEX idx_post_hashtags_post_id IS 'JOIN 최적화: posts와 post_hashtags 연결';
COMMENT ON INDEX idx_post_hashtags_hashtag_id IS 'JOIN 최적화: hashtags와 post_hashtags 연결';
COMMENT ON INDEX idx_post_hashtags_composite IS '복합 인덱스: post_id + hashtag_id 조합 쿼리 최적화';
COMMENT ON INDEX idx_hashtags_name IS '해시태그 이름 검색 최적화 (searchHashtagsAction)';
COMMENT ON INDEX idx_posts_created_at IS '최신순 정렬 최적화';
COMMENT ON INDEX idx_posts_view_count IS '인기순 정렬 최적화';
COMMENT ON INDEX idx_posts_likes_count IS '좋아요순 정렬 최적화';
COMMENT ON INDEX idx_posts_created_at_id IS '최신순 + ID 2차 정렬 최적화';
COMMENT ON INDEX idx_posts_view_count_id IS '인기순 + ID 2차 정렬 최적화';
COMMENT ON INDEX idx_posts_likes_count_id IS '좋아요순 + ID 2차 정렬 최적화';
COMMENT ON INDEX idx_posts_title_search IS '제목 전문 검색 최적화 (GIN 인덱스)';
COMMENT ON INDEX idx_posts_content_search IS '내용 전문 검색 최적화 (GIN 인덱스)';

-- 성능 모니터링을 위한 쿼리 (개발용 참고)
-- 인덱스 사용률 확인: 
-- SELECT relname, 100 * idx_scan / (seq_scan + idx_scan) AS percent_of_times_index_used
-- FROM pg_stat_user_tables WHERE seq_scan + idx_scan > 0 ORDER BY n_live_tup DESC;

-- 캐시 히트율 확인:
-- SELECT 'index hit rate' AS name, (sum(idx_blks_hit)) / nullif(sum(idx_blks_hit + idx_blks_read), 0) * 100 AS ratio
-- FROM pg_statio_user_indexes
-- UNION ALL
-- SELECT 'table hit rate' AS name, sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100 AS ratio
-- FROM pg_statio_user_tables;
