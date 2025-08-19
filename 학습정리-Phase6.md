# 학습정리 - Phase 6 (글 목록/상세 + 조회수 증가)

## 목표

- 글 목록/상세 페이지 완성도 강화
- 조회수 증가 로직 구현 및 에러 처리 UX 개선

## 구현 내용 요약

- 홈페이지 최신 글 6개 + 반응형 그리드 구성
- 글 상세 페이지 (메타 정보, 해시태그, 본문 렌더링)
- 조회수 증가 Server Action 추가 (Service Role 사용)
- 실패 시 비파괴적 경고 UI 및 `posts/[id]/error.tsx` 처리

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
- 보안
    - Service Role 키는 서버 전용, 클라이언트 번들 유출 금지
    - 변이 로직은 항상 서버 경계 내에 유지

## 개선 여지

- 원자적 증가: RPC 함수로 리팩터링하여 단일 쿼리로 처리
- 중복 카운트 방지: 세션/쿠키/로컬스토리지 기반 기간 제한
- 고유 사용자 기준 집계: IP+UA 해시 또는 인증 사용자 기준 정책
- 캐싱: React Query 도입 및 무한 스크롤 연동, 정렬/필터 쿼리키 설계

## 테스트 체크리스트

- 비로그인/로그인 상태 모두에서 조회수 증가 동작
- 증가 실패 시 경고 배너 표시 및 본문 정상 렌더링
- 심각 오류 시 `posts/[id]/error.tsx`에서 우아한 처리
- 목록/카드/상세의 조회수 UI 일관성 유지

## 원자적 증가(Atomic Increment)와 동시성

### 문제: Lost Update와 경쟁 조건

- read-modify-write(읽고-증가-쓰기) 패턴은 동시 요청 시 마지막 쓰기만 반영될 수 있음.
- 두 요청이 같은 `view_count`를 읽고 각자 `+1` 후 업데이트하면 1회만 증가하는 “lost update”가 발생.

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
- 실패 시 단일 에러 네이밍 사용: `error.name = 'VIEW_COUNT_ERROR'`
    - 호출부에서 `if (error.name === 'VIEW_COUNT_ERROR')`로 일관 분기 가능
    - 메시지는 사용자 친화적으로, cause에는 원본 오류 첨부(디버깅 용)
- 결과 검증: RPC가 `false` 반환 시 "대상 없음"으로 간주하여 동일 네임으로 throw
