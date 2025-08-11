'use client';

import { useAuth } from '@/hooks/useAuth';

export default function TestAuthPage() {
    const { user, loading, isAdmin, signIn, signOut } = useAuth();

    if (loading) {
        return (
            <div className="bg-background flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="border-primary mx-auto h-32 w-32 animate-spin rounded-full border-b-2"></div>
                    <p className="text-muted-foreground mt-4">로딩 중...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background min-h-screen">
            <main className="container mx-auto px-4 py-8">
                <h1 className="mb-8 text-3xl font-bold">인증 테스트 페이지</h1>

                <div className="space-y-6">
                    {/* 인증 상태 표시 */}
                    <div className="rounded-lg border p-6">
                        <h2 className="mb-4 text-xl font-semibold">
                            인증 상태
                        </h2>
                        {user ? (
                            <div className="space-y-2">
                                <p>
                                    <strong>로그인됨:</strong> {user.email}
                                </p>
                                <p>
                                    <strong>이름:</strong>{' '}
                                    {user.full_name || '설정되지 않음'}
                                </p>
                                <p>
                                    <strong>Admin 권한:</strong>{' '}
                                    {isAdmin ? '예' : '아니오'}
                                </p>
                                <p>
                                    <strong>가입일:</strong>{' '}
                                    {new Date(
                                        user.created_at
                                    ).toLocaleDateString()}
                                </p>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">
                                로그인되지 않음
                            </p>
                        )}
                    </div>

                    {/* 로그인/로그아웃 버튼 */}
                    <div className="rounded-lg border p-6">
                        <h2 className="mb-4 text-xl font-semibold">
                            인증 액션
                        </h2>
                        <div className="space-y-3">
                            {!user ? (
                                <div className="space-y-2">
                                    <p className="text-muted-foreground text-sm">
                                        소셜 로그인으로 계속하기:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => signIn('google')}
                                            className="rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                                        >
                                            Google로 로그인
                                        </button>
                                        <button
                                            onClick={() => signIn('github')}
                                            className="rounded bg-gray-800 px-4 py-2 text-white transition-colors hover:bg-gray-900"
                                        >
                                            GitHub로 로그인
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={signOut}
                                    className="bg-destructive hover:bg-destructive/90 rounded px-4 py-2 text-white transition-colors"
                                >
                                    로그아웃
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 디버그 정보 */}
                    <div className="rounded-lg border p-6">
                        <h2 className="mb-4 text-xl font-semibold">
                            디버그 정보
                        </h2>
                        <pre className="bg-muted overflow-auto rounded p-4 text-sm">
                            {JSON.stringify(
                                { user, loading, isAdmin },
                                null,
                                2
                            )}
                        </pre>
                    </div>
                </div>
            </main>
        </div>
    );
}
