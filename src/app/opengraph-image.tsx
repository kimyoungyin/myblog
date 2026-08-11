import { ImageResponse } from 'next/og';
import { loadKoreanFonts, type OgFont } from '@/lib/og-font';

// 규약 기반 사이트 기본 OG 이미지 (홈 및 별도 이미지 없는 페이지)
export const alt = '김영인의 기술 블로그';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const runtime = 'nodejs';

const TITLE = '김영인의 기술 블로그';
const SUBTITLE = 'React · Next.js · TypeScript 웹 개발 경험과 지식';

export default async function Image(): Promise<ImageResponse> {
    let fonts: OgFont[] = [];

    try {
        fonts = await loadKoreanFonts();
    } catch (error) {
        console.error('기본 OG 이미지 폰트 로딩 실패:', error);
    }

    const hasKoreanFont = fonts.length > 0;
    const title = hasKoreanFont ? TITLE : 'MYBLOG';
    const subtitle = hasKoreanFont ? SUBTITLE : 'TECHNOLOGY BLOG';
    const imageOptions = hasKoreanFont ? { ...size, fonts } : size;

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
                    fontFamily: hasKoreanFont ? 'Noto Sans KR' : 'Arial',
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
                    {title}
                </div>
                <div
                    style={{
                        display: 'flex',
                        fontSize: 36,
                        fontWeight: 400,
                        color: '#94a3b8',
                    }}
                >
                    {subtitle}
                </div>
            </div>
        ),
        imageOptions
    );
}
