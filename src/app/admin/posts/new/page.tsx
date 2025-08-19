import { MarkdownEditor } from '@/components/editor/MarkdownEditor';
import { createPostAction } from '@/lib/actions';
import { clearTempFolder } from '@/lib/file-upload-server';
// 미들웨어에서 라우트 보호 처리

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
