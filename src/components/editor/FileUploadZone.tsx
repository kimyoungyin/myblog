'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Image, Video, File, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { uploadFile, deleteFile, validateFile } from '@/lib/file-upload';
import { useAuth } from '@/hooks/useAuth';
import type { UploadedFile, FileUploadProgress } from '@/types';

interface FileUploadZoneProps {
    onFilesUploaded: (files: UploadedFile[]) => void;
    onFilesRemoved: (fileIds: string[]) => void;
    uploadedFiles: UploadedFile[];
    className?: string;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
    onFilesUploaded,
    onFilesRemoved,
    uploadedFiles,
    className = '',
}) => {
    const { user, isLoading } = useAuth();
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<
        Map<string, FileUploadProgress>
    >(new Map());
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 드래그앤드롭 이벤트 핸들러
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        await handleFileUpload(files);
    }, []);

    // 파일 선택 핸들러
    const handleFileSelect = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;

            await handleFileUpload(files);

            // 파일 입력 초기화
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        },
        []
    );

    // 파일 업로드 처리
    const handleFileUpload = useCallback(
        async (files: File[]) => {
            const validFiles: File[] = [];
            const invalidFiles: string[] = [];

            // 파일 검증
            files.forEach((file) => {
                const validation = validateFile(file);
                if (validation.isValid) {
                    validFiles.push(file);
                } else {
                    invalidFiles.push(`${file.name}: ${validation.error}`);
                }
            });

            // 검증 실패한 파일들 에러 표시
            if (invalidFiles.length > 0) {
                setError(
                    `다음 파일들을 업로드할 수 없습니다:\n${invalidFiles.join('\n')}`
                );
            }

            if (validFiles.length === 0) return;

            // 파일 업로드 진행
            const newFiles: UploadedFile[] = [];

            for (const file of validFiles) {
                const fileId = `uploading-${Date.now()}-${Math.random()}`;

                // 업로드 진행 상태 설정
                setUploadProgress((prev) =>
                    new Map(prev).set(fileId, {
                        fileId,
                        progress: 0,
                        status: 'uploading',
                    })
                );

                try {
                    const result = await uploadFile(file, true); // 임시 파일로 업로드

                    if (result.success && result.file) {
                        newFiles.push(result.file);

                        // 업로드 완료 상태로 변경
                        setUploadProgress((prev) =>
                            new Map(prev).set(fileId, {
                                fileId,
                                progress: 100,
                                status: 'completed',
                            })
                        );
                    } else {
                        // 업로드 실패 상태로 변경
                        setUploadProgress((prev) =>
                            new Map(prev).set(fileId, {
                                fileId,
                                progress: 0,
                                status: 'error',
                            })
                        );

                        setError(`파일 업로드 실패: ${result.error}`);
                    }
                } catch (error) {
                    console.error('파일 업로드 중 오류:', error);
                    setError('파일 업로드 중 오류가 발생했습니다.');

                    // 업로드 실패 상태로 변경
                    setUploadProgress((prev) =>
                        new Map(prev).set(fileId, {
                            fileId,
                            progress: 0,
                            status: 'error',
                        })
                    );
                }
            }

            // 업로드된 파일들 부모 컴포넌트에 전달
            if (newFiles.length > 0) {
                onFilesUploaded(newFiles);
            }
        },
        [onFilesUploaded]
    );

    // 파일 제거
    const handleFileRemove = useCallback(
        async (fileId: string) => {
            const fileToRemove = uploadedFiles.find((f) => f.id === fileId);
            if (!fileToRemove) return;

            try {
                // 임시 파일인 경우 Storage에서 삭제
                if (fileToRemove.is_temporary) {
                    await deleteFile(fileToRemove.path);
                }

                // 부모 컴포넌트에 제거 알림
                onFilesRemoved([fileId]);
            } catch (error) {
                console.error('파일 제거 중 오류:', error);
                setError('파일 제거 중 오류가 발생했습니다.');
            }
        },
        [uploadedFiles, onFilesRemoved]
    );

    // 파일 아이콘 렌더링 함수 (이미지만)
    const getFileIcon = (file: UploadedFile) => {
        // 이미지인 경우 실제 이미지 표시
        return (
            <div className="relative">
                <img
                    src={file.url}
                    alt={file.name}
                    className="h-6 w-6 rounded object-cover"
                    onError={(e) => {
                        // 이미지 로드 실패 시 기본 아이콘 표시
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                    }}
                />
                {/* 이미지 로드 실패 시 표시할 기본 아이콘 */}
                <Image className="hidden h-6 w-6 text-blue-500" />
            </div>
        );
    };

    // 파일 크기 포맷팅
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // 인증되지 않은 경우 로그인 안내 표시
    if (!isLoading || !user) {
        return (
            <div
                className={`border-muted-foreground/25 rounded-lg border-2 border-dashed p-8 text-center ${className}`}
            >
                <AlertCircle className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-medium">
                    로그인이 필요합니다
                </h3>
                <p className="text-muted-foreground">
                    파일을 업로드하려면 먼저 로그인해주세요.
                </p>
            </div>
        );
    }

    // 어드민이 아닌 경우 권한 없음 표시
    if (!user.is_admin) {
        return (
            <div
                className={`border-muted-foreground/25 rounded-lg border-2 border-dashed p-8 text-center ${className}`}
            >
                <AlertCircle className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-medium">권한이 없습니다</h3>
                <p className="text-muted-foreground">
                    파일 업로드는 어드민만 가능합니다.
                </p>
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* 드래그앤드롭 영역 */}
            <div
                className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                    isDragOver
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <Upload className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-medium">
                    파일을 여기에 드래그앤드롭하세요
                </h3>
                <p className="text-muted-foreground mb-4">
                    이미지 파일만 업로드할 수 있습니다 (최대 5MB)
                </p>
                <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                >
                    <Upload className="h-4 w-4" /> 파일 선택
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>

            {/* 에러 메시지 */}
            {error && (
                <div className="bg-destructive/10 border-destructive/20 text-destructive flex items-center gap-2 rounded-lg border p-3">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm whitespace-pre-line">{error}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setError(null)}
                        className="h-6 w-6 p-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* 업로드된 파일 목록 */}
            {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-medium">업로드된 파일</h4>
                    <div className="space-y-2">
                        {uploadedFiles.map((file) => (
                            <div
                                key={file.id}
                                className="bg-muted/50 flex items-center gap-3 rounded-lg p-3"
                            >
                                {getFileIcon(file)}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                        {file.name}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                        {formatFileSize(file.size)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {file.is_temporary && (
                                        <Badge
                                            variant="secondary"
                                            className="text-xs"
                                        >
                                            임시
                                        </Badge>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            handleFileRemove(file.id)
                                        }
                                        className="text-destructive hover:text-destructive h-6 w-6 p-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 업로드 진행 상태 */}
            {Array.from(uploadProgress.values()).some(
                (p) => p.status === 'uploading'
            ) && (
                <div className="space-y-2">
                    <h4 className="font-medium">업로드 진행 중</h4>
                    <div className="space-y-2">
                        {Array.from(uploadProgress.values())
                            .filter((p) => p.status === 'uploading')
                            .map((progress) => (
                                <div
                                    key={progress.fileId}
                                    className="space-y-1"
                                >
                                    <div className="flex justify-between text-sm">
                                        <span>업로드 중...</span>
                                        <span>{progress.progress}%</span>
                                    </div>
                                    <div className="bg-muted h-2 w-full rounded-full">
                                        <div
                                            className="bg-primary h-2 rounded-full transition-all duration-300"
                                            style={{
                                                width: `${progress.progress}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
};
