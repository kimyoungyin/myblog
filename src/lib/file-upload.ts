import { createClient, supabaseConfig } from '@/utils/supabase/client';
import type { FileUploadConfig, FileUploadResult, UploadedFile } from '@/types';

// 파일 업로드 설정
export const FILE_UPLOAD_CONFIG: FileUploadConfig = {
    ...supabaseConfig,
    allowedTypes: supabaseConfig.allowedImageTypes,
};

/**
 * 클라이언트에서 사용할 수 있는 기본 파일 업로드 함수들
 */

/**
 * 파일 검증 함수
 */
export function validateFile(file: File): { isValid: boolean; error?: string } {
    // 파일 타입 검증
    if (!FILE_UPLOAD_CONFIG.allowedTypes.includes(file.type)) {
        return {
            isValid: false,
            error: '지원하지 않는 파일 타입입니다.',
        };
    }

    // 파일 크기 검증
    if (file.size > FILE_UPLOAD_CONFIG.maxFileSize) {
        const maxSizeMB = FILE_UPLOAD_CONFIG.maxFileSize / (1024 * 1024);
        const actualSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        return {
            isValid: false,
            error: `파일 크기가 너무 큽니다. 최대 ${maxSizeMB}MB까지 가능하지만, 현재 파일은 ${actualSizeMB}MB입니다.`,
        };
    }

    return { isValid: true };
}

/**
 * 파일 업로드 (클라이언트 전용)
 */
export async function uploadFile(
    file: File,
    isTemporary: boolean = true
): Promise<FileUploadResult> {
    try {
        const supabase = createClient();

        // 파일 타입 검증
        if (!FILE_UPLOAD_CONFIG.allowedTypes.includes(file.type)) {
            return {
                success: false,
                error: '지원하지 않는 파일 타입입니다.',
                url: '',
                path: '',
            };
        }

        // 파일 크기 검증
        if (file.size > FILE_UPLOAD_CONFIG.maxFileSize) {
            const maxSizeMB = FILE_UPLOAD_CONFIG.maxFileSize / (1024 * 1024);
            const actualSizeMB = (file.size / (1024 * 1024)).toFixed(2);
            return {
                success: false,
                error: `파일 크기가 너무 큽니다. 최대 ${maxSizeMB}MB까지 가능하지만, 현재 파일은 ${actualSizeMB}MB입니다.`,
                url: '',
                path: '',
            };
        }

        // 파일명 생성 (UUID + 원본 확장자)
        const fileExtension = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExtension}`;

        // 업로드 경로 설정
        const uploadPath = isTemporary
            ? `temp/image/${fileName}`
            : `permanent/image/${fileName}`;

        // Supabase Storage에 업로드
        const { error } = await supabase.storage
            .from(FILE_UPLOAD_CONFIG.storageBucket)
            .upload(uploadPath, file, {
                upsert: true,
            });

        if (error) {
            return {
                success: false,
                error: `업로드 실패: ${error.message}`,
                url: '',
                path: '',
            };
        }

        // Supabase SDK의 getPublicUrl을 사용하여 올바른 공개 URL 생성
        const { data: publicUrlData } = supabase.storage
            .from(FILE_UPLOAD_CONFIG.storageBucket)
            .getPublicUrl(uploadPath);

        const fileUrl = publicUrlData.publicUrl;

        // UploadedFile 객체 생성
        const uploadedFile: UploadedFile = {
            id: crypto.randomUUID(),
            name: file.name,
            url: fileUrl,
            type: 'image',
            size: file.size,
            path: uploadPath,
            uploaded_at: new Date().toISOString(),
            is_temporary: isTemporary,
        };

        return {
            success: true,
            url: fileUrl,
            path: uploadPath,
            file: uploadedFile,
        };
    } catch (error) {
        return {
            success: false,
            error: `업로드 중 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
            url: '',
            path: '',
        };
    }
}

/**
 * 파일 삭제 (클라이언트 전용)
 */
export async function deleteFile(filePath: string): Promise<boolean> {
    try {
        const supabase = createClient();
        const { error } = await supabase.storage
            .from(FILE_UPLOAD_CONFIG.storageBucket)
            .remove([filePath]);

        return !error;
    } catch (error) {
        throw new Error('파일 삭제 실패', { cause: error });
    }
}

/**
 * temp 폴더 내 특정 파일들 삭제 (클라이언트 전용)
 */
export async function cleanupUnusedTempFiles(
    usedImagePaths: string[]
): Promise<void> {
    try {
        const supabase = createClient();
        // temp 폴더 내 모든 파일 조회
        const { data: tempItems, error: listError } = await supabase.storage
            .from(FILE_UPLOAD_CONFIG.storageBucket)
            .list('temp/image');

        if (listError || !tempItems) {
            throw new Error('temp 폴더 조회 실패', { cause: listError });
        }

        // 사용되지 않는 파일들 찾기
        const usedFileNames = usedImagePaths.map((path) =>
            path.split('/').pop()
        );
        const unusedFiles = tempItems.filter(
            (item) => !usedFileNames.includes(item.name)
        );

        if (unusedFiles.length === 0) {
            return;
        }

        // 사용되지 않는 파일들 삭제
        const filePaths = unusedFiles.map((item) => `temp/image/${item.name}`);
        const { error: deleteError } = await supabase.storage
            .from(FILE_UPLOAD_CONFIG.storageBucket)
            .remove(filePaths);

        if (deleteError) {
            throw new Error('사용되지 않는 파일 삭제 실패', {
                cause: deleteError,
            });
        }
    } catch (error) {
        throw new Error('사용되지 않는 파일 정리 중 오류 발생', {
            cause: error,
        });
    }
}

/**
 * 마크다운 내용에서 이미지 경로 추출 (클라이언트 전용)
 */
export function extractImagePathsFromMarkdown(content: string): string[] {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const paths: string[] = [];
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
        const url = match[2];

        // Supabase Storage URL에서 경로 추출
        if (url.includes('/storage/v1/object/')) {
            // URL에서 경로 부분만 추출 (query parameter 제거)
            const pathMatch = url.match(/\/files\/([^?]+)/);
            if (pathMatch) {
                const cleanPath = pathMatch[1];
                paths.push(cleanPath);
            }
        }
    }

    return paths;
}

/**
 * 마크다운 내용의 이미지 URL을 permanent 경로로 업데이트 (클라이언트 전용)
 */
export function updateImageUrlsInMarkdown(
    content: string,
    permanentPaths: string[]
): string {
    let updatedContent = content;

    for (const permanentPath of permanentPaths) {
        // temp 경로를 permanent 경로로 교체
        const tempPath = permanentPath.replace('permanent/', 'temp/');

        // 공개 URL로 변경 (권한 설정 완료)
        // 1. temp 경로를 permanent 경로로 변경
        // /storage/v1/object/public/files/temp/image/file.png → /storage/v1/object/public/files/permanent/image/file.png
        const pathChange = updatedContent.replace(
            new RegExp(
                `/storage/v1/object/public/files/${tempPath.replace(/\//g, '\\/')}`,
                'g'
            ),
            `/storage/v1/object/public/files/${permanentPath}`
        );

        if (pathChange !== updatedContent) {
            updatedContent = pathChange;
        }

        // 2. 전체 URL에서 경로만 변경 (temp → permanent)
        // https://.../storage/v1/object/public/files/temp/image/file.png → https://.../storage/v1/object/public/files/permanent/image/file.png
        const fullUrlChange = updatedContent.replace(
            new RegExp(
                `https://[^/]+/storage/v1/object/public/files/${tempPath.replace(/\//g, '\\/')}`,
                'g'
            ),
            `https://yuistgpbrcrkspxztygl.supabase.co/storage/v1/object/public/files/${permanentPath}`
        );

        if (fullUrlChange !== updatedContent) {
            updatedContent = fullUrlChange;
        }
    }

    return updatedContent;
}

/**
 * 마크다운에서 첫 번째 이미지를 썸네일로 추출 (클라이언트 전용)
 */
export function extractThumbnailFromMarkdown(content: string): string | null {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/;
    const match = content.match(imageRegex);

    if (match) {
        const imageUrl = match[2];

        // Supabase Storage URL에서 경로 추출 (토큰 제거)
        if (imageUrl.includes('supabase.co/storage')) {
            const urlMatch = imageUrl.match(
                /\/storage\/v1\/object\/[^\/]+\/[^\/]+\/(.+?)(\?|$)/
            );
            if (urlMatch) {
                const path = decodeURIComponent(urlMatch[1]);
                if (path.startsWith('temp/') || path.startsWith('permanent/')) {
                    // 서명된 URL을 공개 URL로 변환
                    const publicUrl = imageUrl.replace(
                        /\/storage\/v1\/object\/sign\//,
                        '/storage/v1/object/public/'
                    );
                    return publicUrl;
                }
            }
        }
    }

    return null;
}
