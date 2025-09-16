-- 모든 해시태그를 포함하는 글을 AND 조건으로 검색하는 RPC 함수 생성
-- 참고: Supabase 공식 문서의 복잡한 쿼리 패턴을 따름

DROP FUNCTION IF EXISTS get_posts_with_all_hashtags;

CREATE OR REPLACE FUNCTION get_posts_with_all_hashtags(
    hashtag_ids INTEGER[],
    page_offset INTEGER DEFAULT 0,
    page_limit INTEGER DEFAULT 10,
    sort_by TEXT DEFAULT 'latest',
    search_query TEXT DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    content TEXT,
    content_markdown TEXT,
    thumbnail_url TEXT,
    view_count INTEGER,
    likes_count INTEGER,
    comments_count INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    hashtags JSONB,
    total_count BIGINT
) AS $$
DECLARE
    hashtag_count INTEGER;
    sort_column TEXT;
    sort_direction TEXT;
    total_records BIGINT;
BEGIN
    -- 해시태그 개수 확인
    hashtag_count := array_length(hashtag_ids, 1);
    
    -- 해시태그가 없으면 빈 결과 반환
    IF hashtag_count IS NULL OR hashtag_count = 0 THEN
        RETURN;
    END IF;
    
    -- 정렬 조건 설정
    CASE sort_by
        WHEN 'oldest' THEN
            sort_column := 'p.created_at';
            sort_direction := 'ASC';
        WHEN 'popular' THEN
            sort_column := 'p.view_count';
            sort_direction := 'DESC';
        WHEN 'likes' THEN
            sort_column := 'p.likes_count';
            sort_direction := 'DESC';
        ELSE -- 'latest'
            sort_column := 'p.created_at';
            sort_direction := 'DESC';
    END CASE;
    
    -- 전체 개수 계산 (페이지네이션용) - 서브쿼리로 수정
    WITH filtered_posts AS (
        SELECT DISTINCT p.id
        FROM posts p
        INNER JOIN post_hashtags ph ON p.id = ph.post_id
        WHERE ph.hashtag_id = ANY(hashtag_ids)
          AND (search_query IS NULL OR search_query = '' OR 
               p.title ILIKE '%' || search_query || '%' OR 
               p.content_markdown ILIKE '%' || search_query || '%')
        GROUP BY p.id
        HAVING COUNT(DISTINCT ph.hashtag_id) = hashtag_count
    )
    SELECT COUNT(*) INTO total_records FROM filtered_posts;
    
    -- 메인 쿼리 실행
    RETURN QUERY
    EXECUTE format('
        WITH main_query AS (
            SELECT 
                p.id,
                p.title,
                p.content,
                p.content_markdown,
                p.thumbnail_url,
                p.view_count,
                p.likes_count,
                p.comments_count,
                p.created_at,
                p.updated_at,
                jsonb_agg(
                    jsonb_build_object(
                        ''id'', h.id,
                        ''name'', h.name,
                        ''created_at'', h.created_at
                    )
                    ORDER BY h.name
                ) as hashtags
            FROM posts p
            INNER JOIN post_hashtags ph ON p.id = ph.post_id
            INNER JOIN hashtags h ON ph.hashtag_id = h.id
            WHERE ph.hashtag_id = ANY(%L)
              AND (%L IS NULL OR %L = '''' OR 
                   p.title ILIKE ''%%'' || %L || ''%%'' OR 
                   p.content_markdown ILIKE ''%%'' || %L || ''%%'')
            GROUP BY p.id, p.title, p.content, p.content_markdown, p.thumbnail_url, 
                     p.view_count, p.likes_count, p.comments_count, p.created_at, p.updated_at
            HAVING COUNT(DISTINCT ph.hashtag_id) = %L
            ORDER BY %s %s, p.id ASC
            LIMIT %L OFFSET %L
        )
        SELECT 
            COALESCE(mq.id, -1) as id,
            COALESCE(mq.title, '''') as title,
            COALESCE(mq.content, '''') as content,
            COALESCE(mq.content_markdown, '''') as content_markdown,
            mq.thumbnail_url,
            COALESCE(mq.view_count, 0) as view_count,
            COALESCE(mq.likes_count, 0) as likes_count,
            COALESCE(mq.comments_count, 0) as comments_count,
            COALESCE(mq.created_at, NOW()) as created_at,
            COALESCE(mq.updated_at, NOW()) as updated_at,
            COALESCE(mq.hashtags, ''[]''::jsonb) as hashtags,
            %L::BIGINT as total_count
        FROM (
            SELECT 1 as dummy_row
        ) dummy
        LEFT JOIN main_query mq ON true
    ', 
    hashtag_ids,
    search_query, search_query, search_query, search_query,
    hashtag_count,
    sort_column, sort_direction,
    page_limit, page_offset,
    total_records
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS 우회를 위해 SECURITY DEFINER 사용
-- 공개적으로 접근 가능한 함수로 설정
GRANT EXECUTE ON FUNCTION get_posts_with_all_hashtags TO anon, authenticated;

-- 함수에 대한 설명 추가
COMMENT ON FUNCTION get_posts_with_all_hashtags IS 
'모든 지정된 해시태그를 포함하는 글을 AND 조건으로 검색합니다. 페이지네이션, 정렬, 텍스트 검색을 지원합니다.';
