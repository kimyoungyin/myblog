import { getPosts } from '@/lib/posts';
import { extractDescription } from '@/lib/markdown';
import { getSiteUrl } from '@/lib/site-config';

// RSS 2.0 피드. 구독·신디케이션 및 검색엔진 발견 채널 제공.
// 매 요청마다 최신 글을 반영하되 1시간 캐시.
export const revalidate = 3600;

const SITE_NAME = '김영인의 기술 블로그';
const SITE_DESCRIPTION =
    'React, Next.js, TypeScript 등 웹 개발 기술과 경험을 공유하는 블로그입니다.';

// XML 특수문자 이스케이프
function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '&':
                return '&amp;';
            case "'":
                return '&apos;';
            case '"':
                return '&quot;';
            default:
                return c;
        }
    });
}

export async function GET(): Promise<Response> {
    const siteUrl = getSiteUrl();

    let items = '';
    try {
        // 최신 글 30개
        const { posts } = await getPosts(1, 30, 'latest');
        items = posts
            .map((post) => {
                const url = `${siteUrl}/posts/${post.id}`;
                const description = extractDescription(
                    post.content_markdown,
                    300
                );
                const categories =
                    post.hashtags
                        ?.map(
                            (tag) =>
                                `<category>${escapeXml(tag.name)}</category>`
                        )
                        .join('') || '';
                return `        <item>
            <title>${escapeXml(post.title)}</title>
            <link>${url}</link>
            <guid isPermaLink="true">${url}</guid>
            <description>${escapeXml(description)}</description>
            <pubDate>${new Date(post.created_at).toUTCString()}</pubDate>
            <author>noreply@myblog (김영인)</author>
            ${categories}
        </item>`;
            })
            .join('\n');
    } catch (error) {
        console.error('RSS 피드 생성 실패:', error);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>${escapeXml(SITE_NAME)}</title>
        <link>${siteUrl}</link>
        <description>${escapeXml(SITE_DESCRIPTION)}</description>
        <language>ko-KR</language>
        <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />
${items}
    </channel>
</rss>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control':
                'public, s-maxage=3600, stale-while-revalidate=86400',
        },
    });
}
