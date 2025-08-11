# 마크다운 기반 블로그 프로젝트 학습정리

## Phase 1: 프로젝트 셋업 및 기본 구조 ✅

### 완료된 작업

#### 1. Next.js 프로젝트 생성 및 초기 설정

- [x] Next.js 14+ (App Router) 프로젝트 생성
- [x] TypeScript 설정 완료
- [x] Tailwind CSS 설정 완료
- [x] ESLint 설정 완료

#### 2. 프로젝트 디렉토리 구조 설정

- [x] `@/app` - 페이지 구조 (Next.js App Router)
- [x] `@/components` - 컴포넌트 구조
- [x] `@/lib` - 유틸 함수 및 server actions
- [x] `@/hooks` - 커스텀 훅
- [x] `@/styles` - 스타일 설정
- [x] `@/types` - 타입 정의 (TypeScript 인터페이스)
- [x] `@/utils` - 유틸리티 함수

#### 3. 핵심 패키지 설치

- [x] `@supabase/supabase-js` - Supabase 클라이언트
- [x] `zustand` - 전역 상태 관리
- [x] `@tanstack/react-query` - 서버 상태 관리 및 캐싱
- [x] `@tanstack/react-query-devtools` - 개발 도구
- [x] `react-markdown` - 마크다운 렌더링
- [x] `remark-gfm` - GitHub Flavored Markdown 지원
- [x] `rehype-highlight` - 코드 하이라이팅

#### 4. 개발 도구 설정

- [x] `prettier` - 코드 포맷팅
- [x] `prettier-plugin-tailwindcss` - Tailwind CSS 클래스 정렬
- [x] shadcn/ui 초기 설정

#### 5. 기본 설정 파일 생성

- [x] `.prettierrc` - Prettier 설정
- [x] `src/types/index.ts` - 기본 타입 정의
- [x] `src/lib/supabase.ts` - Supabase 클라이언트 및 타입
- [x] `src/lib/query-provider.tsx` - React Query Provider
- [x] `src/hooks/useAuth.ts` - 기본 인증 훅

#### 6. 프로젝트 구조 최적화

- [x] 디렉토리 별칭 설정 (`@/*` 경로)
- [x] 컴포넌트 분리 전략 (서버/클라이언트 컴포넌트)
- [x] 타입 정의 파일 구조화
- [x] 유틸리티 함수 모듈화

### 학습 내용

#### Next.js 14 App Router

- App Router를 사용한 파일 기반 라우팅
- `layout.tsx`를 통한 전역 레이아웃 관리
- `page.tsx`를 통한 페이지 컴포넌트 정의
- **서버 컴포넌트 vs 클라이언트 컴포넌트** 구분
- **'use client'** 지시어의 필요성과 사용법
- **파일 기반 라우팅**의 장점과 제약사항

#### TypeScript 설정

- `tsconfig.json`에서 `@/*` 경로 별칭 설정
- 타입 안전성을 위한 인터페이스 정의
- Supabase 데이터베이스 타입 정의
- **경로 별칭 설정**의 장점과 설정 방법
- **타입 정의 파일 구조화** 전략
- **인터페이스 vs 타입** 사용 시기와 차이점

#### Tailwind CSS + shadcn/ui

- CSS 변수를 활용한 테마 시스템
- 컴포넌트 기반 UI 라이브러리
- 반응형 디자인을 위한 유틸리티 클래스
- **CSS 변수 시스템**의 작동 원리와 활용법
- **shadcn/ui 컴포넌트** 설치 및 커스터마이징 방법
- **Tailwind CSS v4**의 새로운 기능과 설정 방법

#### React Query (TanStack Query)

- 서버 상태와 클라이언트 상태 분리
- 캐싱 전략 설정 (staleTime, gcTime)
- 개발 도구를 통한 디버깅 지원
- **QueryClient 설정**과 기본 옵션 구성
- **Provider 패턴**을 통한 전역 상태 관리
- **React Query DevTools** 설정 및 활용법

#### Supabase 설정

- 클라이언트 생성 및 환경 변수 관리
- 데이터베이스 스키마 타입 정의
- 인증 시스템 준비
- **환경 변수 관리** 전략과 보안 고려사항
- **타입 생성**을 통한 데이터베이스 스키마 동기화
- **클라이언트 설정**과 에러 처리 방법

### Phase 1 구현 과정에서의 학습 내용

#### 1. 프로젝트 초기화 전략

**디렉토리 구조 설계:**

- **절대 경로 별칭**: `@/*` 설정으로 import 경로 단순화
- **모듈화 전략**: 기능별로 디렉토리 분리 (components, hooks, lib, types)
- **확장성 고려**: 향후 기능 추가를 고려한 구조 설계

**설정 파일 관리:**

- **환경별 설정**: 개발/프로덕션 환경 분리 준비
- **보안 고려사항**: 민감한 정보는 `.env.local`에 저장
- **Git 무시 설정**: `.gitignore`에 환경 변수 파일 추가

#### 2. 개발 도구 통합

**Prettier 설정:**

- **Tailwind CSS 클래스 정렬**: `prettier-plugin-tailwindcss` 활용
- **일관된 코드 스타일**: 팀 개발을 위한 포맷팅 규칙 설정
- **에디터 통합**: VS Code와 Prettier 연동 설정

**ESLint 설정:**

- **Next.js 권장 규칙**: `eslint-config-next` 활용
- **TypeScript 지원**: 타입 안전성을 위한 린팅 규칙
- **코드 품질 향상**: 잠재적 오류 사전 방지

#### 3. 패키지 의존성 관리

**핵심 라이브러리 선택:**

- **상태 관리**: Zustand vs Redux vs Recoil 비교 및 선택
- **데이터 페칭**: TanStack Query vs SWR vs React Query 비교
- **UI 프레임워크**: shadcn/ui vs MUI vs Chakra UI 비교 및 선택

**버전 호환성:**

- **Next.js 14+**: App Router 지원 확인
- **React 18+**: Concurrent Features 지원
- **TypeScript 5+**: 최신 타입 기능 활용

### 다음 단계 (Phase 2)

- Supabase 프로젝트 생성
- 데이터베이스 스키마 생성
- RLS 정책 설정
- 인증 시스템 구현

### 참고 자료

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Prettier Documentation](https://prettier.io/docs/en/)
- [ESLint Configuration](https://eslint.org/docs/latest/use/configure/)
- [React 18 Features](https://react.dev/blog/2022/03/29/react-v18)
- [Next.js App Router](https://nextjs.org/docs/app)
