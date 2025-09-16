'use client';

import React, { useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';

interface SearchBarProps {
    placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    placeholder = '제목이나 내용으로 검색...',
}) => {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    // 디바운싱된 검색 처리 (300ms 지연)
    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);

        // 검색어가 변경되면 페이지를 1로 리셋
        params.set('page', '1');

        if (term) {
            params.set('q', term);
        } else {
            params.delete('q');
        }

        replace(`${pathname}?${params.toString()}`);
    }, 300);

    // 검색어 입력 처리
    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const term = e.target.value;
            handleSearch(term);
        },
        [handleSearch]
    );

    // 검색어 초기화
    const handleClear = useCallback(() => {
        const params = new URLSearchParams(searchParams);
        params.delete('q');
        // 페이지도 1로 리셋
        params.set('page', '1');
        replace(`${pathname}?${params.toString()}`);
    }, [searchParams, pathname, replace]);

    return (
        <div className="relative w-full">
            <div className="relative flex w-full items-center">
                {/* 왼쪽 검색 아이콘 */}
                <div className="absolute left-4 z-10 flex h-6 w-6 items-center justify-center">
                    <Search className="text-muted-foreground h-6 w-6" />
                </div>

                {/* 입력 필드 */}
                <Input
                    type="text"
                    placeholder={placeholder}
                    defaultValue={searchParams.get('q') || ''}
                    onChange={handleInputChange}
                    autoFocus
                    className="h-16 pr-16 pl-16 text-2xl placeholder:text-2xl"
                />

                {/* 오른쪽 삭제 버튼 */}
                {searchParams.get('q') && (
                    <div className="absolute right-2 z-10 flex h-10 w-10 items-center justify-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClear}
                            className="hover:bg-muted h-10 w-10 p-0"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
