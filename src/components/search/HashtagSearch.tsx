'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Search } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { searchHashtagsAction, getHashtagsByIdsAction } from '@/lib/actions';
import { Hashtag } from '@/lib/hashtags';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface HashtagSearchProps {
    placeholder?: string;
}

export const HashtagSearch: React.FC<HashtagSearchProps> = ({
    placeholder = '해시태그로 검색...',
}) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    // 현재 선택된 해시태그들 (ID 기반)
    const [selectedHashtags, setSelectedHashtags] = useState<Hashtag[]>([]);

    // 해시태그 검색어
    const [searchQuery, setSearchQuery] = useState('');

    // 자동완성 관련 상태
    const [suggestions, setSuggestions] = useState<Hashtag[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // 디바운싱된 해시태그 검색어 (300ms 지연)
    const [debouncedSearchQuery] = useDebounce(searchQuery, 300);

    // URL에서 초기 해시태그 파라미터 읽기
    useEffect(() => {
        const tagParam = searchParams.get('tag');
        if (tagParam) {
            // tag 파라미터가 있으면 해당 해시태그 정보를 가져와서 설정
            const tagIds = tagParam
                .split(',')
                .map((id) => parseInt(id))
                .filter((id) => !isNaN(id));
            if (tagIds.length > 0) {
                const fetchHashtags = async () => {
                    try {
                        const hashtags = await getHashtagsByIdsAction(tagIds);
                        setSelectedHashtags(hashtags as Hashtag[]);
                    } catch (error) {
                        console.error('해시태그 정보 조회 실패:', error);
                        // 잘못된 해시태그 ID인 경우 URL에서 제거
                        const params = new URLSearchParams(searchParams);
                        params.delete('tag');
                        router.replace(`${pathname}?${params.toString()}`);
                    }
                };
                fetchHashtags();
            }
        } else {
            // tag 파라미터가 없으면 선택된 해시태그 초기화
            setSelectedHashtags([]);
        }
    }, [searchParams, pathname, router]);

    // 해시태그 실시간 검색 (디바운싱 적용)
    useEffect(() => {
        const searchHashtagSuggestions = async () => {
            if (!debouncedSearchQuery.trim()) {
                setSuggestions([]);
                setShowSuggestions(false);
                return;
            }

            // 최소 2글자 이상일 때만 검색
            if (debouncedSearchQuery.length < 2) {
                setSuggestions([]);
                setShowSuggestions(false);
                return;
            }

            setIsSearching(true);
            try {
                const results =
                    await searchHashtagsAction(debouncedSearchQuery);
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
    }, [debouncedSearchQuery]);

    // URL에 해시태그 파라미터 업데이트
    const updateURLWithHashtags = useCallback(
        (hashtags: Hashtag[]) => {
            const params = new URLSearchParams(searchParams);

            if (hashtags.length > 0) {
                const tagIds = hashtags.map((tag) => tag.id).join(',');
                params.set('tag', tagIds);
            } else {
                params.delete('tag');
            }

            // 검색어가 있으면 유지
            const query = searchParams.get('q');
            if (query) {
                params.set('q', query);
            }

            // 페이지는 1로 리셋
            params.set('page', '1');

            router.replace(`${pathname}?${params.toString()}`);
        },
        [searchParams, pathname, router]
    );

    // 해시태그 선택 (자동완성에서만 가능)
    const selectHashtag = useCallback(
        (hashtag: Hashtag) => {
            // 이미 선택된 해시태그인지 확인
            if (!selectedHashtags.find((tag) => tag.id === hashtag.id)) {
                const newSelectedHashtags = [...selectedHashtags, hashtag];
                setSelectedHashtags(newSelectedHashtags);

                // URL 업데이트
                updateURLWithHashtags(newSelectedHashtags);
            }

            setSearchQuery('');
            setShowSuggestions(false);
        },
        [selectedHashtags, updateURLWithHashtags]
    );

    // 해시태그 제거
    const removeHashtag = useCallback(
        (hashtagToRemove: Hashtag) => {
            const newSelectedHashtags = selectedHashtags.filter(
                (tag) => tag.id !== hashtagToRemove.id
            );
            setSelectedHashtags(newSelectedHashtags);

            // URL 업데이트
            updateURLWithHashtags(newSelectedHashtags);
        },
        [selectedHashtags, updateURLWithHashtags]
    );

    // 검색어 입력 처리
    const handleSearchInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value.replace(/[\s#]/g, '').toLowerCase();
            setSearchQuery(value);
        },
        []
    );

    // 포커스/블러 처리
    const handleFocus = useCallback(() => {
        if (searchQuery.trim() && suggestions.length > 0) {
            setShowSuggestions(true);
        }
    }, [searchQuery, suggestions]);

    const handleBlur = useCallback(() => {
        // 약간의 지연을 두어 클릭 이벤트가 처리될 수 있도록 함
        setTimeout(() => setShowSuggestions(false), 150);
    }, []);

    return (
        <div className="w-full">
            <div className="mb-2 flex gap-2">
                <div className="relative flex-1">
                    <Input
                        value={searchQuery}
                        onChange={handleSearchInputChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder={placeholder}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        className="font-sans text-lg"
                    />

                    {/* 자동완성 후보 */}
                    {showSuggestions && (
                        <div className="absolute top-full right-0 left-0 z-10 mt-1">
                            <div className="bg-background border-border max-h-48 overflow-y-auto rounded-lg border shadow-lg">
                                {isSearching ? (
                                    <div className="text-muted-foreground flex items-center justify-center gap-2 px-3 py-4">
                                        <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                                        <span className="text-sm">
                                            검색 중...
                                        </span>
                                    </div>
                                ) : suggestions.length > 0 ? (
                                    suggestions.map((suggestion) => (
                                        <button
                                            key={suggestion.id}
                                            type="button"
                                            onClick={() =>
                                                selectHashtag(suggestion)
                                            }
                                            className="hover:bg-muted border-border flex w-full items-center gap-2 border-b px-3 py-2 text-left last:border-b-0"
                                        >
                                            <Search className="text-muted-foreground h-4 w-4" />
                                            <span className="font-medium">
                                                #{suggestion.name}
                                            </span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-muted-foreground px-3 py-4 text-center text-sm">
                                        검색 결과가 없습니다
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 선택된 해시태그들 */}
            {selectedHashtags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedHashtags.map((tag) => (
                        <Badge
                            key={tag.id}
                            variant="secondary"
                            className="flex items-center gap-1 px-3 py-1"
                        >
                            #{tag.name}
                            <button
                                type="button"
                                onClick={() => removeHashtag(tag)}
                                className="hover:text-destructive ml-1"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
};
