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

### 학습 내용

#### Next.js 14 App Router

- App Router를 사용한 파일 기반 라우팅
- `layout.tsx`를 통한 전역 레이아웃 관리
- `page.tsx`를 통한 페이지 컴포넌트 정의

#### TypeScript 설정

- `tsconfig.json`에서 `@/*` 경로 별칭 설정
- 타입 안전성을 위한 인터페이스 정의
- Supabase 데이터베이스 타입 정의

#### Tailwind CSS + shadcn/ui

- CSS 변수를 활용한 테마 시스템
- 컴포넌트 기반 UI 라이브러리
- 반응형 디자인을 위한 유틸리티 클래스

#### React Query (TanStack Query)

- 서버 상태와 클라이언트 상태 분리
- 캐싱 전략 설정 (staleTime, gcTime)
- 개발 도구를 통한 디버깅 지원

#### Supabase 설정

- 클라이언트 생성 및 환경 변수 관리
- 데이터베이스 스키마 타입 정의
- 인증 시스템 준비

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
