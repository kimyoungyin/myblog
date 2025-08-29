# 학습정리 - Phase 6 (글 목록/상세 + 조회수 증가)

## 목표

- 글 목록/상세 페이지 완성도 강화 ✅
- 조회수 증가 로직 구현 및 에러 처리 UX 개선 ✅
- **무한 스크롤 구현 및 최적화** ✅
- **정렬 및 필터링 시스템 구현** ✅
- **UI 컴포넌트 개선 및 재사용성 향상** ✅

## 구현 내용 요약

- 홈페이지 최신 글 6개 + 반응형 그리드 구성 ✅
- 글 상세 페이지 (메타 정보, 해시태그, 본문 렌더링) ✅
- 조회수 증가 Server Action 추가 (Service Role 사용) ✅
- 실패 시 비파괴적 경고 UI 및 `posts/[id]/error.tsx` 처리 ✅
- **무한 스크롤을 통한 포스트 목록 페이지네이션** ✅
- **4가지 정렬 방식 구현 (최신순, 인기순, 좋아요순, 오래된순)** ✅
- **해시태그별 필터링 및 정렬 동시 적용** ✅
- **React Key 중복 에러 해결 (2차 정렬로 데이터 일관성 확보)** ✅
- **HashtagLink 재사용 가능한 UI 컴포넌트 생성** ✅
- **PostCard UI 개선 및 모든 해시태그 표시** ✅
- **사용되지 않는 FileUploadZone 컴포넌트 제거** ✅

## 배운 점

- Server Actions
    - 서버에서만 실행되며 민감 키 접근 가능
    - 변이(쓰기) 로직은 Server Action으로 캡슐화
- Supabase 클라이언트 선택
    - Browser/SSR 클라이언트(`createClient`): RLS 적용됨
    - Service Role(`createServiceRoleClient`): RLS 우회 (서버 전용)
    - 조회수처럼 비로그인 사용자도 기록해야 하는 쓰기는 Service Role로 처리
- RLS 개념
    - 기본은 읽기/쓰기 제한 정책
    - Service Role 키 사용 시 우회되므로 보안 경계는 반드시 서버에 둠
- 조회수 증가 패턴
    - 단순 read-modify-write는 경쟁 조건 발생 가능
    - 권장: Postgres 함수 + RPC로 `SET view_count = view_count + 1` 원자 증가
    - 대안: Supabase Edge Function 또는 DB Trigger로 처리
- Next.js App Router 에러 처리
    - 페이지 단위 `error.tsx`로 에러 경계 구현
    - 서버 컴포넌트에서 `throw` → 가까운 `error.tsx`에서 UI 처리
    - 사용자 노출 메시지와 내부 로그 메시지 분리
- UX 가이드
    - 조회수 증가 실패는 본문 열람을 막지 않음(비파괴)
    - 경고 배너로 피드백, 재시도 버튼 제공 가능
- **무한 스크롤 구현 패턴**
    - **React Query + useInfiniteQuery**: 서버 상태 관리 및 페이지네이션
    - **useInView**: Intersection Observer 기반 스크롤 감지
    - **서버 + 클라이언트 하이브리드**: 초기 데이터는 서버, 추가 데이터는 클라이언트
    - **중복 요청 방지**: useInView의 onChange 콜백 활용
- **정렬 시스템 최적화**
    - **2차 정렬**: React Key 중복 에러 방지를 위한 id 기준 보조 정렬
    - **데이터베이스 레벨 정렬**: 서버에서 안정적인 순서 보장
    - **정렬 안정성**: 동일한 값에 대한 일관된 순서 유지
- **UI 컴포넌트 재사용성**
    - **HashtagLink**: 재사용 가능한 해시태그 링크 컴포넌트
    - **Props 인터페이스**: variant, className, showHash 등 유연한 옵션
    - **일관된 스타일링**: 모든 해시태그가 동일한 디자인 패턴
- **성능 최적화 전략**
    - **페이지 크기 상수화**: 일관된 페이지네이션 관리
    - **캐싱 전략**: React Query를 통한 효율적인 데이터 관리
    - **중복 요청 방지**: 상태 기반 조건 확인으로 불필요한 API 호출 차단

## 무한 스크롤 구현 상세 가이드

### 1. 아키텍처 설계

#### **서버 컴포넌트 (초기 데이터)**

```tsx
// posts/page.tsx
export default async function PostsPage({
    searchParams,
}: {
    searchParams: { sort?: string; tag?: string };
}) {
    const sort = (searchParams.sort as PostSort) || 'latest';
    const tag = searchParams.tag || '';

    // 초기 데이터 로딩 (SEO + 빠른 첫 렌더링)
    const initialPosts = await getPostsAction(1, PAGE_SIZE, sort, tag);

    return (
        <PostWrapper initialPosts={initialPosts.posts} sort={sort} tag={tag} />
    );
}
```

#### **클라이언트 컴포넌트 (무한 스크롤)**

```tsx
// PostWrapper.tsx
'use client';

export default function PostWrapper({ initialPosts, sort, tag }) {
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
        useInfiniteQuery({
            queryKey: ['posts', sort, tag],
            queryFn: ({ pageParam }) => getPostsAction(pageParam, sort, tag),
            initialPageParam: 1,
            initialData: {
                pages: [{ posts: initialPosts, total: initialPosts.length }],
                pageParams: [1],
            },
            getNextPageParam: (lastPage, pages) => {
                const hasMorePosts = lastPage.posts.length === PAGE_SIZE;
                return hasMorePosts ? pages.length + 1 : undefined;
            },
        });
}
```

### 2. 핵심 구현 패턴

#### **React Query 설정**

```tsx
const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isError } =
    useInfiniteQuery({
        // 쿼리 키: 정렬과 태그 변경 시 새로운 쿼리
        queryKey: ['posts', sort, tag],

        // 페이지 함수: pageParam을 받아서 API 호출
        queryFn: ({ pageParam }) => getPostsAction(pageParam, sort, tag),

        // 초기 페이지 번호
        initialPageParam: 1,

        // 초기 데이터: 서버에서 받은 첫 페이지
        initialData: {
            pages: [{ posts: initialPosts, total: initialPosts.length }],
            pageParams: [1],
        },

        // 다음 페이지 존재 여부 판단
        getNextPageParam: (lastPage, pages) => {
            const hasMorePosts = lastPage.posts.length === PAGE_SIZE;
            return hasMorePosts ? pages.length + 1 : undefined;
        },

        // 성능 최적화 설정
        refetchOnWindowFocus: false, // 윈도우 포커스 시 재조회 비활성화
        retry: 2, // 재시도 횟수 제한
        gcTime: 0, // 가비지 컬렉션 즉시
        refetchOnMount: false, // 마운트 시 재조회 비활성화
    });
```

#### **데이터 처리 및 메모이제이션**

```tsx
// 모든 페이지의 포스트를 하나의 배열로 평탄화
const posts = useMemo(
    () => data?.pages.flatMap((page) => page.posts) || [],
    [data?.pages]
);
```

### 3. 스크롤 감지 및 페이지 로딩

#### **useInView 설정 (핵심)**

```tsx
const { ref } = useInView({
    threshold: 0.1, // 10% 보일 때 트리거
    rootMargin: '100px', // 뷰포트 하단 100px 전에 트리거
    triggerOnce: false, // 여러 번 트리거 허용
    delay: 0, // 지연 제거로 즉시 반응

    // onChange 콜백으로 중복 요청 방지
    onChange: (inView) => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    },
});
```

#### **중복 요청 방지 전략**

```tsx
// ❌ 잘못된 방식: useEffect + 의존성 배열
useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
    }
}, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);
// 문제: 의존성 배열 변경으로 인한 중복 실행

// ✅ 올바른 방식: useInView onChange 콜백
onChange: (inView) => {
    if (inView && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
    }
};
// 장점: 실제 inView 변경 시에만 실행, 중복 방지
```

### 4. UI 렌더링 및 로딩 상태

#### **포스트 목록 렌더링**

```tsx
return (
    <>
        {posts.length === 0 ? (
            <EmptyHint />
        ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                ))}
            </div>
        )}

        {/* 무한 스크롤 트리거 영역 */}
        {hasNextPage && (
            <div ref={ref} className="py-8 text-center">
                {isFetchingNextPage && (
                    <div className="flex items-center justify-center gap-2">
                        <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
                        <span className="text-muted-foreground text-sm">
                            더 많은 글을 불러오는 중...
                        </span>
                    </div>
                )}
            </div>
        )}
    </>
);
```

### 5. 성능 최적화 전략

#### **메모이제이션**

```tsx
// posts 배열 메모이제이션
const posts = useMemo(
    () => data?.pages.flatMap((page) => page.posts) || [],
    [data?.pages]
);

// 컴포넌트 메모이제이션 (필요시)
export default React.memo(PostWrapper);
```

#### **React Query 최적화**

```tsx
{
    // 캐시 설정
    staleTime: 5 * 60 * 1000,  // 5분간 데이터를 "신선"하다고 간주
    gcTime: 10 * 60 * 1000,    // 10분간 메모리에 유지

    // 재조회 설정
    refetchOnWindowFocus: false,  // 윈도우 포커스 시 재조회 비활성화
    refetchOnMount: false,        // 마운트 시 재조회 비활성화
    refetchOnReconnect: true,     // 네트워크 재연결 시 재조회
}
```

#### **프로덕션 환경 최적화된 캐싱 전략**

```tsx
const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isError } =
    useInfiniteQuery({
        // ... 기본 설정 ...

        // 캐싱 전략
        staleTime: 5 * 60 * 1000, // 5분간 데이터를 "신선"하다고 간주
        gcTime: 10 * 60 * 1000, // 10분간 캐시 유지

        // 자동 재조회 전략
        refetchOnWindowFocus: true, // 윈도우 포커스 시 최신 데이터 동기화
        refetchOnMount: true, // 마운트 시 최신 데이터 확인
        refetchOnReconnect: true, // 네트워크 재연결 시 데이터 동기화
        refetchInterval: 2 * 60 * 1000, // 2분마다 백그라운드에서 재조회
        refetchIntervalInBackground: true, // 백그라운드에서도 재조회

        // 재시도 전략
        retry: 3, // 네트워크 오류 시 3회 재시도
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 지수 백오프
    });
```

#### **캐싱 설정별 효과 및 장점**

1. **`staleTime: 5분`**
    - 5분 내 방문 시 캐시된 데이터 즉시 표시
    - 불필요한 API 호출 방지로 성능 향상
    - 사용자 경험 개선 (즉시 응답)

2. **`gcTime: 10분`**
    - 메모리에 10분간 데이터 유지
    - 빠른 페이지 전환 시 캐시 히트율 향상
    - 메모리 효율성과 성능의 균형

3. **`refetchInterval: 2분`**
    - 백그라운드에서 자동으로 최신 데이터 확인
    - 블로그 글의 실시간성 향상
    - 사용자가 최신 콘텐츠를 놓치지 않음

4. **`refetchIntervalInBackground: true`**
    - 탭이 백그라운드에 있어도 데이터 업데이트 계속
    - 사용자가 탭을 다시 열었을 때 최신 데이터 보장

5. **`refetchOnWindowFocus: true`**
    - 다른 탭에서 돌아올 때 최신 데이터 동기화
    - 멀티태스킹 환경에서 데이터 일관성 유지

6. **`refetchOnMount: true`**
    - 컴포넌트 마운트 시 최신 데이터 확인
    - 페이지 새로고침 시 최신 상태 보장

7. **`retry: 3`**
    - 네트워크 오류 시 안정적인 재시도
    - 일시적인 연결 문제 해결
    - 사용자 경험 향상

### 6. 에러 처리 및 사용자 경험

#### **에러 상태 처리**

```tsx
if (isError) {
    return (
        <Card>
            <CardContent className="p-12 text-center">
                <p className="text-destructive mb-4">
                    글을 불러오는 중 오류가 발생했습니다.
                </p>
                <Button onClick={() => window.location.reload()}>
                    다시 시도
                </Button>
            </CardContent>
        </Card>
    );
}
```

#### **빈 상태 처리**

```tsx
function EmptyHint() {
    return (
        <Card>
            <CardContent className="p-12 text-center">
                <p className="text-muted-foreground mb-4 text-lg">
                    {'아직 작성된 글이 없습니다.'}
                </p>
                <AdminCreateHint />
            </CardContent>
        </Card>
    );
}
```

### 7. 데이터 플로우 및 상태 관리

#### **데이터 흐름**

1. **서버 렌더링**: 초기 포스트 데이터 로딩
2. **클라이언트 초기화**: React Query로 초기 데이터 설정
3. **스크롤 감지**: useInView로 하단 요소 가시성 감지
4. **페이지 로딩**: fetchNextPage()로 다음 페이지 데이터 요청
5. **상태 업데이트**: 새로운 데이터를 기존 배열에 추가
6. **UI 업데이트**: 추가된 포스트들을 그리드에 렌더링

#### **상태 관리**

```tsx
// React Query 상태
const {
    data,              // 모든 페이지 데이터
    fetchNextPage,     // 다음 페이지 로딩 함수
    hasNextPage,       // 다음 페이지 존재 여부
    isFetchingNextPage, // 다음 페이지 로딩 중 상태
    isError            // 에러 발생 여부
} = useInfiniteQuery({...});

// 컴포넌트 상태
const posts = useMemo(() => data?.pages.flatMap(page => page.posts) || [], [data?.pages]);
```

### 8. 문제 해결 및 디버깅

#### **중복 요청 문제**

```tsx
// 문제: useEffect로 인한 중복 실행
useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
        fetchNextPage(); // 여러 번 실행될 수 있음
    }
}, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

// 해결: useInView onChange 콜백 사용
onChange: (inView) => {
    if (inView && hasNextPage && !isFetchingNextPage) {
        fetchNextPage(); // inView 변경 시에만 실행
    }
};
```

#### **렌더링 최적화**

```tsx
// 불필요한 리렌더링 방지
const posts = useMemo(
    () => data?.pages.flatMap((page) => page.posts) || [],
    [data?.pages]
);

// 디버깅을 위한 로그
useEffect(() => {
    console.log('Posts length changed:', posts.length);
}, [posts.length]);
```

### 9. 테스트 및 검증

#### **기능 테스트 체크리스트**

- [ ] 초기 데이터 정상 로딩 (서버 렌더링)
- [ ] 스크롤 시 추가 데이터 로딩
- [ ] 로딩 인디케이터 정상 표시
- [ ] 마지막 페이지 도달 시 추가 요청 중단
- [ ] 정렬/태그 변경 시 쿼리 재실행
- [ ] 에러 발생 시 적절한 UI 표시

#### **성능 테스트**

- [ ] 메모리 사용량 확인 (페이지 수 증가 시)
- [ ] 스크롤 성능 (60fps 유지)
- [ ] 네트워크 요청 최적화 (중복 요청 없음)
- [ ] 캐시 효율성 (불필요한 재요청 없음)

## 개선 여지

- 원자적 증가: RPC 함수로 리팩터링하여 단일 쿼리로 처리
- 중복 카운트 방지: 세션/쿠키/로컬스토리지 기반 기간 제한
- 고유 사용자 기준 집계: IP+UA 해시 또는 인증 사용자 기준 정책
- 캐싱: React Query 도입 및 무한 스크롤 연동, 정렬/필터 쿼리키 설계 ✅
- **무한 스크롤 최적화**: 가상화(virtualization) 도입으로 대량 데이터 처리
- **접근성 개선**: 키보드 네비게이션 및 스크린 리더 지원
- **추가 캐싱 최적화**:
    - 글 상세 페이지 캐싱 전략 수립 ✅ (Next.js 기본 페이지 캐싱 활용)
    - 해시태그별 글 목록 캐싱 최적화 ✅ (Next.js 기본 페이지 캐싱 활용)
    - 검색 결과 캐싱 및 무효화 전략
    - 이미지 캐싱 및 CDN 최적화

## React Query 중복 Key 에러 해결 과정

### 🚨 **발생한 문제**

무한 스크롤 구현 후 **좋아요순(`likes`)이나 인기순(`popular`) 정렬에서 React 중복 key 에러가 발생**했습니다.

#### **에러 원인 분석**

1. **정렬 기준별 데이터 특성 차이**
    - **최신순/오래된순**: `created_at` 기준으로 고유한 순서 보장
    - **좋아요순/인기순**: `likes_count` 또는 `view_count` 기준으로 **동일한 값이 여러 글에 존재**

2. **React Key 중복 발생 시나리오**

    ```typescript
    // 예시: 좋아요가 5개인 글이 3개 있다면
    posts = [
        { id: 1, likes: 5, title: '글1' },
        { id: 2, likes: 5, title: '글2' }, // 같은 likes 값
        { id: 3, likes: 5, title: '글3' }, // 같은 likes 값
    ];

    // 정렬 후 순서가 보장되지 않아 React가 key 중복으로 인식
    // React Query 캐시에서 동일한 데이터가 다른 순서로 렌더링될 수 있음
    ```

3. **React Query 캐시 키 문제**
    ```typescript
    // PostWrapper.tsx의 useInfiniteQuery
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isError } =
        useInfiniteQuery({
            queryKey: ['posts', sort, tag], // sort가 변경되어도 캐시가 혼재됨
            // ...
        });
    ```

### 🤔 **고민한 해결 방법들**

#### **방법 1: React Query 캐시 키에 고유 식별자 추가**

```typescript
queryKey: ['posts', sort, tag, 'infinite'], // 고유 키 추가
```

- ✅ React Query 캐시 분리
- ❌ 데이터 자체의 정렬 안정성은 보장되지 않음
- ❌ 서버에서 전달되는 데이터 순서가 여전히 불안정

#### **방법 2: 정렬 기준 변경 시 캐시 초기화**

```typescript
useEffect(() => {
    queryClient.removeQueries({
        queryKey: ['posts', sort, tag],
    });
}, [sort, tag, queryClient]);
```

- ✅ 캐시 혼재 문제 해결
- ❌ 불필요한 API 재호출
- ❌ 사용자 경험 저하 (로딩 상태 반복)

#### **방법 3: 서버 사이드에서 정렬 안정성 보장 (최종 선택)**

```typescript
// Supabase 쿼리에서 2차 정렬 추가
case 'popular':
    // 인기순: 조회수 내림차순 → id 오름차순 (2차 정렬로 안정성 보장)
    sortedQuery = query
        .order('view_count', { ascending: false })
        .order('id', { ascending: true });
    break;
case 'likes':
    // 좋아요순: 좋아요 수 내림차순 → id 오름차순 (2차 정렬로 안정성 보장)
    sortedQuery = query
        .order('likes_count', { ascending: false })
        .order('id', { ascending: true });
    break;
```

### ✅ **최종 해결책 및 적용**

#### **1. 데이터베이스 레벨에서 해결**

- **2차 정렬 추가**: `id` 오름차순으로 정렬 안정성 보장
- **서버에서 일관된 순서**: React Query 캐시와 무관하게 데이터 자체가 안정적

#### **2. 수정된 코드**

```typescript:src/lib/posts.ts
// 정렬 기준에 따른 쿼리 구성
let sortedQuery = query;
switch (sortBy) {
    case 'latest':
        sortedQuery = query.order('created_at', { ascending: false });
        break;
    case 'oldest':
        sortedQuery = query.order('created_at', { ascending: true });
        break;
    case 'popular':
        // 인기순: 조회수 내림차순 → id 오름차순 (2차 정렬로 안정성 보장)
        sortedQuery = query
            .order('view_count', { ascending: false })
            .order('id', { ascending: true });
        break;
    case 'likes':
        // 좋아요순: 좋아요 수 내림차순 → id 오름차순 (2차 정렬로 안정성 보장)
        sortedQuery = query
            .order('likes_count', { ascending: false })
            .order('id', { ascending: true });
        break;
    default:
        sortedQuery = query.order('created_at', { ascending: false });
}
```

### 🎯 **해결 효과**

1. **중복 key 에러 완전 해결**
    - React가 항상 동일한 순서로 렌더링
    - 컴포넌트 재사용 및 업데이트 최적화

2. **데이터 일관성 보장**
    - 같은 정렬 기준으로 조회 시 항상 동일한 결과
    - 사용자 경험 향상 (예측 가능한 정렬)

3. **성능 최적화**
    - 클라이언트에서 추가 정렬 로직 불필요
    - 데이터베이스 인덱스 활용으로 빠른 정렬

4. **캐시 일관성**
    - React Query 캐시와 데이터베이스 결과 일치
    - 정렬 기준 변경 시에도 안정적인 동작

### 🔍 **학습한 교훈**

1. **React Key 중복 문제의 근본 원인 파악**
    - 단순히 key 값만 변경하는 것이 아닌 **데이터 자체의 안정성** 확보 필요

2. **서버 사이드 vs 클라이언트 사이드 해결책 선택**
    - 데이터 정렬은 **서버에서 처리**하는 것이 더 효율적
    - 클라이언트에서의 우회책보다 **근본적인 해결**이 중요

3. **데이터베이스 정렬의 중요성**
    - 단일 정렬 기준만으로는 **동일 값에 대한 순서 보장 불가**
    - **2차 정렬**을 통한 안정성 확보 필요

4. **React Query 캐싱과 데이터 일관성의 균형**
    - 캐싱 최적화도 중요하지만 **데이터 정확성**이 우선
    - 서버에서 안정적인 데이터를 제공하는 것이 클라이언트 최적화의 기반

### 📚 **관련 기술적 개념**

- **정렬 안정성 (Sort Stability)**: 동일한 키 값에 대해 순서가 일정하게 유지되는 성질
- **2차 정렬 (Secondary Sort)**: 주 정렬 기준이 동일할 때 사용하는 보조 정렬 기준
- **React Key 중복**: React가 컴포넌트를 식별할 때 동일한 key가 여러 개 존재하는 문제
- **데이터베이스 정렬 최적화**: 인덱스 활용을 통한 효율적인 정렬 처리

## 테스트 체크리스트

- 비로그인/로그인 상태 모두에서 조회수 증가 동작
- 증가 실패 시 경고 배너 표시 및 본문 정상 렌더링
- 심각 오류 시 `posts/[id]/error.tsx`에서 우아한 처리
- 목록/카드/상세의 조회수 UI 일관성 유지
- **무한 스크롤 동작 검증**
    - 초기 데이터 정상 로딩
    - 스크롤 시 추가 데이터 로딩
    - 로딩 상태 및 에러 처리
    - 정렬/태그 필터링 시 쿼리 재실행
- **정렬 기능 검증** ✅
    - 최신순/오래된순 정렬 정상 동작 ✅
    - 좋아요순/인기순 정렬 시 React Key 중복 에러 없음 ✅
    - 정렬 기준 변경 시 데이터 일관성 유지 ✅
- **성능 및 사용자 경험**
    - 중복 요청 방지
    - 부드러운 스크롤 경험
    - 적절한 로딩 인디케이터
    - 정렬 기준별 캐시 최적화

## 원자적 증가(Atomic Increment)와 동시성

### 문제: Lost Update와 경쟁 조건

- read-modify-write(읽고-증가-쓰기) 패턴은 동시 요청 시 마지막 쓰기만 반영될 수 있음.
- 두 요청이 같은 `view_count`를 읽고 각자 `+1` 후 업데이트하면 1회만 증가하는 "lost update"가 발생.

### 해결: DB-side RPC로 원자적 증가

- Postgres 단일 UPDATE: `SET view_count = COALESCE(view_count, 0) + 1`
- DB 함수(`increment_view_count`) + RPC로 한 번의 호출에 원자 수행
- 장점:
    - 경쟁 조건 제거(단일 UPDATE는 원자적)
    - 네트워크 호출 1회로 단축(성능 및 지연시간 감소)
    - 서버에 로직 집중(보안·유지보수 유리)

### PostgreSQL 함수 설계 포인트

- `SECURITY DEFINER`: 함수 소유자 권한으로 실행되어 RLS 우회 가능
- 반환값: `RETURN FOUND;`로 대상 행 존재 여부(true/false) 전달
- 권한: `GRANT EXECUTE ON FUNCTION increment_view_count(INTEGER) TO anon, authenticated, service_role`
- 안전성:
    - 입력은 단일 정수 `post_id`만 허용(주입 위험 낮음)
    - 본문은 단일 UPDATE로 최소 권한 원칙에 부합
- 성능:
    - `posts.id` 기본키/인덱스 존재 → O(1) 수준 탐색
    - 동시성: MVCC + row-level lock으로 충돌 없이 누적 증가

### Supabase RPC 호출과 에러 전파

- 호출 흐름(서버 액션):
    - `supabase.rpc('increment_view_count', { post_id })` 호출
    - `error` 발생 시 의미있는 메시지(`'조회수 증가 실패'`, `'해당 글을 찾을 수 없습니다'`)로 throw
    - `page.tsx`의 기존 try/catch 및 `viewCountErrorMessage` 경고 배너와 자연스럽게 연동
- 왜 Service Role인가?
    - 비로그인 사용자도 증가 가능해야 함
    - RLS 우회를 안전하게 허용(서버에서만 사용)

### 대안 및 선택 기준

- 대안 1: 클라이언트에서 단일 UPDATE 직접 실행
    - RLS, 권한, 보안 고려 필요 → 서버-사이드에 집중하는 편이 안전
- 대안 2: Trigger/Materialized View
    - 과도한 복잡도. 단순 카운트 증가는 RPC가 적합
- 대안 3: Advisory Lock
    - 불필요(단일 UPDATE 원자성으로 충분)

### 트랜잭션/격리 레벨 이해

- Postgres는 UPDATE 시 해당 행에 대한 row-level lock 확보
- 동시 요청이 와도 각 요청은 순차적으로 증가 → 누락 없음
- 추가적인 명시적 잠금은 불필요

### 테스트 체크리스트(동시성)

- 단일 요청: 1 증가 확인
- N개의 동시 요청: 정확히 N 증가
- 존재하지 않는 `post_id`: false 반환 → 에러 메시지 매핑 확인
- 비로그인 상태: 정상 증가
- 에러 시 `page.tsx` 경고 배너 표시 유지

### 운영·배포/마이그레이션

- SQL 마이그레이션 파일을 저장/버전관리(재현성, 롤백)
- `CREATE OR REPLACE FUNCTION` + `GRANT`는 안전하게 재실행 가능
- 프리뷰/프로덕션/팀원 로컬 환경에 동일하게 배포

### 보안 유의점

- `SECURITY DEFINER` 사용 시 함수 본문은 최소 작업만 수행(UPDATE 1문)
- 함수 소유자/스키마 권한을 관리하고 불필요한 권한 부여 금지
- 서비스 키는 서버에서만 사용(클라이언트 번들 포함 금지)

## 글 상세 조회 에러 처리 (PostgREST .single())

### 왜 수정이 필요했나?

- Supabase PostgREST의 `.single()`는 행이 없을 때도 오류를 발생시킴
- 이 오류를 그대로 throw하면 애플리케이션 레벨에서 500류로 처리될 위험
- 의도는 "존재하지 않는 글"을 404(notFound)로 처리하는 것 → `null` 반환이 더 정확

### 적용한 전략

- `getPost(postId): Promise<Post | null>`에서 오류를 유형화하여 처리
- PostgREST 오류 중 "row not found" 신호만 `null`로 반환, 나머지는 `throw`

### 구현 포인트

- 타입 협소화: `import type { PostgrestError } from '@supabase/supabase-js'`
- "row not found" 판별(방어적 체크):
    - 코드: `PGRST116`
    - details: 포함 문자열 `"0 rows"`
    - message: 포함 문자열 `"no rows"`
- 그 외 오류는 `throw new Error('글 상세 조회에 실패했습니다.', { cause: error })`
- 상위(페이지)에서는 `null` → `notFound()`로 일관 처리 가능

### 테스트 체크리스트

- 존재하는 ID: 정상 조회 및 해시태그 매핑
- 존재하지 않는 ID: `null` 반환 → 페이지에서 `notFound()` 호출
- DB 오류(권한 문제 등): 의미있는 에러 throw, 로깅 가능

### 입력 검증과 에러 네이밍 규약

- 입력 검증: `PostIdSchema.safeParse({ id: String(postId) })`로 숫자 ID 보장
- 실패 시 단일 에러 네임 사용: `error.name = 'VIEW_COUNT_ERROR'`
    - 호출부에서 `if (error.name === 'VIEW_COUNT_ERROR')`로 일관 분기 가능
    - 메시지는 사용자 친화적으로, cause에는 원본 오류 첨부(디버깅 용)
- 결과 검증: RPC가 `false` 반환 시 "대상 없음"으로 간주하여 동일 네임으로 throw
