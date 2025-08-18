import { NextRequest, NextResponse } from 'next/server';
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const { full_name, avatar_url } = await request.json();

        const user = await getAuthenticatedUser();
        const supabase = await createClient();

        const updates: Record<string, string> = {};
        if (typeof full_name === 'string') updates.full_name = full_name;
        if (typeof avatar_url === 'string') updates.avatar_url = avatar_url;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: '업데이트할 값이 없습니다.' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json(
            { error: '프로필 업데이트 실패' },
            { status: 500 }
        );
    }
}
