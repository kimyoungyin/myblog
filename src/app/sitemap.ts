import type { MetadataRoute } from 'next';
import { getPosts } from '@/lib/posts';
import { PAGE_SIZE } from '@/constants';

// Next.js App Router sitemap route
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const entries: MetadataRoute.Sitemap = [
        {
            url: `${siteUrl}/`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${siteUrl}/posts`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.7,
        },
        {
            url: `${siteUrl}/search`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.6,
        },
    ];

    // 전수 수집: 페이지네이션 루프
    try {
        let page = 1;
        let totalCollected = 0;
        // 안전장치: 최대 10,000개 수집 또는 2,000페이지 루프 방지
        const MAX_POSTS = 10000;
        const MAX_PAGES = 2000;

        let hasMore = true;
        while (hasMore) {
            const { posts, total } = await getPosts(page, PAGE_SIZE, 'latest');

            for (const post of posts) {
                entries.push({
                    url: `${siteUrl}/posts/${post.id}`,
                    lastModified: new Date(
                        (post.updated_at || post.created_at) as string
                    ),
                    changeFrequency: 'weekly',
                    priority: 0.8,
                });
            }

            totalCollected += posts.length;
            const totalPages = Math.ceil(total / PAGE_SIZE);
            page += 1;

            hasMore = !(
                posts.length === 0 ||
                page > totalPages ||
                totalCollected >= total ||
                totalCollected >= MAX_POSTS ||
                page > MAX_PAGES
            );
        }
    } catch (error) {
        // 실패하더라도 정적 엔트리만 반환
        console.error('sitemap generation failed:', error);
    }

    return entries;
}
