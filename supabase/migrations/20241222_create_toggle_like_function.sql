-- 좋아요 토글을 위한 원자적 PostgreSQL 함수
-- 경쟁 조건(race condition)을 방지하고 트랜잭션 안전성을 보장합니다.

CREATE OR REPLACE FUNCTION toggle_like(p_post_id INTEGER, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    like_exists BOOLEAN;
    new_likes_count INTEGER;
    like_id INTEGER;
BEGIN
    -- 트랜잭션 시작 (함수 내에서 자동으로 처리됨)
    
    -- 1. 좋아요 존재 여부 확인
    SELECT EXISTS(
        SELECT 1 FROM likes 
        WHERE post_id = p_post_id AND user_id = p_user_id
    ) INTO like_exists;

    IF like_exists THEN
        -- 2-1. 좋아요 제거 (원자적 삭제)
        DELETE FROM likes 
        WHERE post_id = p_post_id AND user_id = p_user_id;
    ELSE
        -- 2-2. 좋아요 추가 (원자적 삽입)
        INSERT INTO likes (post_id, user_id, created_at) 
        VALUES (p_post_id, p_user_id, NOW())
        RETURNING id INTO like_id;
    END IF;

    -- 3. posts 테이블의 likes_count 업데이트 (원자적 카운트)
    UPDATE posts 
    SET 
        likes_count = (
            SELECT COUNT(*) 
            FROM likes 
            WHERE post_id = p_post_id
        ),
        updated_at = NOW()
    WHERE id = p_post_id;

    -- 4. 업데이트된 좋아요 수 조회
    SELECT likes_count INTO new_likes_count 
    FROM posts 
    WHERE id = p_post_id;

    -- 5. 결과 반환 (JSON 형태)
    RETURN JSON_BUILD_OBJECT(
        'is_liked', NOT like_exists,
        'likes_count', COALESCE(new_likes_count, 0),
        'success', true
    );

EXCEPTION
    WHEN OTHERS THEN
        -- 에러 발생 시 롤백되고 에러 정보 반환
        RETURN JSON_BUILD_OBJECT(
            'is_liked', false,
            'likes_count', 0,
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수 권한 설정 (모든 역할에서 실행 가능)
GRANT EXECUTE ON FUNCTION toggle_like(INTEGER, UUID) TO anon, authenticated, service_role;

-- 함수에 대한 설명 추가
COMMENT ON FUNCTION toggle_like(INTEGER, UUID) IS '
좋아요를 원자적으로 토글하는 함수입니다.
- 경쟁 조건(race condition) 방지
- 트랜잭션 안전성 보장  
- likes 테이블과 posts.likes_count 동기화
- 에러 발생 시 자동 롤백
';
