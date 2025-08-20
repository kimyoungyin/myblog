-- 조회수를 원자적으로 증가시키는 RPC 함수 생성
CREATE OR REPLACE FUNCTION increment_view_count(post_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 원자적 업데이트: view_count를 1 증가시킴
    -- coalesce(view_count, 0) + 1로 NULL 값 처리
    UPDATE posts 
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = post_id;
    
    -- 업데이트된 행이 있으면 true 반환
    RETURN FOUND;
END;
$$;

-- 함수에 대한 권한 설정 (인증된 사용자와 비인증 사용자 모두 접근 가능)
GRANT EXECUTE ON FUNCTION increment_view_count(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION increment_view_count(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_view_count(INTEGER) TO service_role;
