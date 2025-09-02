import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import QueryProvider from '@/lib/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/sonner';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    metadataBase: new URL(
        process.env.NEXT_PUBLIC_SITE_URL || 'https://myblog.vercel.app'
    ),
    title: {
        template: '%s | MyBlog',
        default: 'MyBlog - 김영인의 기술 블로그',
    },
    description: '개발자로서 정리한 경험과 지식을 공유하는 블로그입니다.',
    keywords: [
        '개발',
        '블로그',
        '기술',
        '프로그래밍',
        'React',
        'Next.js',
        'TypeScript',
    ],
    authors: [{ name: '김영인' }],
    creator: '김영인',
    publisher: 'MyBlog',

    // Open Graph 기본 설정
    openGraph: {
        type: 'website',
        locale: 'ko_KR',
        url: '/',
        siteName: 'MyBlog - 김영인의 기술 블로그',
        title: 'MyBlog - 김영인의 기술 블로그',
        description: '개발자로서 정리한 경험과 지식을 공유하는 블로그입니다.',
        images: [
            {
                url: '/og-image.png', // 기본 OG 이미지 (추후 생성 필요)
                width: 1200,
                height: 630,
                alt: 'MyBlog - 김영인의 기술 블로그',
            },
            // 카카오톡 최적화를 위한 정사각형 이미지
            {
                url: '/og-image-square.png', // 정사각형 OG 이미지 (추후 생성 필요)
                width: 800,
                height: 800,
                alt: 'MyBlog - 김영인의 기술 블로그',
            },
        ],
    },

    // Twitter Card 기본 설정
    twitter: {
        card: 'summary_large_image',
        creator: '@kimyoungin', // 실제 트위터 핸들로 변경 필요
        title: 'MyBlog - 김영인의 기술 블로그',
        description: '개발자로서 정리한 경험과 지식을 공유하는 블로그입니다.',
    },

    // 로봇 설정
    robots: {
        index: true,
        follow: true,
        nocache: false,
        googleBot: {
            index: true,
            follow: true,
            noimageindex: false,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },

    // 기타 설정
    category: 'technology',
    applicationName: 'MyBlog',
    generator: 'Next.js',
    referrer: 'origin-when-cross-origin',
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },

    // 카카오톡 및 한국 플랫폼 최적화를 위한 추가 메타데이터
    other: {
        // 카카오톡에서 사용하는 추가 메타태그들
        'og:image:width': '1200',
        'og:image:height': '630',
        'og:rich_attachment': 'true',
        // 한국어 콘텐츠임을 명시
        'content-language': 'ko',
        language: 'Korean',
        // 네이버, 다음 등 한국 검색엔진 최적화
        'naver-site-verification': '', // 추후 네이버 웹마스터 도구 연동 시 추가
        'google-site-verification': '', // 추후 Google Search Console 연동 시 추가
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <ThemeProvider>
                    <QueryProvider>
                        <div className="flex min-h-screen flex-col">
                            <Header />
                            <main className="flex-1">{children}</main>
                            <Footer />
                        </div>
                        <Toaster />
                    </QueryProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
