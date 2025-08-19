'use client';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState, useEffect } from 'react';
// deprecated: SupabaseProvider 제거됨

export default function ProfilePage() {
    const { user, isLoading } = useAuth();

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        avatar_url: '',
    });
    const [isUpdating, setIsUpdating] = useState(false);

    // user 값이 변경될 때마다 formData 초기화
    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                avatar_url: user.avatar_url || '',
            });
        }
    }, [user]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>로그인이 필요합니다</CardTitle>
                        <CardDescription>
                            로그인 후 프로필을 확인하세요.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded bg-yellow-50 p-4 dark:bg-yellow-950">
                            <p className="text-base font-medium text-yellow-700 dark:text-yellow-300">
                                로그인이 필요합니다.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const handleUpdateProfile = async () => {
        try {
            setIsUpdating(true);
            const res = await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: formData.full_name,
                    avatar_url: formData.avatar_url,
                }),
            });
            if (!res.ok) throw new Error('프로필 업데이트 실패');
            setIsEditing(false);
        } catch (e) {
            console.error(e);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCancel = () => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                avatar_url: user.avatar_url || '',
            });
        }
        setIsEditing(false);
    };

    return (
        <div className="container mx-auto max-w-3xl p-6 pt-12">
            <Card className="w-full">
                <CardHeader className="pb-6">
                    <CardTitle className="text-3xl">프로필</CardTitle>
                    <CardDescription className="text-lg">
                        사용자 정보를 관리하고 수정할 수 있습니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    {/* 프로필 이미지 */}
                    <div className="flex items-center space-x-6">
                        <Avatar className="h-24 w-24">
                            <AvatarImage
                                src={user?.avatar_url || ''}
                                alt={user?.full_name || user?.email || ''}
                            />
                            <AvatarFallback className="text-2xl">
                                {user?.full_name
                                    ? user.full_name
                                          .split(' ')
                                          .map((n: string) => n[0])
                                          .join('')
                                    : user?.email?.charAt(0).toUpperCase() ||
                                      'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-muted-foreground text-base font-medium">
                                프로필 이미지
                            </p>
                            <p className="text-muted-foreground text-sm">
                                이미지를 변경하려면 URL을 입력하세요.
                            </p>
                        </div>
                    </div>

                    {/* 이메일 (읽기 전용) */}
                    <div className="space-y-3">
                        <Label
                            htmlFor="email"
                            className="text-base font-medium"
                        >
                            이메일
                        </Label>
                        <Input
                            id="email"
                            value={user?.email || ''}
                            disabled
                            className="bg-muted h-12 text-base"
                        />
                        <p className="text-muted-foreground text-sm">
                            이메일은 변경할 수 없습니다.
                        </p>
                    </div>

                    {/* 이름 */}
                    <div className="space-y-3">
                        <Label
                            htmlFor="full_name"
                            className="text-base font-medium"
                        >
                            이름
                        </Label>
                        {isEditing ? (
                            <Input
                                id="full_name"
                                value={formData.full_name}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        full_name: e.target.value,
                                    })
                                }
                                placeholder="이름을 입력하세요"
                                className="h-12 text-base"
                            />
                        ) : (
                            <Input
                                id="full_name"
                                value={
                                    user?.full_name || '이름이 설정되지 않음'
                                }
                                disabled
                                className="bg-muted h-12 text-base"
                            />
                        )}
                    </div>

                    {/* 관리자 권한 표시 */}
                    {user?.is_admin && (
                        <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-950">
                            <p className="text-base font-medium text-blue-700 dark:text-blue-300">
                                🎯 관리자 권한을 가지고 있습니다.
                            </p>
                        </div>
                    )}

                    {/* 계정 생성일 */}
                    <div className="space-y-3">
                        <Label className="text-base font-medium">
                            계정 생성일
                        </Label>
                        <Input
                            value={
                                user?.created_at
                                    ? new Date(
                                          user.created_at
                                      ).toLocaleDateString('ko-KR')
                                    : '알 수 없음'
                            }
                            disabled
                            className="bg-muted h-12 text-base"
                        />
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex space-x-3">
                        {isEditing ? (
                            <>
                                <Button
                                    onClick={handleUpdateProfile}
                                    disabled={isUpdating}
                                    className="h-12 flex-1 text-base"
                                >
                                    {isUpdating ? '업데이트 중...' : '저장'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                    disabled={isUpdating}
                                    className="h-12 text-base"
                                >
                                    취소
                                </Button>
                            </>
                        ) : (
                            <Button
                                onClick={() => setIsEditing(true)}
                                className="h-12 flex-1 text-base"
                            >
                                프로필 수정
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
