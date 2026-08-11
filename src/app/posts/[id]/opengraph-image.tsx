import { ImageResponse } from 'next/og';
import { getCachedPost } from '@/lib/posts';
import { loadKoreanFont } from '@/lib/og-font';

// 규약 기반 OG 이미지: /posts/[id]/opengraph-image
export const alt = '김영인의 기술 블로그 글';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const runtime = 'nodejs';

const BRAND = '김영인의 기술 블로그';

export default async function Image({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const postId = parseInt((await params).id, 10);
    const post = Number.isNaN(postId) ? null : await getCachedPost(postId);

    const title = post?.title || '글을 찾을 수 없습니다';
    const tags =
        post?.hashtags
            ?.slice(0, 4)
            .map((t) => `#${t.name}`)
            .join('  ') || '';

    const [bold, regular] = await Promise.all([
        loadKoreanFont(700),
        loadKoreanFont(400),
    ]);

    const fonts = [
        { name: 'Noto Sans KR', data: bold, weight: 700 as const },
        { name: 'Noto Sans KR', data: regular, weight: 400 as const },
    ];

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '80px',
                    background:
                        'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    color: '#f8fafc',
                    fontFamily: 'Noto Sans KR',
                }}
            >
                {/* 상단: 태그 */}
                <div
                    style={{
                        display: 'flex',
                        fontSize: 30,
                        color: '#38bdf8',
                        fontWeight: 400,
                    }}
                >
                    {tags}
                </div>

                {/* 중앙: 제목 */}
                <div
                    style={{
                        display: 'flex',
                        fontSize: title.length > 40 ? 64 : 76,
                        fontWeight: 700,
                        lineHeight: 1.25,
                        letterSpacing: '-0.02em',
                    }}
                >
                    {title}
                </div>

                {/* 하단: 브랜드 */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 34,
                        fontWeight: 700,
                        color: '#e2e8f0',
                    }}
                >
                    <div
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: '#38bdf8',
                            marginRight: 20,
                        }}
                    />
                    {BRAND}
                </div>
            </div>
        ),
        { ...size, fonts }
    );
}
