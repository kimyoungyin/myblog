'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

interface CacheBoundaryProps {
    children: React.ReactNode;
    queryKey: string[];
    staleTime?: number;
    gcTime?: number;
}

export function CacheBoundary({
    children,
    queryKey,
    staleTime = 5 * 60 * 1000, // 5분
    gcTime = 10 * 60 * 1000, // 10분
}: CacheBoundaryProps) {
    const queryClient = useQueryClient();
    const isInitialized = useRef(false);

    useEffect(() => {
        if (!isInitialized.current) {
            // 캐시 설정 최적화
            queryClient.setDefaultOptions({
                queries: {
                    staleTime,
                    gcTime,
                    refetchOnWindowFocus: false,
                    refetchOnReconnect: true,
                    retry: (failureCount, error: unknown) => {
                        // 네트워크 오류가 아닌 경우 재시도하지 않음
                        if (
                            error &&
                            typeof error === 'object' &&
                            'status' in error
                        ) {
                            const status = (error as { status: number }).status;
                            if (status >= 400 && status < 500) {
                                return false;
                            }
                        }
                        return failureCount < 3;
                    },
                },
                mutations: {
                    retry: 1,
                },
            });

            isInitialized.current = true;
        }
    }, [queryClient, staleTime, gcTime]);

    // 캐시 정리 함수
    const clearCache = () => {
        queryClient.removeQueries({ queryKey });
    };

    // 캐시 무효화 함수
    const invalidateCache = () => {
        queryClient.invalidateQueries({ queryKey });
    };

    // 백그라운드에서 캐시 새로고침
    const refetchCache = () => {
        queryClient.refetchQueries({ queryKey });
    };

    return <div data-cache-key={queryKey.join('-')}>{children}</div>;
}

// 특정 쿼리 키에 대한 캐시 관리 훅
export function useCacheManagement(queryKey: string[]) {
    const queryClient = useQueryClient();

    const clearCache = () => {
        queryClient.removeQueries({ queryKey });
    };

    const invalidateCache = () => {
        queryClient.invalidateQueries({ queryKey });
    };

    const refetchCache = () => {
        queryClient.refetchQueries({ queryKey });
    };

    const getCacheData = () => {
        return queryClient.getQueryData(queryKey);
    };

    const setCacheData = (data: unknown) => {
        queryClient.setQueryData(queryKey, data);
    };

    return {
        clearCache,
        invalidateCache,
        refetchCache,
        getCacheData,
        setCacheData,
    };
}
