import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="from-background via-background to-muted/20 flex min-h-[calc(100vh-9rem)] items-center justify-center bg-gradient-to-br p-4">
            <div className="w-full max-w-2xl space-y-8">
                <Card className="border-border shadow-xl">
                    <CardHeader className="pb-4 text-center">
                        <div className="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                            <FileQuestion className="text-muted-foreground h-8 w-8" />
                        </div>
                        <CardTitle className="text-foreground text-2xl font-bold">
                            페이지를 찾을 수 없습니다
                        </CardTitle>
                        <p className="text-muted-foreground mt-2 text-base">
                            요청하신 주소에 해당하는 페이지가 없거나 이동되었을
                            수 있습니다.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col justify-center gap-3 sm:flex-row">
                            <Button asChild size="lg" className="gap-2">
                                <Link href="/">
                                    <Home className="h-4 w-4" />
                                    홈으로
                                </Link>
                            </Button>
                            <Button
                                variant="outline"
                                asChild
                                size="lg"
                                className="gap-2"
                            >
                                <Link href="/posts">글 목록</Link>
                            </Button>
                            <Button
                                variant="ghost"
                                asChild
                                size="lg"
                                className="gap-2"
                            >
                                <Link href="/search">검색</Link>
                            </Button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="border-border w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card text-muted-foreground px-2">
                                    또는
                                </span>
                            </div>
                        </div>

                        <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-2 text-sm">
                            <Button
                                variant="link"
                                asChild
                                className="h-auto p-0"
                            >
                                <Link
                                    href="/"
                                    className="underline underline-offset-4"
                                >
                                    홈
                                </Link>
                            </Button>
                            <span>·</span>
                            <Button
                                variant="link"
                                asChild
                                className="h-auto p-0"
                            >
                                <Link
                                    href="/posts"
                                    className="underline underline-offset-4"
                                >
                                    글 목록
                                </Link>
                            </Button>
                            <span>·</span>
                            <Button
                                variant="link"
                                asChild
                                className="h-auto p-0"
                            >
                                <Link
                                    href="/search"
                                    className="underline underline-offset-4"
                                >
                                    검색
                                </Link>
                            </Button>
                            <span>·</span>
                            <Button
                                variant="link"
                                asChild
                                className="h-auto p-0"
                            >
                                <Link
                                    href="/resume"
                                    className="underline underline-offset-4"
                                >
                                    소개
                                </Link>
                            </Button>
                        </div>
                        <p className="text-muted-foreground text-center text-xs">
                            MyBlog - 김영인의 기술 블로그
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
