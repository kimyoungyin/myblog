import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
    try {
        const { accessToken, refreshToken } = await request.json();

        if (!accessToken || !refreshToken) {
            return NextResponse.json(
                { error: '토큰이 필요합니다.' },
                { status: 400 }
            );
        }

        // Supabase 서버 클라이언트 생성
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                        // 이 함수는 미들웨어에서만 작동합니다
                        // 여기서는 직접 쿠키를 설정해야 합니다
                    },
                },
            }
        );

        // 세션 설정
        const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
        });

        if (error) {
            return NextResponse.json(
                { error: '세션 설정에 실패했습니다.' },
                { status: 500 }
            );
        }

        if (!data.session) {
            return NextResponse.json(
                { error: '세션이 생성되지 않았습니다.' },
                { status: 500 }
            );
        }

        // 응답 생성
        const response = NextResponse.json(
            { success: true, user: data.session.user },
            { status: 200 }
        );

        // Supabase 세션 쿠키 설정
        response.cookies.set('sb-access-token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 3600, // 1시간
            path: '/',
        });

        response.cookies.set('sb-refresh-token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 3600, // 7일
            path: '/',
        });

        return response;
    } catch (error) {
        return NextResponse.json(
            { error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
