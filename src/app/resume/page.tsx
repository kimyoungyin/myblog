import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
    title: '이력서',
    description: '김영인 소개 및 이력서',
};

const RESUME_URL = process.env.NEXT_PUBLIC_RESUME_URL ?? '';

export default function ResumePage() {
    return (
        <div className="bg-background min-h-screen">
            <div className="container mx-auto max-w-4xl px-4 py-8">
                <div className="mb-8 flex justify-start">
                    <Button variant="outline" asChild className="gap-2">
                        <Link href="/">
                            <ArrowLeft className="h-4 w-4" />
                            홈으로
                        </Link>
                    </Button>
                </div>

                <Card className="border-border bg-card overflow-hidden">
                    <CardHeader className="flex items-center">
                        <CardTitle className="text-foreground">
                            이력서
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {RESUME_URL ? (
                            <div
                                className="border-border bg-background min-h-[70vh] border-t"
                                style={{ colorScheme: 'inherit' }}
                            >
                                <iframe
                                    src={RESUME_URL}
                                    title="이력서"
                                    className="h-[70vh] w-full border-0"
                                    sandbox="allow-same-origin allow-scripts allow-popups"
                                />
                            </div>
                        ) : (
                            <div className="text-muted-foreground border-border flex min-h-[200px] flex-col items-center justify-center gap-4 border-t p-8 text-center">
                                <p>이력서 URL이 설정되지 않았습니다.</p>
                                <p className="text-sm">
                                    .env.local에 NEXT_PUBLIC_RESUME_URL을
                                    설정해주세요.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
