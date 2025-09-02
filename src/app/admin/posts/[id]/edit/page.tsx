import type { Metadata } from 'next';
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

// 글 수정 페이지 동적 메타데이터 생성
export async function generateMetadata({
    params,
}: EditPostPageProps): Promise<Metadata> {
    const resolvedParams = await params;
    const postId = parseInt(resolvedParams.id);

    if (isNaN(postId)) {
        return {
            title: '잘못된 글 ID',
            description: '올바르지 않은 글 ID입니다.',
        };
    }

    try {
        const post = await getPostAction(postId);

        if (!post) {
            return {
                title: '글을 찾을 수 없음',
                description: '요청한 글을 찾을 수 없습니다.',
            };
        }

        return {
            title: `글 수정 - ${post.title}`,
            description: `"${post.title}" 글을 수정합니다. 마크다운 에디터를 사용해서 내용을 편집할 수 있습니다.`,
            keywords: ['글 수정', '편집', '마크다운 에디터', post.title],

            // Open Graph 최적화
            openGraph: {
                title: `글 수정 - ${post.title} | MyBlog`,
                description: `"${post.title}" 글을 수정합니다.`,
                url: `/admin/posts/${postId}/edit`,
                type: 'website',
            },

            // 관리자 페이지 전용 메타데이터
            other: {
                'page-type': 'admin-editor',
                'editor-mode': 'edit',
                'post-id': postId.toString(),
            },

            // 검색엔진 인덱싱 제외 (관리자 페이지)
            robots: {
                index: false,
                follow: false,
            },
        };
    } catch (error) {
        console.error('글 정보 조회 실패:', error);
        return {
            title: '글 수정',
            description: '글을 수정하는 페이지입니다.',
        };
    }
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
