import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    let next = searchParams.get('redirectTo') ?? '/';

    if (!next.startsWith('/')) {
        next = '/';
    }

    if (!code) {
        return NextResponse.redirect(
            new URL('/auth/login?error=no_code', origin)
        );
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        return NextResponse.redirect(
            new URL('/auth/login?error=exchange_failed', origin)
        );
    }

    return NextResponse.redirect(new URL(next, origin));
}
