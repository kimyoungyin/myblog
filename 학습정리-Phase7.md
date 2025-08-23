# 마크다운 기반 블로그 프로젝트 학습정리

## Phase 7: 검색 및 필터링 ✅

### 완료된 작업

#### 1. 검색바 컴포넌트 구현

- [x] **SearchBar 컴포넌트** (`src/components/ui/search-bar.tsx`)
    - 디바운싱을 통한 검색 성능 최적화 (300ms 지연)
    - URL 파라미터 기반 검색 상태 관리
    - 검색어 초기화 기능 (X 버튼)
    - 검색 시 페이지 자동 리셋 (page=1)
    - 반응형 디자인 및 접근성 고려

#### 2. 검색 결과 페이지 구현

- [x] **검색 페이지** (`src/app/search/page.tsx`)
    - 검색바를 최상단에 고정 (sticky positioning)
    - Suspense를 통한 로딩 상태 관리
    - 검색어가 없을 때의 안내 메시지
    - 뒤로가기 버튼으로 글 목록으로 이동

#### 3. 검색 결과 래퍼 컴포넌트

- [x] **SearchResultsWrapper** (`src/components/search/SearchResultsWrapper.tsx`)
    - React Query의 `useInfiniteQuery`를 활용한 무한 스크롤
    - 검색 결과별 캐싱 전략 구현
    - Intersection Observer를 통한 자동 페이지 로딩
    - 검색 결과가 없을 때의 사용자 친화적 안내

#### 4. 검색 결과 스켈레톤 UI

- [x] **SearchResultsSkeleton** (`src/components/ui/search-results-skeleton.tsx`)
    - 검색 결과 로딩 중 시각적 피드백
    - 그리드 레이아웃에 맞춘 스켈레톤 디자인
    - 단일 카드와 전체 그리드 스켈레톤 분리

#### 5. URL 파라미터 기반 검색 상태 관리

- [x] **Next.js App Router의 searchParams 활용**
    - `useSearchParams`와 `useRouter`를 통한 URL 상태 관리
    - 검색어 변경 시 자동으로 URL 업데이트
    - 브라우저 뒤로가기/앞으로가기 지원
    - 검색 상태의 영속성 보장

#### 6. 검색 결과 캐싱 전략

- [x] **React Query를 통한 검색 결과 캐싱**
    - 검색어별 결과 캐싱 (`queryKey: ['search', searchQuery]`)
    - 검색 결과 페이지네이션 캐싱
    - `staleTime: 5분`, `gcTime: 10분` 설정
    - 윈도우 포커스 시 자동 재조회 비활성화

### 학습 내용

#### 1. 디바운싱을 통한 검색 성능 최적화

**문제점:**

- 사용자가 타이핑할 때마다 API 호출이 발생
- 불필요한 서버 요청으로 인한 성능 저하
- 사용자 경험 저하

**해결책:**

```typescript
import { useDebouncedCallback } from 'use-debounce';

// 300ms 지연 후 검색 실행
const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '1');

    if (term) {
        params.set('q', term);
    } else {
        params.delete('q');
    }

    replace(`${pathname}?${params.toString()}`);
}, 300);
```

**학습 포인트:**

- `use-debounce` 라이브러리의 활용법
- 디바운싱 시간 설정의 중요성 (너무 짧으면 의미 없음, 너무 길면 반응성 저하)
- 검색어 변경 시 페이지 자동 리셋의 필요성

#### 2. React Query의 useInfiniteQuery 활용

**기존 페이지네이션 vs 무한 스크롤:**

- **페이지네이션**: 사용자가 명시적으로 페이지를 선택해야 함
- **무한 스크롤**: 스크롤만 하면 자동으로 다음 페이지 로딩

**구현 방법:**

```typescript
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
        queryKey: ['search', searchQuery],
        queryFn: ({ pageParam }) =>
            getPostsAction(pageParam, 'latest', undefined, searchQuery),
        initialPageParam: 1,
        getNextPageParam: (lastPage, pages) => {
            const hasMorePosts = lastPage.posts.length === PAGE_SIZE;
            return hasMorePosts ? pages.length + 1 : undefined;
        },
        staleTime: 5 * 60 * 1000, // 5분간 데이터를 "신선"하다고 간주
        gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
    });
```

**학습 포인트:**

- `getNextPageParam` 함수의 역할과 구현 방법
- `initialData`를 통한 초기 데이터 설정
- `fetchNextPage`를 통한 다음 페이지 수동 로딩
- `hasNextPage`를 통한 더 로드할 데이터 존재 여부 확인

#### 3. Intersection Observer를 통한 무한 스크롤

**구현 방법:**

```typescript
import { useInView } from 'react-intersection-observer';

const { ref } = useInView({
    threshold: 0.1, // 10% 보일 때 트리거
    rootMargin: '100px', // 뷰포트 하단 100px 전에 트리거
    triggerOnce: false, // 여러 번 트리거 허용
    delay: 0, // 지연 제거로 즉시 반응
    onChange: (inView) => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    },
});
```

**학습 포인트:**

- `react-intersection-observer` 라이브러리의 활용법
- `threshold`와 `rootMargin` 설정의 중요성
- `triggerOnce: false`로 설정하여 여러 번 트리거 허용
- 로딩 상태 확인을 통한 중복 요청 방지

#### 4. URL 파라미터 기반 상태 관리

**장점:**

- 검색 상태의 영속성 보장
- 브라우저 뒤로가기/앞으로가기 지원
- 검색 결과 URL 공유 가능
- SEO 친화적

**구현 방법:**

```typescript
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const searchParams = useSearchParams();
const pathname = usePathname();
const { replace } = useRouter();

// 검색어 변경 시 URL 업데이트
const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '1');

    if (term) {
        params.set('q', term);
    } else {
        params.delete('q');
    }

    replace(`${pathname}?${params.toString()}`);
}, 300);
```

**학습 포인트:**

- `useSearchParams`를 통한 현재 검색 파라미터 읽기
- `useRouter.replace`를 통한 URL 업데이트 (히스토리 스택에 추가하지 않음)
- 검색어 변경 시 페이지 자동 리셋의 필요성

#### 5. 검색 결과 캐싱 전략

**캐싱 설정:**

```typescript
// 검색 결과는 자주 변경되지 않으므로 긴 staleTime 설정
staleTime: 5 * 60 * 1000,        // 5분간 "신선"하다고 간주
gcTime: 10 * 60 * 1000,          // 10분간 캐시 유지

// 검색 결과는 자동 업데이트가 불필요
refetchOnWindowFocus: false,      // 윈도우 포커스 시 재조회 비활성화
refetchOnMount: false,            // 마운트 시 재조회 비활성화
refetchOnReconnect: true,         // 네트워크 재연결 시 재조회
refetchInterval: false,           // 자동 업데이트 비활성화
```

**학습 포인트:**

- 검색 결과의 특성에 맞는 캐싱 전략 수립
- `staleTime`과 `gcTime`의 차이점과 설정 기준
- 검색 결과는 자동 업데이트보다 사용자 요청에 의한 업데이트가 적절

#### 6. PostgreSQL의 ILIKE를 활용한 검색

**구현 방법:**

```typescript
// 제목 또는 내용에서 대소문자 구분 없이 검색
if (searchQuery && searchQuery.trim().length > 0) {
    const trimmedQuery = searchQuery.trim();
    query = query.or(
        `title.ilike.%${trimmedQuery}%,content_markdown.ilike.%${trimmedQuery}%`
    );
}
```

**학습 포인트:**

- PostgreSQL의 `ILIKE` 연산자 활용 (대소문자 구분 없음)
- `%` 와일드카드를 활용한 부분 문자열 검색
- `OR` 조건을 통한 제목과 내용 동시 검색
- 검색어 앞뒤 공백 제거의 중요성

#### 7. Suspense를 활용한 로딩 상태 관리

**구현 방법:**

```typescript
// 검색 결과 섹션을 Suspense로 감싸기
<Suspense
    key={`${query}-${currentPage}`}
    fallback={<SearchResultsSkeleton count={6} />}
>
    <SearchResultsSection searchQuery={query} />
</Suspense>
```

**학습 포인트:**

- `key` prop을 통한 컴포넌트 강제 리렌더링
- 검색어나 페이지가 변경될 때마다 새로운 Suspense 인스턴스 생성
- `fallback`을 통한 로딩 상태 표시
- 서버 컴포넌트와 클라이언트 컴포넌트의 적절한 분리

### 성능 최적화 기법

#### 1. 메모이제이션을 통한 불필요한 리렌더링 방지

```typescript
// 검색 결과 배열을 메모이제이션
const posts = useMemo(
    () => data?.pages.flatMap((page) => page.posts) || [],
    [data?.pages]
);
```

#### 2. 디바운싱을 통한 API 호출 최적화

```typescript
// 300ms 지연으로 불필요한 API 호출 방지
const handleSearch = useDebouncedCallback((term: string) => {
    // 검색 로직
}, 300);
```

#### 3. 적절한 캐싱 전략

```typescript
// 검색 결과는 5분간 신선하다고 간주
staleTime: 5 * 60 * 1000,
// 10분간 캐시 유지
gcTime: 10 * 60 * 1000,
```

### 사용자 경험 개선

#### 1. 검색 결과가 없을 때의 안내

```typescript
function SearchEmptyHint({ searchQuery }: { searchQuery: string }) {
    return (
        <Card className="flex min-h-[400px] items-center justify-center">
            <CardContent className="p-12 text-center">
                <Search className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                <h2 className="mb-4 text-xl font-semibold">
                    검색 결과가 없습니다
                </h2>
                <p className="text-muted-foreground mb-6">
                    &quot;{searchQuery}&quot;에 대한 검색 결과를 찾을 수 없습니다.
                </p>
                <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">
                        다음을 확인해보세요:
                    </p>
                    <ul className="text-muted-foreground space-y-1 text-sm">
                        <li>• 검색어의 철자가 정확한지 확인</li>
                        <li>• 다른 키워드로 검색해보기</li>
                        <li>• 더 일반적인 용어로 검색해보기</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}
```

#### 2. 로딩 상태의 시각적 피드백

```typescript
// 무한 스크롤 로딩 Skeleton
{isFetchingNextPage &&
    Array.from({ length: 3 }).map((_, index) => (
        <SinglePostCardSkeleton key={`skeleton-${index}`} />
    ))}
```

#### 3. 검색 상태에 따른 UI 변화

```typescript
// 검색어가 없을 때의 초기 상태
{!searchQuery ? (
    <SearchInitialState />
) : posts.length === 0 ? (
    <SearchEmptyHint searchQuery={searchQuery} />
) : (
    // 검색 결과 표시
)}
```

### 추가로 구현된 고급 검색 기능

#### 해시태그 AND 조건 검색 구현 ✅

**문제점:**

- 기존 해시태그 검색은 OR 조건으로 작동 (여러 해시태그 중 하나만 포함하면 검색됨)
- 여러 해시태그를 **모두** 포함하는 글을 찾는 AND 조건 검색이 필요

**해결 방법:**

1. **PostgreSQL RPC 함수 생성**
2. **다대다 테이블 구조 활용**
3. **복잡한 쿼리 로직 캡슐화**

#### 8. 해시태그 AND 검색을 위한 PostgreSQL RPC 함수

**OR 조건 vs AND 조건 문제:**

```typescript
// 기존 OR 조건 (문제 상황)
query = query.in('post_hashtags.hashtags.id', hashtagIds);
// 결과: 해시태그 중 하나만 포함하면 검색됨

// 원하는 AND 조건
// 결과: 모든 해시태그를 포함하는 글만 검색되어야 함
```

**해결책: PostgreSQL RPC 함수 구현**

```sql
-- 모든 해시태그를 포함하는 글을 AND 조건으로 검색
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
    total_records BIGINT;
BEGIN
    -- 해시태그 개수 확인
    hashtag_count := array_length(hashtag_ids, 1);

    -- 전체 개수 계산 (페이지네이션용)
    WITH filtered_posts AS (
        SELECT DISTINCT p.id
        FROM posts p
        INNER JOIN post_hashtags ph ON p.id = ph.post_id
        WHERE ph.hashtag_id = ANY(hashtag_ids)
          AND (search_query IS NULL OR search_query = '' OR
               p.title ILIKE '%' || search_query || '%' OR
               p.content_markdown ILIKE '%' || search_query || '%')
        GROUP BY p.id
        HAVING COUNT(DISTINCT ph.hashtag_id) = hashtag_count -- AND 조건 핵심
    )
    SELECT COUNT(*) INTO total_records FROM filtered_posts;

    -- 메인 쿼리 실행 (페이지네이션 + 정렬)
    RETURN QUERY
    EXECUTE format('...');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**학습 포인트:**

1. **HAVING COUNT(DISTINCT ph.hashtag_id) = hashtag_count**: AND 조건의 핵심
    - 각 글이 가진 해시태그의 개수가 검색하려는 해시태그 개수와 일치해야 함
    - 이를 통해 모든 해시태그를 포함하는 글만 필터링

2. **SECURITY DEFINER**: RLS 정책 우회
    - 읽기 전용 검색 함수에서 성능 향상을 위해 사용
    - 보안을 위해 함수 내부에서 적절한 검증 로직 포함

3. **동적 쿼리 생성**: `EXECUTE format()` 활용
    - 정렬 조건을 동적으로 처리
    - SQL 인젝션 방지를 위한 `%L` 포맷터 사용

#### 9. 다대다 관계에서 배열 컬럼 vs 다대다 테이블 선택

**결정 요인 분석:**

| 구분              | 배열 컬럼 (text[])                 | 다대다 테이블          |
| ----------------- | ---------------------------------- | ---------------------- |
| **데이터 무결성** | ❌ 참조 무결성 없음                | ✅ 외래키 제약조건     |
| **검색 성능**     | ❌ 인덱싱 제한적                   | ✅ B-tree 인덱스 활용  |
| **복잡한 쿼리**   | ❌ AND 조건 구현 복잡              | ✅ SQL 조인으로 간단   |
| **확장성**        | ❌ 해시태그별 메타데이터 저장 불가 | ✅ 추가 정보 저장 가능 |
| **표준 준수**     | ❌ 정규화 위반                     | ✅ 관계형 DB 모델 준수 |

**이 프로젝트에서 다대다 테이블을 선택한 이유:**

1. **데이터 무결성이 최우선**

    ```sql
    -- 존재하지 않는 해시태그 참조 방지
    CREATE TABLE post_hashtags (
        post_id INTEGER REFERENCES posts(id),
        hashtag_id INTEGER REFERENCES hashtags(id),
        PRIMARY KEY (post_id, hashtag_id)
    );
    ```

2. **검색 속도보다는 정확성 중시**
    - 블로그는 실시간 검색보다는 정확한 결과가 더 중요
    - 사용자 수가 많지 않아 성능 최적화보다는 유지보수성 우선

3. **향후 확장성 고려**

    ```sql
    -- 해시태그별 추가 정보 저장 가능
    ALTER TABLE post_hashtags ADD COLUMN created_at TIMESTAMPTZ;
    ALTER TABLE post_hashtags ADD COLUMN order_index INTEGER;
    ```

4. **복잡한 검색 쿼리 지원**
    ```sql
    -- AND 조건 검색이 직관적
    SELECT p.*
    FROM posts p
    INNER JOIN post_hashtags ph ON p.id = ph.post_id
    WHERE ph.hashtag_id IN (1, 2, 3)
    GROUP BY p.id
    HAVING COUNT(DISTINCT ph.hashtag_id) = 3; -- 모든 해시태그 포함
    ```

**배열 컬럼 방식의 한계:**

```sql
-- 배열에서 AND 조건 구현 (복잡하고 성능 저하)
SELECT * FROM posts
WHERE hashtag_ids @> ARRAY[1, 2, 3]; -- 모든 요소 포함 확인

-- 하지만 인덱싱이 제한적이고, 복잡한 조건 처리가 어려움
```

**다대다 테이블의 장점:**

```sql
-- 표준 SQL 조인으로 깔끔한 쿼리
SELECT
    p.*,
    array_agg(h.name) as hashtag_names
FROM posts p
INNER JOIN post_hashtags ph ON p.id = ph.post_id
INNER JOIN hashtags h ON ph.hashtag_id = h.id
GROUP BY p.id;
```

#### 10. 복잡한 쿼리를 위한 RPC 함수 설계 패턴

**문제: 클라이언트 라이브러리의 한계**

```typescript
// Supabase 클라이언트로는 복잡한 AND 조건 구현이 어려움
const { data } = await supabase
    .from('posts')
    .select(`*, post_hashtags!inner(hashtags!inner(*))`)
    .in('post_hashtags.hashtags.id', [1, 2, 3]); // OR 조건만 가능
```

**해결: RPC 함수로 복잡한 로직 캡슐화**

```typescript
// TypeScript에서 RPC 함수 호출
const { data: rpcResults, error } = await supabase.rpc(
    'get_posts_with_all_hashtags',
    {
        hashtag_ids: [1, 2, 3],
        page_offset: 0,
        page_limit: 10,
        sort_by: 'latest',
        search_query: 'React',
    }
);
```

**RPC 함수 설계 원칙:**

1. **매개변수 기본값 설정**

    ```sql
    page_offset INTEGER DEFAULT 0,
    page_limit INTEGER DEFAULT 10,
    sort_by TEXT DEFAULT 'latest'
    ```

2. **결과가 없을 때도 total_count 반환**

    ```sql
    -- 더미 행을 통해 total_count 항상 반환 보장
    SELECT
        COALESCE(mq.id, -1) as id,
        -- ... other fields
        %L::BIGINT as total_count
    FROM (SELECT 1 as dummy_row) dummy
    LEFT JOIN main_query mq ON true
    ```

3. **타입 안전성 보장**
    ```typescript
    // TypeScript 타입 정의
    export interface PostWithHashtagsRPC {
        id: number;
        title: string;
        // ... other fields
        hashtags: Hashtag[];
        total_count: number;
    }
    ```

**학습한 고급 PostgreSQL 기법:**

1. **WITH 절을 활용한 복잡한 쿼리 구조화**
2. **EXECUTE format()을 통한 동적 SQL 생성**
3. **SECURITY DEFINER를 통한 권한 관리**
4. **JSONB 집계 함수를 활용한 중첩 데이터 반환**
5. **COALESCE를 활용한 NULL 처리**

#### 11. RPC 함수 반환 패턴에 대한 설계 고민과 선택

**문제 제기: 두 가지 반환 방식의 선택**

RPC 함수에서 페이지네이션 데이터를 반환할 때 두 가지 방식을 고려했습니다:

```typescript
// 방식 1: 각 행에 total_count 포함 (현재 구현)
[
  { id: 1, title: "글1", hashtags: [...], total_count: 150 },
  { id: 2, title: "글2", hashtags: [...], total_count: 150 },
  { id: 3, title: "글3", hashtags: [...], total_count: 150 }
]

// 방식 2: 분리된 구조 (대안)
{
  posts: [
    { id: 1, title: "글1", hashtags: [...] },
    { id: 2, title: "글2", hashtags: [...] },
    { id: 3, title: "글3", hashtags: [...] }
  ],
  total_count: 150
}
```

**PostgreSQL RPC 함수의 제약사항**

PostgreSQL RPC 함수는 **단일 테이블 구조**만 반환할 수 있습니다:

```sql
-- ✅ 가능: 테이블 구조 반환
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    total_count BIGINT  -- 각 행에 포함
)

-- ❌ 불가능: 복합 객체 반환
-- PostgreSQL은 {posts: [], total: number} 같은 구조를 직접 반환할 수 없음
```

**Supabase 공식 패턴 분석**

Context7에서 확인한 Supabase 공식 문서의 모든 페이지네이션 RPC 함수들은 **각 행에 메타데이터를 포함하는 방식**을 사용합니다:

```typescript
// Supabase 공식 예시들
const { data } = await supabase.rpc('match_documents', {
    query_embedding: embedding,
    match_threshold: 0.78,
    match_count: 10,
});
// data[0].similarity, data[0].total_count 등으로 접근
```

**분리된 구조를 구현하려면?**

분리된 구조를 원한다면 **두 개의 별도 RPC 함수**가 필요합니다:

```typescript
// ❌ 성능상 불리한 방식
async function getPostsWithSeparateCount(hashtagIds: number[]) {
    // 1. 전체 개수만 조회하는 별도 RPC 함수
    const { data: countResult } = await supabase.rpc(
        'count_posts_with_hashtags',
        {
            hashtag_ids: hashtagIds,
        }
    );

    // 2. 실제 데이터만 조회하는 별도 RPC 함수
    const { data: postsResult } = await supabase.rpc('get_posts_data_only', {
        hashtag_ids: hashtagIds,
        offset: offset,
        limit: limit,
    });

    return {
        posts: postsResult || [],
        total: countResult?.[0]?.count || 0,
    };
}
```

**현재 방식을 선택한 이유**

1. **PostgreSQL 제약사항 준수**
    - RPC 함수는 테이블 구조만 반환 가능
    - 복합 객체 반환은 PostgreSQL 차원에서 지원하지 않음

2. **성능 효율성**

    ```sql
    -- ✅ 단일 쿼리로 데이터와 개수를 함께 조회
    SELECT
        p.*,
        COUNT(*) OVER() as total_count
    FROM filtered_posts p
    ```

3. **데이터 일관성 보장**
    - 같은 트랜잭션에서 데이터와 개수를 조회
    - 동시성 문제 방지 (다른 사용자가 데이터를 변경해도 일관된 결과)

4. **Supabase 표준 패턴 준수**
    - 공식 문서의 모든 예시가 이 패턴을 사용
    - 다른 개발자들이 이해하기 쉬운 표준 구조

5. **메모리 효율성**

    ```typescript
    // ✅ 메모리 효율적
    const total = rpcResults?.[0]?.total_count || 0; // 한 번만 저장

    // vs 분리된 방식 - 추가 메모리 사용
    const result = {
        posts: [...], // 배열 복사
        total: count  // 별도 필드
    };
    ```

6. **네트워크 효율성**
    - 단일 RPC 호출로 모든 데이터 조회
    - 네트워크 라운드트립 최소화

**학습 포인트: 실용성 vs 이상적 설계**

이론적으로는 `{posts: [], total: number}` 구조가 더 깔끔해 보이지만, **실제 구현에서는 제약사항과 성능을 고려해야 합니다**:

- **기술적 제약**: PostgreSQL RPC 함수의 반환 타입 제한
- **성능 고려**: 단일 쿼리 vs 다중 쿼리의 성능 차이
- **표준 준수**: 플랫폼의 기존 패턴과 일관성 유지
- **유지보수성**: 다른 개발자가 이해하기 쉬운 구조

**결론: 실용적 선택의 중요성**

현재 구현은 **PostgreSQL의 제약사항**, **Supabase의 표준 패턴**, **성능 최적화**를 모두 고려한 **실용적이고 효율적인 선택**입니다. 완벽한 설계보다는 **주어진 환경에서 최선의 선택**을 하는 것이 실무에서 더 중요함을 학습했습니다.

### 아직 구현되지 않은 기능

#### 1. 해시태그 자동완성 검색

- [ ] 해시태그 입력 시 자동완성 드롭다운
- [ ] 기존 해시태그와의 매칭
- [ ] 실시간 해시태그 제안

#### 2. 해시태그별 결과 캐싱

- [ ] 해시태그 기반 검색 결과 캐싱
- [ ] 해시태그별 인기 검색어 캐싱
- [ ] 해시태그 관련 글 추천 시스템

### 다음 단계 계획

#### Phase 8: 해시태그 시스템 고도화

1. **해시태그 자동완성 구현**
    - 검색어 입력 시 실시간 해시태그 제안
    - 기존 해시태그와의 매칭 알고리즘
    - 사용자 입력 패턴 학습

2. **고급 검색 기능 구현**
    - 검색어 + 해시태그 조합 검색
    - 검색 필터 및 정렬 옵션
    - 검색 히스토리 및 인기 검색어

3. **검색 성능 최적화**
    - PostgreSQL 풀텍스트 검색 (tsvector/tsquery)
    - 검색 결과 랭킹 알고리즘
    - 검색 결과 하이라이팅

### 학습한 핵심 개념

1. **디바운싱**: 사용자 입력 최적화를 위한 지연 실행 기법
2. **무한 스크롤**: React Query의 `useInfiniteQuery`를 활용한 페이지네이션
3. **Intersection Observer**: 요소의 가시성 감지를 통한 자동 로딩
4. **URL 상태 관리**: Next.js App Router를 활용한 검색 상태 영속성
5. **캐싱 전략**: React Query를 통한 검색 결과 최적화
6. **Suspense**: React의 로딩 상태 관리 패턴
7. **PostgreSQL 검색**: ILIKE를 활용한 대소문자 구분 없는 검색
8. **PostgreSQL RPC 함수**: 복잡한 쿼리 로직의 캡슐화
9. **다대다 관계 설계**: 배열 컬럼 vs 조인 테이블 선택 기준
10. **AND 조건 검색**: HAVING COUNT()를 활용한 교집합 검색
11. **동적 SQL 생성**: EXECUTE format()을 통한 안전한 동적 쿼리
12. **SECURITY DEFINER**: RLS 우회를 통한 성능 최적화
13. **RPC 반환 패턴**: PostgreSQL 제약사항과 성능을 고려한 설계 선택
14. **실용적 설계**: 이상적 구조보다 제약사항과 표준을 고려한 선택

### 성과 및 개선점

#### 성과

- 사용자 친화적인 검색 인터페이스 구현
- 무한 스크롤을 통한 부드러운 사용자 경험
- 적절한 캐싱을 통한 성능 최적화
- URL 기반 상태 관리로 검색 결과 공유 가능
- **해시태그 AND 조건 검색 구현으로 정밀한 검색 가능**
- **PostgreSQL RPC 함수를 통한 복잡한 쿼리 로직 캡슐화**
- **다대다 관계 설계를 통한 데이터 무결성 보장**

#### 개선점

- 검색 결과 정렬 옵션 확장
- 검색 성능을 위한 데이터베이스 인덱싱 최적화
- 모바일 환경에서의 검색 UX 개선
- 해시태그 자동완성 기능 추가

### 결론

Phase 7에서는 블로그의 핵심 기능인 검색 시스템을 성공적으로 구현했습니다. 디바운싱, 무한 스크롤, 캐싱 등 다양한 최적화 기법을 적용하여 사용자 경험을 크게 향상시켰습니다.

특히 React Query의 `useInfiniteQuery`와 Intersection Observer를 활용한 무한 스크롤 구현은 사용자가 자연스럽게 더 많은 검색 결과를 탐색할 수 있게 해주었습니다. 또한 URL 파라미터 기반 상태 관리를 통해 검색 결과의 공유와 브라우저 히스토리 지원이 가능해졌습니다.

**추가로 구현한 해시태그 AND 조건 검색**은 PostgreSQL의 고급 기능을 활용한 중요한 성과입니다. 다대다 테이블 구조를 통해 데이터 무결성을 보장하면서도, RPC 함수를 통해 복잡한 쿼리 로직을 깔끔하게 캡슐화할 수 있었습니다. 이를 통해 사용자는 여러 해시태그를 모두 포함하는 글을 정확하게 검색할 수 있게 되었습니다.

**핵심 학습 성과:**

- PostgreSQL의 고급 쿼리 기법 (HAVING COUNT, WITH 절, 동적 SQL)
- 다대다 관계 설계에서의 배열 컬럼 vs 조인 테이블 선택 기준
- RPC 함수를 통한 복잡한 비즈니스 로직 캡슐화
- 데이터 무결성과 성능 간의 트레이드오프 이해
- **RPC 함수 반환 패턴 설계**: PostgreSQL 제약사항과 Supabase 표준 패턴 이해
- **실용적 설계 철학**: 이상적 구조보다 제약사항과 성능을 고려한 현실적 선택

다음 단계에서는 해시태그 자동완성 기능을 추가하고, 검색 성능을 더욱 최적화하여 사용자가 원하는 콘텐츠를 더 쉽고 빠르게 찾을 수 있도록 개선할 예정입니다.
