import type { Metadata } from 'next';
import { MarkdownEditor } from '@/components/editor/MarkdownEditor';
import { createPostAction } from '@/lib/actions';
import { clearTempFolder } from '@/lib/file-upload-server';
// 미들웨어에서 라우트 보호 처리

// 새 글 작성 페이지 메타데이터
export const metadata: Metadata = {
    title: '새 글 작성',
    description:
        '새로운 블로그 글을 작성합니다. 마크다운 에디터를 사용해서 글을 작성하고 해시태그를 추가할 수 있습니다.',
    keywords: ['글 작성', '새 글', '마크다운 에디터', '블로그 작성'],

    // Open Graph 최적화
    openGraph: {
        title: '새 글 작성 | MyBlog',
        description: '새로운 블로그 글을 작성합니다.',
        url: '/admin/posts/new',
        type: 'website',
    },

    // 관리자 페이지 전용 메타데이터
    other: {
        'page-type': 'admin-editor',
        'editor-mode': 'create',
    },

    // 검색엔진 인덱싱 제외 (관리자 페이지)
    robots: {
        index: false,
        follow: false,
    },
};

export default async function NewPostPage() {
    // 서버 사이드에서 temp 폴더 초기화
    try {
        await clearTempFolder();
        console.log('temp 폴더 초기화 완료');
    } catch (error) {
        console.error('temp 폴더 초기화 실패:', error);
        // 에러가 발생해도 페이지는 계속 렌더링
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* 보호는 미들웨어에서 처리됨 */}

            <h1 className="mb-8 text-3xl font-bold">새 글 작성</h1>
            <MarkdownEditor
                action={createPostAction}
                submitButtonText="글 작성"
            />
        </div>
    );
}
