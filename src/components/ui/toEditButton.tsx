'use client';

import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { Edit } from 'lucide-react';
import Link from 'next/link';

export default function ToEditButton({ postId }: { postId: number }) {
    const { user } = useAuthStore();

    const isAdmin = user?.is_admin;

    if (!isAdmin) {
        return null;
    }

    return (
        <Button variant="outline" asChild>
            <Link href={`/admin/posts/${postId}/edit`}>
                <Edit className="h-4 w-4" />
                수정
            </Link>
        </Button>
    );
}
