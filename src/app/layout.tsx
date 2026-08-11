import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import QueryProvider from '@/lib/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/sonner';
import { Analytics } from '@vercel/analytics/next';
import { getSiteUrl } from '@/lib/site-config';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    metadataBase: new URL(getSiteUrl()),
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

    // RSS 피드 등 대체 표현 등록 (구독·신디케이션)
    alternates: {
        types: {
            'application/rss+xml': [
                { url: '/feed.xml', title: '김영인의 기술 블로그 RSS' },
            ],
        },
    },
    authors: [{ name: '김영인' }],
    creator: '김영인',
    publisher: 'MyBlog',

    // Open Graph 기본 설정
    // og:image는 규약 파일 src/app/opengraph-image.tsx가 자동 주입한다.
    openGraph: {
        type: 'website',
        locale: 'ko_KR',
        url: '/',
        siteName: 'MyBlog - 김영인의 기술 블로그',
        title: 'MyBlog - 김영인의 기술 블로그',
        description: '개발자로서 정리한 경험과 지식을 공유하는 블로그입니다.',
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
    // (og:image 관련 태그는 규약 파일이 자동 주입하므로 여기서 중복 지정하지 않음)
    other: {
        'og:rich_attachment': 'true',
        // 한국어 콘텐츠임을 명시
        'content-language': 'ko',
        language: 'Korean',
    },
    // 검색엔진 소유 확인용 코드는 환경변수로 주입 (없으면 필드 자체를 생략)
    verification: {
        ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && {
            google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
        }),
        ...(process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION && {
            other: {
                'naver-site-verification':
                    process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION,
            },
        }),
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
                <Analytics />
            </body>
        </html>
    );
}
