# Phase 9 학습정리: 좋아요 시스템 구현

## 개요

Phase 9에서는 블로그 글에 대한 좋아요 시스템을 구현했습니다. 로그인한 사용자가 좋아요를 추가/제거할 수 있고, 낙관적 UI 업데이트를 통해 Instagram, Twitter와 같은 현대적 소셜 플랫폼 수준의 즉시 반응하는 인터페이스를 제공합니다. 또한 보안 강화와 성능 최적화를 통해 안정적이고 빠른 좋아요 시스템을 완성했습니다.

## 핵심 학습 내용

### 1. 낙관적 UI 업데이트 (Optimistic UI Updates) 심화

#### 좋아요 시스템에서의 낙관적 업데이트 구현

```typescript
const handleToggleLike = async () => {
    if (!user) return;

    // 1. 즉시 UI에 반영 (낙관적 업데이트)
    const newIsLiked = !isLiked;
    const newLikesCount = newIsLiked
        ? likesCount + 1
        : Math.max(0, likesCount - 1);

    setIsLiked(newIsLiked);
    setLikesCount(newLikesCount);

    // 2. 백그라운드에서 서버 요청
    startTransition(async () => {
        try {
            const formData = new FormData();
            formData.append('post_id', postId.toString());
            const result = await toggleLikeAction(formData);

            // 서버 결과로 최종 상태 업데이트
            setIsLiked(result.is_liked);
            setLikesCount(result.likes_count);
        } catch {
            // 실패 시 원래 상태로 복원
            setIsLiked(!newIsLiked);
            setLikesCount(initialLikesCount);
        }
    });
};
```

**학습 포인트:**

- **즉시 피드백**: 사용자 액션에 대한 즉각적인 시각적 반응
- **백그라운드 동기화**: `useTransition`을 통한 비차단적 서버 요청
- **실패 시 복원 전략**: 서버 요청 실패 시 이전 상태로 자동 복원
- **상태 일관성**: 서버 응답으로 최종 상태 동기화

### 2. React 19 useTransition과 현대적 상태 관리

#### useTransition을 활용한 백그라운드 처리

```typescript
const [isPending, startTransition] = useTransition();

// 낙관적 업데이트 + 백그라운드 서버 요청
startTransition(async () => {
    try {
        const result = await toggleLikeAction(formData);
        // 성공 시 서버 데이터로 동기화
        setIsLiked(result.is_liked);
        setLikesCount(result.likes_count);
    } catch {
        // 실패 시 복원 로직
        setIsLiked(!newIsLiked);
        setLikesCount(initialLikesCount);
    }
});
```

**고민했던 부분과 해결책:**

**문제**: 좋아요 토글 시 사용자가 기다려야 하는 시간 최소화

**해결책**: useTransition을 통한 낙관적 업데이트

- UI 변경을 먼저 처리하여 즉시 반응
- 서버 요청은 백그라운드에서 비차단적으로 실행
- 실패 시에만 상태를 복원하는 전략

**학습한 내용:**

- React 18+의 Concurrent Features 활용
- 사용자 경험과 데이터 일관성의 균형
- 에러 처리와 상태 복원 전략

### 3. Supabase 보안 강화: getSession vs getUser

#### 보안 취약점 발견과 해결

**초기 문제**: Server Actions에서 `supabase.auth.getSession()` 사용

```typescript
// ❌ 보안 위험이 있는 방식
const {
    data: { session },
    error: authError,
} = await supabase.auth.getSession();

if (authError || !session?.user) {
    throw new Error('로그인이 필요합니다.');
}
```

**보안 경고**:

```
Using the user object as returned from supabase.auth.getSession()
could be insecure! This value comes directly from the storage medium
and may not be authentic. Use supabase.auth.getUser() instead.
```

**해결책**: `getUser()`로 전환하여 서버 사이드 검증

```typescript
// ✅ 보안이 강화된 방식
const {
    data: { user },
    error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
    throw new Error('좋아요를 추가/제거하려면 로그인이 필요합니다.');
}
```

**학습 포인트:**

- **`getSession()`**: 클라이언트 스토리지(쿠키)에서 직접 읽음, 위조 가능
- **`getUser()`**: Supabase Auth 서버에 검증 요청, 신뢰할 수 있는 인증
- **Server Actions 보안**: 서버에서 실행되는 코드는 반드시 서버 사이드 검증 필요

### 4. PostgreSQL RPC 함수와 원자적 연산

#### 좋아요 토글을 위한 RPC 함수 설계

```sql
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
```

**학습한 핵심 개념:**

- **원자적 연산**: 좋아요 토글과 카운트 업데이트를 단일 트랜잭션으로 처리
- **SECURITY DEFINER**: RLS 우회를 위한 함수 소유자 권한 실행
- **JSON 반환**: 클라이언트에서 필요한 데이터를 구조화하여 반환
- **경쟁 조건 방지**: 동시 요청에도 데이터 일관성 보장

### 5. 캐시 무효화 전략과 성능 최적화

#### 다중 페이지 캐시 무효화의 필요성

```typescript
export async function toggleLikeAction(formData: FormData) {
    // ... 좋아요 토글 로직 ...

    // 세 페이지의 캐시 무효화
    revalidatePath(`/posts/${rawData.post_id}`); // 글 상세 페이지
    revalidatePath('/posts'); // 글 목록 페이지
    revalidatePath('/'); // 홈페이지
}
```

**고민했던 부분**: 왜 세 페이지 모두 무효화해야 하는가?

**분석 결과**:

1. **`/posts/[id]`**: 글 상세 페이지의 좋아요 버튼과 카운트
2. **`/posts`**: 글 목록의 PostCard에서 `likes_count` 표시
3. **`/`**: 홈페이지의 PostCard에서 `likes_count` 표시

**학습한 내용:**

- 데이터 일관성을 위한 포괄적 캐시 무효화 전략
- Next.js App Router의 캐시 시스템 이해
- 성능과 데이터 정확성의 균형점 찾기

### 6. 현대적 UX 패턴: Toast 없는 조용한 피드백

#### 소셜 미디어 UX 패턴 적용

**초기 구현**: Toast 알림과 낙관적 업데이트 병행

```typescript
// ❌ 과도한 피드백
toast.success('좋아요가 추가되었습니다.');
toast.error('좋아요 처리에 실패했습니다.');
```

**개선된 접근**: Toast 제거하여 자연스러운 경험

```typescript
// ✅ 조용한 에러 처리
try {
    const result = await toggleLikeAction(formData);
    setIsLiked(result.is_liked);
    setLikesCount(result.likes_count);
} catch {
    // 실패 시 조용히 상태 복원, Toast 없음
    setIsLiked(!newIsLiked);
    setLikesCount(initialLikesCount);
}
```

**결정 이유:**

- **즉시 시각적 피드백**: 하트 아이콘과 숫자 변화로 충분한 피드백
- **방해받지 않는 경험**: Toast가 사용자의 몰입을 방해하지 않음
- **현대적 패턴**: Instagram, Twitter 등 주요 플랫폼의 UX 패턴 적용

### 7. TypeScript 타입 안전성과 Zod 검증

#### 좋아요 시스템을 위한 타입 정의

```typescript
// 좋아요 상태 인터페이스
export interface LikeStatus {
    post_id: number;
    is_liked: boolean;
    likes_count: number;
}

// 좋아요 토글 결과 인터페이스
export interface ToggleLikeResult {
    success: boolean;
    is_liked: boolean;
    likes_count: number;
    error?: string;
}

// Zod 스키마
export const ToggleLikeSchema = z.object({
    post_id: z.number().int().positive('올바른 글 ID가 아닙니다.'),
});

export const GetLikeStatusSchema = z.object({
    post_id: z.number().int().positive('올바른 글 ID가 아닙니다.'),
    user_id: z.string().min(1, '사용자 ID가 필요합니다.').optional(),
});
```

**학습 포인트:**

- 런타임 검증과 컴파일 타임 타입 체크의 조합
- 에러 메시지 한국어화로 사용자 친화적 피드백
- 선택적 필드(`user_id`)를 통한 유연한 API 설계

### 8. 컴포넌트 재사용성과 Props 설계

#### 다양한 상황에서 사용 가능한 LikeButton 설계

```typescript
interface LikeButtonProps {
    postId: number;
    initialLikesCount: number;
    initialIsLiked: boolean;
    className?: string;
    showCount?: boolean;
    size?: 'sm' | 'default' | 'lg';
}

export function LikeButton({
    postId,
    initialLikesCount,
    initialIsLiked,
    className,
    showCount = true,
    size = 'default',
}: LikeButtonProps) {
    // 컴포넌트 구현...
}
```

**설계 원칙:**

- **초기값 주입**: 서버에서 계산된 초기 상태 전달
- **유연한 크기**: 다양한 컨텍스트에서 사용 가능
- **선택적 표시**: 좋아요 수 표시 여부 제어
- **스타일 확장성**: className을 통한 추가 스타일링 지원

### 9. Server Actions 아키텍처 패턴

#### 계층화된 Server Actions 구조

```typescript
// 1. Server Action (API 레이어)
export async function toggleLikeAction(formData: FormData) {
    try {
        // 인증 검증
        const {
            data: { user },
        } = await supabase.auth.getUser();

        // 데이터 검증
        const validationResult = ToggleLikeSchema.safeParse(rawData);

        // 비즈니스 로직 호출
        const result = await toggleLike(validationResult.data, user.id);

        // 캐시 무효화
        revalidatePath(`/posts/${rawData.post_id}`);

        return result;
    } catch (error) {
        throw error;
    }
}

// 2. 비즈니스 로직 레이어 (src/lib/likes.ts)
export async function toggleLike(
    { post_id }: ToggleLikeData,
    userId: string
): Promise<ToggleLikeResult> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase.rpc('toggle_like', {
        p_post_id: post_id,
        p_user_id: userId,
    });

    // 결과 처리 및 반환
}
```

**아키텍처 장점:**

- **관심사 분리**: API 처리와 비즈니스 로직 분리
- **재사용성**: 비즈니스 로직을 다른 컨텍스트에서도 활용 가능
- **테스트 용이성**: 각 레이어별 독립적 테스트 가능
- **유지보수성**: 변경사항이 특정 레이어에 국한됨

### 10. 접근성과 사용자 경험 고려사항

#### 다양한 사용자 상황에 대한 대응

```typescript
// 로그인하지 않은 사용자 처리
if (!user) {
    return (
        <Link
            href="/auth/login"
            className={cn(buttonVariants({ variant: 'ghost', size }), className)}
            aria-label="로그인하여 좋아요 기능 사용"
        >
            <Heart className={iconSizeClass} />
            {showCount && <span>{likesCount}</span>}
        </Link>
    );
}

// 로그인한 사용자 처리
return (
    <Button
        variant="ghost"
        size={size}
        onClick={handleToggleLike}
        disabled={isPending}
        className={cn(className)}
        aria-label={isLiked ? '좋아요 취소' : '좋아요 추가'}
        aria-pressed={isLiked}
    >
        <Heart
            className={cn(iconSizeClass, {
                'fill-red-500 text-red-500': isLiked,
                'text-muted-foreground': !isLiked,
            })}
        />
        {showCount && <span>{likesCount}</span>}
    </Button>
);
```

**접근성 고려사항:**

- **ARIA 속성**: `aria-label`, `aria-pressed`로 스크린 리더 지원
- **시각적 피드백**: 색상과 fill 상태로 좋아요 여부 표시
- **키보드 접근성**: Button 컴포넌트의 기본 키보드 지원
- **상태 표시**: `disabled` 상태로 중복 클릭 방지

## 기존 Phase에서 활용한 기술

### Phase 1-3: 기본 인프라

- **Next.js App Router**: 서버 컴포넌트에서 초기 좋아요 상태 조회, 클라이언트 컴포넌트에서 인터랙션 처리
- **TypeScript**: 좋아요 관련 모든 인터페이스와 함수에 완전한 타입 안전성 확보
- **Tailwind CSS + shadcn/ui**: 일관된 디자인 시스템으로 LikeButton 컴포넌트 구현

### Phase 4: 인증 시스템 심화 활용

- **Supabase Auth**: 좋아요 권한 확인과 사용자 식별에 `getUser()` 보안 강화 방식 적용
- **useAuth 훅**: 로그인 상태 확인과 사용자 정보 접근
- **보안 강화**: Server Actions에서 서버 사이드 인증 검증 패턴 확립

### Phase 5: Server Actions 패턴 확장

- **폼 데이터 기반 처리**: 기존 글/댓글 작성과 동일한 패턴으로 좋아요 토글 구현
- **Zod 검증**: 기존 스키마 패턴을 좋아요에 적용하여 일관된 데이터 검증
- **revalidatePath**: 다중 페이지 캐시 무효화를 통한 데이터 일관성 확보

### Phase 6-7: 성능 최적화 기법 적용

- **React Query**: 좋아요 상태 캐싱과 무효화 전략 (기본 설정 활용)
- **최적화 패턴**: 기존 무한 스크롤에서 학습한 성능 최적화 기법 적용

### Phase 8: 댓글 시스템에서의 낙관적 업데이트 경험

- **낙관적 업데이트**: 댓글 시스템에서 구현한 패턴을 좋아요에 적용
- **useTransition**: 댓글에서 학습한 백그라운드 처리 패턴 재활용
- **상태 복원 전략**: 실패 시 이전 상태로 복원하는 검증된 패턴 적용

## 핵심 의사결정과 그 이유

### 1. PostgreSQL RPC 함수 vs 클라이언트 다중 쿼리

**결정**: RPC 함수를 통한 서버 사이드 원자적 처리
**이유**:

- 좋아요 토글과 카운트 업데이트의 원자성 보장
- 네트워크 라운드트립 최소화 (1회 호출)
- 경쟁 조건(race condition) 완전 방지
- 서버에서 비즈니스 로직 관리로 보안성 향상

### 2. 캐시 무효화 범위 결정

**결정**: 세 페이지(`/posts/[id]`, `/posts`, `/`) 모두 무효화
**이유**:

- 데이터 일관성 최우선 (PostCard의 likes_count 표시)
- 사용자가 좋아요 후 다른 페이지 이동 시에도 정확한 데이터 표시
- Next.js의 효율적인 캐시 시스템으로 성능 영향 최소화

### 3. Toast 알림 제거 결정

**결정**: 좋아요 토글 시 Toast 알림 완전 제거
**이유**:

- 낙관적 UI 업데이트로 충분한 시각적 피드백 제공
- 현대적 소셜 미디어 UX 패턴 적용 (Instagram, Twitter 방식)
- 사용자 몰입도 향상 (방해 요소 제거)
- 조용한 에러 처리로 자연스러운 사용자 경험

### 4. getSession에서 getUser로 보안 강화

**결정**: 모든 Server Actions에서 `getUser()` 사용
**이유**:

- 클라이언트 스토리지 기반 인증의 위조 가능성 차단
- Supabase Auth 서버를 통한 실시간 검증
- 보안 모범 사례 준수 및 향후 확장성 확보

## 향후 개선 방향

### 1. 실시간 좋아요 동기화

- Supabase Realtime을 활용한 실시간 좋아요 수 업데이트
- 다른 사용자의 좋아요 실시간 반영
- WebSocket 기반 효율적인 데이터 동기화

### 2. 좋아요 분석 및 통계

- 사용자별 좋아요 패턴 분석
- 인기 글 추천 알고리즘 개발
- 좋아요 트렌드 시각화

### 3. 소셜 기능 확장

- 좋아요한 사용자 목록 표시
- 좋아요 기반 글 추천 시스템
- 사용자 프로필에 좋아요한 글 목록

### 4. 성능 최적화

- 좋아요 수 캐싱 전략 고도화
- Redis를 통한 실시간 카운터 구현
- 배치 처리를 통한 데이터베이스 부하 분산

## 결론

Phase 9 좋아요 시스템 구현을 통해 현대적 웹 애플리케이션의 핵심 기술들을 종합적으로 학습할 수 있었습니다.

특히 낙관적 UI 업데이트와 useTransition을 활용하여 Instagram, Twitter 수준의 즉시 반응하는 인터페이스를 구현할 수 있었고, Supabase 보안 강화(`getUser()`)를 통해 프로덕션 수준의 안전한 인증 시스템을 구축했습니다.

또한 PostgreSQL RPC 함수를 활용한 원자적 연산과 다중 페이지 캐시 무효화 전략을 통해 데이터 일관성과 성능을 모두 확보할 수 있었으며, Toast 제거를 통한 조용한 UX 개선으로 현대적 소셜 미디어 패턴을 성공적으로 적용했습니다.

이러한 경험은 향후 더 복잡한 소셜 기능이나 실시간 인터랙션이 필요한 프로젝트에서도 활용할 수 있는 견고한 기반이 될 것입니다.
