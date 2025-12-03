# Phase 4 학습정리: 사용자 인증 및 권한 관리 시스템

## 개요

Phase 4에서는 **완전한 사용자 인증 및 권한 관리 시스템**을 구축했습니다. Zustand와 React Query를 조합한 **하이브리드 상태 관리 아키텍처**를 통해 인증 상태를 효율적으로 관리하고, Next.js 미들웨어를 활용한 **라우트 보호 시스템**으로 보안성을 확보했습니다.

특히 **OAuth 2.0 소셜 로그인**과 **세션 기반 인증**을 통해 사용자 편의성과 보안성을 동시에 달성했으며, Phase 1-3에서 구축한 기반 위에 **완전한 사용자 관리 레이어**를 완성했습니다.

---

## 핵심 학습 내용

### 1. 하이브리드 상태 관리 아키텍처

#### Zustand + React Query 조합 전략

**상태 관리 역할 분담:**

```typescript
// src/stores/auth-store.ts - 클라이언트 상태 관리
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

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
            // 보안을 위해 민감하지 않은 정보만 저장
            partialize: (state) => ({
                user: state.user
                    ? {
                          id: state.user.id,
                          email: state.user.email,
                          full_name: state.user.full_name,
                          avatar_url: state.user.avatar_url,
                          is_admin: state.user.is_admin,
                      }
                    : null,
            }),
        }
    )
);
```

```typescript
// src/hooks/useAuth.ts - 서버 상태와 클라이언트 상태 연동
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuthStore } from '@/stores/auth-store';

export function useAuth() {
    const { user, isLoading, setUser, setLoading, clearAuth } = useAuthStore();
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
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
            // JWT 관련 오류는 재시도하지 않음
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
                if (error.code === 'PGRST116') {
                    // 프로필이 없는 경우 - 자동 생성 대기
                    console.warn('프로필 생성 대기 중...');
                    return null;
                }
                throw error;
            }

            return data;
        },
        enabled: !!session?.user?.id,
        staleTime: 5 * 60 * 1000, // 5분간 캐시
        retry: (failureCount, error) => {
            // 프로필 생성 대기 중인 경우 재시도
            if (error?.code === 'PGRST116' && failureCount < 3) return true;
            return false;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });

    // 3. 프로필 정보를 Zustand 스토어와 동기화
    useEffect(() => {
        if (profile) {
            setUser(profile);
        } else if (session === null) {
            // 세션이 없으면 사용자 정보 클리어
            clearAuth();
        }
        setLoading(false);
    }, [profile, session, setUser, clearAuth, setLoading]);

    // 4. 인증 상태 변경 리스너
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
                clearAuth();
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase.auth, queryClient, clearAuth]);

    // 5. 로그아웃 함수
    const signOut = useCallback(async () => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            // 모든 캐시 제거
            queryClient.clear();
            clearAuth();
        } catch (error) {
            console.error('로그아웃 오류:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [supabase.auth, queryClient, clearAuth, setLoading]);

    // 6. 계산된 값들
    const isAuthenticated = !!session && !!user;
    const isAdmin = user?.is_admin || false;

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

**학습한 핵심 개념:**

- **상태 분리**: 서버 상태(React Query)와 클라이언트 상태(Zustand) 명확한 역할 분담
- **캐싱 전략**: 세션은 1분, 프로필은 5분 캐시로 성능과 실시간성 균형
- **상태 동기화**: useEffect를 통한 서버 상태와 클라이언트 상태 동기화
- **에러 처리**: 다양한 에러 시나리오에 대한 세밀한 처리 전략

#### Zustand Persist 미들웨어 활용

```typescript
// 보안을 고려한 상태 지속성 관리
export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isLoading: true,

            // 액션들
            setUser: (user) => {
                set({ user });
                // 사용자 변경 시 관련 캐시 무효화
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                        new CustomEvent('auth-user-changed', {
                            detail: { user },
                        })
                    );
                }
            },

            setLoading: (isLoading) => set({ isLoading }),

            clearAuth: () => {
                set({ user: null, isLoading: false });
                // 로그아웃 시 이벤트 발생
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('auth-logout'));
                }
            },

            // 사용자 정보 업데이트
            updateUser: (updates) => {
                const currentUser = get().user;
                if (currentUser) {
                    set({ user: { ...currentUser, ...updates } });
                }
            },
        }),
        {
            name: 'auth-storage',

            // 보안을 위한 부분 저장
            partialize: (state) => ({
                user: state.user
                    ? {
                          id: state.user.id,
                          email: state.user.email,
                          full_name: state.user.full_name,
                          avatar_url: state.user.avatar_url,
                          is_admin: state.user.is_admin,
                          // 민감한 정보는 제외 (created_at, updated_at 등)
                      }
                    : null,
            }),

            // 스토리지 옵션
            storage: {
                getItem: (name) => {
                    const str = localStorage.getItem(name);
                    if (!str) return null;

                    try {
                        return JSON.parse(str);
                    } catch {
                        // 파싱 실패 시 null 반환
                        return null;
                    }
                },
                setItem: (name, value) => {
                    localStorage.setItem(name, JSON.stringify(value));
                },
                removeItem: (name) => {
                    localStorage.removeItem(name);
                },
            },
        }
    )
);
```

**학습 포인트:**

- **부분 저장**: `partialize`로 민감한 정보 제외하고 필요한 데이터만 저장
- **커스텀 스토리지**: 에러 처리가 포함된 안전한 localStorage 래퍼
- **이벤트 시스템**: 상태 변경 시 커스텀 이벤트로 다른 컴포넌트에 알림
- **타입 안전성**: TypeScript와 완벽한 통합으로 런타임 오류 방지

### 2. Next.js 미들웨어를 활용한 라우트 보호

#### 미들웨어 기반 인증 검증

```typescript
// src/middleware.ts - 라우트 보호 미들웨어
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value);
                        response.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    // 사용자 인증 상태 확인 (세션 자동 갱신 포함)
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;

    // 보호된 라우트 정의
    const protectedRoutes = ['/admin', '/profile'];
    const adminRoutes = ['/admin'];
    const isProtectedRoute = protectedRoutes.some((route) =>
        pathname.startsWith(route)
    );
    const isAdminRoute = adminRoutes.some((route) =>
        pathname.startsWith(route)
    );

    // 인증이 필요한 라우트에 비인증 사용자 접근 시
    if (isProtectedRoute && (!user || error)) {
        const redirectUrl = new URL('/auth/login', request.url);
        redirectUrl.searchParams.set('redirectTo', pathname);
        return NextResponse.redirect(redirectUrl);
    }

    // 관리자 권한이 필요한 라우트 처리
    if (isAdminRoute && user) {
        // 사용자 프로필에서 관리자 권한 확인
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!profile?.is_admin) {
            // 관리자가 아닌 경우 홈으로 리디렉션
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    // 로그인 페이지에 이미 인증된 사용자 접근 시
    if (pathname === '/auth/login' && user) {
        const redirectTo =
            request.nextUrl.searchParams.get('redirectTo') || '/';
        return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
```

**학습한 핵심 개념:**

- **서버 사이드 인증**: 클라이언트 조작이 불가능한 서버에서 인증 검증
- **자동 세션 갱신**: `auth.getUser()` 호출로 만료된 토큰 자동 갱신
- **쿠키 동기화**: 서버와 클라이언트 간 인증 쿠키 자동 동기화
- **세밀한 권한 제어**: 일반 사용자와 관리자 권한 분리
- **사용자 경험**: 로그인 후 원래 페이지로 자동 리디렉션

#### 보호된 라우트 패턴

```typescript
// 라우트별 보호 수준 정의
const routeProtection = {
    // 공개 라우트
    public: ['/', '/posts', '/posts/[id]', '/about'],

    // 인증 필요 라우트
    authenticated: ['/profile'],

    // 관리자 전용 라우트
    admin: [
        '/admin',
        '/admin/posts',
        '/admin/posts/new',
        '/admin/posts/[id]/edit',
    ],

    // 비인증 사용자 전용 (로그인 페이지 등)
    unauthenticated: ['/auth/login'],
};

// 동적 라우트 매칭 함수
function matchRoute(pathname: string, routes: string[]): boolean {
    return routes.some((route) => {
        // 정확한 매치
        if (route === pathname) return true;

        // 동적 라우트 매치 ([id], [slug] 등)
        const routePattern = route.replace(/\[.*?\]/g, '[^/]+');
        const regex = new RegExp(`^${routePattern}$`);
        return regex.test(pathname);
    });
}

// 사용 예시
const isAdminRoute = matchRoute(pathname, routeProtection.admin);
const isAuthenticatedRoute = matchRoute(
    pathname,
    routeProtection.authenticated
);
```

**학습 포인트:**

- **라우트 패턴 매칭**: 동적 라우트를 포함한 유연한 패턴 매칭
- **권한 계층**: 공개 → 인증 → 관리자 순서의 권한 계층 구조
- **확장성**: 새로운 라우트 추가 시 쉽게 보호 수준 설정 가능

### 3. OAuth 2.0 소셜 로그인 구현

#### 로그인 페이지 UI 구현

```typescript
// src/app/auth/login/page.tsx - 소셜 로그인 페이지
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    const redirectTo = searchParams.get('redirectTo') || '/';

    // 이미 로그인된 사용자는 리디렉션
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.push(redirectTo);
        }
    }, [isAuthenticated, authLoading, router, redirectTo]);

    const handleSocialLogin = async (provider: 'google' | 'github') => {
        try {
            setIsLoading(true);
            setError(null);

            const supabase = createClient();
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
                    queryParams: provider === 'google' ? {
                        access_type: 'offline',
                        prompt: 'consent',
                    } : undefined,
                },
            });

            if (error) {
                throw error;
            }

            // OAuth 리디렉션이 성공적으로 시작됨
            console.log('OAuth 리디렉션 시작:', data);

        } catch (err) {
            console.error(`${provider} 로그인 오류:`, err);
            setError(
                err instanceof Error
                    ? err.message
                    : `${provider} 로그인 중 오류가 발생했습니다.`
            );
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">
                        로그인
                    </CardTitle>
                    <CardDescription className="text-center">
                        소셜 계정으로 간편하게 로그인하세요
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {error && (
                        <div className="rounded-md bg-destructive/15 p-3">
                            <div className="text-sm text-destructive">
                                {error}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleSocialLogin('google')}
                            disabled={isLoading}
                        >
                            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Google로 로그인
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleSocialLogin('github')}
                            disabled={isLoading}
                        >
                            <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                            </svg>
                            GitHub으로 로그인
                        </Button>
                    </div>

                    <div className="text-center text-sm text-muted-foreground">
                        로그인하면{' '}
                        <a href="/terms" className="underline underline-offset-4 hover:text-primary">
                            이용약관
                        </a>
                        {' '}및{' '}
                        <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
                            개인정보처리방침
                        </a>
                        에 동의하는 것으로 간주됩니다.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
```

**학습한 핵심 개념:**

- **사용자 경험**: 로딩 상태, 에러 상태, 성공 상태에 대한 적절한 피드백
- **보안 고려사항**: 리디렉션 URL 검증과 XSS 방지
- **접근성**: 키보드 네비게이션과 스크린 리더 지원
- **반응형 디자인**: 모바일과 데스크탑에서 일관된 사용자 경험

#### OAuth 콜백 처리 개선

```typescript
// src/app/auth/callback/route.ts - 서버 사이드 콜백 처리
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('redirectTo') ?? '/';

    if (code) {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            request.cookies.set(name, value);
                        });
                    },
                },
            }
        );

        try {
            const { data, error } =
                await supabase.auth.exchangeCodeForSession(code);

            if (error) {
                console.error('OAuth 콜백 오류:', error);
                return NextResponse.redirect(
                    `${origin}/auth/login?error=${encodeURIComponent(error.message)}`
                );
            }

            if (data.session) {
                // 세션 생성 성공
                console.log('OAuth 로그인 성공:', data.user.email);

                // 안전한 리디렉션 URL 검증
                const redirectUrl = validateRedirectUrl(next, origin);
                return NextResponse.redirect(redirectUrl);
            }
        } catch (err) {
            console.error('OAuth 처리 중 예외:', err);
            return NextResponse.redirect(
                `${origin}/auth/login?error=oauth_error`
            );
        }
    }

    // 코드가 없거나 처리 실패 시 로그인 페이지로
    return NextResponse.redirect(`${origin}/auth/login?error=no_code`);
}

// 리디렉션 URL 검증 함수
function validateRedirectUrl(redirectTo: string, origin: string): string {
    try {
        // 상대 경로인지 확인
        if (redirectTo.startsWith('/')) {
            return `${origin}${redirectTo}`;
        }

        // 절대 URL인 경우 같은 도메인인지 확인
        const redirectUrl = new URL(redirectTo);
        const originUrl = new URL(origin);

        if (redirectUrl.origin === originUrl.origin) {
            return redirectTo;
        }

        // 다른 도메인인 경우 홈으로 리디렉션
        console.warn('잠재적 오픈 리디렉션 시도:', redirectTo);
        return `${origin}/`;
    } catch {
        // URL 파싱 실패 시 홈으로 리디렉션
        return `${origin}/`;
    }
}
```

**학습 포인트:**

- **서버 사이드 처리**: 클라이언트에서 접근할 수 없는 서버에서 안전한 토큰 교환
- **보안 검증**: 오픈 리디렉션 공격 방지를 위한 URL 검증
- **에러 처리**: 다양한 실패 시나리오에 대한 적절한 처리
- **로깅**: 디버깅과 모니터링을 위한 적절한 로그 기록

### 4. 사용자 프로필 관리 시스템

#### 프로필 페이지 구현

```typescript
// src/app/profile/page.tsx - 사용자 프로필 관리
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/utils/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export default function ProfilePage() {
    const { user, isLoading, signOut } = useAuth();
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updateSuccess, setUpdateSuccess] = useState(false);
    const router = useRouter();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        full_name: user?.full_name || '',
        email: user?.email || '',
    });

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) return;

        try {
            setIsUpdating(true);
            setUpdateError(null);
            setUpdateSuccess(false);

            const supabase = createClient();

            // 프로필 업데이트
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name.trim(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (error) {
                throw error;
            }

            // 캐시 무효화로 UI 즉시 업데이트
            queryClient.invalidateQueries({
                queryKey: ['auth', 'profile', user.id]
            });

            setUpdateSuccess(true);

            // 성공 메시지 3초 후 자동 숨김
            setTimeout(() => setUpdateSuccess(false), 3000);

        } catch (err) {
            console.error('프로필 업데이트 오류:', err);
            setUpdateError(
                err instanceof Error
                    ? err.message
                    : '프로필 업데이트 중 오류가 발생했습니다.'
            );
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            router.push('/');
        } catch (err) {
            console.error('로그아웃 오류:', err);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user) {
        router.push('/auth/login');
        return null;
    }

    return (
        <div className="container mx-auto max-w-2xl py-8 px-4">
            <div className="space-y-6">
                {/* 프로필 헤더 */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center space-x-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage
                                    src={user.avatar_url || undefined}
                                    alt={user.full_name || user.email}
                                />
                                <AvatarFallback className="text-lg">
                                    {user.full_name?.charAt(0) || user.email.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <CardTitle>{user.full_name || '이름 없음'}</CardTitle>
                                <CardDescription>{user.email}</CardDescription>
                                {user.is_admin && (
                                    <Badge variant="secondary">관리자</Badge>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* 프로필 편집 폼 */}
                <Card>
                    <CardHeader>
                        <CardTitle>프로필 정보</CardTitle>
                        <CardDescription>
                            프로필 정보를 수정할 수 있습니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            {updateError && (
                                <div className="rounded-md bg-destructive/15 p-3">
                                    <div className="text-sm text-destructive">
                                        {updateError}
                                    </div>
                                </div>
                            )}

                            {updateSuccess && (
                                <div className="rounded-md bg-green-50 p-3 border border-green-200">
                                    <div className="text-sm text-green-800">
                                        프로필이 성공적으로 업데이트되었습니다.
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="full_name">이름</Label>
                                <Input
                                    id="full_name"
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        full_name: e.target.value
                                    }))}
                                    placeholder="이름을 입력하세요"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">이메일</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    disabled
                                    className="bg-muted"
                                />
                                <p className="text-sm text-muted-foreground">
                                    이메일은 변경할 수 없습니다.
                                </p>
                            </div>

                            <div className="flex space-x-2">
                                <Button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="flex-1"
                                >
                                    {isUpdating ? '업데이트 중...' : '프로필 업데이트'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* 계정 관리 */}
                <Card>
                    <CardHeader>
                        <CardTitle>계정 관리</CardTitle>
                        <CardDescription>
                            계정 관련 작업을 수행할 수 있습니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-medium">로그아웃</h4>
                                    <p className="text-sm text-muted-foreground">
                                        현재 세션에서 로그아웃합니다.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={handleSignOut}
                                >
                                    로그아웃
                                </Button>
                            </div>

                            {user.is_admin && (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-medium">관리자 페이지</h4>
                                        <p className="text-sm text-muted-foreground">
                                            블로그 관리 기능에 접근합니다.
                                        </p>
                                    </div>
                                    <Button
                                        variant="default"
                                        onClick={() => router.push('/admin')}
                                    >
                                        관리자 페이지
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
```

**학습한 핵심 개념:**

- **실시간 UI 업데이트**: React Query 캐시 무효화로 즉시 UI 반영
- **폼 상태 관리**: 로컬 상태와 서버 상태의 효율적인 동기화
- **사용자 피드백**: 로딩, 성공, 에러 상태에 대한 명확한 피드백
- **권한 기반 UI**: 관리자 권한에 따른 조건부 UI 렌더링

---

## 고민했던 부분과 해결책

### 1. 상태 관리 아키텍처 선택

**문제**: React Query vs Zustand vs Redux 중 최적의 조합 결정

**고려한 옵션들**:

1. **Redux Toolkit + RTK Query (복잡함)**:

```typescript
// ❌ 보일러플레이트가 많고 복잡
const authSlice = createSlice({
    name: 'auth',
    initialState: { user: null, isLoading: false },
    reducers: {
        setUser: (state, action) => {
            state.user = action.payload;
        },
        setLoading: (state, action) => {
            state.isLoading = action.payload;
        },
    },
});

const authApi = createApi({
    reducerPath: 'authApi',
    baseQuery: fetchBaseQuery({
        /* ... */
    }),
    endpoints: (builder) => ({
        getProfile: builder.query({
            /* ... */
        }),
    }),
});
```

2. **React Query만 사용 (서버 상태에만 특화)**:

```typescript
// 🤔 클라이언트 상태 관리에 한계
const { data: user } = useQuery(['auth', 'user'], fetchUser);
// 로딩 상태, UI 상태 등을 별도로 관리해야 함
```

3. **Zustand + React Query 조합 (선택된 방식)**:

```typescript
// ✅ 각각의 강점을 살린 조합
// Zustand: 클라이언트 상태 (로딩, UI 상태)
const useAuthStore = create((set) => ({
    isLoading: false,
    setLoading: (loading) => set({ isLoading: loading }),
}));

// React Query: 서버 상태 (세션, 프로필)
const { data: session } = useQuery(['auth', 'session'], fetchSession);
```

**학습한 내용**:

- **관심사 분리**: 서버 상태와 클라이언트 상태를 명확히 분리
- **도구의 특성**: 각 라이브러리가 가장 잘하는 영역에 집중
- **복잡성 관리**: 단순한 도구 조합이 복잡한 단일 도구보다 효율적

### 2. 인증 상태 동기화 타이밍

**문제**: 서버 상태(React Query)와 클라이언트 상태(Zustand) 동기화 시점

**발생 시나리오**:

```typescript
// 문제 상황: 프로필 데이터가 로드되기 전에 컴포넌트가 렌더링
const { user } = useAuthStore(); // null (아직 동기화 안됨)
const { data: profile } = useQuery(['profile'], fetchProfile); // 로딩 중

// 이 시점에서 user가 null이므로 로그인하지 않은 것으로 판단
if (!user) return <LoginButton />;
```

**해결책**:

```typescript
// useAuth 훅에서 통합된 상태 제공
export function useAuth() {
    const { user, isLoading, setUser, setLoading } = useAuthStore();

    const { data: session } = useQuery(['auth', 'session'], fetchSession);
    const { data: profile } = useQuery(['auth', 'profile'], fetchProfile, {
        enabled: !!session?.user?.id,
    });

    // 프로필 데이터를 Zustand와 동기화
    useEffect(() => {
        if (profile) {
            setUser(profile);
        } else if (session === null) {
            setUser(null);
        }
        setLoading(false);
    }, [profile, session, setUser, setLoading]);

    // 통합된 상태 반환
    return {
        user,
        isAuthenticated: !!session && !!user,
        isLoading: isLoading || (!session && !profile),
    };
}
```

**학습한 내용**:

- **상태 동기화**: useEffect를 통한 안전한 상태 동기화
- **로딩 상태 관리**: 여러 비동기 작업의 로딩 상태 통합 관리
- **조건부 쿼리**: `enabled` 옵션으로 의존성 있는 쿼리 제어

### 3. 미들웨어 성능 최적화

**문제**: 모든 요청에서 데이터베이스 조회로 인한 성능 저하

**초기 구현 (성능 문제)**:

```typescript
// ❌ 모든 요청마다 데이터베이스 조회
export async function middleware(request: NextRequest) {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (isAdminRoute && user) {
        // 매번 데이터베이스에서 관리자 권한 확인
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();
    }
}
```

**최적화된 구현**:

```typescript
// ✅ JWT 토큰에 관리자 정보 포함
export async function middleware(request: NextRequest) {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (isAdminRoute && user) {
        // JWT 토큰의 user_metadata에서 관리자 정보 확인
        const isAdmin = user.user_metadata?.is_admin || false;

        if (!isAdmin) {
            // 필요한 경우에만 데이터베이스 조회
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single();

            if (!profile?.is_admin) {
                return NextResponse.redirect(new URL('/', request.url));
            }
        }
    }
}
```

**추가 최적화 (향후 구현)**:

```typescript
// 🔮 Redis 캐싱으로 성능 향상
const getCachedUserRole = async (userId: string) => {
    const cached = await redis.get(`user:${userId}:role`);
    if (cached) return JSON.parse(cached);

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();

    await redis.setex(`user:${userId}:role`, 300, JSON.stringify(profile)); // 5분 캐시
    return profile;
};
```

**학습한 내용**:

- **성능 측정**: 미들웨어 실행 시간 모니터링의 중요성
- **캐싱 전략**: 자주 조회되는 데이터의 효율적인 캐싱
- **JWT 활용**: 토큰에 필요한 정보 포함으로 데이터베이스 조회 최소화

### 4. 에러 처리 및 사용자 경험

**문제**: 다양한 인증 에러 상황에 대한 일관된 처리

**에러 시나리오들**:

```typescript
// 1. 네트워크 오류
// 2. JWT 토큰 만료
// 3. 권한 부족
// 4. 프로필 생성 지연
// 5. OAuth 제공자 오류
```

**통합 에러 처리 시스템**:

```typescript
// 에러 타입 정의
type AuthError =
    | 'NETWORK_ERROR'
    | 'TOKEN_EXPIRED'
    | 'PERMISSION_DENIED'
    | 'PROFILE_NOT_READY'
    | 'OAUTH_ERROR'
    | 'UNKNOWN_ERROR';

// 에러 처리 유틸리티
export const handleAuthError = (error: unknown): { type: AuthError; message: string } => {
    if (error instanceof Error) {
        if (error.message.includes('JWT')) {
            return { type: 'TOKEN_EXPIRED', message: '로그인이 만료되었습니다. 다시 로그인해주세요.' };
        }
        if (error.message.includes('PGRST116')) {
            return { type: 'PROFILE_NOT_READY', message: '프로필 생성 중입니다. 잠시 후 다시 시도해주세요.' };
        }
        if (error.message.includes('network')) {
            return { type: 'NETWORK_ERROR', message: '네트워크 연결을 확인해주세요.' };
        }
    }

    return { type: 'UNKNOWN_ERROR', message: '알 수 없는 오류가 발생했습니다.' };
};

// 에러 상태별 UI 컴포넌트
export const AuthErrorDisplay = ({ error }: { error: AuthError }) => {
    const errorConfig = {
        NETWORK_ERROR: { color: 'orange', icon: '🌐', retry: true },
        TOKEN_EXPIRED: { color: 'red', icon: '🔒', retry: false },
        PERMISSION_DENIED: { color: 'red', icon: '⛔', retry: false },
        PROFILE_NOT_READY: { color: 'blue', icon: '⏳', retry: true },
        OAUTH_ERROR: { color: 'red', icon: '🔑', retry: true },
        UNKNOWN_ERROR: { color: 'gray', icon: '❓', retry: true },
    };

    const config = errorConfig[error];

    return (
        <div className={`p-4 rounded-md bg-${config.color}-50 border border-${config.color}-200`}>
            <div className="flex items-center space-x-2">
                <span>{config.icon}</span>
                <span className={`text-${config.color}-800`}>
                    {handleAuthError({ message: error }).message}
                </span>
            </div>
        </div>
    );
};
```

**학습한 내용**:

- **에러 분류**: 에러 타입별 적절한 사용자 메시지와 액션 제공
- **사용자 중심**: 기술적 오류보다는 사용자가 이해할 수 있는 메시지
- **복구 가능성**: 재시도 가능한 오류와 불가능한 오류 구분

---

## 기존 Phase에서 활용한 기술

### Phase 1-3 기반 기술의 확장

#### TypeScript 타입 시스템 고도화

- **Phase 1-3**: 기본 타입 정의와 컴포넌트 타입
- **Phase 4**: 인증 상태, 에러 타입, 미들웨어 타입 완전 활용
- **확장 내용**: 제네릭과 유니온 타입을 활용한 복잡한 상태 관리

#### React Query 캐싱 전략 심화

- **Phase 2**: 기본 인증 상태 관리
- **Phase 4**: 세밀한 캐시 무효화와 조건부 쿼리 활용
- **확장 내용**: 의존성 있는 쿼리와 실시간 상태 동기화

#### UI 컴포넌트 시스템 활용

- **Phase 3**: 기본 레이아웃과 테마 시스템
- **Phase 4**: 폼 컴포넌트와 사용자 피드백 UI 완성
- **확장 내용**: 접근성과 사용자 경험을 고려한 인증 UI

---

## 핵심 의사결정과 그 이유

### 1. Zustand + React Query vs Redux Toolkit

**결정**: Zustand와 React Query 조합 선택

**이유**:

- **학습 곡선**: Redux보다 간단한 API로 빠른 개발 가능
- **번들 크기**: 더 작은 번들 크기로 성능 향상
- **관심사 분리**: 서버 상태와 클라이언트 상태의 명확한 분리
- **개발자 경험**: 보일러플레이트 최소화로 생산성 향상

### 2. 미들웨어 vs 클라이언트 사이드 라우트 보호

**결정**: Next.js 미들웨어 우선 사용

**이유**:

- **보안성**: 서버 사이드에서 검증하여 클라이언트 조작 불가
- **성능**: 불필요한 페이지 로드 방지
- **SEO**: 검색 엔진이 보호된 콘텐츠에 접근하지 않음
- **사용자 경험**: 즉시 리디렉션으로 빠른 피드백

### 3. OAuth vs 이메일/비밀번호 인증

**결정**: OAuth 소셜 로그인 우선 구현

**이유**:

- **사용자 편의성**: 별도 회원가입 없이 기존 계정 활용
- **보안성**: 검증된 OAuth 제공자의 보안 시스템 활용
- **개발 효율성**: 비밀번호 관리, 이메일 인증 등 복잡한 로직 생략
- **사용자 신뢰**: 구글, 깃허브 등 신뢰할 수 있는 제공자

### 4. 세션 vs JWT 토큰 저장 방식

**결정**: Supabase 기본 세션 관리 활용

**이유**:

- **자동 갱신**: 토큰 만료 시 자동 refresh 처리
- **보안성**: httpOnly 쿠키로 XSS 공격 방지
- **편의성**: Supabase가 제공하는 완전한 세션 관리
- **확장성**: 향후 다양한 인증 방식 추가 용이

---

## 성능 및 보안 고려사항

### 성능 최적화

#### 캐싱 전략 최적화

```typescript
// 인증 관련 쿼리 최적화
const authQueryOptions = {
    session: {
        staleTime: 60 * 1000, // 1분
        gcTime: 10 * 60 * 1000, // 10분
        refetchOnWindowFocus: false,
        retry: 1,
    },
    profile: {
        staleTime: 5 * 60 * 1000, // 5분
        gcTime: 30 * 60 * 1000, // 30분
        refetchOnWindowFocus: false,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
};
```

#### 미들웨어 성능 최적화

```typescript
// 불필요한 데이터베이스 조회 최소화
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 정적 파일은 빠르게 통과
    if (pathname.startsWith('/_next/') || pathname.includes('.')) {
        return NextResponse.next();
    }

    // 보호된 라우트만 인증 검사
    const protectedRoutes = ['/admin', '/profile'];
    const isProtectedRoute = protectedRoutes.some((route) =>
        pathname.startsWith(route)
    );

    if (!isProtectedRoute) {
        return NextResponse.next();
    }

    // 필요한 경우에만 사용자 정보 조회
    const {
        data: { user },
    } = await supabase.auth.getUser();
    // ...
}
```

### 보안 강화

#### 토큰 보안

```typescript
// JWT 토큰 검증 강화
const validateToken = async (token: string) => {
    try {
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser(token);

        if (error || !user) {
            throw new Error('Invalid token');
        }

        // 토큰 만료 시간 확인
        const now = Math.floor(Date.now() / 1000);
        if (user.exp && user.exp < now) {
            throw new Error('Token expired');
        }

        return user;
    } catch (error) {
        console.error('Token validation failed:', error);
        return null;
    }
};
```

#### 권한 검증 강화

```typescript
// 관리자 권한 이중 검증
const verifyAdminAccess = async (userId: string) => {
    // 1. JWT 토큰에서 기본 확인
    const {
        data: { user },
    } = await supabase.auth.getUser();
    const tokenAdmin = user?.user_metadata?.is_admin;

    // 2. 데이터베이스에서 실제 권한 확인
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();

    // 두 값이 모두 true여야 관리자 권한 인정
    return tokenAdmin && profile?.is_admin;
};
```

#### 세션 보안

```typescript
// 세션 하이재킹 방지
const sessionSecurity = {
    // IP 주소 변경 감지
    checkIpAddress: (session: Session, currentIp: string) => {
        const sessionIp = session.user?.user_metadata?.ip_address;
        return sessionIp === currentIp;
    },

    // 의심스러운 활동 감지
    detectSuspiciousActivity: (session: Session) => {
        const lastActivity = session.user?.user_metadata?.last_activity;
        const now = Date.now();
        const timeDiff = now - new Date(lastActivity).getTime();

        // 24시간 이상 비활성 시 재인증 요구
        return timeDiff > 24 * 60 * 60 * 1000;
    },
};
```

---

## 향후 개선 방향

### 1. 고급 인증 기능

#### 다중 인증 요소 (MFA)

```typescript
// TOTP 기반 2단계 인증
const enableTwoFactor = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
    });

    if (error) throw error;

    // QR 코드 표시
    return data.totp.qr_code;
};

// 2FA 검증
const verifyTwoFactor = async (token: string, challengeId: string) => {
    const { data, error } = await supabase.auth.mfa.verify({
        factorId: challengeId,
        challengeId,
        code: token,
    });

    return { success: !error, data, error };
};
```

#### 소셜 로그인 확장

```typescript
// 추가 OAuth 제공자
const socialProviders = {
    kakao: {
        name: 'Kakao',
        icon: KakaoIcon,
        color: '#FEE500',
    },
    naver: {
        name: 'Naver',
        icon: NaverIcon,
        color: '#03C75A',
    },
    apple: {
        name: 'Apple',
        icon: AppleIcon,
        color: '#000000',
    },
};

// 동적 소셜 로그인 버튼 생성
const SocialLoginButtons = () => {
    return (
        <div className="space-y-2">
            {Object.entries(socialProviders).map(([provider, config]) => (
                <Button
                    key={provider}
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSocialLogin(provider as any)}
                    style={{ borderColor: config.color }}
                >
                    <config.icon className="mr-2 h-4 w-4" />
                    {config.name}로 로그인
                </Button>
            ))}
        </div>
    );
};
```

### 2. 사용자 경험 향상

#### 로딩 상태 개선

```typescript
// 스켈레톤 UI로 로딩 경험 향상
const AuthSkeleton = () => (
    <div className="flex items-center space-x-4">
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        <div className="space-y-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-3 w-32 bg-muted animate-pulse rounded" />
        </div>
    </div>
);

// 점진적 로딩
const ProgressiveAuth = () => {
    const { session, profile, isLoading } = useAuth();

    if (!session) return <LoginButton />;
    if (!profile) return <AuthSkeleton />;

    return <UserMenu user={profile} />;
};
```

#### 오프라인 지원

```typescript
// 오프라인 상태 감지 및 처리
const useOfflineAuth = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const { user } = useAuthStore();

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return {
        isOnline,
        canAuthenticate: isOnline,
        cachedUser: user, // 오프라인 시 캐시된 사용자 정보 사용
    };
};
```

### 3. 보안 강화

#### 세션 관리 고도화

```typescript
// 디바이스별 세션 관리
interface DeviceSession {
    id: string;
    user_id: string;
    device_info: string;
    ip_address: string;
    user_agent: string;
    last_active: string;
    is_current: boolean;
}

const SessionManager = () => {
    const [sessions, setSessions] = useState<DeviceSession[]>([]);

    const revokeSession = async (sessionId: string) => {
        // 특정 세션 무효화
        await supabase.auth.admin.deleteUser(sessionId);
        setSessions(prev => prev.filter(s => s.id !== sessionId));
    };

    const revokeAllOtherSessions = async () => {
        // 현재 세션 외 모든 세션 무효화
        const currentSessionId = getCurrentSessionId();
        await Promise.all(
            sessions
                .filter(s => s.id !== currentSessionId)
                .map(s => revokeSession(s.id))
        );
    };

    return (
        <div className="space-y-4">
            <h3>활성 세션</h3>
            {sessions.map(session => (
                <SessionCard
                    key={session.id}
                    session={session}
                    onRevoke={() => revokeSession(session.id)}
                />
            ))}
        </div>
    );
};
```

#### 보안 이벤트 로깅

```typescript
// 보안 관련 이벤트 추적
const securityLogger = {
    logLoginAttempt: (email: string, success: boolean, ip: string) => {
        console.log(`Login attempt: ${email}, Success: ${success}, IP: ${ip}`);
        // 실제로는 보안 로그 서비스로 전송
    },

    logSuspiciousActivity: (userId: string, activity: string, details: any) => {
        console.warn(`Suspicious activity: ${activity}`, { userId, details });
        // 관리자에게 알림 발송
    },

    logPermissionDenied: (userId: string, resource: string) => {
        console.warn(`Permission denied: ${userId} -> ${resource}`);
        // 권한 침해 시도 기록
    },
};
```

---

## 결론

Phase 4 사용자 인증 및 권한 관리 시스템 구축을 통해 **현대적이고 안전한 사용자 관리 시스템**의 완전한 기반을 마련할 수 있었습니다.

특히 **Zustand와 React Query의 하이브리드 상태 관리**를 통해 서버 상태와 클라이언트 상태를 효율적으로 분리하고 관리할 수 있게 되었으며, **Next.js 미들웨어를 활용한 라우트 보호**로 서버 사이드 보안을 확보했습니다. 또한 **OAuth 2.0 소셜 로그인**을 통해 사용자 편의성과 보안성을 동시에 달성했습니다.

**타입 안전한 인증 시스템**과 **세밀한 에러 처리**를 통해 개발자 경험과 사용자 경험을 모두 향상시켰으며, **확장 가능한 권한 관리 아키텍처**를 통해 향후 복잡한 권한 요구사항에도 대응할 수 있는 기반을 마련했습니다.

이러한 경험은 향후 **대규모 사용자 서비스의 인증 시스템 설계**와 **보안을 고려한 상태 관리 아키텍처 구축**에서도 활용할 수 있는 실무 역량이 될 것입니다.

---

## 다음 단계 (Phase 5)

### Phase 5에서 구현할 기능들

#### 1. 마크다운 에디터 시스템

- 실시간 미리보기가 있는 마크다운 에디터
- 이미지 업로드 및 관리 시스템
- 코드 하이라이팅과 수식 렌더링

#### 2. 글 작성 및 편집 기능

- 관리자 전용 글 작성/편집 페이지
- 해시태그 관리 시스템
- 임시 저장 및 자동 저장 기능

#### 3. 파일 업로드 시스템

- Supabase Storage를 활용한 이미지 업로드
- 드래그 앤 드롭 파일 업로드
- 이미지 최적화 및 리사이징

**Phase 4에서 구축한 기반이 Phase 5에서 활용되는 방식:**

- 인증 시스템 → 관리자 권한 확인 및 글 작성 권한 제어
- 상태 관리 → 에디터 상태와 서버 상태 동기화
- 에러 처리 → 파일 업로드 실패 및 네트워크 오류 처리
- UI 컴포넌트 → 일관된 폼 디자인과 사용자 피드백

---

## 참고 자료

### 공식 문서

- [Zustand](https://zustand-demo.pmnd.rs/) - 간단하고 확장 가능한 상태 관리
- [TanStack Query](https://tanstack.com/query/latest) - 서버 상태 관리와 캐싱
- [Supabase Auth](https://supabase.com/docs/guides/auth) - 인증 및 사용자 관리
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware) - 라우트 보호

### 보안 & 인증

- [OAuth 2.0 Security](https://datatracker.ietf.org/doc/html/rfc6819) - OAuth 2.0 보안 가이드
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725) - JWT 보안 모범 사례
- [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) - 인증 보안 체크리스트

### 상태 관리 & 아키텍처

- [React Query Patterns](https://tkdodo.eu/blog/practical-react-query) - React Query 실무 패턴
- [State Management Guide](https://kentcdodds.com/blog/application-state-management-with-react) - React 상태 관리 가이드
- [TypeScript Advanced Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html) - 고급 타입 시스템
