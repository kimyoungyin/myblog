# 마크다운 기반 블로그 프로젝트 학습정리

## Phase 2: Supabase 설정 및 인증 ✅

### 완료된 작업

#### 1. Supabase 프로젝트 생성 및 설정

- [x] Supabase 프로젝트 생성 (`yuistgpbrcrkspxztygl.supabase.co`)
- [x] 환경 변수 설정 (`.env.local`)
- [x] Supabase 클라이언트 설정 (`src/lib/supabase.ts`)
- [x] 데이터베이스 스키마 생성 (profiles, hashtags, posts, post_hashtags, comments, likes)
- [x] RLS (Row Level Security) 정책 설정

#### 2. 인증 시스템 구현

- [x] 소셜 로그인 구현 (Google OAuth 2.0, GitHub OAuth)
- [x] 인증 관련 타입 정의 (`src/types/index.ts`)
- [x] 기본 인증 훅 생성 (`src/hooks/useAuth.ts`)
- [x] Auth Callback 라우트 생성 (`src/app/auth/callback/page.tsx`)
- [x] 인증 테스트 페이지 생성 (`src/app/test-auth/page.tsx`)

#### 3. 데이터베이스 보안 설정

- [x] RLS 활성화 및 정책 설정
- [x] Admin 전용 글 작성 권한 설정
- [x] 사용자별 댓글/좋아요 권한 설정
- [x] 공개 읽기, 인증된 사용자만 쓰기 정책

### 학습 내용

#### TanStack Query (React Query) 첫 사용 경험

**개념 이해:**

- **서버 상태 vs 클라이언트 상태**:
    - 서버 상태: API에서 가져오는 데이터 (사용자 정보, 글 목록 등)
    - 클라이언트 상태: UI 상태 (폼 입력, 모달 열림/닫힘 등)
- **캐싱 전략**:
    - `staleTime`: 데이터가 "신선"하다고 간주되는 시간 (기본값: 1분)
    - `gcTime`: 캐시에서 제거되기 전까지 유지되는 시간 (기본값: 10분)
- **자동 백그라운드 업데이트**: 사용자가 탭을 다시 열 때 자동으로 최신 데이터 가져오기

**개발 중 디버깅 도구:**

- **React Query DevTools**:
    - 브라우저 우측 하단에 표시
    - 모든 쿼리와 뮤테이션 상태를 실시간으로 모니터링
    - 캐시된 데이터, 로딩 상태, 에러 상태를 시각적으로 확인
    - 쿼리 키별로 데이터 그룹화하여 관리
    - `initialIsOpen={false}`로 기본적으로 접힌 상태로 시작

**설정 코드:**

```tsx
const [queryClient] = useState(
    () =>
        new QueryClient({
            defaultOptions: {
                queries: {
                    staleTime: 60 * 1000, // 1분
                    gcTime: 10 * 60 * 1000, // 10분
                    retry: 1,
                    refetchOnWindowFocus: false,
                },
                mutations: {
                    retry: 1,
                },
            },
        })
);
```

#### SSR 방식에서 Supabase 로그인과 로그인 상태 유지

**SSR과 인증의 관계:**

- **Next.js App Router**: 서버 컴포넌트와 클라이언트 컴포넌트 분리
- **서버 컴포넌트**: 인증 상태를 직접 확인할 수 없음 (브라우저 API 접근 불가)
- **클라이언트 컴포넌트**: `'use client'` 지시어로 브라우저 환경에서 실행

**인증 상태 관리 전략:**

1. **초기 로딩 상태**: `useAuth` 훅에서 `loading: true`로 시작
2. **세션 확인**: `supabase.auth.getSession()`으로 현재 세션 확인
3. **프로필 정보 가져오기**: 세션이 있으면 `profiles` 테이블에서 사용자 정보 조회
4. **상태 동기화**: `useEffect`로 프로필 정보와 로컬 상태 동기화

**로그인 상태 유지 메커니즘:**

- **Supabase 세션**: JWT 토큰 기반으로 자동 갱신
- **로컬 스토리지**: 브라우저에 세션 정보 저장
- **새로고침 대응**: 페이지 새로고침 시에도 자동으로 세션 복원
- **자동 만료 처리**: 토큰 만료 시 자동으로 refresh token 사용

**Auth Session 관리:**

- **세션 생성**: OAuth 로그인 성공 시 `access_token`, `refresh_token` 자동 생성
- **세션 저장**: Supabase가 자동으로 브라우저 로컬 스토리지에 세션 정보 저장
- **세션 복원**: 페이지 새로고침 시 `supabase.auth.getSession()`으로 저장된 세션 자동 복원
- **세션 만료**: `access_token` 만료 시 `refresh_token`을 사용해 자동 갱신
- **세션 무효화**: 로그아웃 시 `supabase.auth.signOut()`으로 세션 완전 삭제

**인증 훅 구조:**

```tsx
export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // 현재 세션 가져오기 (무한 캐싱)
    const { data: session } = useQuery({
        queryKey: ['auth', 'session'],
        queryFn: async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            return session;
        },
        staleTime: Infinity, // 세션은 자주 변경되지 않음
        gcTime: Infinity,
    });

    // 사용자 프로필 가져오기 (5분 캐싱)
    const { data: profile } = useQuery({
        queryKey: ['auth', 'profile', session?.user?.id],
        queryFn: async () => {
            if (!session?.user?.id) return null;

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!session?.user?.id, // 세션이 있을 때만 실행
        staleTime: 5 * 60 * 1000, // 5분
    });
}
```

#### OAuth 2.0 소셜 로그인 구현

**Google OAuth 2.0:**

- **Client ID/Secret**: Google Cloud Console에서 생성
- **리디렉션 URI**: `https://yuistgpbrcrkspxztygl.supabase.co/auth/v1/callback`
- **사용자 메타데이터**: `full_name`, `avatar_url` 자동 수집

**GitHub OAuth:**

- **Client ID/Secret**: GitHub OAuth Apps에서 생성
- **권한 범위**: `user:email` (이메일 정보 접근)
- **사용자 정보**: GitHub 프로필 정보 자동 수집

**OAuth 플로우:**

1. 사용자가 소셜 로그인 버튼 클릭
2. `supabase.auth.signInWithOAuth()` 호출
3. 소셜 제공자 로그인 페이지로 리디렉션
4. 사용자 인증 완료 후 Supabase callback URL로 리디렉션
5. URL hash fragment에서 `access_token`, `refresh_token` 추출
6. `supabase.auth.setSession()`으로 세션 설정
7. 자동으로 메인 페이지로 리디렉션

#### 데이터베이스 스키마 설계

**핵심 테이블 구조:**

- **profiles**: 사용자 정보 (Supabase Auth 확장)
- **posts**: 블로그 글 (admin만 작성 가능)
- **hashtags**: 해시태그 관리
- **post_hashtags**: 글-해시태그 다대다 관계
- **comments**: 댓글 시스템 (1단계 계층)
- **likes**: 좋아요 시스템

**RLS 정책 설계 원칙:**

- **공개 읽기**: 모든 사용자가 글, 댓글, 해시태그 조회 가능
- **인증된 사용자만 쓰기**: 로그인한 사용자만 댓글, 좋아요 가능
- **Admin 전용**: 글 작성/수정/삭제는 admin만 가능
- **자신의 데이터만 수정**: 댓글, 좋아요는 작성자만 수정/삭제 가능

### 기술적 도전과 해결

#### 1. Auth Callback 라우트 구현

**문제**: OAuth 로그인 후 리디렉션되는 `/auth/callback` 페이지가 없어서 404 에러 발생
**해결**: Next.js App Router로 동적 라우트 생성, URL hash fragment에서 토큰 추출

#### 2. 타입 안전성 확보

**문제**: Supabase 데이터베이스 타입과 TypeScript 인터페이스 불일치
**해결**: `Database` 타입 정의로 테이블 구조와 완벽하게 일치하는 타입 시스템 구축

#### 3. 인증 상태 동기화

**문제**: 서버와 클라이언트 간 인증 상태 불일치
**해결**: React Query로 서버 상태 관리, `useEffect`로 로컬 상태 동기화

#### 4. OAuth Callback 처리

**문제**: OAuth 로그인 후 URL hash fragment에 토큰이 포함되어 전달되는 방식
**해결**: `window.location.hash`에서 `access_token`, `refresh_token` 추출하여 Supabase 세션 설정

#### 5. 자동 프로필 생성 시스템

**문제**: OAuth 로그인 후 `profiles` 테이블에 사용자 정보가 자동으로 생성되지 않음
**해결**: Supabase Database Functions와 Triggers를 사용하여 사용자 가입 시 자동 프로필 생성

### 성능 최적화

#### React Query 캐싱 전략

- **세션 정보**: `staleTime: Infinity`로 자주 변경되지 않는 데이터 무한 캐싱
- **사용자 프로필**: `staleTime: 5분`으로 적당한 주기로 갱신
- **백그라운드 리페치**: 사용자가 탭을 다시 열 때 자동으로 최신 데이터 가져오기

#### 인증 상태 관리 최적화

- **조건부 쿼리**: `enabled` 옵션으로 세션이 있을 때만 프로필 조회
- **에러 처리**: 네트워크 오류 시 자동 재시도 (최대 1회)
- **로딩 상태**: 사용자 경험을 위한 적절한 로딩 인디케이터

### Phase 2 추가 구현 및 학습 내용

#### 1. OAuth Callback 처리 시스템

**구현 내용:**

- `/auth/callback` 라우트 생성 (`src/app/auth/callback/page.tsx`)
- URL hash fragment에서 토큰 추출 로직
- Supabase 세션 설정 및 상태 관리
- 성공/실패 시 사용자 피드백 및 리디렉션

**핵심 코드:**

```tsx
// URL hash fragment에서 토큰 추출
const hash = window.location.hash.substring(1);
const params = new URLSearchParams(hash);
const accessToken = params.get('access_token');
const refreshToken = params.get('refresh_token');

// Supabase 세션 설정
const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
});
```

#### 2. 자동 프로필 생성 시스템

**구현 내용:**

- Supabase Database Functions 생성
- `auth.users` 테이블 INSERT 시 자동 트리거 실행
- `profiles` 테이블에 사용자 정보 자동 생성
- OAuth 제공자에서 전달받은 메타데이터 활용

**SQL 함수:**

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 3. 인증 테스트 시스템

**구현 내용:**

- `/test-auth` 페이지 생성
- Google, GitHub 소셜 로그인 버튼
- 로그인 상태 표시 및 디버그 정보
- 로그아웃 기능 테스트

#### 4. 환경 변수 관리

**구현 내용:**

- `.env.local` 파일 생성
- Supabase URL 및 API 키 설정
- Next.js 환경 변수 시스템 활용
- 개발/프로덕션 환경 분리 준비

### 다음 단계 (Phase 3)

**Phase 3: 기본 UI 컴포넌트** 준비:

- 레이아웃 컴포넌트 (Layout, Header, Footer)
- 공통 UI 컴포넌트 (Button, Input, Dialog 등)
- 반응형 디자인 기본 설정
- 테마 설정 (다크/라이트 모드)

### 참고 자료

- [Supabase Authentication Documentation](https://supabase.com/docs/guides/auth)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [OAuth 2.0 Authorization Code Flow](https://oauth.net/2/grant-types/authorization-code/)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

### 개발 환경 정보

- **Supabase 프로젝트**: `yuistgpbrcrkspxztygl.supabase.co`
- **지원 소셜 로그인**: Google OAuth 2.0, GitHub OAuth
- **데이터베이스**: PostgreSQL with RLS
- **인증 방식**: JWT 기반 세션 관리
- **상태 관리**: React Query (서버 상태) + React useState (클라이언트 상태)
- **추가 구현**: OAuth Callback 처리, 자동 프로필 생성, 인증 테스트 시스템
- **환경 변수**: `.env.local`을 통한 Supabase 설정 관리
