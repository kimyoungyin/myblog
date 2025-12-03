# Phase 2 학습정리: Supabase 설정 및 데이터베이스 구축

## 개요

Phase 2에서는 **Supabase를 활용한 현대적인 백엔드 인프라**를 구축했습니다. PostgreSQL 데이터베이스 스키마 설계부터 Row Level Security(RLS) 정책 구현, OAuth 2.0 소셜 로그인 시스템까지 **확장 가능하고 안전한 데이터 아키텍처**를 완성했습니다.

특히 **타입 안전성을 보장하는 데이터베이스 스키마**와 **세밀한 권한 제어 시스템**을 통해 프로덕션 수준의 보안과 성능을 확보했으며, Phase 1에서 구축한 TypeScript 기반 위에 **완전한 end-to-end 타입 안전성**을 구현했습니다.

---

## 핵심 학습 내용

### 1. Supabase 아키텍처와 PostgreSQL 스키마 설계

#### 데이터베이스 스키마 설계 철학

**관계형 데이터베이스 설계 원칙:**

```sql
-- 사용자 프로필 테이블 (Supabase Auth 확장)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 블로그 글 테이블
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    thumbnail_url TEXT,
    author_id UUID REFERENCES profiles(id) NOT NULL,
    view_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 해시태그 시스템 (다대다 관계)
CREATE TABLE hashtags (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE post_hashtags (
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    hashtag_id INTEGER REFERENCES hashtags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, hashtag_id)
);

-- 댓글 시스템 (1단계 계층)
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES profiles(id) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 좋아요 시스템
CREATE TABLE likes (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);
```

**학습 포인트:**

- **정규화 원칙**: 데이터 중복 최소화와 무결성 보장
- **외래 키 제약**: `REFERENCES`와 `ON DELETE CASCADE`로 참조 무결성 확보
- **인덱싱 전략**: `UNIQUE` 제약과 복합 키로 성능 최적화
- **타임스탬프 관리**: `TIMESTAMPTZ`로 시간대 정보 포함 저장
- **카운터 필드**: `likes_count`, `comments_count`로 집계 성능 최적화

#### TypeScript 타입 시스템과 데이터베이스 연동

```typescript
// src/types/index.ts - 데이터베이스 스키마와 완벽 동기화
export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    email: string;
                    full_name: string | null;
                    avatar_url: string | null;
                    is_admin: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email: string;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    is_admin?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    is_admin?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            posts: {
                Row: {
                    id: number;
                    title: string;
                    content_markdown: string;
                    thumbnail_url: string | null;
                    author_id: string;
                    view_count: number;
                    likes_count: number;
                    comments_count: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    title: string;
                    content_markdown: string;
                    thumbnail_url?: string | null;
                    author_id: string;
                    view_count?: number;
                    likes_count?: number;
                    comments_count?: number;
                };
                Update: {
                    title?: string;
                    content_markdown?: string;
                    thumbnail_url?: string | null;
                    view_count?: number;
                    likes_count?: number;
                    comments_count?: number;
                    updated_at?: string;
                };
            };
        };
    };
}

// 편의성을 위한 타입 별칭
export type User = Database['public']['Tables']['profiles']['Row'];
export type Post = Database['public']['Tables']['posts']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type Like = Database['public']['Tables']['likes']['Row'];

// 유틸리티 타입 활용
export type CreatePostData = Database['public']['Tables']['posts']['Insert'];
export type UpdatePostData = Database['public']['Tables']['posts']['Update'];
```

**학습한 핵심 개념:**

- **타입 안전성**: 데이터베이스 스키마 변경 시 컴파일 타임에 오류 발견
- **자동 완성**: IDE에서 테이블 컬럼명과 타입 자동 완성 지원
- **CRUD 타입 분리**: `Row`, `Insert`, `Update` 타입으로 용도별 타입 최적화
- **유틸리티 타입**: TypeScript 고급 타입으로 코드 재사용성 향상

### 2. Row Level Security (RLS) 정책 설계

#### 보안 정책 설계 원칙

**계층적 권한 시스템:**

```sql
-- 1. 공개 읽기 정책 (모든 사용자)
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Public posts are viewable by everyone" ON posts
    FOR SELECT USING (true);

CREATE POLICY "Public comments are viewable by everyone" ON comments
    FOR SELECT USING (true);

-- 2. 인증된 사용자 정책
CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- 3. 관리자 전용 정책
CREATE POLICY "Only admins can insert posts" ON posts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "Only admins can update posts" ON posts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "Only admins can delete posts" ON posts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- 4. 소유자 기반 정책
CREATE POLICY "Users can insert their own comments" ON comments
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own comments" ON comments
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own comments" ON comments
    FOR DELETE USING (auth.uid() = author_id);

-- 5. 중복 방지 정책
CREATE POLICY "Users can manage their own likes" ON likes
    FOR ALL USING (auth.uid() = user_id);
```

**학습 포인트:**

- **최소 권한 원칙**: 필요한 최소한의 권한만 부여
- **계층적 권한**: 공개 → 인증 → 소유자 → 관리자 순서의 권한 체계
- **조건부 정책**: `WITH CHECK`와 `USING`으로 세밀한 권한 제어
- **성능 고려**: 인덱스와 함께 작동하는 효율적인 정책 설계

#### RLS 정책 테스트 및 검증

```sql
-- RLS 정책 테스트 쿼리
-- 1. 비인증 사용자 테스트
SET ROLE anon;
SELECT * FROM posts; -- 성공: 공개 읽기 허용
INSERT INTO posts (title, content_markdown, author_id)
VALUES ('Test', 'Content', 'some-uuid'); -- 실패: 인증 필요

-- 2. 일반 사용자 테스트
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "user-uuid", "role": "authenticated"}';
INSERT INTO comments (post_id, author_id, content)
VALUES (1, 'user-uuid', 'My comment'); -- 성공: 자신의 댓글 작성

-- 3. 관리자 테스트
SET request.jwt.claims TO '{"sub": "admin-uuid", "role": "authenticated"}';
INSERT INTO posts (title, content_markdown, author_id)
VALUES ('Admin Post', 'Content', 'admin-uuid'); -- 성공: 관리자 글 작성
```

**학습한 핵심 개념:**

- **역할 기반 테스트**: `SET ROLE`로 다양한 권한 레벨 시뮬레이션
- **JWT 클레임 시뮬레이션**: `request.jwt.claims`로 인증 상태 모방
- **정책 검증**: 실제 쿼리 실행으로 정책 동작 확인
- **보안 테스트**: 권한 우회 시도를 통한 보안 검증

### 3. OAuth 2.0 소셜 로그인 시스템

#### OAuth 2.0 플로우 구현

**Google OAuth 2.0 설정:**

```typescript
// src/lib/auth.ts - OAuth 설정
export const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    });

    if (error) {
        console.error('Google 로그인 오류:', error);
        throw error;
    }

    return data;
};

// GitHub OAuth 설정
export const signInWithGitHub = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            scopes: 'user:email',
        },
    });

    if (error) {
        console.error('GitHub 로그인 오류:', error);
        throw error;
    }

    return data;
};
```

**OAuth Callback 처리:**

```typescript
// src/app/auth/callback/page.tsx - 콜백 처리
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AuthCallbackPage() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                const supabase = createClient();

                // URL hash fragment에서 토큰 추출
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash);

                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (!accessToken || !refreshToken) {
                    throw new Error('인증 토큰을 찾을 수 없습니다.');
                }

                // Supabase 세션 설정
                const { data, error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (error) {
                    throw error;
                }

                setStatus('success');

                // 성공 시 메인 페이지로 리디렉션
                setTimeout(() => {
                    router.push('/');
                }, 2000);

            } catch (err) {
                console.error('Auth callback 오류:', err);
                setError(err instanceof Error ? err.message : '알 수 없는 오류');
                setStatus('error');
            }
        };

        handleAuthCallback();
    }, [router]);

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>로그인 처리 중...</p>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">로그인 실패</h1>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => router.push('/auth/login')}
                        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
                    >
                        다시 시도
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-green-600 mb-4">로그인 성공!</h1>
                <p className="text-gray-600">메인 페이지로 이동합니다...</p>
            </div>
        </div>
    );
}
```

**학습 포인트:**

- **OAuth 2.0 플로우**: Authorization Code Grant 방식의 완전한 구현
- **보안 고려사항**: `state` 매개변수로 CSRF 공격 방지
- **사용자 경험**: 로딩, 성공, 실패 상태에 대한 적절한 피드백
- **에러 처리**: 다양한 실패 시나리오에 대한 견고한 처리

#### 자동 프로필 생성 시스템

**Database Function과 Trigger:**

```sql
-- 새 사용자 자동 프로필 생성 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, is_admin)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        FALSE -- 기본값으로 일반 사용자
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- 에러 발생 시 로그 기록 (선택사항)
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW; -- 사용자 생성은 계속 진행
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users 테이블에 트리거 설정
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 관리자 사용자 수동 설정 함수
CREATE OR REPLACE FUNCTION public.set_user_admin(user_email TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE profiles
    SET is_admin = TRUE, updated_at = NOW()
    WHERE email = user_email;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User with email % not found', user_email;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**학습한 핵심 개념:**

- **Database Triggers**: 데이터 변경 시 자동 실행되는 로직
- **JSON 데이터 처리**: `raw_user_meta_data`에서 OAuth 제공자 정보 추출
- **에러 처리**: `EXCEPTION` 블록으로 견고한 에러 처리
- **보안 함수**: `SECURITY DEFINER`로 권한 상승 함수 생성

### 4. React Query를 활용한 인증 상태 관리

#### 서버 상태와 클라이언트 상태 분리 전략

```typescript
// src/hooks/useAuth.ts - 인증 상태 관리 훅
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export function useAuth() {
    const [isLoading, setIsLoading] = useState(true);
    const queryClient = useQueryClient();
    const supabase = createClient();

    // 1. 세션 정보 관리 (React Query)
    const { data: session, error: sessionError } = useQuery({
        queryKey: ['auth', 'session'],
        queryFn: async () => {
            const {
                data: { session },
                error,
            } = await supabase.auth.getSession();
            if (error) throw error;
            return session;
        },
        staleTime: 60 * 1000, // 1분간 캐시
        gcTime: 10 * 60 * 1000, // 10분간 메모리 유지
        refetchOnWindowFocus: false, // 윈도우 포커스 시 재조회 비활성화
        retry: (failureCount, error) => {
            // 인증 관련 오류는 재시도하지 않음
            if (error?.message?.includes('Invalid JWT')) return false;
            return failureCount < 1;
        },
    });

    // 2. 사용자 프로필 정보 관리 (React Query)
    const { data: profile, error: profileError } = useQuery({
        queryKey: ['auth', 'profile', session?.user?.id],
        queryFn: async () => {
            if (!session?.user?.id) return null;

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error) {
                // 프로필이 없는 경우 자동 생성 시도
                if (error.code === 'PGRST116') {
                    console.warn('프로필이 없습니다. 자동 생성을 기다립니다.');
                    return null;
                }
                throw error;
            }

            return data;
        },
        enabled: !!session?.user?.id, // 세션이 있을 때만 실행
        staleTime: 5 * 60 * 1000, // 5분간 캐시
        retry: (failureCount, error) => {
            // 프로필이 없는 경우 재시도
            if (error?.code === 'PGRST116' && failureCount < 3) return true;
            return false;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });

    // 3. 인증 상태 변경 리스너
    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);

            // 세션 쿼리 무효화
            queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });

            if (session?.user?.id) {
                // 프로필 쿼리 무효화
                queryClient.invalidateQueries({
                    queryKey: ['auth', 'profile', session.user.id],
                });
            } else {
                // 로그아웃 시 모든 인증 관련 캐시 제거
                queryClient.removeQueries({ queryKey: ['auth'] });
            }

            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [supabase.auth, queryClient]);

    // 4. 로그인/로그아웃 함수
    const signOut = async () => {
        try {
            setIsLoading(true);
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            // 모든 캐시 제거
            queryClient.clear();
        } catch (error) {
            console.error('로그아웃 오류:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // 5. 계산된 값들
    const user = profile || session?.user || null;
    const isAuthenticated = !!session && !!user;
    const isAdmin = profile?.is_admin || false;

    return {
        // 상태
        user,
        session,
        isAuthenticated,
        isAdmin,
        isLoading: isLoading || (!session && !sessionError),

        // 에러
        error: sessionError || profileError,

        // 함수
        signOut,

        // 디버그 정보
        debug: {
            sessionStatus: session ? 'active' : 'inactive',
            profileStatus: profile ? 'loaded' : 'missing',
            hasSessionError: !!sessionError,
            hasProfileError: !!profileError,
        },
    };
}
```

**학습 포인트:**

- **캐싱 전략**: 세션은 1분, 프로필은 5분 캐시로 성능 최적화
- **조건부 쿼리**: `enabled` 옵션으로 불필요한 요청 방지
- **에러 처리**: 다양한 에러 시나리오에 대한 세밀한 처리
- **실시간 동기화**: `onAuthStateChange`로 인증 상태 변경 감지
- **캐시 무효화**: 상태 변경 시 관련 쿼리 자동 갱신

#### React Query DevTools 활용

```typescript
// src/lib/query-provider.tsx - 개발 도구 설정
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
                        staleTime: 60 * 1000, // 1분
                        gcTime: 10 * 60 * 1000, // 10분
                        retry: 1,
                        refetchOnWindowFocus: false,
                        // 에러 발생 시 자동 재시도 조건
                        retryCondition: (error) => {
                            // 네트워크 오류만 재시도
                            return !error?.message?.includes('JWT');
                        },
                    },
                    mutations: {
                        retry: 1,
                        // 뮤테이션 성공 시 관련 쿼리 무효화
                        onSuccess: () => {
                            queryClient.invalidateQueries({
                                queryKey: ['auth']
                            });
                        },
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools
                initialIsOpen={false}
                buttonPosition="bottom-right"
                position="bottom"
            />
        </QueryClientProvider>
    );
}
```

**학습한 핵심 개념:**

- **쿼리 상태 시각화**: 로딩, 성공, 에러 상태를 실시간으로 모니터링
- **캐시 관리**: 어떤 데이터가 캐시되어 있는지 시각적 확인
- **성능 분석**: 쿼리 실행 시간과 재시도 횟수 추적
- **디버깅 도구**: 개발 중 인증 플로우 문제 해결에 필수적

---

## 고민했던 부분과 해결책

### 1. OAuth Callback URL 처리 방식

**문제**: OAuth 로그인 후 리디렉션되는 URL에서 토큰을 안전하게 처리하는 방법

**시도한 방식들**:

1. **Query Parameter 방식 (보안 문제)**:

```typescript
// ❌ 보안상 위험한 방식
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('access_token'); // URL에 토큰 노출
```

2. **Hash Fragment 방식 (선택된 방식)**:

```typescript
// ✅ 상대적으로 안전한 방식
const hash = window.location.hash.substring(1);
const params = new URLSearchParams(hash);
const accessToken = params.get('access_token'); // 서버 로그에 기록되지 않음
```

3. **PKCE 방식 (향후 개선 계획)**:

```typescript
// 🔮 향후 적용 예정 - 가장 안전한 방식
const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // PKCE 활성화
        flowType: 'pkce',
    },
});
```

**학습한 내용**:

- **보안 고려사항**: URL 기반 토큰 전달의 위험성과 완화 방법
- **OAuth 2.0 플로우**: Authorization Code Grant vs Implicit Grant
- **PKCE (Proof Key for Code Exchange)**: 모바일/SPA 환경에서의 보안 강화

### 2. 자동 프로필 생성 타이밍 문제

**문제**: OAuth 로그인 후 프로필이 생성되기 전에 프로필 조회 시도로 인한 에러

**발생 시나리오**:

```typescript
// 1. 사용자가 OAuth 로그인 완료
// 2. auth.users 테이블에 사용자 생성
// 3. 클라이언트에서 즉시 프로필 조회 시도
// 4. 트리거가 아직 실행되지 않아 프로필이 없음 → 에러 발생
```

**해결책**:

```typescript
// 재시도 로직과 지연 처리
const { data: profile } = useQuery({
    queryKey: ['auth', 'profile', session?.user?.id],
    queryFn: async () => {
        if (!session?.user?.id) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // 프로필이 없는 경우 - 트리거 실행 대기
                console.warn('프로필 생성 대기 중...');
                throw new Error('PROFILE_NOT_READY');
            }
            throw error;
        }

        return data;
    },
    enabled: !!session?.user?.id,
    retry: (failureCount, error) => {
        // 프로필 생성 대기 중인 경우 최대 3회 재시도
        if (error?.message === 'PROFILE_NOT_READY' && failureCount < 3) {
            return true;
        }
        return false;
    },
    retryDelay: (attemptIndex) => {
        // 지수 백오프: 1초, 2초, 4초
        return Math.min(1000 * 2 ** attemptIndex, 4000);
    },
});
```

**학습한 내용**:

- **비동기 처리**: 데이터베이스 트리거의 비동기적 특성 이해
- **재시도 전략**: 지수 백오프를 통한 효율적인 재시도
- **사용자 경험**: 로딩 상태 표시로 사용자 혼란 방지

### 3. RLS 정책 성능 최적화

**문제**: 복잡한 RLS 정책으로 인한 쿼리 성능 저하

**초기 정책 (성능 문제)**:

```sql
-- ❌ 매번 서브쿼리 실행으로 성능 저하
CREATE POLICY "Admin posts policy" ON posts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );
```

**최적화된 정책**:

```sql
-- ✅ 인덱스 활용으로 성능 향상
CREATE INDEX idx_profiles_admin ON profiles(id, is_admin)
WHERE is_admin = true;

-- 인덱스를 활용하는 정책
CREATE POLICY "Admin posts policy" ON posts
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE is_admin = true
        )
    );
```

**추가 최적화**:

```sql
-- 함수 기반 정책으로 재사용성 향상
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 함수를 사용한 간결한 정책
CREATE POLICY "Admin posts policy" ON posts
    FOR ALL USING (auth.is_admin());
```

**학습한 내용**:

- **인덱스 전략**: RLS 정책에 맞는 효율적인 인덱스 설계
- **함수 활용**: 재사용 가능한 보안 함수로 정책 단순화
- **성능 측정**: `EXPLAIN ANALYZE`로 정책 성능 분석

### 4. 타입 안전성과 개발 생산성의 균형

**문제**: 엄격한 타입 시스템으로 인한 개발 속도 저하

**단계적 접근법**:

```typescript
// 1단계: 기본 타입 정의 (개발 초기)
interface User {
    id: string;
    email: string;
    // 나머지는 any로 임시 처리
    [key: string]: any;
}

// 2단계: 점진적 타입 강화 (기능 구현 후)
interface User {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
}

// 3단계: 완전한 타입 안전성 (안정화 후)
type User = Database['public']['Tables']['profiles']['Row'];
```

**타입 유틸리티 활용**:

```typescript
// 개발 편의성을 위한 유틸리티 타입
type PartialUser = Partial<User>; // 모든 필드 선택적
type CreateUser = Omit<User, 'id' | 'created_at' | 'updated_at'>; // 자동 생성 필드 제외
type PublicUser = Pick<User, 'id' | 'full_name' | 'avatar_url'>; // 공개 정보만

// 조건부 타입으로 유연성 확보
type UserWithProfile<T extends boolean> = T extends true
    ? User & { profile: Profile }
    : User;
```

**학습한 내용**:

- **점진적 타입 도입**: 완벽한 타입보다는 실용적인 접근
- **유틸리티 타입**: TypeScript 고급 기능으로 생산성 향상
- **타입 추론**: 명시적 타입보다 추론 활용으로 코드 간소화

---

## 기존 Phase에서 활용한 기술

### Phase 1 기반 기술의 확장

#### TypeScript 타입 시스템 확장

- **Phase 1**: 기본 인터페이스와 유틸리티 타입 설정
- **Phase 2**: 데이터베이스 스키마와 완벽 동기화된 타입 시스템 구축
- **확장 내용**: `Database` 타입으로 end-to-end 타입 안전성 확보

#### React Query 설정 활용

- **Phase 1**: 기본 QueryClient 설정과 캐싱 전략
- **Phase 2**: 인증 상태 관리에 특화된 쿼리 패턴 구현
- **확장 내용**: 조건부 쿼리, 에러 처리, 실시간 동기화

#### Next.js App Router 활용

- **Phase 1**: 파일 기반 라우팅 시스템 구축
- **Phase 2**: 인증 콜백 라우트와 보호된 라우트 구현
- **확장 내용**: 동적 라우팅과 서버/클라이언트 컴포넌트 분리

---

## 핵심 의사결정과 그 이유

### 1. Supabase vs Firebase vs 자체 백엔드

**결정**: Supabase 선택

**이유**:

- **PostgreSQL 기반**: 관계형 데이터베이스의 강력한 기능 활용
- **Row Level Security**: 세밀한 권한 제어 시스템
- **실시간 기능**: WebSocket 기반 실시간 구독
- **타입 안전성**: 데이터베이스 스키마에서 TypeScript 타입 자동 생성
- **오픈소스**: 벤더 락인 위험 최소화

### 2. OAuth 2.0 vs 자체 인증 시스템

**결정**: OAuth 2.0 소셜 로그인 우선 구현

**이유**:

- **사용자 편의성**: 별도 회원가입 없이 기존 계정으로 로그인
- **보안성**: 검증된 OAuth 제공자의 보안 시스템 활용
- **개발 효율성**: 비밀번호 관리, 이메일 인증 등 복잡한 로직 생략
- **확장성**: 향후 다양한 소셜 로그인 제공자 추가 용이

### 3. RLS vs 애플리케이션 레벨 권한 제어

**결정**: Row Level Security (RLS) 우선 적용

**이유**:

- **데이터베이스 레벨 보안**: 애플리케이션 버그와 무관한 보안 보장
- **성능**: 데이터베이스 엔진 레벨에서 필터링으로 효율성 향상
- **일관성**: 모든 클라이언트에서 동일한 보안 정책 적용
- **감사**: 데이터베이스 레벨에서 접근 로그 관리

### 4. React Query vs SWR vs Apollo Client

**결정**: React Query (TanStack Query) 유지

**이유**:

- **Phase 1 연속성**: 기존 설정과 학습 곡선 활용
- **캐싱 전략**: 인증 상태에 최적화된 캐싱 패턴
- **개발자 도구**: 강력한 DevTools로 디버깅 효율성
- **커뮤니티**: 활발한 커뮤니티와 풍부한 문서

---

## 성능 및 보안 고려사항

### 성능 최적화

#### 데이터베이스 인덱스 전략

```sql
-- 자주 사용되는 쿼리에 대한 인덱스
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_admin ON profiles(id, is_admin) WHERE is_admin = true;
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_likes_post_user ON likes(post_id, user_id);

-- 복합 인덱스로 정렬 쿼리 최적화
CREATE INDEX idx_posts_created_desc ON posts(created_at DESC, id DESC);
CREATE INDEX idx_comments_post_created ON comments(post_id, created_at DESC);
```

#### React Query 캐싱 최적화

```typescript
// 인증 관련 쿼리 최적화
const authQueryOptions = {
    session: {
        staleTime: 60 * 1000, // 1분
        gcTime: 10 * 60 * 1000, // 10분
        refetchOnWindowFocus: false,
    },
    profile: {
        staleTime: 5 * 60 * 1000, // 5분
        gcTime: 30 * 60 * 1000, // 30분
        refetchOnWindowFocus: false,
    },
};
```

### 보안 강화

#### JWT 토큰 보안

```typescript
// 토큰 만료 시간 설정
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // 토큰 만료 시간: 1시간
        tokenRefreshMargin: 60, // 60초 전 미리 갱신
    },
});
```

#### 환경 변수 보안

```typescript
// 환경 변수 검증
const requiredEnvVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

// 필수 환경 변수 존재 확인
Object.entries(requiredEnvVars).forEach(([key, value]) => {
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
});
```

#### RLS 정책 보안 검증

```sql
-- 정책 테스트 함수
CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS TABLE(test_name TEXT, result BOOLEAN, error_message TEXT) AS $$
BEGIN
    -- 비인증 사용자 테스트
    SET ROLE anon;

    RETURN QUERY
    SELECT 'anon_can_read_posts'::TEXT,
           (SELECT COUNT(*) FROM posts) > 0,
           'Anonymous users should be able to read posts'::TEXT;

    -- 인증된 사용자 테스트
    SET ROLE authenticated;
    -- 추가 테스트...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 향후 개선 방향

### 1. 인증 시스템 고도화

#### 다중 인증 요소 (MFA)

```typescript
// TOTP 기반 2단계 인증
const enableMFA = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'My Auth App',
    });

    if (error) throw error;
    return data;
};
```

#### 세션 관리 고도화

```typescript
// 디바이스별 세션 관리
interface DeviceSession {
    id: string;
    user_id: string;
    device_info: string;
    ip_address: string;
    last_active: string;
    is_current: boolean;
}

// 의심스러운 로그인 감지
const detectSuspiciousLogin = (session: Session) => {
    // IP 주소, 디바이스 정보 변경 감지
    // 이메일 알림 발송
};
```

### 2. 성능 모니터링

#### 데이터베이스 성능 추적

```sql
-- 느린 쿼리 모니터링
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- RLS 정책 성능 분석
SELECT schemaname, tablename, policyname,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size
FROM pg_policies
WHERE schemaname = 'public';
```

#### 클라이언트 성능 측정

```typescript
// React Query 성능 메트릭
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // 성능 메트릭 수집
            onSuccess: (data, query) => {
                console.log(
                    `Query ${query.queryKey} took ${query.state.dataUpdatedAt - query.state.fetchFailureCount}ms`
                );
            },
        },
    },
});
```

### 3. 보안 강화

#### 감사 로그 시스템

```sql
-- 사용자 활동 로그 테이블
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 자동 감사 로그 트리거
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Rate Limiting

```typescript
// API 요청 제한
const rateLimiter = {
    auth: {
        windowMs: 15 * 60 * 1000, // 15분
        max: 5, // 최대 5회 로그인 시도
    },
    api: {
        windowMs: 60 * 1000, // 1분
        max: 100, // 최대 100회 API 요청
    },
};
```

---

## 결론

Phase 2 Supabase 설정 및 데이터베이스 구축을 통해 **현대적이고 안전한 백엔드 인프라**의 핵심 기반을 마련할 수 있었습니다.

특히 **PostgreSQL의 Row Level Security**를 활용한 세밀한 권한 제어 시스템과 **OAuth 2.0 기반 소셜 로그인**을 통해 사용자 편의성과 보안성을 동시에 확보했습니다. 또한 **React Query를 활용한 인증 상태 관리**로 복잡한 비동기 상태를 효율적으로 처리할 수 있는 아키텍처를 구축했습니다.

**타입 안전성을 보장하는 데이터베이스 스키마 설계**와 **자동 프로필 생성 시스템**을 통해 개발자 경험과 사용자 경험을 모두 향상시켰으며, **성능 최적화된 캐싱 전략**으로 확장 가능한 시스템의 기반을 마련했습니다.

이러한 경험은 향후 **대규모 사용자 서비스의 백엔드 아키텍처 설계**와 **보안을 고려한 인증 시스템 구축**에서도 활용할 수 있는 실무 역량이 될 것입니다.

---

## 다음 단계 (Phase 3)

### Phase 3에서 구현할 기능들

#### 1. 기본 UI 컴포넌트 시스템

- 레이아웃 컴포넌트 (Header, Footer, Sidebar)
- 공통 UI 컴포넌트 확장 (Form, Modal, Toast)
- 반응형 디자인 시스템 구축

#### 2. 테마 시스템 구현

- 다크/라이트 모드 전환
- 사용자 설정 저장 및 복원
- 시스템 테마 자동 감지

#### 3. 네비게이션 시스템

- 인증 상태 기반 메뉴 구성
- 관리자 전용 메뉴 분리
- 모바일 반응형 네비게이션

**Phase 2에서 구축한 기반이 Phase 3에서 활용되는 방식:**

- 인증 상태 관리 → 조건부 UI 렌더링
- 사용자 권한 시스템 → 관리자 메뉴 표시/숨김
- React Query 캐싱 → 사용자 설정 상태 관리
- TypeScript 타입 시스템 → 컴포넌트 props 타입 안전성

---

## 참고 자료

### 공식 문서

- [Supabase Authentication](https://supabase.com/docs/guides/auth) - OAuth 및 세션 관리
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) - RLS 정책 설계
- [TanStack Query](https://tanstack.com/query/latest) - 서버 상태 관리 패턴
- [OAuth 2.0 RFC](https://datatracker.ietf.org/doc/html/rfc6749) - OAuth 2.0 표준 명세

### 보안 및 성능

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) - 인증 보안 가이드
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization) - 데이터베이스 성능 최적화
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725) - JWT 보안 모범 사례

### 아키텍처 참고

- [Supabase Architecture](https://supabase.com/docs/guides/getting-started/architecture) - Supabase 전체 아키텍처
- [React Query Patterns](https://tkdodo.eu/blog/practical-react-query) - React Query 실무 패턴
- [Database Design Patterns](https://www.postgresql.org/docs/current/ddl-schemas.html) - PostgreSQL 스키마 설계
