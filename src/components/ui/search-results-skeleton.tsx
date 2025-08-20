import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface SearchResultsSkeletonProps {
    count?: number;
    className?: string;
}

export const SearchResultsSkeleton: React.FC<SearchResultsSkeletonProps> = ({
    count = 6,
    className = '',
}) => {
    return (
        <div className={`space-y-6 ${className}`}>
            {/* 검색 결과 개수 표시 Skeleton */}
            <div className="mb-6">
                <Skeleton className="h-6 w-32" />
            </div>

            {/* 검색 결과 그리드 */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: count }).map((_, index) => (
                    <Card key={index} className="transition-all duration-200">
                        <CardHeader className="pb-3">
                            {/* 썸네일 Skeleton */}
                            <div className="relative mb-4 h-48 w-full overflow-hidden rounded-lg">
                                <Skeleton className="h-full w-full" />
                            </div>

                            {/* 제목 Skeleton */}
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-full" />
                                <Skeleton className="h-6 w-3/4" />
                            </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                            {/* 메타 정보 Skeleton */}
                            <div className="mb-3 flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                    <Skeleton className="h-3 w-3" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                                <div className="flex items-center gap-1">
                                    <Skeleton className="h-3 w-3" />
                                    <Skeleton className="h-3 w-8" />
                                </div>
                                <div className="flex items-center gap-1">
                                    <Skeleton className="h-3 w-3" />
                                    <Skeleton className="h-3 w-8" />
                                </div>
                                <div className="flex items-center gap-1">
                                    <Skeleton className="h-3 w-3" />
                                    <Skeleton className="h-3 w-8" />
                                </div>
                            </div>

                            {/* 해시태그 Skeleton */}
                            <div className="flex flex-wrap gap-1">
                                <Skeleton className="h-5 w-16 rounded-full" />
                                <Skeleton className="h-5 w-20 rounded-full" />
                                <Skeleton className="h-5 w-14 rounded-full" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* 페이지네이션 Skeleton */}
            <div className="mt-8 flex justify-center">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                </div>
            </div>
        </div>
    );
};

// 단일 카드 Skeleton (로딩 상태나 에러 상태에서 사용)
export const SinglePostCardSkeleton: React.FC = () => {
    return (
        <Card className="transition-all duration-200">
            <CardHeader className="pb-3">
                {/* 썸네일 Skeleton */}
                <div className="relative mb-4 h-48 w-full overflow-hidden rounded-lg">
                    <Skeleton className="h-full w-full" />
                </div>

                {/* 제목 Skeleton */}
                <div className="space-y-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-3/4" />
                </div>
            </CardHeader>

            <CardContent className="pt-0">
                {/* 메타 정보 Skeleton */}
                <div className="mb-3 flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <Skeleton className="h-3 w-3" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="flex items-center gap-1">
                        <Skeleton className="h-3 w-3" />
                        <Skeleton className="h-3 w-8" />
                    </div>
                    <div className="flex items-center gap-1">
                        <Skeleton className="h-3 w-3" />
                        <Skeleton className="h-3 w-8" />
                    </div>
                    <div className="flex items-center gap-1">
                        <Skeleton className="h-3 w-3" />
                        <Skeleton className="h-3 w-8" />
                    </div>
                </div>

                {/* 해시태그 Skeleton */}
                <div className="flex flex-wrap gap-1">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                </div>
            </CardContent>
        </Card>
    );
};
