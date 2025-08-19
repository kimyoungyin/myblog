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
