-- 댓글 수 증가/감소를 위한 RPC 함수들

-- 댓글 생성 시 comments_count 증가
CREATE OR REPLACE FUNCTION increment_comment_count(post_id_param INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE posts 
    SET comments_count = comments_count + 1,
        updated_at = NOW()
    WHERE id = post_id_param;
END;
$$;

-- 댓글 삭제 시 comments_count 감소
CREATE OR REPLACE FUNCTION decrement_comment_count(post_id_param INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE posts 
    SET comments_count = GREATEST(comments_count - 1, 0),
        updated_at = NOW()
    WHERE id = post_id_param;
END;
$$;

-- 특정 글의 실제 댓글 수와 comments_count 동기화
CREATE OR REPLACE FUNCTION sync_comment_count(post_id_param INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    actual_count INTEGER;
BEGIN
    -- 실제 댓글 수 계산
    SELECT COUNT(*) INTO actual_count
    FROM comments
    WHERE post_id = post_id_param;
    
    -- posts 테이블의 comments_count 업데이트
    UPDATE posts 
    SET comments_count = actual_count,
        updated_at = NOW()
    WHERE id = post_id_param;
END;
$$;

-- 모든 글의 댓글 수 동기화 (관리용)
CREATE OR REPLACE FUNCTION sync_all_comment_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE posts 
    SET comments_count = (
        SELECT COUNT(*)
        FROM comments
        WHERE comments.post_id = posts.id
    ),
    updated_at = NOW();
END;
$$;
