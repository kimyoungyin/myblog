# Phase 12 학습정리: Vercel 배포 및 환경변수 설정

## 개요

Phase 12에서는 Next.js 애플리케이션을 Vercel에 배포하고, 프로덕션 환경에서의 OAuth 인증 및 환경변수 관리를 구현했습니다. 특히 개발 환경과 프로덕션 환경 간의 차이점과 이를 해결하는 방법을 학습했습니다.

## 핵심 학습 내용

### 1. Vercel 배포 설정 및 최적화

#### vercel.json 설정의 중요성

```json
{
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "framework": "nextjs",
    "buildCommand": "npm run build",
    "installCommand": "npm install",
    "git": {
        "deploymentEnabled": {
            "main": true,
            "develop": false
        }
    },
    "functions": {
        "app/**/*.{js,ts}": {
            "memory": 1024,
            "maxDuration": 30
        }
    },
    "regions": ["icn1"],
    "trailingSlash": false
}
```

**학습 포인트:**

- **브랜치별 배포 제어**: `main` 브랜치만 자동 배포되도록 설정하여 안정적인 배포 관리
- **함수 최적화**: 메모리(1024MB)와 실행 시간(30초) 제한으로 성능과 비용 최적화
- **지역 설정**: `icn1` (서울) 리전으로 한국 사용자 응답 속도 최적화
- **URL 정규화**: `trailingSlash: false`로 일관된 URL 구조 유지

#### .vercelignore로 배포 최적화

```bash
# Development files
.env.local
.env.development.local

# Documentation
학습정리-*.md
README.md

# Test files
**/__tests__/**
**/*.test.ts
**/*.test.tsx

# Local development
.next
node_modules
.turbo
```

**학습한 내용:**

- **배포 크기 최적화**: 불필요한 파일 제외로 배포 속도 향상
- **보안 강화**: 로컬 환경 파일과 테스트 파일 제외
- **빌드 효율성**: 개발 관련 파일들을 배포에서 제외

### 2. 환경변수 관리 및 보안

#### 환경변수 계층 구조 이해

```typescript
// 동적 URL 생성 패턴
const getURL = () => {
    let url =
        process?.env?.NEXT_PUBLIC_SITE_URL ?? // 1순위: 명시적 설정
        process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // 2순위: Vercel 자동 설정
        'http://localhost:3000/'; // 3순위: 개발 환경 기본값

    url = url.startsWith('http') ? url : `https://${url}`;
    url = url.endsWith('/') ? url : `${url}/`;

    return url;
};
```

**학습 포인트:**

- **환경별 우선순위**: 명시적 설정 > 자동 설정 > 기본값 순서로 적용
- **URL 정규화**: 프로토콜과 trailing slash 자동 처리
- **개발/프로덕션 호환성**: 하나의 코드로 모든 환경 대응

#### 클라이언트 vs 서버 환경변수 구분

```typescript
// 클라이언트에서 접근 가능 (NEXT_PUBLIC_ 접두사)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 서버에서만 접근 가능 (보안이 중요한 키)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;
```

**중요한 보안 원칙:**

- **PUBLIC 키**: 브라우저에 노출되어도 안전한 키만 `NEXT_PUBLIC_` 사용
- **SERVICE_ROLE_KEY**: 절대 클라이언트에 노출하지 않음 (모든 권한 보유)
- **환경별 분리**: 개발/스테이징/프로덕션 환경별 다른 키 사용

### 3. OAuth 인증 및 Redirect URL 관리

#### 프로덕션 환경에서의 OAuth 설정

```typescript
// 동적 redirect URL 생성
const handleOAuthLogin = async (provider: 'google' | 'github') => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${window.location.origin}/auth/callback`,
        },
    });

    if (data.url) {
        window.location.href = data.url;
    }
};
```

**학습한 문제와 해결책:**

**문제**: 개발 환경에서는 작동하던 OAuth가 프로덕션에서 실패
**원인**: Supabase 프로젝트 설정에 프로덕션 URL이 등록되지 않음
**해결책**:

1. **Site URL 설정**: `https://myblog-navy-kappa.vercel.app`
2. **Redirect URLs 추가**:
    - `https://myblog-navy-kappa.vercel.app/auth/callback`
    - `http://localhost:3000/auth/callback`
3. **환경변수 추가**: `NEXT_PUBLIC_SITE_URL` 설정

**학습한 OAuth 플로우:**

1. **클라이언트**: OAuth 요청 시 `redirectTo` 파라미터로 콜백 URL 지정
2. **OAuth 제공자**: 인증 완료 후 Supabase callback URL로 리디렉트
3. **Supabase**: 토큰 처리 후 지정된 `redirectTo` URL로 최종 리디렉트
4. **애플리케이션**: `/auth/callback`에서 세션 정보 처리

### 4. Next.js 프로덕션 빌드 최적화

#### 빌드 과정 분석

```bash
npm run build
```

**빌드 결과 분석:**

```
Route (app)                                 Size  First Load JS
┌ ○ /                                      174 B         108 kB
├ ○ /_not-found                            992 B         101 kB
├ ƒ /admin/posts/[id]/edit                 134 B         217 kB
├ ○ /admin/posts/new                       135 B         217 kB
├ ƒ /api/profile                           132 B        99.7 kB
├ ƒ /posts                               2.38 kB         158 kB
├ ƒ /posts/[id]                          13.4 kB         259 kB
└ ○ /sitemap.xml                           132 B        99.7 kB
```

**학습 포인트:**

- **○ (Static)**: 빌드 시 미리 생성되는 정적 페이지
- **ƒ (Dynamic)**: 요청 시 서버에서 렌더링되는 동적 페이지
- **First Load JS**: 페이지 첫 로드 시 다운로드되는 JavaScript 크기
- **Code Splitting**: 페이지별로 필요한 코드만 로드하여 성능 최적화

#### 성능 모니터링 설정

```typescript
// Vercel Analytics 추가
import { Analytics } from '@vercel/analytics/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <body>
                {/* 앱 컴포넌트들 */}
                <Analytics />
            </body>
        </html>
    );
}
```

**Analytics로 모니터링할 수 있는 지표:**

- **페이지 로드 시간**: 사용자 경험 최적화 지표
- **Core Web Vitals**: Google SEO 순위에 영향을 주는 성능 지표
- **사용자 플로우**: 실제 사용자의 행동 패턴 분석

### 5. 배포 자동화 및 CI/CD 파이프라인

#### Git 기반 자동 배포

```json
// vercel.json
{
    "git": {
        "deploymentEnabled": {
            "main": true, // 프로덕션 자동 배포
            "develop": false // 개발 브랜치는 수동 배포
        }
    }
}
```

**배포 전략:**

- **main 브랜치**: 안정된 코드만 머지, 자동 프로덕션 배포
- **develop 브랜치**: 개발 중인 코드, 배포 비활성화
- **Pull Request**: 자동으로 Preview 배포 생성하여 테스트 가능

#### 배포 검증 프로세스

**자동 검증 항목:**

1. **빌드 성공**: TypeScript 컴파일, ESLint 검사
2. **번들 크기**: 성능에 영향을 주는 큰 번들 감지
3. **환경변수**: 필수 환경변수 존재 여부 확인

**수동 검증 항목:**

1. **기능 테스트**: 주요 기능들의 정상 작동 확인
2. **인증 플로우**: OAuth 로그인/로그아웃 테스트
3. **반응형 디자인**: 다양한 디바이스에서 UI 확인
4. **성능 테스트**: 로딩 속도 및 사용자 경험 검증

## 기존 Phase에서 활용한 기술

### Phase 1-3: 기본 인프라

- **Next.js 설정**: `next.config.ts`의 이미지 최적화 설정이 프로덕션에서 활용
- **TypeScript**: 빌드 시 타입 검사로 런타임 에러 방지
- **Tailwind CSS**: 프로덕션 빌드에서 사용하지 않는 CSS 자동 제거

### Phase 4-5: 데이터베이스 연동

- **Supabase 클라이언트**: 환경별로 다른 URL과 키 설정
- **환경변수 관리**: 개발/프로덕션 환경 분리

### Phase 6-8: 인증 시스템

- **OAuth 설정**: 프로덕션 URL에 대한 추가 설정 필요
- **세션 관리**: 쿠키 기반 세션이 도메인 간에 정상 작동

### Phase 9-11: 고급 기능들

- **React Query**: 프로덕션에서의 캐싱 전략 최적화
- **성능 최적화**: 빌드 시 코드 분할과 트리 셰이킹 적용

## 핵심 의사결정과 그 이유

### 1. Vercel을 배포 플랫폼으로 선택

**결정**: Vercel 사용
**이유**:

- **Next.js 최적화**: Next.js 개발팀이 만든 플랫폼으로 완벽한 호환성
- **자동 배포**: Git 연동으로 코드 푸시만으로 배포 완료
- **글로벌 CDN**: 전 세계 사용자에게 빠른 응답 속도 제공
- **서버리스 함수**: 별도 서버 관리 없이 API 엔드포인트 제공
- **무료 티어**: 개인 프로젝트에 충분한 리소스 제공

**대안으로 고려했던 것들:**

- **Netlify**: 정적 사이트에 특화, 서버리스 함수 제한적
- **AWS Amplify**: 복잡한 설정, 높은 러닝 커브
- **Railway/Render**: 컨테이너 기반, Next.js 최적화 부족

### 2. 환경변수 관리 전략

**결정**: 계층적 환경변수 관리
**이유**:

- **보안성**: 민감한 정보는 서버에서만 접근 가능
- **유연성**: 환경별로 다른 설정 적용 가능
- **자동화**: Vercel의 자동 환경변수 활용

**적용한 원칙:**

- `NEXT_PUBLIC_`: 클라이언트 노출 허용 (URL, 공개 키)
- 일반 환경변수: 서버에서만 접근 (비밀 키, 데이터베이스 URL)
- 계층적 fallback: 명시적 설정 > 자동 설정 > 기본값

### 3. 브랜치 전략 및 배포 정책

**결정**: main 브랜치만 자동 배포
**이유**:

- **안정성**: 검증된 코드만 프로덕션 배포
- **비용 효율성**: 불필요한 배포 방지
- **테스트 환경**: PR별 Preview 배포로 충분한 테스트 환경 제공

## 고민했던 부분과 해결책

### 문제 1: OAuth 프로덕션 환경 오류

**문제**: 개발 환경에서는 정상 작동하던 Google/GitHub 로그인이 프로덕션에서 실패
**시도한 해결 방법들**:

1. **코드 검토**: 클라이언트 코드에서 redirect URL 생성 로직 확인
2. **환경변수 확인**: Vercel 대시보드에서 환경변수 설정 검토
3. **네트워크 분석**: 브라우저 개발자 도구로 OAuth 플로우 추적

**최종 해결책**:

```typescript
// Supabase 프로젝트 설정에서 URL 추가
Site URL: https://myblog-navy-kappa.vercel.app
Redirect URLs:
- https://myblog-navy-kappa.vercel.app/auth/callback
- http://localhost:3000/auth/callback

// Vercel 환경변수 추가
NEXT_PUBLIC_SITE_URL=https://myblog-navy-kappa.vercel.app
```

**학습한 내용**:

- OAuth는 보안을 위해 사전에 등록된 URL에서만 작동
- 개발과 프로덕션 환경의 URL이 다르므로 양쪽 모두 등록 필요
- Supabase의 Site URL 설정이 기본 redirect 동작에 영향

### 문제 2: 환경변수 우선순위 혼란

**문제**: 여러 환경변수가 있을 때 어떤 것이 사용되는지 불명확
**해결책**: 명확한 우선순위 체계 구축

```typescript
const getURL = () => {
    let url =
        process?.env?.NEXT_PUBLIC_SITE_URL ?? // 최우선
        process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Vercel 자동 제공
        'http://localhost:3000/'; // 개발 환경 기본값
    return normalizeURL(url);
};
```

**학습한 내용**:

- 환경변수는 명시적 > 자동 > 기본값 순서로 우선순위 설정
- Nullish coalescing operator(`??`)로 undefined/null만 fallback
- URL 정규화로 일관된 형태 보장

### 문제 3: 빌드 최적화와 기능성의 균형

**문제**: 모든 기능을 포함하면 번들 크기 증가, 성능 저하 우려
**해결책**:

1. **코드 분할**: 페이지별로 필요한 코드만 로드
2. **동적 임포트**: 관리자 기능은 필요시에만 로드
3. **트리 셰이킹**: 사용하지 않는 코드 자동 제거

```typescript
// 동적 임포트 예시
const AdminPanel = dynamic(() => import('@/components/admin/AdminPanel'), {
    loading: () => <div>Loading...</div>,
    ssr: false
});
```

**학습한 내용**:

- Next.js의 자동 코드 분할 활용
- 조건부 렌더링으로 불필요한 컴포넌트 로드 방지
- 빌드 분석으로 번들 크기 모니터링

## 성능 및 보안 고려사항

### 성능 최적화

**적용한 최적화 기법:**

1. **이미지 최적화**: Next.js Image 컴포넌트로 자동 최적화
2. **코드 분할**: 페이지별, 컴포넌트별 분할로 초기 로드 시간 단축
3. **캐싱 전략**: React Query와 Vercel CDN으로 다층 캐싱
4. **지역 최적화**: 한국 리전(icn1) 사용으로 지연 시간 최소화

**측정 지표:**

- **First Contentful Paint (FCP)**: 첫 콘텐츠 표시 시간
- **Largest Contentful Paint (LCP)**: 주요 콘텐츠 로드 시간
- **Cumulative Layout Shift (CLS)**: 레이아웃 변화 최소화

### 보안 강화

**적용한 보안 조치:**

1. **환경변수 분리**: 민감한 정보는 서버에서만 접근
2. **HTTPS 강제**: 프로덕션에서 모든 통신 암호화
3. **CORS 설정**: Supabase에서 허용된 도메인만 접근 가능
4. **OAuth 제한**: 사전 등록된 redirect URL만 허용

```typescript
// 보안을 위한 환경변수 사용 예시
// ✅ 안전: 서버에서만 접근
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ✅ 안전: 브라우저 노출 허용
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
```

## 배포 후 모니터링 및 유지보수

### 모니터링 대상

**성능 모니터링:**

- **페이지 로드 시간**: Vercel Analytics로 실시간 모니터링
- **에러 발생률**: 빌드 실패, 런타임 에러 추적
- **사용자 행동**: 페이지 방문, 기능 사용 패턴 분석

**보안 모니터링:**

- **인증 실패**: 비정상적인 로그인 시도 감지
- **API 호출**: 비정상적인 요청 패턴 모니터링
- **환경변수**: 민감한 정보 노출 여부 확인

### 유지보수 계획

**정기 업데이트:**

1. **의존성 업데이트**: 보안 패치 및 기능 개선
2. **성능 최적화**: 번들 크기, 로딩 속도 개선
3. **보안 강화**: 새로운 보안 위협에 대한 대응

**장애 대응:**

1. **모니터링**: Vercel 대시보드에서 실시간 상태 확인
2. **롤백**: 문제 발생 시 이전 버전으로 즉시 복구
3. **디버깅**: 로그 분석을 통한 근본 원인 파악

## 향후 개선 방향

### 1. 고급 배포 전략

**현재**: 단순 main 브랜치 배포
**개선 방향**:

- **스테이징 환경**: develop 브랜치용 별도 환경 구축
- **카나리 배포**: 일부 사용자에게만 새 버전 적용
- **A/B 테스트**: Vercel의 Edge Config를 활용한 기능 테스트

### 2. 모니터링 고도화

**현재**: 기본 Vercel Analytics
**개선 방향**:

- **에러 추적**: Sentry 연동으로 상세한 에러 정보 수집
- **성능 분석**: Web Vitals 상세 분석
- **사용자 분석**: 실제 사용 패턴 기반 UX 개선

### 3. 보안 강화

**현재**: 기본 OAuth 보안
**개선 방향**:

- **2FA 지원**: 관리자 계정 이중 인증
- **Rate Limiting**: API 호출 제한으로 남용 방지
- **보안 헤더**: CSP, HSTS 등 추가 보안 헤더 적용

### 4. 성능 최적화

**현재**: 기본 Next.js 최적화
**개선 방향**:

- **Service Worker**: 오프라인 지원 및 캐싱 강화
- **이미지 최적화**: WebP, AVIF 포맷 지원
- **프리로딩**: 사용자 행동 예측 기반 리소스 사전 로드

## 결론

Phase 12 Vercel 배포 및 환경변수 설정을 통해 **프로덕션 환경에서의 웹 애플리케이션 운영**에 대한 포괄적인 이해를 얻을 수 있었습니다.

특히 **개발 환경과 프로덕션 환경의 차이점**을 실제로 경험하며, OAuth 인증 설정, 환경변수 관리, 성능 최적화 등의 실무적 지식을 습득했습니다. **계층적 환경변수 관리 전략**과 **보안을 고려한 키 분리**를 통해 안전하고 확장 가능한 배포 시스템을 구축할 수 있었습니다.

이러한 경험은 향후 **대규모 프로덕션 환경**에서의 웹 애플리케이션 개발과 운영에서도 활용할 수 있는 견고한 기반이 될 것입니다. 특히 **자동화된 CI/CD 파이프라인**과 **모니터링 시스템**의 중요성을 이해하게 되어, 더욱 안정적이고 효율적인 개발 워크플로우를 구성할 수 있게 되었습니다.
