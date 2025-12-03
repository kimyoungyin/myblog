# Phase 13 학습정리: RPC 원자적 연산 및 캐시 무효화 최적화

## 개요

Phase 13에서는 최근 커밋을 통해 **PostgreSQL RPC 함수를 활용한 원자적 연산**과 **데이터 뮤테이션 시 정교한 캐시 무효화 전략**을 구현했습니다. 특히 댓글 수 동기화와 좋아요 토글에서 발생할 수 있는 경쟁 조건(race condition) 문제를 해결하고, Next.js의 `revalidatePath`를 통한 효율적인 캐시 관리 시스템을 완성했습니다.

## 핵심 학습 내용

### 1. PostgreSQL RPC 함수를 통한 원자적 연산

#### 댓글 수 동기화 RPC 함수 구현

```sql
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
```

**학습 포인트:**

- **원자적 연산**: 단일 UPDATE 문으로 경쟁 조건 방지
- **SECURITY DEFINER**: 함수 소유자 권한으로 실행되어 RLS 우회 가능
- **GREATEST 함수**: 댓글 수가 음수가 되는 것을 방지
- **updated_at 자동 갱신**: 데이터 변경 시점 추적

#### 좋아요 토글 RPC 함수의 고급 패턴

```sql
CREATE OR REPLACE FUNCTION toggle_like(p_post_id INTEGER, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    like_exists BOOLEAN;
    new_likes_count INTEGER;
    like_id INTEGER;
BEGIN
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

    -- 3. posts 테이블의 likes_count 업데이트
    UPDATE posts
    SET
        likes_count = (
            SELECT COUNT(*)
            FROM likes
            WHERE post_id = p_post_id
        ),
        updated_at = NOW()
    WHERE id = p_post_id;

    -- 4. 결과 반환 (JSON 형태)
    RETURN JSON_BUILD_OBJECT(
        'is_liked', NOT like_exists,
        'likes_count', COALESCE(new_likes_count, 0),
        'success', true
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN JSON_BUILD_OBJECT(
            'is_liked', false,
            'likes_count', 0,
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**학습한 고급 패턴:**

- **트랜잭션 안전성**: 함수 내 모든 연산이 하나의 트랜잭션으로 처리
- **JSON 반환**: 복잡한 결과를 구조화된 형태로 반환
- **예외 처리**: EXCEPTION 블록으로 에러 상황 대응
- **EXISTS 최적화**: 존재 여부만 확인하여 성능 향상
- **COALESCE 활용**: NULL 값 처리로 안정성 확보

### 2. TypeScript에서 RPC 함수 호출 패턴

#### 댓글 생성 시 RPC 호출

```typescript
// 댓글 생성
const { data: newComment, error } = await supabase
    .from('comments')
    .insert({
        content: data.content,
        post_id: data.post_id,
        author_id: authorId,
        parent_id: data.parent_id || null,
    })
    .select(/* ... */)
    .single();

if (error) {
    throw new Error(`댓글 생성 실패: ${error.message}`);
}

// 댓글 수 증가 (RPC 호출)
const { error: countError } = await supabase.rpc('increment_comment_count', {
    post_id_param: data.post_id,
});

if (countError) {
    console.error('댓글 수 증가 실패:', countError);
    // 댓글은 생성되었으므로 에러를 던지지 않고 로그만 남김
}
```

**학습 포인트:**

- **분리된 에러 처리**: 댓글 생성과 카운트 증가를 별도로 처리
- **부분 실패 허용**: 카운트 증가 실패해도 댓글 생성은 유지
- **로깅 전략**: 중요하지 않은 실패는 로그로만 기록

#### 좋아요 토글 RPC 호출과 결과 처리

```typescript
export async function toggleLike(
    data: ToggleLikeData,
    userId: string
): Promise<ToggleLikeResult> {
    const supabase = createServiceRoleClient();
    try {
        // PostgreSQL RPC 함수를 통한 원자적 좋아요 토글
        const { data: result, error } = await supabase.rpc('toggle_like', {
            p_post_id: data.post_id,
            p_user_id: userId,
        });

        if (error) {
            console.error('좋아요 토글 RPC 에러:', error);
            return {
                success: false,
                is_liked: false,
                likes_count: 0,
                error: error.message || '좋아요 처리에 실패했습니다.',
            };
        }

        // RPC 함수가 반환한 JSON 결과 파싱
        if (!result || typeof result !== 'object') {
            return {
                success: false,
                is_liked: false,
                likes_count: 0,
                error: '서버 응답이 올바르지 않습니다.',
            };
        }

        // 성공적인 결과 반환
        return {
            success: true,
            is_liked: result.is_liked,
            likes_count: result.likes_count,
        };
    } catch (error) {
        console.error('좋아요 토글 실패:', error);
        return {
            success: false,
            is_liked: false,
            likes_count: 0,
            error:
                error instanceof Error
                    ? error.message
                    : '알 수 없는 오류가 발생했습니다.',
        };
    }
}
```

**학습한 내용:**

- **JSON 결과 파싱**: RPC 함수의 JSON 반환값을 안전하게 처리
- **타입 안전성**: TypeScript 타입으로 결과 구조 보장
- **포괄적 에러 처리**: 네트워크, 파싱, 비즈니스 로직 에러 모두 대응
- **일관된 반환 형태**: 성공/실패 관계없이 동일한 구조로 반환

### 3. 정교한 캐시 무효화 전략

#### Server Actions에서의 계층적 캐시 무효화

```typescript
// 댓글 생성 Server Action
export async function createCommentAction(formData: FormData) {
    try {
        // ... 댓글 생성 로직 ...

        // 캐시 무효화
        revalidatePath(`/posts/${rawData.post_id}`); // 특정 글 페이지
        revalidatePath('/posts'); // 글 목록 캐시 무효화
        revalidatePath('/'); // 홈페이지 캐시 무효화

        return comment;
    } catch (error) {
        throw error;
    }
}

// 글 수정 Server Action
export async function updatePostAction(postId: number, formData: FormData) {
    try {
        // ... 글 수정 로직 ...

        // 캐시 무효화 및 리다이렉트
        revalidatePath(`/admin/posts/${postId}/edit`); // 편집 페이지
        revalidatePath(`/posts/${postId}`); // 글 상세 페이지
        revalidatePath('/posts'); // 글 목록 페이지
        revalidatePath('/'); // 홈페이지 캐시 무효화

        redirect(`/posts/${postId}`);
    } catch (error) {
        throw error;
    }
}
```

**학습한 캐시 무효화 패턴:**

- **계층적 무효화**: 변경 사항이 영향을 주는 모든 페이지 무효화
- **특정 경로 우선**: 가장 직접적으로 영향받는 페이지부터 무효화
- **전역 캐시 고려**: 홈페이지 같은 전역 캐시도 함께 무효화
- **리다이렉트 전 무효화**: 페이지 이동 전에 캐시 무효화 완료

#### 캐시 무효화 범위 결정 원칙

```typescript
// 댓글 관련 무효화 범위
revalidatePath(`/posts/${postId}`); // 1순위: 댓글이 표시되는 글 페이지
revalidatePath('/posts'); // 2순위: 댓글 수가 표시되는 글 목록
revalidatePath('/'); // 3순위: 최신 글이 표시되는 홈페이지

// 좋아요 관련 무효화 범위
revalidatePath(`/posts/${postId}`); // 1순위: 좋아요가 표시되는 글 페이지
revalidatePath('/posts'); // 2순위: 좋아요 수가 표시되는 글 목록
revalidatePath('/'); // 3순위: 인기 글이 표시되는 홈페이지
```

**무효화 범위 결정 기준:**

- **직접 영향**: 데이터가 직접 표시되는 페이지
- **간접 영향**: 집계 데이터나 목록에 영향을 주는 페이지
- **전역 영향**: 사이트 전체 통계나 추천에 영향을 주는 페이지
- **사용자 경험**: 사용자가 기대하는 데이터 일관성 범위

### 4. 동시성 문제 해결 패턴

#### 경쟁 조건(Race Condition) 시나리오

**문제 상황:**

```typescript
// ❌ 경쟁 조건이 발생할 수 있는 패턴
// 사용자 A와 B가 동시에 좋아요를 누르는 경우

// 사용자 A: 현재 좋아요 수 조회 (예: 10개)
const currentCount = await getCurrentLikesCount(postId);

// 사용자 B: 현재 좋아요 수 조회 (예: 10개) - 동일한 값
const currentCount = await getCurrentLikesCount(postId);

// 사용자 A: 좋아요 추가 후 카운트 업데이트 (11개로 설정)
await addLike(postId, userA);
await updateLikesCount(postId, currentCount + 1);

// 사용자 B: 좋아요 추가 후 카운트 업데이트 (11개로 설정) - 덮어쓰기!
await addLike(postId, userB);
await updateLikesCount(postId, currentCount + 1);

// 결과: 실제로는 2개가 증가해야 하지만 1개만 증가
```

**해결책: RPC 원자적 연산**

```sql
-- ✅ 원자적 연산으로 경쟁 조건 해결
UPDATE posts
SET likes_count = (
    SELECT COUNT(*)
    FROM likes
    WHERE post_id = p_post_id
),
updated_at = NOW()
WHERE id = p_post_id;
```

**학습한 동시성 해결 패턴:**

- **원자적 연산**: 읽기-수정-쓰기를 하나의 연산으로 처리
- **데이터베이스 레벨 해결**: 애플리케이션 레벨이 아닌 DB 레벨에서 해결
- **실시간 계산**: 캐시된 값이 아닌 실시간 COUNT 사용
- **트랜잭션 격리**: 함수 내 모든 연산이 격리된 환경에서 실행

#### 부분 실패 처리 전략

```typescript
// 댓글 생성 시 부분 실패 허용 패턴
try {
    // 1. 핵심 기능: 댓글 생성 (실패 시 전체 실패)
    const comment = await createComment(data, userId);

    // 2. 부가 기능: 카운트 증가 (실패해도 계속 진행)
    try {
        await supabase.rpc('increment_comment_count', {
            post_id_param: data.post_id,
        });
    } catch (countError) {
        console.error('댓글 수 증가 실패:', countError);
        // 로그만 남기고 계속 진행
    }

    // 3. 캐시 무효화 (실패해도 계속 진행)
    try {
        revalidatePath(`/posts/${data.post_id}`);
    } catch (cacheError) {
        console.error('캐시 무효화 실패:', cacheError);
        // 로그만 남기고 계속 진행
    }

    return comment;
} catch (error) {
    // 핵심 기능 실패 시에만 에러 전파
    throw error;
}
```

**부분 실패 처리 원칙:**

- **핵심 vs 부가 기능 구분**: 핵심 기능 실패는 전체 실패, 부가 기능 실패는 허용
- **사용자 경험 우선**: 사용자가 기대하는 핵심 동작은 반드시 성공
- **점진적 성능 저하**: 부가 기능 실패 시에도 기본 기능은 유지
- **모니터링 강화**: 부분 실패 상황을 로그로 추적하여 개선점 파악

## 기존 Phase에서 활용한 기술

### Phase 1-3: 기본 인프라

- **Next.js Server Actions**: Phase 3에서 구축한 Server Actions 패턴을 RPC 호출에 활용
- **TypeScript 타입 시스템**: 엄격한 타입 정의로 RPC 결과 안전성 보장
- **Zod 스키마 검증**: 사용자 입력 검증을 RPC 호출 전에 수행

### Phase 4-5: 데이터베이스 연동

- **Supabase 클라이언트**: Service Role 클라이언트로 RPC 함수 호출
- **PostgreSQL 스키마**: 기존 테이블 구조를 활용한 RPC 함수 설계
- **관계형 데이터**: posts, comments, likes 테이블 간 관계를 RPC에서 활용

### Phase 6-8: 인증 및 권한

- **사용자 인증**: RPC 함수 호출 시 사용자 ID 전달
- **권한 검증**: SECURITY DEFINER로 권한 우회하되 비즈니스 로직에서 검증
- **세션 관리**: 로그인한 사용자만 좋아요/댓글 기능 사용 가능

### Phase 9-11: 고급 기능

- **React Query 캐싱**: RPC 호출 결과를 React Query로 캐싱
- **성능 최적화**: 원자적 연산으로 네트워크 호출 횟수 감소
- **에러 처리**: Phase 9에서 구축한 에러 처리 패턴을 RPC에 적용

### Phase 12: 배포 환경

- **프로덕션 안정성**: RPC 함수로 프로덕션 환경에서의 동시성 문제 해결
- **모니터링**: RPC 함수 실행 로그를 통한 성능 모니터링
- **확장성**: 데이터베이스 레벨 최적화로 트래픽 증가에 대비

## 핵심 의사결정과 그 이유

### 1. PostgreSQL RPC 함수 선택

**결정**: 애플리케이션 로직이 아닌 PostgreSQL RPC 함수로 원자적 연산 구현
**이유**:

- **동시성 보장**: 데이터베이스 레벨에서 트랜잭션 격리 보장
- **성능 최적화**: 여러 번의 네트워크 호출을 하나로 통합
- **데이터 일관성**: 읽기-수정-쓰기 패턴의 경쟁 조건 완전 제거
- **확장성**: 애플리케이션 서버 수에 관계없이 일관된 동작

**대안으로 고려했던 것들:**

- **애플리케이션 레벨 락**: 복잡하고 확장성 제한
- **Redis 분산 락**: 추가 인프라 필요, 복잡성 증가
- **Optimistic Locking**: 재시도 로직 필요, 사용자 경험 저하

### 2. 부분 실패 허용 전략

**결정**: 핵심 기능과 부가 기능을 구분하여 부분 실패 허용
**이유**:

- **사용자 경험**: 댓글 작성은 성공했는데 카운트 증가 실패로 전체 실패하면 안 됨
- **시스템 안정성**: 부가 기능 실패가 핵심 기능에 영향을 주지 않음
- **점진적 성능 저하**: 일부 기능 장애 시에도 서비스 지속 가능
- **복구 가능성**: 부가 기능은 나중에 배치 작업으로 복구 가능

### 3. 계층적 캐시 무효화 전략

**결정**: 데이터 변경 시 영향받는 모든 페이지의 캐시 무효화
**이유**:

- **데이터 일관성**: 사용자가 어떤 페이지를 방문하든 최신 데이터 보장
- **사용자 경험**: 댓글 작성 후 목록 페이지에서도 즉시 반영
- **SEO 최적화**: 검색 엔진이 크롤링할 때도 최신 데이터 제공
- **캐시 효율성**: 필요한 부분만 선택적으로 무효화

## 고민했던 부분과 해결책

### 문제 1: RPC 함수 vs 애플리케이션 로직

**문제**: 비즈니스 로직을 데이터베이스에 둘지 애플리케이션에 둘지 고민
**시도한 방법들**:

1. **애플리케이션 레벨 구현**: 여러 쿼리를 순차적으로 실행
2. **트랜잭션 래핑**: BEGIN/COMMIT으로 애플리케이션에서 트랜잭션 관리
3. **Optimistic Locking**: 버전 필드를 사용한 낙관적 락

**최종 해결책**: PostgreSQL RPC 함수 사용

```sql
-- 모든 연산을 하나의 함수로 통합
CREATE OR REPLACE FUNCTION toggle_like(p_post_id INTEGER, p_user_id UUID)
RETURNS JSON AS $$
BEGIN
    -- 원자적 연산으로 모든 로직 처리
    -- ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**학습한 내용**:

- **데이터베이스의 강점**: ACID 속성을 활용한 안전한 동시성 처리
- **네트워크 최적화**: 여러 번의 왕복을 하나로 줄여 성능 향상
- **코드 단순화**: 복잡한 동시성 처리 로직을 데이터베이스에 위임

### 문제 2: 캐시 무효화 범위 결정

**문제**: 어떤 페이지까지 캐시를 무효화해야 할지 판단 어려움
**해결책**: 데이터 의존성 분석을 통한 체계적 접근

```typescript
// 데이터 의존성 매핑
const cacheInvalidationMap = {
    comment: [
        `/posts/${postId}`, // 직접 영향: 댓글이 표시되는 페이지
        '/posts', // 간접 영향: 댓글 수가 표시되는 목록
        '/', // 전역 영향: 최신 활동이 반영되는 홈
    ],
    like: [
        `/posts/${postId}`, // 직접 영향: 좋아요가 표시되는 페이지
        '/posts', // 간접 영향: 좋아요 수가 표시되는 목록
        '/', // 전역 영향: 인기 글 순서에 영향
    ],
    post: [
        `/posts/${postId}`, // 직접 영향: 글 내용이 표시되는 페이지
        `/admin/posts/${postId}/edit`, // 관리 페이지
        '/posts', // 간접 영향: 글 목록
        '/', // 전역 영향: 최신 글 목록
    ],
};
```

**학습한 내용**:

- **의존성 분석**: 데이터가 어디에 표시되는지 체계적으로 분석
- **사용자 시나리오**: 사용자가 어떤 경로로 페이지를 방문하는지 고려
- **성능 균형**: 과도한 무효화는 성능 저하, 부족한 무효화는 일관성 문제

### 문제 3: RPC 함수 에러 처리

**문제**: RPC 함수에서 발생하는 다양한 에러 상황 처리
**해결책**: 계층화된 에러 처리 전략

```typescript
// 1. RPC 함수 레벨 에러 처리
EXCEPTION
    WHEN OTHERS THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', SQLERRM
        );

// 2. TypeScript 호출 레벨 에러 처리
try {
    const { data: result, error } = await supabase.rpc('toggle_like', params);

    if (error) {
        return { success: false, error: error.message };
    }

    if (!result.success) {
        return { success: false, error: result.error };
    }

    return { success: true, ...result };
} catch (error) {
    return {
        success: false,
        error: '네트워크 오류가 발생했습니다.'
    };
}

// 3. Server Action 레벨 에러 처리
export async function toggleLikeAction(formData: FormData) {
    try {
        const result = await toggleLike(data, userId);

        if (!result.success) {
            throw new Error(result.error);
        }

        // 캐시 무효화
        revalidatePath(`/posts/${postId}`);

        return result;
    } catch (error) {
        console.error('좋아요 토글 실패:', error);
        throw error;
    }
}
```

**학습한 내용**:

- **계층별 책임**: 각 계층에서 처리할 수 있는 에러만 처리
- **에러 전파**: 상위 계층에서 의미 있는 에러 메시지로 변환
- **사용자 친화적**: 기술적 에러를 사용자가 이해할 수 있는 메시지로 변환

## 성능 및 보안 고려사항

### 성능 최적화

**RPC 함수 성능 최적화:**

1. **인덱스 활용**: 자주 조회되는 컬럼에 인덱스 설정
2. **쿼리 최적화**: EXISTS, COUNT(\*) 등 효율적인 쿼리 패턴 사용
3. **네트워크 최적화**: 여러 번의 호출을 하나로 통합
4. **메모리 사용**: DECLARE 변수를 최소화하여 메모리 효율성 향상

```sql
-- 성능 최적화된 쿼리 패턴
SELECT EXISTS(
    SELECT 1 FROM likes
    WHERE post_id = p_post_id AND user_id = p_user_id
) INTO like_exists;

-- 인덱스 활용을 위한 WHERE 조건 순서
CREATE INDEX idx_likes_post_user ON likes(post_id, user_id);
```

**캐시 무효화 성능:**

1. **선택적 무효화**: 영향받는 페이지만 정확히 무효화
2. **배치 무효화**: 여러 경로를 한 번에 무효화
3. **비동기 처리**: 캐시 무효화를 비동기로 처리하여 응답 속도 향상

### 보안 강화

**RPC 함수 보안:**

1. **SECURITY DEFINER**: 함수 소유자 권한으로 실행
2. **입력 검증**: 함수 내에서 파라미터 유효성 검사
3. **권한 제한**: 필요한 역할에만 EXECUTE 권한 부여
4. **SQL 인젝션 방지**: 파라미터화된 쿼리 사용

```sql
-- 보안을 고려한 함수 설계
CREATE OR REPLACE FUNCTION toggle_like(p_post_id INTEGER, p_user_id UUID)
RETURNS JSON AS $$
BEGIN
    -- 입력 검증
    IF p_post_id IS NULL OR p_post_id <= 0 THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Invalid post ID');
    END IF;

    IF p_user_id IS NULL THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Invalid user ID');
    END IF;

    -- 비즈니스 로직...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 제한
GRANT EXECUTE ON FUNCTION toggle_like(INTEGER, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION toggle_like(INTEGER, UUID) FROM anon;
```

**애플리케이션 레벨 보안:**

1. **인증 확인**: RPC 호출 전 사용자 인증 상태 확인
2. **권한 검증**: 사용자가 해당 작업을 수행할 권한이 있는지 확인
3. **입력 검증**: Zod 스키마로 클라이언트 입력 검증
4. **에러 정보 제한**: 민감한 에러 정보는 로그에만 기록

## React Query 캐시 최적화 및 윈도우 포커스 전략

### 1. refetchOnWindowFocus 설정 최적화

#### 인증 관련 쿼리의 보안 강화

**문제 인식**: 기존 인증 쿼리에서 `refetchOnWindowFocus: false` 설정으로 인한 보안 취약점

```typescript
// ❌ 이전 설정 (보안 위험)
const { data: session } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: getSession,
    refetchOnWindowFocus: false, // 멀티탭 로그아웃 감지 불가
    staleTime: 60 * 1000,
});
```

**해결책**: TanStack Query 공식 권장사항에 따른 설정 변경

```typescript
// ✅ 개선된 설정 (보안 강화)
const { data: session } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
        const {
            data: { session },
        } = await supabase.auth.getSession();
        return session;
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true, // 보안을 위해 윈도우 포커스 시 세션 상태 확인
    retry: false,
});

// 프로필 쿼리도 동일하게 적용
const { data: profile } = useQuery({
    queryKey: ['auth', 'profile', session?.user?.id],
    queryFn: fetchProfile,
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true, // 프로필 변경사항 즉시 반영
    retry: false,
});
```

**학습한 핵심 개념:**

- **보안 우선**: 인증 데이터는 항상 최신 상태 유지가 보안상 필수
- **멀티탭 동기화**: 다른 탭에서 로그아웃 시 즉시 감지 및 반영
- **세션 만료 감지**: JWT 토큰 만료를 빠르게 감지하여 자동 로그아웃
- **사용자 경험**: 모든 탭에서 일관된 인증 상태 제공

#### 데이터 유형별 최적화 전략

**1. 인증 관련 데이터 (refetchOnWindowFocus: true)**

```typescript
// 세션, 프로필, 권한 정보
const authQueries = {
    session: {
        refetchOnWindowFocus: true, // 보안상 필수
        staleTime: 60 * 1000, // 1분
    },
    profile: {
        refetchOnWindowFocus: true, // 실시간 프로필 변경 반영
        staleTime: 5 * 60 * 1000, // 5분
    },
};
```

**2. 동적 콘텐츠 (refetchOnWindowFocus: true)**

```typescript
// 게시글 목록, 댓글, 좋아요 수
const dynamicQueries = {
    posts: {
        refetchOnWindowFocus: true, // 새 글, 댓글 수 변경 반영
        staleTime: 5 * 60 * 1000,
        refetchInterval: 2 * 60 * 1000, // 2분마다 백그라운드 업데이트
    },
};
```

**3. 정적/검색 데이터 (refetchOnWindowFocus: false)**

```typescript
// 검색 결과, 통계 데이터
const staticQueries = {
    search: {
        refetchOnWindowFocus: false, // 검색 결과는 정적
        staleTime: 5 * 60 * 1000,
        refetchOnMount: false,
    },
};
```

#### 전역 vs 개별 설정 전략

**전역 기본 설정 (QueryProvider)**

```typescript
// src/lib/query-provider.tsx
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: true, // 기본적으로 true (TanStack Query 권장)
        },
    },
});
```

**개별 쿼리에서 선택적 비활성화**

```typescript
// 정적 데이터만 선택적으로 비활성화
const { data: searchResults } = useQuery({
    queryKey: ['search', query],
    queryFn: searchPosts,
    refetchOnWindowFocus: false, // 검색 결과는 재조회 불필요
    staleTime: 5 * 60 * 1000,
});
```

**학습한 설계 원칙:**

- **기본값 활용**: TanStack Query 기본값(`true`)을 그대로 사용
- **선택적 비활성화**: 정말 필요한 경우에만 `false`로 설정
- **보안 우선**: 인증 관련 데이터는 절대 비활성화하지 않음
- **사용자 경험**: 데이터 일관성과 실시간성의 균형

#### 성능과 보안의 균형

**네트워크 최적화**

```typescript
// staleTime과 refetchOnWindowFocus의 조합으로 최적화
const optimizedQuery = {
    staleTime: 5 * 60 * 1000, // 5분간 "신선한" 데이터로 간주
    refetchOnWindowFocus: true, // 포커스 시에도 staleTime 고려
    gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
};
```

**보안과 성능의 트레이드오프**

- **보안 우선**: 인증 데이터는 성능보다 보안이 우선
- **적절한 staleTime**: 너무 짧으면 과도한 요청, 너무 길면 보안 위험
- **배경 업데이트**: `refetchInterval`로 사용자 액션 없이도 주기적 업데이트

### 2. 캐시 무효화와 윈도우 포커스의 시너지

**Server Actions와 refetchOnWindowFocus 조합**

```typescript
// Server Action에서 캐시 무효화
export async function createCommentAction(formData: FormData) {
    try {
        const comment = await createComment(data, userId);

        // 서버 사이드 캐시 무효화
        revalidatePath(`/posts/${data.post_id}`);
        revalidatePath('/posts');

        // 클라이언트 사이드는 refetchOnWindowFocus로 자동 동기화
        return comment;
    } catch (error) {
        throw error;
    }
}
```

**학습한 통합 전략:**

- **서버 캐시**: `revalidatePath`로 Next.js 캐시 무효화
- **클라이언트 캐시**: `refetchOnWindowFocus`로 React Query 캐시 자동 갱신
- **이중 보장**: 서버와 클라이언트 양쪽에서 데이터 일관성 보장

## 향후 개선 방향

### 1. RPC 함수 확장

**현재**: 댓글 수, 좋아요 토글 RPC 함수
**개선 방향**:

- **조회수 증가**: `increment_view_count` RPC 함수 최적화
- **해시태그 통계**: 해시태그별 글 수 실시간 업데이트
- **사용자 통계**: 사용자별 활동 통계 RPC 함수
- **배치 연산**: 여러 글의 통계를 한 번에 업데이트하는 함수

### 2. 캐시 전략 고도화

**현재**: 페이지 단위 캐시 무효화
**개선 방향**:

- **태그 기반 캐시**: Next.js의 태그 기반 캐시 무효화 활용
- **부분 캐시**: 페이지 전체가 아닌 컴포넌트 단위 캐시 무효화
- **예측 캐시**: 사용자 행동 패턴을 분석한 선제적 캐시 갱신
- **캐시 워밍**: 인기 있는 콘텐츠의 캐시를 미리 생성

### 3. 모니터링 및 관찰성

**현재**: 기본적인 에러 로깅
**개선 방향**:

- **성능 메트릭**: RPC 함수 실행 시간, 호출 빈도 모니터링
- **에러 추적**: Sentry 연동으로 RPC 함수 에러 상세 추적
- **비즈니스 메트릭**: 댓글 작성률, 좋아요 클릭률 등 비즈니스 지표
- **알림 시스템**: 임계치 초과 시 자동 알림

### 4. 확장성 개선

**현재**: 단일 데이터베이스 RPC 함수
**개선 방향**:

- **읽기 복제본**: 읽기 전용 쿼리를 복제본으로 분산
- **파티셔닝**: 대용량 테이블의 파티셔닝 전략
- **캐시 계층**: Redis를 활용한 다층 캐시 구조
- **비동기 처리**: 중요하지 않은 작업의 큐 기반 비동기 처리

## 결론

Phase 13 RPC 원자적 연산 및 캐시 무효화 최적화를 통해 **데이터베이스 레벨에서의 동시성 제어**와 **효율적인 캐시 관리 전략**에 대한 깊이 있는 이해를 얻을 수 있었습니다.

특히 **PostgreSQL RPC 함수를 활용한 원자적 연산**을 통해 애플리케이션 레벨에서 해결하기 어려운 경쟁 조건 문제를 근본적으로 해결할 수 있었고, **계층적 캐시 무효화 전략**으로 데이터 일관성과 성능을 동시에 확보할 수 있었습니다. **부분 실패 허용 패턴**을 통해 시스템의 안정성을 높이면서도 사용자 경험을 보장하는 방법을 학습했습니다.

또한 **React Query의 refetchOnWindowFocus 최적화**를 통해 인증 시스템의 보안성을 크게 향상시킬 수 있었습니다. TanStack Query 공식 권장사항을 따라 **데이터 유형별 차별화된 캐시 전략**을 구현함으로써, 보안이 중요한 인증 데이터는 실시간 동기화를 보장하고, 정적 데이터는 불필요한 네트워크 요청을 방지하는 **최적화된 캐시 시스템**을 완성했습니다.

이러한 경험은 향후 **대규모 트래픽 환경**에서의 데이터 일관성 보장과 **고성능 웹 애플리케이션** 개발에서도 활용할 수 있는 견고한 기반이 될 것입니다. 특히 **데이터베이스 중심의 비즈니스 로직 설계**, **정교한 캐시 관리**, 그리고 **보안을 고려한 실시간 데이터 동기화**의 중요성을 이해하게 되어, 더욱 안정적이고 확장 가능하며 보안성이 뛰어난 시스템을 구축할 수 있게 되었습니다.
