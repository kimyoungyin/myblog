import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// 공개 접근 가능한 경로들 (인증 불필요)
const publicPaths = [
    '/', // 홈페이지
    '/auth/login', // 로그인 페이지
    '/auth/callback', // OAuth 콜백
    '/posts', // 글 목록 페이지
    '/about', // 소개 페이지
];

// 인증이 필요한 경로들 (로그인 필수)
const protectedPaths = [
    '/profile', // 사용자 프로필
];

const adminPaths = [
    '/admin', // 관리자 페이지들
];

export async function updateSession(request: NextRequest) {
    const supabaseResponse = NextResponse.next({
        request,
    });
    // supabase/ssr의 createServerClient는 edge runtime 에서 지원됨
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    // 쿠키 설정 로직 추가
                    cookiesToSet.forEach(({ name, value, options }) => {
                        supabaseResponse.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    // Do not run code between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    // IMPORTANT: DO NOT REMOVE auth.getUser()

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // 현재 경로가 공개 경로인지 확인
    const isPublicPath = publicPaths.some((path) => {
        if (path === '/') {
            return request.nextUrl.pathname === '/';
        }
        if (path === '/posts') {
            // /posts와 /posts/[id] 모두 허용
            return (
                request.nextUrl.pathname === '/posts' ||
                /^\/posts\/\d+$/.test(request.nextUrl.pathname)
            );
        }
        return request.nextUrl.pathname.startsWith(path);
    });

    // 현재 경로가 보호된 경로인지 확인
    const isProtectedPath = protectedPaths.some((path) =>
        request.nextUrl.pathname.startsWith(path)
    );

    // 관리자 경로 여부
    const isAdminPath = adminPaths.some((path) =>
        request.nextUrl.pathname.startsWith(path)
    );

    // 인증이 필요한 페이지에 접근하려고 하는데 인증이 되지 않은 경우
    if (!user && isProtectedPath && !isPublicPath) {
        // 로그인 페이지로 리디렉션
        const url = request.nextUrl.clone();
        url.pathname = '/auth/login';

        // 현재 페이지를 쿼리 파라미터로 저장 (로그인 후 돌아가기 위함)
        if (request.nextUrl.pathname !== '/auth/login') {
            url.searchParams.set('redirectTo', request.nextUrl.pathname);
        }

        return NextResponse.redirect(url);
    }

    // 관리자 경로 보호: 미인증 → 로그인, 인증됨 → admin 확인
    if (isAdminPath) {
        if (!user) {
            const url = request.nextUrl.clone();
            url.pathname = '/auth/login';
            url.searchParams.set('redirectTo', request.nextUrl.pathname);
            return NextResponse.redirect(url);
        }
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();
        if (error || !profile?.is_admin) {
            const url = request.nextUrl.clone();
            url.pathname = '/';
            return NextResponse.redirect(url);
        }
        return supabaseResponse;
    }

    // 이미 로그인된 사용자가 로그인 페이지에 접근하는 경우
    if (user && request.nextUrl.pathname === '/auth/login') {
        // 홈페이지로 리디렉션
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
    }

    // IMPORTANT: You *must* return the supabaseResponse object as it is.
    // If you're creating a new response object with NextResponse.next() make sure to:
    // 1. Pass the request in it, like so:
    //    const myNewResponse = NextResponse.next({ request })
    // 2. Copy over the cookies, like so:
    //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
    // 3. Change the myNewResponse object to fit your needs, but avoid changing
    //    the cookies!
    // 4. Finally:
    //    return myNewResponse
    // If this is not done, you may be causing the browser and server to go out
    // of sync and terminate the user's session prematurely!

    return supabaseResponse;
}
