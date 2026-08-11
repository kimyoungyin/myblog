import type { MetadataRoute } from 'next';

// PWA 매니페스트. 모바일 검색 결과 브랜딩 및 홈 화면 설치 지원.
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: '김영인의 기술 블로그',
        short_name: 'MyBlog',
        description:
            'React, Next.js, TypeScript 등 웹 개발 기술과 경험을 공유하는 블로그입니다.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        lang: 'ko-KR',
        icons: [
            {
                src: '/web-app-manifest-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/web-app-manifest-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
        ],
    };
}
