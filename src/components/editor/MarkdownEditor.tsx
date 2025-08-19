'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Save, Eye, EyeOff, Search } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useDebounce } from '@/hooks/useDebounce';
import { searchHashtagsAction } from '@/lib/actions';
import { Hashtag } from '@/lib/hashtags';
import { uploadFile } from '@/lib/file-upload';
import { toast } from 'sonner';

interface MarkdownEditorProps {
    initialTitle?: string;
    initialContent?: string;
    initialHashtags?: string[];
    initialData?: {
        title: string;
        content: string;
        hashtags: string[];
    };
    action: (formData: FormData) => Promise<void>;
    submitButtonText?: string;
    isEditing?: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
    initialTitle = '',
    initialContent = '',
    initialHashtags = [],
    initialData,
    action,
    submitButtonText = '저장',
    isEditing = false,
}) => {
    // initialData가 있으면 우선 사용, 없으면 개별 props 사용
    const [title, setTitle] = useState(initialData?.title || initialTitle);
    const [content, setContent] = useState(
        initialData?.content || initialContent
    );
    const [hashtags, setHashtags] = useState<string[]>(
        initialData?.hashtags || initialHashtags
    );

    const [newHashtag, setNewHashtag] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);

    // 해시태그 자동완성 관련 상태
    const [suggestions, setSuggestions] = useState<Hashtag[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // 디바운싱된 해시태그 검색어 (300ms 지연)
    const debouncedHashtagQuery = useDebounce(newHashtag, 300);

    // 개별 에러 상태 관리 (저장 시도 후에만 표시)
    const [titleError, setTitleError] = useState(false);
    const [contentError, setContentError] = useState(false);
    const [hashtagError, setHashtagError] = useState(false);

    // 화면 크기 감지
    const checkScreenSize = useCallback(() => {
        setIsDesktop(window.innerWidth >= 1024);
    }, []);

    useEffect(() => {
        // 초기 체크
        checkScreenSize();

        // 리사이즈 이벤트 리스너
        window.addEventListener('resize', checkScreenSize);

        // 클린업
        return () => window.removeEventListener('resize', checkScreenSize);
    }, [checkScreenSize]);

    // 해시태그 실시간 검색 (디바운싱 적용)
    useEffect(() => {
        const searchHashtagSuggestions = async () => {
            if (!debouncedHashtagQuery.trim()) {
                setSuggestions([]);
                setShowSuggestions(false);
                return;
            }

            // 최소 2글자 이상일 때만 검색
            if (debouncedHashtagQuery.length < 2) {
                setSuggestions([]);
                setShowSuggestions(false);
                return;
            }

            setIsSearching(true);
            try {
                const results = await searchHashtagsAction(
                    debouncedHashtagQuery
                );
                setSuggestions(results as Hashtag[]);
                setShowSuggestions(results.length > 0);
            } catch {
                setSuggestions([]);
                setShowSuggestions(false);
            } finally {
                setIsSearching(false);
            }
        };

        searchHashtagSuggestions();
    }, [debouncedHashtagQuery]);

    // 해시태그 추가
    const addHashtag = useCallback(() => {
        const normalizedTag = newHashtag.trim().toLowerCase();
        // 최소 2글자 이상, 최대 20글자 이하, #만 제한하고 다른 특수문자는 허용
        if (
            normalizedTag &&
            normalizedTag.length >= 2 &&
            normalizedTag.length <= 20 &&
            !normalizedTag.includes('#') &&
            !hashtags.includes(normalizedTag)
        ) {
            setHashtags((prev) => [...prev, normalizedTag]);
            setNewHashtag('');
            setShowSuggestions(false);
            // 해시태그가 추가되면 에러 상태 해제
            setHashtagError(false);
        }
    }, [newHashtag, hashtags]);

    // 자동완성 후보에서 해시태그 선택
    const selectSuggestion = useCallback(
        (tag: Hashtag) => {
            // 최소 2글자 이상, 최대 20글자 이하, #만 제한하고 다른 특수문자는 허용
            if (
                tag.name.length >= 2 &&
                tag.name.length <= 20 &&
                !tag.name.includes('#') &&
                !hashtags.includes(tag.name)
            ) {
                setHashtags((prev) => [...prev, tag.name]);
                // 해시태그가 추가되면 에러 상태 해제
                setHashtagError(false);
            }
            setNewHashtag('');
            setShowSuggestions(false);
        },
        [hashtags]
    );

    // 해시태그 제거
    const removeHashtag = useCallback(
        (tagToRemove: string) => {
            setHashtags((prev) => {
                const newHashtags = prev.filter((tag) => tag !== tagToRemove);
                // 해시태그가 모두 제거되면 에러 상태 다시 활성화
                if (newHashtags.length === 0 && hashtagError) {
                    setHashtagError(true);
                }
                return newHashtags;
            });
        },
        [hashtagError]
    );

    // 해시태그 입력 처리 (Enter 키)
    const handleHashtagKeyPress = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addHashtag();
            }
        },
        [addHashtag]
    );

    // 에러 상태 확인 (개별 상태 사용)
    const hasTitleError = titleError;
    const hasContentError = contentError;
    const hasHashtagError = hashtagError;
    // 클라이언트에서 인증 상태 확인하지 않음 - 서버에서 처리

    // 폼 제출 핸들러
    const handleSubmit = useCallback(
        (e: React.FormEvent<HTMLFormElement>) => {
            // 유효성 검사
            const titleValid = title.trim();
            const contentValid = content.trim();
            const hashtagsValid = hashtags.length > 0;
            // 인증 검사는 서버에서 처리하므로 클라이언트에서는 검사하지 않음

            // 에러 상태 설정
            setTitleError(!titleValid);
            setContentError(!contentValid);
            setHashtagError(!hashtagsValid);

            // 유효하지 않은 경우 첫 번째 필드로 포커스 이동하고 제출 방지
            if (!titleValid) {
                e.preventDefault();
                document.getElementById('title')?.focus();
                return;
            }
            if (!hashtagsValid) {
                e.preventDefault();
                document.getElementById('hashtag-input')?.focus();
                return;
            }
            if (!contentValid) {
                e.preventDefault();
                document.getElementById('content')?.focus();
                return;
            }

            // 모든 유효성 검사 통과 시 form 제출 진행 (Next.js가 자동 처리)
        },
        [title, content, hashtags]
    );

    // 컴포넌트 언마운트 시 임시 파일 정리

    const onDrop = useCallback(
        async (e: React.DragEvent<HTMLTextAreaElement>) => {
            e.preventDefault();

            const files = Array.from(e.dataTransfer.files);
            if (files.length === 0) return;

            // 파일 개수 제한
            if (files.length > 20) {
                toast.error('최대 20개까지 업로드 가능합니다.');
                return;
            }

            for (const file of files) {
                try {
                    // 이미지 파일인 경우만 허용
                    if (!file.type.startsWith('image/')) {
                        toast.error(
                            `${file.name}: 이미지 파일만 업로드 가능합니다.`
                        );
                        continue;
                    }

                    // 파일 크기가 0인지 확인
                    if (file.size === 0) {
                        toast.error(`${file.name}: 파일이 비어있습니다.`);
                        continue;
                    }

                    // 파일 크기가 너무 작은지 확인 (이미지는 최소 1KB 이상)
                    if (file.size < 1024) {
                        toast.error(`${file.name}: 파일이 너무 작습니다.`);
                        continue;
                    }

                    const result = await uploadFile(file, true); // temp 폴더에 업로드

                    if (result.success && result.url) {
                        // 마크다운 링크 생성 및 삽입 (이미지만)
                        const markdownLink = `![${file.name}](${result.url})`;

                        // 커서 위치에 링크 삽입
                        const textarea = document.getElementById(
                            'content'
                        ) as HTMLTextAreaElement;
                        if (!textarea) {
                            continue;
                        }

                        const start = textarea.selectionStart || 0;
                        const end = textarea.selectionEnd || 0;
                        const text = textarea.value || '';
                        const before = text.substring(0, start);
                        const after = text.substring(end);
                        const newText = before + markdownLink + after;

                        setContent(newText);

                        // content 상태 업데이트 확인

                        // 커서 위치 조정
                        setTimeout(() => {
                            if (textarea) {
                                textarea.focus();
                                textarea.setSelectionRange(
                                    start + markdownLink.length,
                                    start + markdownLink.length
                                );
                            }
                        }, 0);

                        toast.success(`${file.name}이(가) 업로드되었습니다.`);
                    } else {
                        toast.error(
                            result.error || '알 수 없는 오류가 발생했습니다.'
                        );
                    }
                } catch {
                    toast.error(`${file.name} 업로드 중 오류가 발생했습니다.`);
                }
            }
        },
        [setContent]
    );

    return (
        <div className="bg-background min-h-screen p-6">
            <div className="mx-auto max-w-7xl">
                {/* 헤더 */}
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-3xl font-bold">
                        {isEditing ? '글 수정' : '새 글 작성'}
                    </h1>
                    <div className="flex items-center gap-2">
                        {/* 모바일/태블릿에서만 미리보기 버튼 표시 */}
                        <div className="lg:hidden">
                            <Button
                                variant="outline"
                                onClick={() => setShowPreview(!showPreview)}
                                className="flex items-center gap-2"
                            >
                                {showPreview ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                                {showPreview ? '편집' : '미리보기'}
                            </Button>
                        </div>

                        <form action={action} onSubmit={handleSubmit}>
                            {/* userId hidden input 제거 - 보안상 위험 */}
                            <input type="hidden" name="title" value={title} />
                            <input
                                type="hidden"
                                name="content"
                                value={content}
                            />
                            <input
                                type="hidden"
                                name="hashtags"
                                value={hashtags.join(',')}
                            />
                            <Button
                                type="submit"
                                className="flex items-center gap-2"
                                title="글을 저장합니다"
                            >
                                <Save className="h-4 w-4" />
                                {submitButtonText}
                            </Button>
                        </form>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* 편집 영역 */}
                    <div
                        className={`space-y-6 ${showPreview || isDesktop ? 'lg:col-span-1' : 'lg:col-span-2'}`}
                    >
                        {/* 제목 입력 */}
                        <Card>
                            <CardContent className="p-4">
                                <Label
                                    htmlFor="title"
                                    className="mb-2 block text-sm font-medium"
                                >
                                    제목
                                </Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => {
                                        setTitle(e.target.value);
                                        // 제목이 입력되면 해당 에러 상태만 해제
                                        if (e.target.value.trim()) {
                                            setTitleError(false);
                                        }
                                    }}
                                    placeholder="글 제목을 입력하세요"
                                    className={`font-sans text-lg ${
                                        hasTitleError
                                            ? '!border-destructive focus:!border-destructive'
                                            : ''
                                    }`}
                                />
                                {hasTitleError && (
                                    <p className="text-destructive mt-2 pl-1 text-sm">
                                        제목을 입력해주세요
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* 해시태그 입력 */}
                        <Card>
                            <CardContent className="p-4">
                                <Label className="mb-2 block text-sm font-medium">
                                    해시태그
                                </Label>
                                <div className="mb-2 flex gap-2">
                                    <Input
                                        id="hashtag-input"
                                        value={newHashtag}
                                        onChange={(e) => {
                                            // 띄어쓰기와 #만 제거, 다른 특수문자는 허용
                                            const cleanedValue = e.target.value
                                                .replace(/[\s#]/g, '')
                                                .toLowerCase();
                                            setNewHashtag(cleanedValue);
                                            // 해시태그 입력은 에러 상태와 무관
                                        }}
                                        autoComplete="off"
                                        autoCorrect="off"
                                        autoCapitalize="off"
                                        spellCheck="false"
                                        onKeyDown={handleHashtagKeyPress}
                                        onFocus={() => {
                                            if (newHashtag.trim()) {
                                                setShowSuggestions(
                                                    suggestions.length > 0
                                                );
                                            }
                                        }}
                                        onBlur={() => {
                                            // 약간의 지연을 두어 클릭 이벤트가 처리될 수 있도록 함
                                            setTimeout(
                                                () => setShowSuggestions(false),
                                                150
                                            );
                                        }}
                                        placeholder="해시태그를 입력하고 Enter를 누르세요"
                                        className={`font-sans text-lg ${
                                            hasHashtagError
                                                ? '!border-destructive focus:!border-destructive'
                                                : ''
                                        }`}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addHashtag}
                                        className="px-3"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* 자동완성 후보 */}
                                {showSuggestions && (
                                    <div className="relative mb-2">
                                        <div className="bg-background border-border absolute top-0 right-0 left-0 z-10 max-h-48 overflow-y-auto rounded-lg border shadow-lg">
                                            {isSearching ? (
                                                <div className="text-muted-foreground flex items-center justify-center gap-2 px-3 py-4">
                                                    <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                                                    <span className="text-sm">
                                                        검색 중...
                                                    </span>
                                                </div>
                                            ) : suggestions.length > 0 ? (
                                                suggestions.map(
                                                    (suggestion) => (
                                                        <button
                                                            key={suggestion.id}
                                                            type="button"
                                                            onClick={() =>
                                                                selectSuggestion(
                                                                    suggestion
                                                                )
                                                            }
                                                            className="hover:bg-muted border-border flex w-full items-center gap-2 border-b px-3 py-2 text-left last:border-b-0"
                                                        >
                                                            <Search className="text-muted-foreground h-4 w-4" />
                                                            <span className="font-medium">
                                                                #
                                                                {
                                                                    suggestion.name
                                                                }
                                                            </span>
                                                        </button>
                                                    )
                                                )
                                            ) : (
                                                <div className="text-muted-foreground px-3 py-4 text-center text-sm">
                                                    검색 결과가 없습니다
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    {hashtags.map((tag) => (
                                        <Badge
                                            key={tag}
                                            variant="secondary"
                                            className="flex items-center gap-1 px-3 py-1"
                                        >
                                            #{tag}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeHashtag(tag)
                                                }
                                                className="hover:text-destructive ml-1"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                                {hasHashtagError && (
                                    <p className="text-destructive pl-1 text-sm">
                                        최소 하나의 해시태그를 입력해주세요
                                    </p>
                                )}
                                {/* 인증 에러는 서버에서 처리하므로 클라이언트에서는 표시하지 않음 */}
                            </CardContent>
                        </Card>

                        {/* 마크다운 입력 */}
                        <Card className="flex-1">
                            <CardContent className="p-4">
                                <Label
                                    htmlFor="content"
                                    className="mb-2 block text-sm font-medium"
                                >
                                    내용
                                </Label>
                                <div className="relative">
                                    <Textarea
                                        id="content"
                                        value={content}
                                        onChange={(e) => {
                                            setContent(e.target.value);
                                            // 내용이 입력되면 해당 에러 상태만 해제
                                            if (e.target.value.trim()) {
                                                setContentError(false);
                                            }
                                        }}
                                        placeholder="마크다운으로 글을 작성하세요...&#10;&#10;이미지 파일을 드래그 앤 드롭하면 자동으로 업로드됩니다."
                                        className={`min-h-[400px] resize-none font-sans text-sm transition-all duration-200 ${
                                            hasContentError
                                                ? '!border-destructive focus:!border-destructive'
                                                : ''
                                        }`}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.classList.add(
                                                'border-primary',
                                                'bg-primary/5'
                                            );
                                        }}
                                        onDragLeave={(e) => {
                                            e.currentTarget.classList.remove(
                                                'border-primary',
                                                'bg-primary/5'
                                            );
                                        }}
                                        onDrop={onDrop}
                                    />
                                </div>
                                {hasContentError && (
                                    <p className="text-destructive mt-2 pl-1 text-sm">
                                        내용을 입력해주세요
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* 미리보기 영역 */}
                    {/* 모바일/태블릿: 토글 가능, 데스크탑: 항상 표시 */}
                    {(showPreview || isDesktop) && (
                        <div className="space-y-6">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <h1 className="mb-4 text-2xl font-bold">
                                            {title || '제목 없음'}
                                        </h1>
                                        <div className="mb-4 flex flex-wrap gap-2">
                                            {hashtags.map((tag) => (
                                                <Badge
                                                    key={tag}
                                                    variant="outline"
                                                >
                                                    #{tag}
                                                </Badge>
                                            ))}
                                        </div>
                                        {/* 제목과 내용 사이 구분선 */}
                                        <hr className="border-border my-6" />
                                        <MarkdownRenderer
                                            content={
                                                content ||
                                                '내용을 입력하세요...'
                                            }
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
