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

interface MarkdownEditorProps {
    initialTitle?: string;
    initialContent?: string;
    initialHashtags?: string[];
    onSave?: (data: {
        title: string;
        content: string;
        hashtags: string[];
    }) => void;
    action?: (formData: FormData) => Promise<void>;
    submitButtonText?: string;
    isEditing?: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
    initialTitle = '',
    initialContent = '',
    initialHashtags = [],
    onSave,
    action,
    submitButtonText = '저장',
    isEditing = false,
}) => {
    const [title, setTitle] = useState(initialTitle);
    const [content, setContent] = useState(initialContent);
    const [hashtags, setHashtags] = useState<string[]>(initialHashtags);
    const [newHashtag, setNewHashtag] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
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
    useEffect(() => {
        const checkScreenSize = () => {
            setIsDesktop(window.innerWidth >= 1024);
        };

        // 초기 체크
        checkScreenSize();

        // 리사이즈 이벤트 리스너
        window.addEventListener('resize', checkScreenSize);

        // 클린업
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

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
            } catch (error) {
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

    // 저장 가능 여부 확인
    const canSave = title.trim() && content.trim() && hashtags.length > 0;

    // 에러 상태 확인 (개별 상태 사용)
    const hasTitleError = titleError;
    const hasContentError = contentError;
    const hasHashtagError = hashtagError;

    // 저장 처리
    const handleSave = useCallback(async () => {
        if (!canSave) {
            // 개별 에러 상태 활성화
            setTitleError(!title.trim());
            setContentError(!content.trim());
            setHashtagError(hashtags.length === 0);

            // 첫 번째 비어있는 필드로 포커스 이동
            if (!title.trim()) {
                document.getElementById('title')?.focus();
            } else if (hashtags.length === 0) {
                document.getElementById('hashtag-input')?.focus();
            } else if (!content.trim()) {
                document.getElementById('content')?.focus();
            }

            return;
        }

        if (onSave) {
            setIsSaving(true);
            try {
                await onSave({
                    title: title.trim(),
                    content: content.trim(),
                    hashtags,
                });
            } catch (error) {
                alert('저장 중 오류가 발생했습니다.');
            } finally {
                setIsSaving(false);
            }
        }
    }, [title, content, hashtags, onSave, canSave]);

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
                        {action ? (
                            <form action={action}>
                                <input
                                    type="hidden"
                                    name="title"
                                    value={title}
                                />
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
                                    disabled={isSaving || !canSave}
                                    className="flex items-center gap-2"
                                    title="글을 저장합니다"
                                >
                                    <Save className="h-4 w-4" />
                                    {isSaving ? '저장 중...' : submitButtonText}
                                </Button>
                            </form>
                        ) : (
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2"
                                title="글을 저장합니다"
                            >
                                <Save className="h-4 w-4" />
                                {isSaving ? '저장 중...' : submitButtonText}
                            </Button>
                        )}
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
                                    placeholder="마크다운으로 글을 작성하세요..."
                                    className={`min-h-[400px] resize-none font-sans text-sm ${
                                        hasContentError
                                            ? '!border-destructive focus:!border-destructive'
                                            : ''
                                    }`}
                                />
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
