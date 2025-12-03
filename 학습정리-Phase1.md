# Phase 1 학습정리: 프로젝트 셋업 및 기본 구조

## 개요

Phase 1에서는 마크다운 기반 블로그 프로젝트의 **견고한 기반**을 구축했습니다. Next.js 14의 App Router, TypeScript, Tailwind CSS, 그리고 현대적인 React 생태계의 핵심 라이브러리들을 통합하여 **확장 가능하고 유지보수가 용이한 프로젝트 아키텍처**를 설계했습니다. 특히 **개발자 경험(DX) 최적화**와 **코드 품질 보장**을 위한 도구들을 체계적으로 구성했습니다.

---

## 핵심 학습 내용

### 1. Next.js 14 App Router 아키텍처 설계

#### 파일 기반 라우팅 시스템의 이해

**App Router의 핵심 개념:**

```
src/app/
├── layout.tsx          # 전역 레이아웃 (모든 페이지 공통)
├── page.tsx           # 홈페이지 (/)
├── globals.css        # 전역 스타일
├── posts/
│   ├── page.tsx       # 글 목록 (/posts)
│   └── [id]/
│       └── page.tsx   # 글 상세 (/posts/[id])
└── admin/
    └── posts/
        ├── page.tsx   # 관리자 글 목록
        └── new/
            └── page.tsx # 새 글 작성
```

**학습 포인트:**

- **계층적 레이아웃**: `layout.tsx`를 통한 중첩 레이아웃 구조
- **동적 라우팅**: `[id]` 폴더를 통한 매개변수 기반 라우팅
- **라우트 그룹**: `(auth)` 같은 폴더로 URL에 영향 없는 조직화
- **병렬 라우팅**: `@modal` 같은 슬롯을 통한 복잡한 UI 구성

#### 서버 컴포넌트 vs 클라이언트 컴포넌트 전략

**서버 컴포넌트 (기본값):**

```typescript
// app/posts/page.tsx - 서버에서 데이터 페칭
export default async function PostsPage() {
    // 서버에서 직접 데이터베이스 조회
    const posts = await getPosts();

    return (
        <div>
            <h1>블로그 글 목록</h1>
            {posts.map(post => (
                <PostCard key={post.id} post={post} />
            ))}
        </div>
    );
}
```

**클라이언트 컴포넌트 ('use client' 지시어):**

```typescript
'use client';

// 상호작용이 필요한 컴포넌트
export default function SearchBar() {
    const [query, setQuery] = useState('');

    return (
        <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색어를 입력하세요"
        />
    );
}
```

**학습한 핵심 개념:**

- **서버 컴포넌트 장점**: SEO 최적화, 초기 로딩 속도, 서버 리소스 활용
- **클라이언트 컴포넌트 필요성**: 상태 관리, 이벤트 핸들링, 브라우저 API 사용
- **하이브리드 접근**: 서버에서 초기 데이터, 클라이언트에서 상호작용
- **경계 최소화**: 클라이언트 컴포넌트를 가능한 작게 유지

### 2. TypeScript 설정과 타입 안전성 확보

#### 엄격한 TypeScript 설정

```json
// tsconfig.json - 프로덕션 수준의 엄격한 설정
{
    "compilerOptions": {
        "strict": true, // 모든 엄격한 타입 검사 활성화
        "noUncheckedIndexedAccess": true, // 배열/객체 접근 시 undefined 가능성 체크
        "noImplicitReturns": true, // 모든 코드 경로에서 반환값 필수
        "noFallthroughCasesInSwitch": true, // switch 문의 fallthrough 방지
        "noImplicitOverride": true, // 오버라이드 시 명시적 키워드 필요
        "exactOptionalPropertyTypes": true, // 선택적 속성의 정확한 타입 체크
        // 경로 별칭 설정
        "baseUrl": ".",
        "paths": {
            "@/*": ["./src/*"]
        }
    }
}
```

**학습 포인트:**

- **점진적 타입 도입**: `strict: false`에서 시작해 단계적으로 엄격하게
- **경로 별칭의 중요성**: `@/components/Button` 같은 절대 경로로 가독성 향상
- **타입 추론 활용**: 명시적 타입보다 TypeScript의 추론 능력 활용
- **유틸리티 타입**: `Partial<T>`, `Pick<T, K>` 등으로 타입 조작

#### 프로젝트 전반의 타입 시스템 설계

```typescript
// src/types/index.ts - 중앙화된 타입 정의
export interface User {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
}

export interface Post {
    id: number;
    title: string;
    content_markdown: string;
    thumbnail_url?: string;
    view_count: number;
    likes_count: number;
    comments_count: number;
    created_at: string;
    updated_at: string;
    hashtags?: Hashtag[];
}

// 유니온 타입으로 정렬 옵션 제한
export type PostSort = 'latest' | 'oldest' | 'popular' | 'likes';

// 제네릭을 활용한 API 응답 타입
export interface ApiResponse<T> {
    data: T;
    success: boolean;
    error?: string;
}
```

**학습한 핵심 개념:**

- **인터페이스 vs 타입**: 확장 가능성을 고려한 선택
- **유니온 타입**: 제한된 값 집합으로 런타임 오류 방지
- **제네릭**: 재사용 가능한 타입 정의
- **선택적 속성**: `?`를 통한 유연한 타입 설계

### 3. Tailwind CSS와 shadcn/ui 디자인 시스템

#### Tailwind CSS 설정 최적화

```javascript
// tailwind.config.js - 프로젝트 맞춤 설정
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            // 커스텀 색상 팔레트
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                // ... 기타 색상
            },
            // 커스텀 애니메이션
            keyframes: {
                'accordion-down': {
                    from: { height: 0 },
                    to: { height: 'var(--radix-accordion-content-height)' },
                },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
            },
        },
    },
    plugins: [require('tailwindcss-animate')],
};
```

**학습 포인트:**

- **CSS 변수 시스템**: `hsl(var(--primary))`를 통한 동적 테마 지원
- **유틸리티 우선 접근법**: 컴포넌트별 CSS 파일 대신 클래스 조합
- **반응형 디자인**: `sm:`, `md:`, `lg:` 접두사로 브레이크포인트별 스타일
- **다크 모드 지원**: `dark:` 접두사로 자동 다크 모드 대응

#### shadcn/ui 컴포넌트 시스템 구축

```typescript
// src/components/ui/button.tsx - shadcn/ui 패턴
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  // 기본 스타일
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
```

**학습한 핵심 개념:**

- **Variant 기반 설계**: `class-variance-authority`로 체계적인 변형 관리
- **Compound Components**: 복잡한 UI를 작은 컴포넌트들의 조합으로 구성
- **Radix UI 기반**: 접근성이 보장된 headless 컴포넌트 활용
- **타입 안전한 Props**: `VariantProps`로 variant 타입 자동 추론

### 4. React Query와 상태 관리 아키텍처

> [query client 셋업 관련 글](https://velog.io/@hhjeee/React-Query%EC%9D%98-QueryClientProvider-%EC%B4%88%EA%B8%B0-%EC%84%A4%EC%A0%95)
> [staleTime과 gcTime의 차이와 동작 원리](https://onetwothreechachacha.tistory.com/160)

#### React Query 설정과 캐싱 전략

```typescript
// src/lib/query-provider.tsx - 전역 쿼리 설정
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export default function QueryProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // 캐싱 전략
                        staleTime: 60 * 1000, // 1분간 데이터를 "신선"하다고 간주
                        gcTime: 10 * 60 * 1000, // 10분간 가비지 컬렉션 지연
                        retry: 1, // 실패 시 1회만 재시도
                        refetchOnWindowFocus: false, // 윈도우 포커스 시 재조회 비활성화
                    },
                    mutations: {
                        retry: 1, // 변경 작업도 1회만 재시도
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
```

**학습 포인트:**

- **서버 상태 vs 클라이언트 상태**: React Query는 서버 상태만 관리
- **캐싱 계층**: staleTime(신선도) vs gcTime(메모리 관리)
- **개발자 도구**: ReactQueryDevtools로 쿼리 상태 시각화
- **Provider 패턴**: 전역 상태 관리를 위한 Context API 활용

#### Zustand를 활용한 클라이언트 상태 관리

```typescript
// src/stores/auth-store.ts - 간단한 전역 상태
import { create } from 'zustand';
import { persist } from 'zustand/middleware'; // 새로고침 후에도 값을 사용하도록 저장

interface AuthState {
    user: User | null;
    isLoading: boolean;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isLoading: true,
            setUser: (user) => set({ user }),
            setLoading: (isLoading) => set({ isLoading }),
            clearAuth: () => set({ user: null, isLoading: false }),
        }),
        {
            name: 'auth-storage',
            // 민감하지 않은 데이터만 저장
            partialize: (state) => ({
                user: state.user
                    ? {
                          id: state.user.id,
                          email: state.user.email,
                          is_admin: state.user.is_admin,
                      }
                    : null,
            }),
        }
    )
);
```

**학습한 핵심 개념:**

- **최소한의 상태**: Redux보다 간단한 API로 보일러플레이트 최소화
- **미들웨어 활용**: `persist`로 브라우저 저장소 연동
- **부분 저장**: `partialize`로 민감한 데이터 제외
- **타입 안전성**: TypeScript와의 완벽한 통합

### 5. 개발자 경험(DX) 최적화 도구 설정

#### Prettier와 ESLint 통합 설정

```json
// .prettierrc - 일관된 코드 포맷팅
{
    "semi": true,
    "trailingComma": "es5",
    "singleQuote": true,
    "printWidth": 80,
    "tabWidth": 4,
    "useTabs": false,
    "plugins": ["prettier-plugin-tailwindcss"]
}
```

```javascript
// eslint.config.mjs - Next.js 최적화 린팅
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = [
    ...compat.extends('next/core-web-vitals', 'next/typescript'),
    {
        rules: {
            // 커스텀 규칙
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/no-explicit-any': 'error',
            'prefer-const': 'error',
            'no-var': 'error',
        },
    },
];

export default eslintConfig;
```

**학습 포인트:**

- **자동 포맷팅**: Prettier로 코드 스타일 통일
- **Tailwind 클래스 정렬**: `prettier-plugin-tailwindcss`로 클래스 순서 자동 정렬
- **린팅 규칙**: TypeScript와 Next.js에 특화된 규칙 적용
- **에디터 통합**: VS Code 확장으로 실시간 포맷팅

#### 패키지 관리와 의존성 전략

```json
// package.json - 핵심 의존성 분석
{
    "dependencies": {
        // 프레임워크 & 런타임
        "next": "15.0.3",
        "react": "^18.3.1",
        "typescript": "^5.6.3",

        // 상태 관리 & 데이터 페칭
        "@tanstack/react-query": "^5.59.16",
        "zustand": "^5.0.1",

        // UI & 스타일링
        "tailwindcss": "^3.4.1",
        "@radix-ui/react-slot": "^1.1.0",
        "class-variance-authority": "^0.7.1",
        "clsx": "^2.1.1",
        "tailwind-merge": "^2.5.4",

        // 백엔드 & 데이터베이스
        "@supabase/supabase-js": "^2.46.1",
        "@supabase/ssr": "^0.5.1",

        // 마크다운 & 콘텐츠
        "react-markdown": "^9.0.1",
        "remark-gfm": "^4.0.0",
        "rehype-highlight": "^7.0.0"
    },
    "devDependencies": {
        // 개발 도구
        "@tanstack/react-query-devtools": "^5.59.16",
        "prettier": "^3.3.3",
        "prettier-plugin-tailwindcss": "^0.6.8",
        "eslint": "^8.57.1"
    }
}
```

**의존성 선택 기준:**

- **안정성**: 활발한 유지보수와 큰 커뮤니티
- **번들 크기**: 트리 셰이킹 지원과 최적화된 크기
- **타입 지원**: TypeScript 네이티브 지원
- **생태계 호환성**: Next.js와 React 생태계 호환성

---

## 고민했던 부분과 해결책

### 1. 상태 관리 라이브러리 선택

**문제**: Redux vs Zustand vs React Query의 역할 분담

**고민 과정**:

- **Redux**: 강력하지만 보일러플레이트가 많음
- **Zustand**: 간단하지만 서버 상태 관리 부족
- **React Query**: 서버 상태에 특화되었지만 클라이언트 상태 관리 제한

**최종 결정**: React Query + Zustand 조합

- **React Query**: 서버 상태 (API 데이터, 캐싱)
- **Zustand**: 클라이언트 상태 (UI 상태, 사용자 설정)

**학습한 내용**:

- 상태의 성격에 따른 도구 선택의 중요성
- 과도한 추상화보다는 적절한 도구 조합
- 각 라이브러리의 강점을 살리는 아키텍처 설계

### 2. 디렉토리 구조 설계

**문제**: 확장 가능한 폴더 구조 설계

**시도한 구조들**:

```
// 1차 시도: 기능별 분리 (문제 발생)
src/
├── features/
│   ├── auth/
│   ├── posts/
│   └── comments/
└── shared/

// 2차 시도: 레이어별 분리 (복잡함)
src/
├── components/
├── hooks/
├── services/
├── stores/
└── utils/

// 최종 선택: 하이브리드 접근
src/
├── app/           # Next.js App Router 페이지
├── components/    # 재사용 가능한 UI 컴포넌트
│   ├── ui/       # 기본 UI 컴포넌트 (shadcn/ui)
│   ├── layout/   # 레이아웃 컴포넌트
│   └── posts/    # 기능별 컴포넌트
├── lib/          # 비즈니스 로직 & 유틸리티
├── hooks/        # 커스텀 훅
├── stores/       # 전역 상태 관리
├── types/        # TypeScript 타입 정의
└── utils/        # 순수 유틸리티 함수
```

**학습한 내용**:

- **확장성**: 새로운 기능 추가 시 명확한 위치
- **응집도**: 관련된 코드들의 물리적 근접성
- **재사용성**: 컴포넌트와 로직의 분리
- **Next.js 규칙**: App Router의 파일 시스템 라우팅 준수

### 3. TypeScript 엄격성 수준 결정

**문제**: 개발 속도 vs 타입 안전성의 균형

**단계적 접근**:

```typescript
// 1단계: 기본 설정 (개발 초기)
{
  "strict": false,
  "noImplicitAny": true
}

// 2단계: 점진적 강화 (기능 구현 후)
{
  "strict": true,
  "noUncheckedIndexedAccess": false
}

// 3단계: 최대 엄격성 (안정화 후)
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true
}
```

**학습한 내용**:

- **점진적 도입**: 한 번에 모든 엄격한 규칙을 적용하면 개발 속도 저하
- **팀 합의**: 타입 안전성과 개발 생산성의 균형점 찾기
- **도구 활용**: `// @ts-ignore` 대신 적절한 타입 가드 사용

### 4. 성능 최적화 전략

**문제**: 초기 로딩 성능과 개발 편의성

**고려사항**:

- **번들 크기**: 불필요한 라이브러리 포함 방지
- **코드 스플리팅**: 페이지별 청크 분할
- **이미지 최적화**: Next.js Image 컴포넌트 활용
- **캐싱 전략**: React Query의 적절한 캐시 설정

**적용한 최적화**:

```typescript
// 동적 import로 코드 스플리팅
const MarkdownEditor = dynamic(() => import('@/components/editor/MarkdownEditor'), {
  loading: () => <div>에디터 로딩 중...</div>,
  ssr: false // 클라이언트에서만 로딩
});

// React Query 캐시 최적화
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1분간 신선한 데이터로 간주
      gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
    },
  },
});
```

**학습한 내용**:

- **측정 기반 최적화**: 실제 성능 문제가 있는 부분에만 최적화 적용
- **사용자 경험 우선**: 개발자 편의보다 사용자 경험 우선
- **점진적 개선**: 완벽한 최적화보다는 지속적인 개선

---

## 기존 Phase에서 활용한 기술

### Phase 1이 후속 Phase의 기반이 된 부분

#### 아키텍처 설계 원칙

- **모듈화**: 각 기능을 독립적인 모듈로 분리하여 Phase 2-13에서 점진적 확장
- **타입 안전성**: 초기 설정한 엄격한 TypeScript가 모든 Phase에서 런타임 오류 방지
- **컴포넌트 시스템**: shadcn/ui 기반 디자인 시스템이 일관된 UI 제공

#### 개발 워크플로우

- **코드 품질**: Prettier + ESLint 설정이 모든 Phase에서 일관된 코드 스타일 보장
- **상태 관리**: React Query + Zustand 조합이 복잡한 기능 구현의 기반
- **개발자 도구**: React Query DevTools가 모든 Phase에서 디버깅 지원

---

## 핵심 의사결정과 그 이유

### 1. Next.js 14 App Router 선택

**결정**: Pages Router 대신 App Router 사용

**이유**:

- **미래 지향성**: Next.js의 공식 권장 방향
- **서버 컴포넌트**: SEO와 성능 최적화에 유리
- **레이아웃 시스템**: 중첩 레이아웃으로 복잡한 UI 구조 지원
- **스트리밍**: 점진적 페이지 로딩으로 사용자 경험 향상

### 2. TypeScript 엄격 모드 적용

**결정**: 초기부터 `strict: true` 설정

**이유**:

- **런타임 오류 방지**: 컴파일 타임에 대부분의 오류 발견
- **개발자 경험**: 자동완성과 리팩토링 도구 지원
- **코드 품질**: 명시적 타입으로 코드 의도 명확화
- **팀 협업**: 타입 정의로 API 계약 명확화

### 3. Tailwind CSS + shadcn/ui 조합

**결정**: CSS-in-JS 대신 유틸리티 우선 CSS

**이유**:

- **성능**: 런타임 CSS 생성 없이 빌드 타임 최적화
- **일관성**: 디자인 토큰 기반 일관된 스타일링
- **생산성**: 미리 정의된 컴포넌트로 빠른 개발
- **접근성**: Radix UI 기반으로 웹 접근성 자동 보장

### 4. React Query + Zustand 상태 관리

**결정**: Redux 대신 특화된 라이브러리 조합

**이유**:

- **관심사 분리**: 서버 상태와 클라이언트 상태의 명확한 분리
- **개발 생산성**: 보일러플레이트 최소화
- **성능 최적화**: React Query의 자동 캐싱과 백그라운드 업데이트
- **학습 곡선**: Redux보다 간단한 API

---

## 성능 및 보안 고려사항

### 성능 최적화

#### 번들 크기 최적화

- **트리 셰이킹**: 사용하지 않는 코드 자동 제거
- **동적 import**: 필요한 시점에만 코드 로딩
- **이미지 최적화**: Next.js Image 컴포넌트 활용

#### 캐싱 전략

- **React Query**: 서버 데이터의 지능적 캐싱
- **Next.js 캐싱**: 페이지와 API 응답 캐싱
- **브라우저 캐싱**: 정적 자산의 장기 캐싱

### 보안 고려사항

#### 타입 안전성

- **런타임 검증**: Zod 스키마로 외부 데이터 검증
- **SQL 인젝션 방지**: Supabase ORM 사용
- **XSS 방지**: React의 자동 이스케이프 활용

#### 환경 변수 관리

- **민감 정보 분리**: `.env.local`로 개발 환경 분리
- **타입 검증**: 환경 변수의 TypeScript 타입 정의
- **빌드 타임 검증**: 필수 환경 변수 존재 확인

---

## 향후 개선 방향

### 1. 개발 도구 고도화

#### 테스트 환경 구축

- **단위 테스트**: Vitest + Testing Library
- **E2E 테스트**: Playwright 통합
- **시각적 회귀 테스트**: Chromatic 도입

#### CI/CD 파이프라인

- **자동화된 테스트**: PR 시 자동 테스트 실행
- **코드 품질 검사**: SonarQube 정적 분석
- **성능 모니터링**: Lighthouse CI 통합

### 2. 성능 모니터링

#### 실시간 모니터링

- **Core Web Vitals**: 실제 사용자 성능 지표 추적
- **에러 추적**: Sentry 통합으로 런타임 에러 모니터링
- **사용자 행동 분석**: Google Analytics 4 연동

#### 성능 최적화

- **코드 스플리팅**: 라우트별 청크 최적화
- **이미지 최적화**: WebP, AVIF 포맷 지원
- **CDN 활용**: 정적 자산 글로벌 배포

### 3. 개발자 경험 향상

#### 문서화

- **Storybook**: 컴포넌트 문서화 및 테스트
- **API 문서**: OpenAPI 스펙 자동 생성
- **아키텍처 문서**: 의사결정 기록 (ADR) 관리

#### 개발 워크플로우

- **Git 훅**: Husky로 커밋 전 검증
- **자동 포맷팅**: 저장 시 자동 코드 정리
- **의존성 관리**: Renovate로 자동 업데이트

---

## 결론

Phase 1 프로젝트 셋업 및 기본 구조 구축을 통해 **현대적인 웹 애플리케이션 개발의 핵심 기반**을 마련할 수 있었습니다.

특히 **Next.js 14 App Router**와 **TypeScript 엄격 모드**를 통해 타입 안전성과 성능을 동시에 확보했고, **React Query + Zustand** 조합으로 효율적인 상태 관리 아키텍처를 구축했습니다. 또한 **shadcn/ui + Tailwind CSS**를 통해 일관되고 접근 가능한 디자인 시스템을 확립했습니다.

**개발자 경험(DX) 최적화**를 위한 Prettier, ESLint, TypeScript 설정은 이후 모든 Phase에서 코드 품질과 개발 생산성을 보장하는 견고한 기반이 되었으며, **확장 가능한 아키텍처 설계**를 통해 복잡한 기능들을 점진적으로 추가할 수 있는 구조를 마련했습니다.

이러한 경험은 향후 **대규모 프로젝트의 초기 설계**와 **팀 개발 환경 구축**에서도 활용할 수 있는 실무 역량이 될 것입니다.

---

## 다음 단계 (Phase 2)

### Phase 2에서 구현할 기능들

#### 1. Supabase 프로젝트 설정

- 데이터베이스 스키마 설계 (users, posts, comments, likes)
- Row Level Security (RLS) 정책 구현
- 실시간 구독 설정

#### 2. 인증 시스템 구축

- OAuth 소셜 로그인 (Google, GitHub)
- 세션 관리 및 토큰 처리
- 사용자 권한 관리 (일반 사용자 vs 관리자)

#### 3. 기본 데이터 모델링

- 사용자 프로필 관리
- 글 작성/수정/삭제 권한 설정
- 댓글 및 좋아요 시스템 기반 구축

**Phase 1에서 구축한 기반이 Phase 2에서 활용되는 방식:**

- TypeScript 타입 시스템 → Supabase 스키마 타입 정의
- React Query 설정 → 인증 상태 캐싱 및 관리
- Zustand 스토어 → 사용자 세션 상태 관리
- Next.js App Router → 인증 보호 라우트 구현

---

## 참고 자료

### 공식 문서

- [Next.js 14 App Router](https://nextjs.org/docs/app) - 파일 기반 라우팅과 서버 컴포넌트
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - 고급 타입 시스템
- [Tailwind CSS](https://tailwindcss.com/docs) - 유틸리티 우선 CSS 프레임워크
- [TanStack Query](https://tanstack.com/query/latest) - 서버 상태 관리
- [Zustand](https://zustand-demo.pmnd.rs/) - 간단한 상태 관리

### 디자인 시스템 & UI

- [shadcn/ui](https://ui.shadcn.com/) - 재사용 가능한 컴포넌트 라이브러리
- [Radix UI](https://www.radix-ui.com/) - 접근성 중심 headless 컴포넌트
- [Class Variance Authority](https://cva.style/docs) - 타입 안전한 variant 시스템

### 개발 도구

- [Prettier](https://prettier.io/docs/en/) - 코드 포맷팅 도구
- [ESLint](https://eslint.org/docs/latest/use/configure/) - 코드 품질 검사
- [React Query DevTools](https://tanstack.com/query/latest/docs/react/devtools) - 쿼리 상태 시각화

### 아키텍처 참고

- [React 18 Features](https://react.dev/blog/2022/03/29/react-v18) - Concurrent Features
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing) - 성능 최적화 가이드
- [TypeScript Best Practices](https://typescript-eslint.io/rules/) - 타입스크립트 모범 사례
