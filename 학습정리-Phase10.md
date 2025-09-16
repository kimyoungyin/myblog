# Phase 10 학습정리: 해시태그 메뉴 및 그룹화 구현

## 개요

Phase 10에서는 해시태그 시스템의 완전한 리팩토링을 통해 **ID 기반 필터링 시스템**과 **반응형 해시태그 사이드바**를 구현했습니다. 기존의 해시태그 이름 기반 필터링을 완전히 제거하고, 성능 최적화된 ID 기반 시스템으로 전환하면서 **PostgreSQL 인덱스 최적화**와 **성능 모니터링 도구**까지 구축했습니다.

---

## 핵심 학습 내용

### 1. 해시태그 시스템 아키텍처 리팩토링

#### ID 기반 필터링 시스템으로의 전환

**기존 문제점:**

- 해시태그 이름과 ID 기반 필터링이 혼재
- 복잡한 조건부 로직으로 인한 코드 복잡성
- 성능상 비효율적인 이름 기반 조회

**해결 방안:**

```typescript
// ✅ 개선된 방식: ID 기반 단일 시스템
export async function getPosts(
    page: number = 1,
    limit: number = 10,
    sortBy: PostSort = 'latest',
    hashtagIds?: number[], // 이름 기반 파라미터 완전 제거
    searchQuery?: string
): Promise<{ posts: Post[]; total: number }> {
    // 해시태그 ID 배열이 있는 경우 RPC 함수 사용 (AND 조건)
    if (hashtagIds && hashtagIds.length > 0) {
        const { data: rpcResults } = await supabase.rpc(
            'get_posts_with_all_hashtags',
            {
                hashtag_ids: hashtagIds,
                page_offset: (page - 1) * limit,
                page_limit: limit,
                sort_by: sortBy,
                search_query: searchQuery?.trim() || null,
            }
        );
        // RPC 결과 처리 로직...
    }
    // 기존 방식: 전체 글 조회
}
```

**학습 포인트:**

- **단일 책임 원칙**: 하나의 시스템은 하나의 방식으로만 작동
- **하위 호환성 제거**: 레거시 코드 정리를 통한 코드베이스 단순화
- **타입 안전성**: ID 기반 시스템으로 런타임 오류 방지

#### URL 파라미터 검증 및 정리

```typescript
// posts/page.tsx에서의 강화된 검증 로직
if (tag?.trim()) {
    const tagParam = tag.trim();
    const tagId = parseInt(tagParam, 10);
    if (!isNaN(tagId) && tagId > 0) {
        activeTagId = tagId;
        // 해시태그 존재 여부 확인
        const hashtagInfo = await getHashtagByIdAction(tagId);
        if (!hashtagInfo) {
            // 존재하지 않는 ID인 경우 URL에서 제거
            redirect(`/posts?sort=${validSortBy}`);
        }
    } else {
        // 숫자가 아닌 경우 URL에서 제거
        redirect(`/posts?sort=${validSortBy}`);
    }
}
```

**학습 포인트:**

- **입력 검증의 중요성**: URL 파라미터도 신뢰할 수 없는 입력
- **사용자 경험**: 잘못된 URL은 자동으로 정리하여 오류 방지
- **데이터 무결성**: 존재하지 않는 리소스 참조 방지

---

### 2. 반응형 레이아웃 시스템 구현

#### Tailwind CSS 고급 반응형 패턴

**핵심 레이아웃 구조:**

```typescript
// 전체 레이아웃 컨테이너
<div className="relative mx-auto max-w-7xl px-4 py-8">
    {/* 데스크톱: 왼쪽 여백에 고정 사이드바 */}
    <div className="absolute top-0 left-0 hidden w-64 xl:block">
        <div className="sticky top-8">
            <HashtagSidebar hashtags={popularHashtags} />
        </div>
    </div>

    {/* 메인 컨텐츠 - 사이드바 공간 확보 */}
    <div className="mx-auto max-w-4xl xl:mr-auto xl:ml-72">
        {/* 태블릿 이하: 사이드바를 상단에 배치 */}
        <div className="mb-8 xl:hidden">
            <HashtagSidebar hashtags={popularHashtags} />
        </div>

        {/* 실제 컨텐츠 */}
        <PostWrapper />
    </div>
</div>
```

**학습 포인트:**

- **`absolute` + `sticky` 조합**: 고정 위치 + 스크롤 추적
- **`xl:ml-72` 패턴**: 사이드바 너비(w-64 = 16rem)보다 큰 마진으로 공간 확보
- **조건부 렌더링**: `xl:hidden`과 `xl:block`으로 반응형 표시/숨김
- **컨테이너 전략**: `max-w-7xl` 전체 컨테이너 + `max-w-4xl` 메인 컨텐츠

#### 복잡한 반응형 요구사항 해결

**요구사항:**

1. 데스크톱: 왼쪽 빈 공간에 사이드바, 메인 컨텐츠는 중앙 정렬
2. 태블릿 이하: 사이드바는 상단, 메인 컨텐츠는 전체 너비

**해결 과정:**

```css
/* 1차 시도: Grid 레이아웃 (실패) */
.grid-layout {
    display: grid;
    grid-template-columns: 256px 1fr; /* 고정폭 문제 */
}

/* 2차 시도: Flex + absolute (성공) */
.relative-container {
    position: relative; /* 절대 위치 기준점 */
}
.sidebar-absolute {
    position: absolute;
    top: 0;
    left: 0;
    width: 16rem; /* w-64 */
}
.main-content-with-margin {
    margin-left: 18rem; /* xl:ml-72, 사이드바보다 큰 마진 */
    margin-right: auto; /* xl:mr-auto, 우측 자동 마진 */
    max-width: 56rem; /* max-w-4xl */
}
```

**학습 포인트:**

- **레이아웃 전략 선택**: Grid vs Flex vs Absolute positioning
- **여백 계산**: 사이드바 너비 + 추가 여백으로 겹침 방지
- **반응형 조건부 스타일링**: 브레이크포인트별 다른 레이아웃 적용

---

### 3. PostgreSQL 성능 최적화

#### 전략적 인덱스 설계

**JOIN 최적화 인덱스:**

```sql
-- 1. 기본 외래키 인덱스
CREATE INDEX idx_post_hashtags_post_id ON post_hashtags (post_id);
CREATE INDEX idx_post_hashtags_hashtag_id ON post_hashtags (hashtag_id);

-- 2. 복합 인덱스 (조합 쿼리 최적화)
CREATE INDEX idx_post_hashtags_composite
ON post_hashtags (post_id, hashtag_id);
```

**정렬 최적화 인덱스:**

```sql
-- 3. 단일 컬럼 정렬 인덱스
CREATE INDEX idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX idx_posts_view_count ON posts (view_count DESC);
CREATE INDEX idx_posts_likes_count ON posts (likes_count DESC);

-- 4. 복합 인덱스 (2차 정렬 안정성)
CREATE INDEX idx_posts_created_at_id ON posts (created_at DESC, id ASC);
CREATE INDEX idx_posts_view_count_id ON posts (view_count DESC, id ASC);
CREATE INDEX idx_posts_likes_count_id ON posts (likes_count DESC, id ASC);
```

**전문 검색 최적화:**

```sql
-- 5. GIN 인덱스 (Full-Text Search)
CREATE INDEX idx_posts_title_search
ON posts USING gin (to_tsvector('simple', title));

CREATE INDEX idx_posts_content_search
ON posts USING gin (to_tsvector('simple', content_markdown));
```

**학습 포인트:**

- **인덱스 타입 선택**: B-Tree vs GIN vs Hash
- **복합 인덱스 설계**: 쿼리 패턴에 맞는 컬럼 순서
- **2차 정렬 최적화**: React Key 중복 방지를 위한 안정성 보장
- **언어별 텍스트 검색**: `'korean'` 미지원으로 `'simple'` 사용

#### 성능 모니터링 시스템

**RPC 함수 기반 분석 도구:**

```sql
-- 인덱스 사용률 분석
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
```

**TypeScript 클라이언트 도구:**

```typescript
// 개발 환경 전용 성능 분석
export async function runPerformanceAnalysis() {
    if (process.env.NODE_ENV === 'production') {
        console.warn('성능 분석은 개발 환경에서만 실행하세요.');
        return null;
    }

    const results = await Promise.allSettled([
        analyzeIndexUsage(),
        analyzeCacheHitRate(),
        analyzeTableSizes(),
    ]);

    return {
        indexUsage,
        cacheHitRate,
        tableSizes,
        timestamp: new Date().toISOString(),
    };
}
```

**학습 포인트:**

- **PostgreSQL 시스템 뷰 활용**: `pg_stat_user_tables`, `pg_statio_user_indexes`
- **성능 메트릭 이해**: 인덱스 사용률, 캐시 히트율, 테이블 크기
- **개발 환경 분리**: 프로덕션에서는 성능 분석 도구 비활성화
- **비동기 병렬 처리**: `Promise.allSettled`로 안전한 병렬 실행

---

### 4. React Query와 무한 스크롤 최적화

#### 무한 스크롤 쿼리 키 전략

**문제 상황:**
해시태그 ID 리팩토링 후 무한 스크롤이 작동하지 않는 문제 발생

**원인 분석:**

```typescript
// ❌ 문제가 있던 방식
const { data } = useInfiniteQuery({
    queryKey: ['posts', sort, tag], // tag는 문자열
    queryFn: ({ pageParam }) =>
        getPostsAction(
            pageParam,
            sort,
            tag ? [hashtag] : undefined // 잘못된 파라미터 매핑
        ),
});
```

**해결 방안:**

```typescript
// ✅ 개선된 방식
const { data } = useInfiniteQuery({
    queryKey: ['posts', sort, tagId], // 명확한 ID 기반 키
    queryFn: ({ pageParam }) =>
        getPostsAction(
            pageParam,
            sort,
            tagId ? [Number(tagId)] : undefined // 정확한 ID 배열 전달
        ),
});
```

**학습 포인트:**

- **쿼리 키 설계**: 캐시 무효화와 데이터 일관성을 위한 키 전략
- **타입 안전성**: 문자열 → 숫자 변환 시 명시적 타입 변환
- **디버깅 접근법**: 쿼리 키와 함수 파라미터 불일치 문제 추적

#### React Query 캐싱 전략

```typescript
// 프로덕션 최적화된 캐싱 설정
const { data } = useInfiniteQuery({
    queryKey: ['posts', sort, tagId],
    queryFn: ({ pageParam }) => getPostsAction(/* ... */),
    // 캐싱 전략
    staleTime: 5 * 60 * 1000, // 5분간 데이터를 "신선"하다고 간주
    gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
    // 자동 재조회 전략
    refetchOnWindowFocus: true,
    refetchInterval: 2 * 60 * 1000, // 2분마다 백그라운드 재조회
    // 재시도 전략
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});
```

**학습 포인트:**

- **캐싱 라이프사이클**: `staleTime` vs `gcTime`의 차이점
- **백그라운드 업데이트**: 사용자 경험을 해치지 않는 데이터 동기화
- **지수 백오프**: 네트워크 오류 시 효율적인 재시도 전략

---

### 5. 컴포넌트 설계 및 Props 인터페이스

#### HashtagSidebar 컴포넌트 설계

```typescript
interface HashtagSidebarProps {
    hashtags: HashtagWithCount[];
    className?: string;
    title?: string;
    showCount?: boolean;
}

export const HashtagSidebar: React.FC<HashtagSidebarProps> = ({
    hashtags,
    className = '',
    showCount = true,
}) => {
    return (
        <Card className={`h-fit ${className}`}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Hash className="h-4 w-4" />
                    해시태그별
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-2">
                    {hashtags.map((hashtag) => (
                        <Link
                            key={hashtag.id}
                            href={`/posts?tag=${hashtag.id}`}
                            className="group hover:bg-accent flex items-center justify-between rounded-lg p-2 transition-colors"
                        >
                            {/* 해시태그 링크 UI */}
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
```

**학습 포인트:**

- **재사용 가능한 컴포넌트**: Props를 통한 유연한 설정
- **접근성 고려**: 시맨틱 HTML과 적절한 상호작용 요소
- **일관된 디자인 시스템**: shadcn/ui 컴포넌트 활용

#### SortSelector 컴포넌트 개선

```typescript
// 해시태그 ID 기반으로 개선된 SortSelector
export const SortSelector: React.FC<SortSelectorProps> = ({
    currentSort,
    currentTagId, // 이름에서 ID로 변경
    className = '',
}) => {
    const params = new URLSearchParams();
    params.set('sort', option.value);
    if (currentTagId) params.set('tag', currentTagId); // ID 기반 파라미터
    const href = `?${params.toString()}`;

    return (
        <DropdownMenu>
            {/* 드롭다운 UI */}
        </DropdownMenu>
    );
};
```

**학습 포인트:**

- **일관된 파라미터 명명**: `currentTag` → `currentTagId`로 의도 명확화
- **URL 상태 관리**: `URLSearchParams`를 통한 안전한 쿼리 스트링 조작
- **컴포넌트 간 일관성**: 모든 컴포넌트가 동일한 ID 기반 시스템 사용

---

### 6. PostgreSQL RPC 함수와 복잡한 쿼리

#### AND 조건 해시태그 필터링 RPC 함수

```sql
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
    -- ... 기타 컬럼들
    hashtags JSONB, -- 모든 연관된 해시태그 반환
    total_count BIGINT
) AS $$
DECLARE
    hashtag_count INTEGER;
BEGIN
    hashtag_count := array_length(hashtag_ids, 1);

    -- AND 조건 구현: HAVING COUNT(DISTINCT ph.hashtag_id) = hashtag_count
    RETURN QUERY
    EXECUTE format('
        WITH main_query AS (
            SELECT
                p.id,
                p.title,
                -- ... 기타 컬럼들
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
            GROUP BY p.id, -- 기타 컬럼들
            HAVING COUNT(DISTINCT ph.hashtag_id) = %L -- AND 조건 핵심
            ORDER BY %s %s, p.id ASC
            LIMIT %L OFFSET %L
        )
        -- ... 결과 처리 로직
    ',
    hashtag_ids, hashtag_count, sort_column, sort_direction, page_limit, page_offset
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**학습 포인트:**

- **AND 조건 구현**: `HAVING COUNT(DISTINCT ph.hashtag_id) = hashtag_count`
- **동적 SQL**: `format()` 함수로 안전한 쿼리 생성
- **JSON 집계**: `jsonb_agg()`로 관련 데이터 그룹화
- **RLS 우회**: `SECURITY DEFINER`로 권한 상승

#### 해시태그 집계 쿼리 최적화

**Supabase PostgREST 제약사항:**

```typescript
// ❌ 작동하지 않는 방식 (PostgREST 제약)
const { data } = await supabase.from('hashtags').select(`
        *,
        post_hashtags(count) // 다대다 관계에서 집계 함수 제한
    `);
```

**해결 방안 - 수동 집계:**

```typescript
// ✅ 수동 집계로 해결
export async function getHashtagsWithCount(): Promise<HashtagWithCount[]> {
    // 1단계: 모든 해시태그 조회
    const { data: hashtags } = await supabase
        .from('hashtags')
        .select('id, name, created_at');

    // 2단계: 각 해시태그별 글 개수 조회
    const { data: postCounts } = await supabase
        .from('post_hashtags')
        .select('hashtag_id')
        .in('hashtag_id', hashtagIds);

    // 3단계: Map을 사용한 효율적인 집계
    const countMap = new Map<number, number>();
    (postCounts || []).forEach((pc) => {
        const current = countMap.get(pc.hashtag_id) || 0;
        countMap.set(pc.hashtag_id, current + 1);
    });

    // 4단계: 결과 조합 및 정렬
    return hashtags
        .map((hashtag) => ({
            ...hashtag,
            post_count: countMap.get(hashtag.id) || 0,
        }))
        .sort((a, b) => {
            // 글 개수 내림차순, 같으면 이름 오름차순
            if (b.post_count !== a.post_count) {
                return b.post_count - a.post_count;
            }
            return a.name.localeCompare(b.name);
        });
}
```

**학습 포인트:**

- **PostgREST 제약사항 이해**: 다대다 관계에서의 집계 함수 제한
- **Map 자료구조 활용**: O(n) 시간복잡도로 효율적인 집계
- **다단계 쿼리 설계**: 복잡한 요구사항을 단순한 쿼리들로 분해
- **정렬 로직**: 다중 조건 정렬 구현

---

### 7. 컴포넌트 간 데이터 플로우 최적화

#### Server Component에서 Client Component로의 데이터 전달

```typescript
// posts/page.tsx (Server Component)
export default async function PostsPage({ searchParams }: PostsPageProps) {
    // 서버에서 초기 데이터 조회
    const [result, popularHashtags] = await Promise.all([
        getPostsAction(1, validSortBy, activeTagId ? [activeTagId] : undefined),
        getHashtagsWithCountAction(15),
    ]);

    return (
        <div>
            {/* 서버에서 렌더링된 사이드바 */}
            <HashtagSidebar hashtags={popularHashtags} />

            {/* 클라이언트 컴포넌트에 초기 데이터 전달 */}
            <PostWrapper
                initialPosts={result.posts}
                sort={validSortBy}
                tagId={activeTagId?.toString()}
            />
        </div>
    );
}
```

**학습 포인트:**

- **하이브리드 렌더링**: 서버에서 초기 데이터, 클라이언트에서 상호작용
- **Props 직렬화**: Server Component에서 Client Component로 전달 가능한 데이터 타입
- **병렬 데이터 조회**: `Promise.all`로 독립적인 쿼리들 최적화

#### 무한 스크롤과 필터링 상태 동기화

```typescript
// PostWrapper.tsx (Client Component)
export default function PostWrapper({ initialPosts, sort, tagId }) {
    const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
        queryKey: ['posts', sort, tagId], // 필터 상태가 쿼리 키에 반영
        queryFn: ({ pageParam }) =>
            getPostsAction(
                pageParam,
                sort,
                tagId ? [Number(tagId)] : undefined // ID 배열로 변환
            ),
        initialData: {
            pages: [{ posts: initialPosts, total: initialPosts.length }],
            pageParams: [1],
        },
        // ... 기타 설정
    });
}
```

**학습 포인트:**

- **쿼리 키 설계**: 필터 상태 변경 시 적절한 캐시 무효화
- **초기 데이터 활용**: 서버 렌더링 데이터로 첫 페이지 즉시 표시
- **타입 변환 안전성**: 문자열 ID를 숫자 배열로 안전하게 변환

---

## 고민했던 부분과 해결책

### 1. 해시태그 표시 버그 재발

**문제**: 해시태그 필터링 시 PostCard에서 모든 해시태그가 아닌 필터링된 해시태그만 표시

**원인**: PostgreSQL RPC 함수에서 JOIN 조건이 해시태그를 필터링함

**해결책**: RPC 함수를 두 단계로 분리

1. 조건에 맞는 글 ID 찾기 (필터링)
2. 해당 글의 모든 해시태그 조회 (전체 표시)

```sql
-- 수정된 RPC 함수 핵심 로직
-- 모든 해시태그를 가져오기 위해 별도 JOIN 사용
INNER JOIN hashtags h ON ph.hashtag_id = h.id -- 모든 해시태그 JOIN
WHERE ph.hashtag_id = ANY(hashtag_ids) -- 필터 조건은 WHERE에서만
GROUP BY p.id, -- 기타 컬럼들
HAVING COUNT(DISTINCT ph.hashtag_id) = hashtag_count -- AND 조건
```

**학습한 내용:**

- **SQL JOIN의 부작용**: JOIN 조건이 SELECT 결과에 미치는 영향
- **데이터 완전성**: 필터링과 표시 로직의 분리 필요성
- **PostgreSQL 집계**: GROUP BY와 HAVING의 적절한 활용

### 2. 반응형 레이아웃 구현의 복잡성

**문제**: 데스크톱에서 사이드바가 메인 컨텐츠를 침범하거나 중앙 정렬이 안 되는 문제

**시도한 방식들:**

1. **Grid Layout (문제 발생)**

```css
.container {
    display: grid;
    grid-template-columns: 256px 1fr; /* 고정폭으로 인한 반응형 문제 */
}
```

2. **Flex Layout (부분 개선)**

```css
.container {
    display: flex;
    gap: 2rem; /* 사이드바와 메인 컨텐츠 분리 */
}
```

3. **Absolute Positioning (최종 선택)**

```css
.container {
    position: relative; /* 절대 위치 기준점 */
}
.sidebar {
    position: absolute;
    top: 0;
    left: 0;
    width: 16rem; /* w-64 */
}
.main-content {
    margin-left: 18rem; /* xl:ml-72, 사이드바 + 여백 */
    margin-right: auto; /* 중앙 정렬을 위한 자동 마진 */
    max-width: 56rem; /* 컨텐츠 최대 너비 제한 */
}
```

**학습한 내용:**

- **CSS 포지셔닝 전략**: Static, Relative, Absolute, Fixed의 적절한 활용
- **여백 계산**: 고정 요소와 가변 요소 간의 공간 관리
- **반응형 조건부 스타일**: Tailwind의 브레이크포인트 활용법

### 3. 성능 최적화 전략

**문제**: 해시태그 관련 쿼리의 성능 병목점

**분석**:

- JOIN 연산이 많은 해시태그 필터링
- 정렬 연산의 비효율성
- 텍스트 검색의 느린 속도

**해결책**: 전략적 인덱스 설계

```sql
-- JOIN 최적화
CREATE INDEX idx_post_hashtags_composite ON post_hashtags (post_id, hashtag_id);

-- 정렬 최적화 (2차 정렬 포함)
CREATE INDEX idx_posts_created_at_id ON posts (created_at DESC, id ASC);

-- 검색 최적화
CREATE INDEX idx_posts_title_search ON posts USING gin (to_tsvector('simple', title));
```

**학습한 내용:**

- **인덱스 설계 원칙**: 쿼리 패턴에 맞는 인덱스 구조
- **복합 인덱스**: 다중 조건 쿼리 최적화
- **GIN 인덱스**: 전문 검색을 위한 특수 인덱스

---

## 기존 Phase에서 활용한 기술

### Phase 1-3: 기본 인프라

- **Next.js 14 App Router**: 서버/클라이언트 컴포넌트 분리 패턴 활용
- **Supabase**: PostgreSQL과 PostgREST의 고급 기능 활용
- **TypeScript**: 타입 안전성으로 리팩토링 과정에서 오류 방지

### Phase 4: 사용자 인증 시스템

- **미들웨어 기반 라우트 보호**: 관리자 전용 기능 보안
- **세션 관리**: 사용자 상태에 따른 UI 조건부 렌더링

### Phase 5: 글 작성 및 편집

- **Server Actions**: 데이터 변경 작업의 안전한 처리
- **Zod 검증**: 해시태그 ID 파라미터 검증에 활용
- **React Query**: 캐시 무효화 전략으로 데이터 일관성 보장

### Phase 6: 좋아요 및 조회수 시스템

- **PostgreSQL RPC 함수**: 원자적 업데이트 패턴 재활용
- **낙관적 업데이트**: 사용자 경험 향상 패턴

### Phase 7: 검색 및 필터링

- **디바운싱**: 실시간 검색 성능 최적화 기법 재사용
- **URL 상태 관리**: 검색 상태 유지 패턴 확장

### Phase 8: 무한 스크롤 및 정렬

- **useInfiniteQuery**: 해시태그 필터링과 무한 스크롤 통합
- **Intersection Observer**: 스크롤 감지 최적화

### Phase 9: 댓글 시스템

- **컴포넌트 설계 패턴**: 재사용 가능한 컴포넌트 구조 적용

---

## 핵심 의사결정과 그 이유

### 1. 하위 호환성 제거 결정

**결정**: 해시태그 이름 기반 필터링 완전 제거

**이유**:

- **코드 복잡성 감소**: 이중 로직 제거로 유지보수성 향상
- **성능 개선**: 불필요한 이름 조회 로직 제거
- **타입 안전성**: ID 기반 시스템으로 런타임 오류 방지
- **사용자 경험**: 일관된 URL 구조로 예측 가능한 동작

### 2. Absolute Positioning 레이아웃 선택

**결정**: Grid/Flex 대신 Absolute Positioning 사용

**이유**:

- **유연성**: 반응형 조건에 따른 완전히 다른 레이아웃 구현 가능
- **성능**: CSS Grid의 복잡한 계산 없이 단순한 포지셔닝
- **호환성**: 다양한 브라우저에서 안정적인 동작
- **확장성**: 향후 사이드바 추가 시 쉬운 확장

### 3. PostgreSQL RPC 함수 활용

**결정**: PostgREST 제약사항을 RPC 함수로 우회

**이유**:

- **복잡한 쿼리 지원**: PostgREST로 표현하기 어려운 AND 조건 구현
- **성능 최적화**: 데이터베이스 레벨에서 최적화된 쿼리 실행
- **타입 안전성**: PostgreSQL의 강타입 시스템 활용
- **확장성**: 향후 더 복잡한 비즈니스 로직 구현 기반

### 4. 성능 모니터링 도구 구현

**결정**: 개발 환경 전용 성능 분석 도구 구축

**이유**:

- **데이터 기반 최적화**: 추측이 아닌 측정 기반 성능 개선
- **지속적 모니터링**: 코드 변경 시 성능 영향 추적
- **학습 도구**: PostgreSQL 내부 동작 이해를 위한 교육적 가치
- **미래 대비**: 스케일 증가 시 성능 병목점 사전 식별

---

## 성능 및 보안 고려사항

### 성능 최적화

#### 데이터베이스 레벨

- **인덱스 전략**: JOIN, 정렬, 검색에 특화된 8개 인덱스 구현
- **쿼리 최적화**: RPC 함수로 복잡한 비즈니스 로직을 DB에서 처리
- **캐시 효율성**: 인덱스와 테이블 캐시 히트율 모니터링

#### 애플리케이션 레벨

- **React Query 최적화**: 5분 staleTime, 10분 gcTime으로 적절한 캐싱
- **컴포넌트 메모이제이션**: `useMemo`로 불필요한 리렌더링 방지
- **병렬 데이터 조회**: `Promise.all`로 독립적인 API 호출 최적화

### 보안 고려사항

#### 입력 검증

- **URL 파라미터 검증**: 해시태그 ID의 숫자 여부 및 존재 여부 확인
- **타입 안전성**: TypeScript로 컴파일 타임 오류 방지
- **Zod 스키마**: 런타임 데이터 검증

#### 데이터베이스 보안

- **RLS 우회**: `SECURITY DEFINER`로 읽기 전용 함수의 안전한 권한 상승
- **SQL 인젝션 방지**: PostgreSQL의 `format()` 함수로 안전한 동적 쿼리
- **권한 관리**: 익명/인증 사용자별 적절한 함수 실행 권한

---

## 향후 개선 방향

### 1. 성능 최적화

#### 데이터베이스 최적화

- **파티셔닝**: 글 테이블의 날짜별 파티셔닝으로 대용량 데이터 처리
- **머티리얼라이즈드 뷰**: 해시태그 통계를 위한 사전 계산된 뷰
- **연결 풀링**: 동시 접속자 증가에 대비한 연결 관리

#### 캐싱 전략

- **Redis 도입**: 해시태그 통계의 실시간 캐싱
- **CDN 활용**: 정적 컨텐츠의 글로벌 배포
- **브라우저 캐싱**: 해시태그 목록의 클라이언트 캐싱

### 2. 사용자 경험 개선

#### 인터랙션 향상

- **해시태그 자동완성**: 실시간 인기 해시태그 제안
- **검색 히스토리**: 사용자별 검색 기록 저장
- **개인화**: 사용자 관심사 기반 해시태그 추천

#### 접근성 개선

- **키보드 내비게이션**: 사이드바 링크의 키보드 접근성
- **스크린 리더**: ARIA 레이블로 보조 기술 지원
- **색상 대비**: WCAG 가이드라인 준수

### 3. 기술적 개선

#### 코드 품질

- **테스트 커버리지**: 해시태그 시스템의 단위/통합 테스트
- **타입 안전성**: 더 엄격한 TypeScript 설정
- **에러 처리**: 세분화된 에러 타입과 복구 전략

#### 모니터링 고도화

- **실시간 알림**: 성능 임계값 초과 시 알림 시스템
- **트렌드 분석**: 해시태그 인기도 변화 추적
- **사용자 행동 분석**: 해시태그 클릭 패턴 분석

---

## 결론

Phase 10 해시태그 메뉴 및 그룹화 구현을 통해 **복잡한 시스템의 리팩토링 과정**과 **성능 최적화의 전체적인 접근법**을 학습할 수 있었습니다.

특히 **해시태그 이름 기반에서 ID 기반 시스템으로의 전환**을 통해 코드의 복잡성을 크게 줄이고 성능을 향상시킬 수 있었고, **PostgreSQL RPC 함수와 인덱스 최적화**를 활용한 데이터베이스 레벨 최적화로 확장 가능한 아키텍처를 구축할 수 있게 되었습니다.

또한 **반응형 레이아웃의 복잡한 요구사항**을 CSS Absolute Positioning과 Tailwind의 조건부 클래스를 조합하여 해결하는 과정에서, 실제 프로덕션 환경에서 마주할 수 있는 **복잡한 UI/UX 요구사항을 체계적으로 분석하고 해결하는 방법론**을 익힐 수 있었습니다.

이러한 경험은 향후 **대규모 시스템의 성능 최적화**와 **복잡한 사용자 인터페이스 구현** 프로젝트에서도 활용할 수 있는 견고한 기반이 될 것입니다.
