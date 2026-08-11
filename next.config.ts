import type { NextConfig } from 'next';

type HeaderRoutes = Awaited<
    ReturnType<NonNullable<NextConfig['headers']>>
>;

const nextConfig: NextConfig = {
    // 불필요한 프레임워크 노출 헤더 제거
    poweredByHeader: false,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'yuistgpbrcrkspxztygl.supabase.co',
                pathname: '/storage/v1/object/public/**',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
        ],
    },
    // 기본 보안 헤더 (Core Web Vitals에 영향 없는 안전 범위)
    async headers(): Promise<HeaderRoutes> {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on',
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
