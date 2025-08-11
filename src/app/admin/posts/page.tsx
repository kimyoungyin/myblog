'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { getPostsAction, deletePostAction } from '@/lib/actions';
import { Post } from '@/lib/posts';

export default function PostsPage() {
    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 글 목록 조회
    const fetchPosts = useCallback(async () => {
        try {
            setLoading(true);
            const result = await getPostsAction(1, 50); // 최대 50개 글 조회
            setPosts(result.posts);
            setError(null);
        } catch (err) {
            setError('글 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    // 글 삭제
    const handleDelete = async (postId: number) => {
        if (!confirm('정말로 이 글을 삭제하시겠습니까?')) {
            return;
        }

        try {
            await deletePostAction(postId);
            alert('글이 삭제되었습니다.');
            fetchPosts(); // 목록 새로고침
        } catch (error) {
            alert(
                `삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
            );
        }
    };

    // 글 수정 페이지로 이동
    const handleEdit = (postId: number) => {
        router.push(`/admin/posts/${postId}/edit`);
    };

    // 글 상세 페이지로 이동
    const handleView = (postId: number) => {
        router.push(`/posts/${postId}`);
    };

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    if (loading) {
        return (
            <ProtectedRoute requireAdmin>
                <div className="bg-background min-h-screen p-6">
                    <div className="mx-auto max-w-7xl">
                        <div className="flex h-64 items-center justify-center">
                            <div className="text-center">
                                <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
                                <p className="text-muted-foreground">
                                    글 목록을 불러오는 중...
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute requireAdmin>
            <div className="bg-background min-h-screen p-6">
                <div className="mx-auto max-w-7xl">
                    {/* 헤더 */}
                    <div className="mb-6 flex items-center justify-between">
                        <h1 className="text-3xl font-bold">글 관리</h1>
                        <Button asChild>
                            <Link
                                href="/admin/posts/new"
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />새 글 작성
                            </Link>
                        </Button>
                    </div>

                    {/* 에러 메시지 */}
                    {error && (
                        <Card className="border-destructive mb-6">
                            <CardContent className="p-4">
                                <p className="text-destructive">{error}</p>
                                <Button
                                    variant="outline"
                                    onClick={fetchPosts}
                                    className="mt-2"
                                >
                                    다시 시도
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* 글 목록 */}
                    {posts.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <p className="text-muted-foreground mb-4">
                                    아직 작성된 글이 없습니다.
                                </p>
                                <Button asChild>
                                    <Link
                                        href="/admin/posts/new"
                                        className="flex items-center gap-2"
                                    >
                                        <Plus className="h-4 w-4" />첫 번째 글
                                        작성하기
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {posts.map((post) => (
                                <Card
                                    key={post.id}
                                    className="transition-shadow hover:shadow-md"
                                >
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <CardTitle className="mb-2 text-xl">
                                                    {post.title}
                                                </CardTitle>
                                                <div className="text-muted-foreground flex items-center gap-4 text-sm">
                                                    <span>
                                                        조회수:{' '}
                                                        {post.view_count}
                                                    </span>
                                                    <span>
                                                        좋아요:{' '}
                                                        {post.likes_count}
                                                    </span>
                                                    <span>
                                                        댓글:{' '}
                                                        {post.comments_count}
                                                    </span>
                                                    <span>
                                                        작성일:{' '}
                                                        {new Date(
                                                            post.created_at
                                                        ).toLocaleDateString(
                                                            'ko-KR'
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleView(post.id)
                                                    }
                                                    className="flex items-center gap-1"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    보기
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleEdit(post.id)
                                                    }
                                                    className="flex items-center gap-1"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                    수정
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleDelete(post.id)
                                                    }
                                                    className="text-destructive hover:text-destructive flex items-center gap-1"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    삭제
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
