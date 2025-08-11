'use client';

import React from 'react';
import { MarkdownEditor } from '@/components/editor/MarkdownEditor';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { createPostAction } from '@/lib/actions';

export default function NewPostPage() {
    return (
        <ProtectedRoute requireAdmin>
            <MarkdownEditor
                action={createPostAction}
                submitButtonText="글 작성"
            />
        </ProtectedRoute>
    );
}
