import Image from 'next/image';

export default function Home() {
    return (
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
                        현재 Phase 1: 프로젝트 셋업 및 기본 구조가
                        완료되었습니다.
                    </p>
                </div>
            </main>
        </div>
    );
}
