import { ImageResponse } from 'next/og';
import { loadKoreanFont } from '@/lib/og-font';

// 규약 기반 사이트 기본 OG 이미지 (홈 및 별도 이미지 없는 페이지)
export const alt = '김영인의 기술 블로그';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const runtime = 'nodejs';

const TITLE = '김영인의 기술 블로그';
const SUBTITLE = 'React · Next.js · TypeScript 웹 개발 경험과 지식';

export default async function Image() {
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
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 28,
                    background:
                        'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    color: '#f8fafc',
                    fontFamily: 'Noto Sans KR',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        fontSize: 84,
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                    }}
                >
                    {TITLE}
                </div>
                <div
                    style={{
                        display: 'flex',
                        fontSize: 36,
                        fontWeight: 400,
                        color: '#94a3b8',
                    }}
                >
                    {SUBTITLE}
                </div>
            </div>
        ),
        { ...size, fonts }
    );
}
