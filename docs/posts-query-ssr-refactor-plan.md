# A안: get-query-client + prefetch + Hydration 정석 패턴 적용 계획

## 1. 현재 구조 요약

### 1.1 데이터 흐름

| 구분 | 위치 | 역할 |
|------|------|------|
| Server Action | `getPostsAction(page, sortBy, hashtagIds?, searchQuery?)` | `getPosts(page, PAGE_SIZE, sortBy, ...)` 호출 → `{ posts: Post[], total: number }` 반환 |
| 서버 페이지 | `src/app/posts/page.tsx` | `getQueryClient()` → `prefetchInfiniteQuery` → `getQueryData`로 `posts` 추출 → `dehydrate` → `HydrationBoundary` + `PostWrapper`에 `initialPosts` 전달 |
| 클라이언트 | `PostWrapper` | `useInfiniteQuery` + `initialData: { pages: [{ posts: initialPosts, total: initialPosts.length }], pageParams: [1] }` |
| QueryClient | 서버: `get-query-client.ts` (cache + per-request) / 클라이언트: `query-provider.tsx` (useState) | 이중 생성 경로 존재 |

### 1.2 발견된 이슈

1. **queryKey 불일치**  
   - prefetch: `['posts', validSortBy, ...(activeTagId ? [activeTagId.toString()] : [])]` → 태그 없을 때 `['posts', validSortBy]`  
   - getQueryData: `['posts', validSortBy, activeTagId?.toString()]` → 태그 없을 때 `['posts', validSortBy, undefined]`  
   → 두 키가 달라서 캐시 조회가 실패할 수 있음.

2. **initialData의 total 오류**  
   - `initialData.total`을 `initialPosts.length`로 설정해 둠.  
   - 실제 `getPostsAction`은 DB 전체 개수 `total`을 반환하므로, 2페이지 이상 있을 때 `getNextPageParam`/`hasNextPage` 판단이 잘못될 수 있음.

3. **QueryClient 이중 생성**  
   - 레이아웃: `QueryProvider`가 `useState(() => new QueryClient(...))`로 클라이언트용 인스턴스 생성.  
   - 공식 권장: 서버/클라이언트 모두 `getQueryClient()` 사용(클라이언트는 싱글톤).  
   - 현재는 페이지에서만 `getQueryClient()` 사용, Provider는 별도 인스턴스 → Hydration 시 같은 트리이므로 동작은 하지만, 패턴 불일치 및 suspend 시 클라이언트 재생성 이슈 가능.

4. **SSR과 initialData 중복**  
   - 서버에서 이미 prefetch + dehydrate로 캐시를 채우므로, 클라이언트에서 동일 쿼리는 HydrationBoundary로 채워짐.  
   - `initialData`를 추가로 주면 구조가 dehydrate 결과와 어긋날 수 있고, 공식 패턴(캐시만 사용)과도 다름.

---

## 2. 수정 계획 (A안)

### 2.1 목표

- **단일 QueryClient 경로**: 서버·클라이언트 모두 `getQueryClient()` 사용.  
- **Hydration만으로 초기 데이터**: 서버 `prefetchInfiniteQuery` + `dehydrate` → 클라이언트 `useInfiniteQuery`는 `initialData` 제거.  
- **queryKey 일원화**: prefetch / getQueryData(제거 후 불필요) / useInfiniteQuery 동일 키.  
- **옵션 통일**: `makeQueryClient()` 한 곳에서 `staleTime`/`gcTime`/`retry` 등 공통 설정.

---

### 2.2 파일별 변경 사항

#### (1) `src/lib/get-query-client.ts`

- **변경**: `makeQueryClient()`에 클라이언트와 동일한 기본 옵션 반영.  
- **내용**  
  - `defaultOptions.queries`: `staleTime: 60 * 1000`, `gcTime: 10 * 60 * 1000`, `retry: 1`, `refetchOnWindowFocus: true` (현재 query-provider와 맞춤).  
  - 필요 시 `mutations.retry: 1` 추가.  
- **이유**: 서버 prefetch와 클라이언트 쿼리가 같은 기본값을 쓰도록.

---

#### (2) `src/lib/query-provider.tsx`

- **변경**: `useState(() => new QueryClient(...))` 제거 → `getQueryClient()` 사용.  
- **내용**  
  - `import getQueryClient from '@/lib/get-query-client'`  
  - `const queryClient = getQueryClient()`  
  - `QueryClientProvider client={queryClient}`  
  - `useState` 제거.  
- **이유**: 공식 권장(브라우저 싱글톤 + suspend 시 재생성 방지).

---

#### (3) `src/app/posts/page.tsx`

- **변경 1**: `getQueryData` + `posts` fallback 로직 전체 제거.  
  - prefetch만 수행하고, 캐시에서 `posts`를 꺼내서 `PostWrapper`에 넘기지 않음.  
- **변경 2**: `PostWrapper`에 `initialPosts` prop 제거.  
  - `<PostWrapper sort={...} tagId={...} />` 만 전달.  
- **변경 3**: queryKey는 prefetch 한 곳만 유지하고, **동일한 배열**로 통일.  
  - 현재 prefetch 키: `['posts', validSortBy, ...(activeTagId ? [activeTagId.toString()] : [])]`  
  - 이 키를 그대로 유지 (getQueryData 제거로 여기서 키 사용처는 prefetch뿐).  
- **유지**: `prefetchInfiniteQuery` + `dehydrate` + `HydrationBoundary` 구조 유지.  
- **에러 UI**: Server Component이므로 `Button`의 `onClick`은 클라이언트 컴포넌트(예: shadcn Button)에서만 동작. 현재 구조 유지해도 됨. 필요 시 나중에 “다시 시도”를 클라이언트 컴포넌트로 분리 가능.

---

#### (4) `src/components/posts/PostWrapper.tsx`

- **변경 1**: `initialPosts` prop 제거.  
  - props: `sort`, `tagId` 만.  
- **변경 2**: `useInfiniteQuery`에서 `initialData` 제거.  
  - HydrationBoundary로 채워진 캐시만 사용.  
- **변경 3**: queryKey를 페이지의 prefetch와 **완전 동일**하게.  
  - `['posts', sort, ...(tagId ? [tagId] : [])]`  
  - (이미 동일 구조이므로, `tagId`가 `activeTagId?.toString()`과 같은 값이면 일치.)  
- **유지**: `queryFn`, `initialPageParam`, `getNextPageParam`, `staleTime`/`gcTime`/refetch/retry 등 기존 옵션 유지.  
- **타입**: `initialPosts` 제거에 따라 컴포넌트 props 타입에서 해당 필드 삭제.

---

### 2.3 queryKey 상수화 (선택)

- **목적**: prefetch와 useInfiniteQuery에서 같은 키를 쓰도록 실수 방지.  
- **방법**:  
  - `src/lib/queries.ts` 또는 `src/constants/queries.ts`에  
    - `postsListQueryKey(sort: PostSort, tagId?: string): QueryKey`  
    - 반환: `['posts', sort, ...(tagId ? [tagId] : [])]`  
  - `page.tsx`와 `PostWrapper.tsx`에서 이 함수만 사용.  
- **우선순위**: 낮음. 먼저 동작 정리 후 적용해도 됨.

---

### 2.4 검증 포인트

1. **Hydration**  
   - `/posts` 접속 시 첫 페이지가 서버에서 prefetch된 데이터로 바로 표시되는지.  
   - React Query DevTools에서 해당 infinite query에 데이터가 채워져 있는지.

2. **무한 스크롤**  
   - 두 번째 페이지가 `fetchNextPage`로 정상 로드되는지.  
   - `getNextPageParam`이 `lastPage.posts.length === PAGE_SIZE` 기준으로 올바른지 (서버 반환 `total`과 무관하게 페이지 단위로 동작하는지).

3. **필터/정렬**  
   - `sort`/`tag` 변경 시 URL이 바뀌고, 새로운 queryKey로 prefetch + useInfiniteQuery가 동작하는지.

4. **에러**  
   - prefetch 실패 시 페이지 catch 블록에서 에러 UI가 나오는지.  
   - 클라이언트에서 fetch 실패 시 PostWrapper의 isError UI가 나오는지.

---

### 2.5 적용 순서 제안

1. `get-query-client.ts`: `makeQueryClient` 옵션 확장.  
2. `query-provider.tsx`: `getQueryClient()` 사용으로 전환.  
3. `PostWrapper.tsx`: `initialPosts`·`initialData` 제거, queryKey는 유지.  
4. `posts/page.tsx`: getQueryData 및 `posts`/`initialPosts` 제거, PostWrapper props 수정.  
5. (선택) queryKey 헬퍼 도입 및 두 곳에서 사용.

---

### 2.6 참고 (Context7 / 공식 문서)

- TanStack Query v5: 서버에서 `prefetchInfiniteQuery` 후 `dehydrate` → 클라이언트는 같은 queryKey의 `useInfiniteQuery`만 사용하면 hydrated 캐시가 채워짐. `initialData`는 같은 구조(`pages`/`pageParams`)를 요구하며, hydration과 중복되면 불일치 가능.  
- Next.js App Router: Server Component에서 `getQueryClient()` 사용 시 React `cache()`로 요청 단위 재사용, 클라이언트에서는 동일 모듈의 싱글톤 사용 권장.  
- Provider: 공식 예시는 “useState 대신 getQueryClient()로 클라이언트 주입”을 권장하여 suspend 시 QueryClient 재생성 방지.

---

## 3. 완료 내역

| 단계 | 파일 | 적용 내용 |
|------|------|-----------|
| 1 | `src/lib/get-query-client.ts` | 공식 SSR 권장대로 `staleTime: 60 * 1000`만 명시, 나머지는 라이브러리 기본값 사용 |
| 2 | `src/lib/query-provider.tsx` | `useState(QueryClient)` 제거 → `getQueryClient()` 사용 (브라우저 싱글톤) |
| 3 | `src/components/posts/PostWrapper.tsx` | `initialPosts` prop·`initialData` 제거, Hydration 캐시만 사용 |
| 4 | `src/app/posts/page.tsx` | getQueryData·posts fallback 제거, `PostWrapper`에 `initialPosts` 전달 제거 |
| 5 | `src/lib/queries.ts` (신규) | `postsListQueryKey(sort, tagId)` 헬퍼 추가 |
| 5 | `src/app/posts/page.tsx`, `PostWrapper.tsx` | prefetch·useInfiniteQuery에서 `postsListQueryKey` 사용으로 queryKey 일원화 |

이 계획대로 적용하여 A안(공식 패턴 정석)이 반영되었고, queryKey 불일치·total 오류·QueryClient 이중 생성·initialData 중복 이슈가 정리되었습니다.
