# Phase 4: 사용자 인증 및 권한 관리 - 학습 정리

## 구현 완료 항목

### 1. Zustand 기반 인증 상태 관리 스토어 ✅

- **파일**: `src/stores/auth-store.ts`
- **기능**:
    - 사용자 정보, 인증 상태, 로딩 상태 관리
    - `persist` 미들웨어로 새로고침 시 상태 유지
    - `partialize`로 민감하지 않은 데이터만 저장

### 2. useAuth 훅 Zustand 연동 ✅

- **파일**: `src/hooks/useAuth.ts`
- **기능**:
    - React Query와 Zustand 연동
    - 세션 및 프로필 데이터 캐싱
    - 로그인/로그아웃 시 캐시 무효화

### 3. 라우트 보호 (미들웨어로 대체)

- **파일**: `src/utils/supabase/middleware.ts`
- **기능**:
    - 보호 경로(`/admin`, `/profile`) 접근 제어 및 리다이렉트
    - `auth.getUser()` 호출로 세션 자동 리프레시/쿠키 동기화

### 4. 소셜 로그인 페이지 ✅

- **파일**: `src/app/auth/login/page.tsx`
- **기능**:
    - Google, GitHub OAuth 로그인
    - 이미 로그인된 사용자 자동 리다이렉트
    - 반응형 디자인

### 5. 사용자 프로필 관리 페이지 ✅

- **파일**: `src/app/profile/page.tsx`
- **기능**:
    - 프로필 정보 표시 및 수정
    - 관리자 권한 표시
    - 프로필 업데이트 시 캐시 무효화

### 6. React Query 캐싱 전략 최적화 ✅

- **파일**: `src/components/cache/CacheBoundary.tsx`
- **기능**:
    - 캐시 TTL 및 가비지 컬렉션 설정
    - 에러 재시도 전략
    - 캐시 관리 훅 제공

### 7. Header 로그인 버튼 개선 ✅

- **파일**: `src/components/layout/Header.tsx`
- **기능**:
    - 로그인 버튼 클릭 시 로그인 페이지로 이동
    - 기존 UI 일관성 유지

## 직접 구현하려면 배워야 했던 지식들

### 1. Zustand 상태 관리

- **핵심 개념**:
    - `create` 함수로 스토어 생성
    - `persist` 미들웨어로 상태 지속성
    - `partialize`로 저장할 데이터 선택
- **학습 포인트**:
    - Redux vs Zustand 비교
    - 미들웨어 패턴 이해
    - 상태 정규화 및 최적화

### 2. React Query 캐싱 전략

- **핵심 개념**:
    - `staleTime` vs `gcTime` 차이점
    - `refetchOnWindowFocus` vs `refetchOnReconnect`
    - 에러 재시도 로직 설계
- **학습 포인트**:
    - 캐시 무효화 전략
    - 백그라운드 리페치 최적화
    - 메모리 사용량 관리

### 3. Supabase OAuth 인증

- **핵심 개념**:
    - OAuth 2.0 플로우 이해
    - 리다이렉트 URL 설정
    - 세션 관리 및 갱신
- **학습 포인트**:
    - 소셜 로그인 보안 고려사항
    - 토큰 저장 및 관리
    - 사용자 프로필 동기화

### 4. TypeScript 고급 타입

- **핵심 개념**:
    - `unknown` vs `any` 타입 안전성
    - 타입 가드 및 타입 단언
    - 제네릭과 유니온 타입
- **학습 포인트**:
    - 런타임 타입 검증
    - 타입 안전한 에러 처리
    - 제네릭 컴포넌트 설계

### 5. React 컴포넌트 설계 패턴

- **핵심 개념**:
    - 컴포지션 vs 상속
    - 렌더 프롭 패턴
    - 고차 컴포넌트 (HOC)
- **학습 포인트**:
    - 컴포넌트 재사용성
    - 성능 최적화 (React.memo, useMemo)
    - 상태 끌어올리기 전략

### 6. 보안 및 권한 관리

- **핵심 개념**:
    - Row Level Security (RLS)
    - JWT 토큰 검증
    - 권한 기반 접근 제어 (RBAC)
- **학습 포인트**:
    - 인증 vs 인가 차이점
    - 세션 하이재킹 방지
    - 민감한 데이터 보호

### 7. 상태 관리 아키텍처

- **핵심 개념**:
    - 전역 상태 vs 로컬 상태
    - 상태 정규화
    - 상태 동기화 전략
- **학습 포인트**:
    - 상태 업데이트 최적화
    - 사이드 이펙트 관리
    - 상태 지속성 전략

## 구현 과정에서 배운 점

### 1. 상태 관리 설계

- Zustand의 단순함과 강력함을 경험
- `persist` 미들웨어로 사용자 경험 향상
- 상태 업데이트 시 불변성 유지의 중요성

### 2. 캐싱 전략

- React Query의 강력한 캐싱 기능 활용
- 적절한 `staleTime` 설정으로 불필요한 API 호출 방지
- 캐시 무효화 시점과 방법의 중요성

### 3. 컴포넌트 설계

- 재사용 가능한 컴포넌트 설계의 중요성
- Props 인터페이스 설계 시 확장성 고려
- 컴포넌트 간 의존성 최소화

### 4. 타입 안전성

- TypeScript의 엄격한 타입 체크로 런타임 에러 방지
- `unknown` 타입 사용으로 타입 안전성 향상
- 제네릭을 활용한 유연한 컴포넌트 설계

## 다음 Phase 준비사항

### Phase 5: 글 작성 및 편집

- 마크다운 에디터 컴포넌트 설계
- 실시간 미리보기 구현
- 이미지 업로드 기능
- 해시태그 관리 시스템

### Phase 6: 글 목록 및 상세 페이지

- 무한 스크롤 구현
- 반응형 그리드 레이아웃
- 조회수 및 좋아요 시스템
- 검색 및 필터링 기능

## 참고 자료

- [Zustand 공식 문서](https://zustand-demo.pmnd.rs/)
- [React Query 공식 문서](https://tanstack.com/query/latest)
- [Supabase Auth 문서](https://supabase.com/docs/guides/auth)
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/)
- [React 컴포넌트 설계 패턴](https://react.dev/learn)
