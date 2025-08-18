import { MarkdownEditor } from '@/components/editor/MarkdownEditor';
import { getPostAction, updatePostAction } from '@/lib/actions';
import { clearTempFolder } from '@/lib/file-upload-server';
// 미들웨어에서 라우트 보호 처리
import { notFound } from 'next/navigation';

interface EditPostPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
    // 서버 사이드에서 temp 폴더 초기화
    try {
        await clearTempFolder();
    } catch (error) {
        throw new Error('temp 폴더 초기화 실패', { cause: error });
        // 에러가 발생해도 페이지는 계속 렌더링
    }

    // 서버 사이드에서 글 데이터 로딩
    const resolvedParams = await params;
    const postId = parseInt(resolvedParams.id);

    if (isNaN(postId)) {
        notFound();
    }

    const post = await getPostAction(postId);

    if (!post) {
        notFound();
    }

    // updatePostAction을 postId와 함께 호출하는 서버 액션
    async function handleUpdatePost(formData: FormData) {
        'use server';
        return updatePostAction(postId, formData);
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* 보호는 미들웨어에서 처리됨 */}

            <h1 className="mb-8 text-3xl font-bold">글 수정</h1>
            <MarkdownEditor
                action={handleUpdatePost}
                submitButtonText="글 수정"
                isEditing={true}
                initialData={{
                    title: post.title,
                    content: post.content_markdown,
                    hashtags: post.hashtags?.map((tag) => tag.name) || [],
                }}
            />
        </div>
    );
}
