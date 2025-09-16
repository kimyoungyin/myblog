'use client';

import React from 'react';
import { useAuthStore } from '@/stores/auth-store';

export const AdminCreateHint: React.FC = () => {
    const { user } = useAuthStore();

    if (!user?.is_admin) return null;

    return <p className="text-muted-foreground">첫 번째 글을 작성해보세요!</p>;
};
