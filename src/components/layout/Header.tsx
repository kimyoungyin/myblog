'use client';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ui/theme-toggle';

import Link from 'next/link';
import { memo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Search } from 'lucide-react';

const Header = memo(function Header() {
    const { user, isLoading, isAdmin, signOut } = useAuth();

    return (
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
            <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* 로고 및 네비게이션 */}
                <div className="flex items-center space-x-6">
                    <Link href="/" className="flex items-center space-x-2">
                        <span className="text-xl font-bold">MyBlog</span>
                    </Link>
                    <nav className="hidden items-center space-x-6 md:flex">
                        <Link
                            href="/"
                            className="hover:text-primary text-sm font-medium transition-colors"
                        >
                            홈
                        </Link>
                        <Link
                            href="/posts"
                            className="hover:text-primary text-sm font-medium transition-colors"
                        >
                            글 목록
                        </Link>
                        <Link
                            href="/about"
                            className="hover:text-primary text-sm font-medium transition-colors"
                        >
                            소개
                        </Link>
                    </nav>
                </div>

                {/* 사용자 메뉴 및 테마 토글 */}
                <div className="flex items-center space-x-4">
                    {/* 검색 버튼 - 모바일과 데스크탑 모두에서 표시 */}
                    <Button asChild variant="outline" size="sm">
                        <Link
                            href="/search"
                            className="flex items-center gap-2"
                        >
                            <Search className="h-4 w-4" />
                            <span className="hidden sm:inline">검색</span>
                        </Link>
                    </Button>

                    <ThemeToggle />
                    {isLoading ? (
                        <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
                    ) : user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="relative h-8 w-8 rounded-full"
                                >
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage
                                            src={user.avatar_url || ''}
                                            alt={user.full_name || user.email}
                                        />
                                        <AvatarFallback>
                                            {user.full_name
                                                ? user.full_name
                                                      .split(' ')
                                                      .map((n: string) => n[0])
                                                      .join('')
                                                : user.email
                                                      .charAt(0)
                                                      .toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-56"
                                align="end"
                                forceMount
                            >
                                <div className="flex items-center justify-start gap-2 p-2">
                                    <div className="flex flex-col space-y-1 leading-none">
                                        {user.full_name && (
                                            <p className="font-medium">
                                                {user.full_name}
                                            </p>
                                        )}
                                        <p className="text-muted-foreground w-[200px] truncate text-sm">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>
                                <DropdownMenuSeparator />
                                {isAdmin && (
                                    <>
                                        <DropdownMenuItem asChild>
                                            <Link
                                                href="/admin/posts/new"
                                                className="cursor-pointer"
                                            >
                                                새 글 작성
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link
                                                href="/admin/posts"
                                                className="cursor-pointer"
                                            >
                                                글 관리
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </>
                                )}
                                <DropdownMenuItem asChild>
                                    <Link
                                        href="/profile"
                                        className="cursor-pointer"
                                    >
                                        프로필
                                    </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                    className="cursor-pointer text-red-600 focus:text-red-600"
                                    onClick={signOut}
                                >
                                    로그아웃
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <div className="flex items-center space-x-2">
                            <Button asChild>
                                <Link href="/auth/login">로그인</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
});

export default Header;
