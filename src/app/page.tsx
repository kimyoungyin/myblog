import Layout from '@/components/layout/Layout';

export default function Home() {
    return (
        <Layout>
            <div className="bg-background min-h-screen">
                <main className="container mx-auto px-4 py-8">
                    <h1 className="mb-8 text-center text-4xl font-bold">
                        마크다운 기반 블로그
                    </h1>
                    <p className="text-muted-foreground text-center text-lg">
                        개발자로서 정리한 경험과 지식을 공유하는 블로그입니다.
                    </p>
                    <div className="mt-8 text-center">
                        <p className="text-muted-foreground text-sm">
                            ✅ Phase 3: 기본 UI 컴포넌트가 완료되었습니다.
                        </p>
                        <p className="text-muted-foreground mt-2 text-sm">
                            다음 단계: Phase 4 - 사용자 인증 및 권한 관리
                        </p>
                    </div>
                </main>
            </div>
        </Layout>
    );
}
