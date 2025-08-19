import { createServiceRoleClient } from '@/utils/supabase/server';
import { FILE_UPLOAD_CONFIG } from './file-upload';

/**
 * 서버에서 temp 폴더의 파일을 permanent 폴더로 실제 이동
 * 이 함수는 서버 사이드에서만 호출되어야 합니다.
 */
export async function moveTempFilesToPermanentServer(
    imagePaths: string[]
): Promise<{ success: boolean; permanentPaths: string[]; error?: string }> {
    try {
        if (imagePaths.length === 0) {
            return { success: true, permanentPaths: [] };
        }

        // 서버 사이드에서만 Service Role 클라이언트 사용 가능
        const supabase = createServiceRoleClient();

        const permanentPaths: string[] = [];

        for (const tempPath of imagePaths) {
            if (!tempPath.startsWith('temp/')) {
                continue;
            }

            const permanentPath = tempPath.replace('temp/', 'permanent/');

            try {
                // 1. 파일 복사 (temp → permanent)
                const { error: copyError } = await supabase.storage
                    .from(FILE_UPLOAD_CONFIG.storageBucket)
                    .copy(tempPath, permanentPath);

                if (copyError) {
                    continue;
                }

                // 2. 원본 temp 파일 삭제
                const { error: deleteError } = await supabase.storage
                    .from(FILE_UPLOAD_CONFIG.storageBucket)
                    .remove([tempPath]);

                if (deleteError) {
                    throw new Error('temp 파일 삭제 실패', {
                        cause: deleteError,
                    });
                }

                permanentPaths.push(permanentPath);
            } catch (error) {
                throw new Error('파일 이동 중 오류', { cause: error });
            }
        }

        return { success: true, permanentPaths };
    } catch (error) {
        return {
            success: false,
            permanentPaths: [],
            error: '서버에서 파일 이동 중 오류가 발생했습니다.',
        };
    }
}

/**
 * temp 폴더 내 모든 파일 삭제 (서버 전용)
 */
export async function clearTempFolder(): Promise<void> {
    try {
        // 서버 사이드에서만 Service Role 클라이언트 사용 가능
        const supabase = createServiceRoleClient();

        // temp 폴더 내 모든 하위 폴더와 파일 조회
        const { data: tempItems, error: listError } = await supabase.storage
            .from(FILE_UPLOAD_CONFIG.storageBucket)
            .list('temp');

        if (listError) {
            return;
        }

        if (!tempItems || tempItems.length === 0) {
            return;
        }

        // temp 폴더 내 모든 파일 경로 수집
        const tempFiles: string[] = [];

        for (const item of tempItems) {
            if (item.name === 'image') {
                // image 하위 폴더의 파일들 조회
                const { data: imageItems, error: imageListError } =
                    await supabase.storage
                        .from(FILE_UPLOAD_CONFIG.storageBucket)
                        .list('temp/image');

                if (!imageListError && imageItems) {
                    const imageFiles = imageItems.map(
                        (img) => `temp/image/${img.name}`
                    );
                    tempFiles.push(...imageFiles);
                }
            }
        }

        if (tempFiles.length === 0) {
            return;
        }

        // 모든 temp 파일 삭제
        const { error: deleteError } = await supabase.storage
            .from(FILE_UPLOAD_CONFIG.storageBucket)
            .remove(tempFiles);

        if (deleteError) {
            throw new Error('temp 파일 삭제 실패', { cause: deleteError });
        }
    } catch (error) {
        throw new Error('temp 폴더 초기화 중 오류 발생', { cause: error });
    }
}
