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

### 아직 구현되지 않은 기능

#### 1. 해시태그 자동완성 검색

- [ ] 해시태그 입력 시 자동완성 드롭다운
- [ ] 기존 해시태그와의 매칭
- [ ] 실시간 해시태그 제안

#### 2. 검색어 + 해시태그 조합 검색

- [ ] 검색어와 해시태그를 동시에 사용한 고급 검색
- [ ] 검색 필터 조합 (AND/OR 조건)
- [ ] 검색 결과 정렬 옵션

#### 3. 해시태그별 결과 캐싱

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

### 성과 및 개선점

#### 성과

- 사용자 친화적인 검색 인터페이스 구현
- 무한 스크롤을 통한 부드러운 사용자 경험
- 적절한 캐싱을 통한 성능 최적화
- URL 기반 상태 관리로 검색 결과 공유 가능

#### 개선점

- 해시태그 기반 검색 기능 추가 필요
- 검색 결과 정렬 옵션 확장
- 검색 성능을 위한 데이터베이스 인덱싱 최적화
- 모바일 환경에서의 검색 UX 개선

### 결론

Phase 7에서는 블로그의 핵심 기능인 검색 시스템을 성공적으로 구현했습니다. 디바운싱, 무한 스크롤, 캐싱 등 다양한 최적화 기법을 적용하여 사용자 경험을 크게 향상시켰습니다.

특히 React Query의 `useInfiniteQuery`와 Intersection Observer를 활용한 무한 스크롤 구현은 사용자가 자연스럽게 더 많은 검색 결과를 탐색할 수 있게 해주었습니다. 또한 URL 파라미터 기반 상태 관리를 통해 검색 결과의 공유와 브라우저 히스토리 지원이 가능해졌습니다.

다음 단계에서는 해시태그 시스템을 고도화하고, 더 정교한 검색 기능을 구현하여 사용자가 원하는 콘텐츠를 더 쉽게 찾을 수 있도록 개선할 예정입니다.
