import { QueryClient, isServer } from '@tanstack/react-query';
import { cache } from 'react';

// 서버와 클라이언트에서 QueryClient를 생성 (공식 SSR 권장: staleTime만 명시)
// https://tanstack.com/query/v5/docs/framework/react/guides/advanced-ssr
function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                // SSR prefetch 후 클라이언트에서 즉시 재조회 방지 (공식 권장)
                staleTime: 60 * 1000, // 1분. gcTime/retry/refetchOnWindowFocus는 라이브러리 기본값 사용
            },
        },
    });
}

// 브라우저에서 사용할 QueryClient 싱글톤
let browserQueryClient: QueryClient | undefined = undefined;

// cache()를 사용하여 동일한 요청 범위(같은 HTTP 요청의 렌더링 컨텍스트) 내에서 QueryClient를 재사용합니다.
// 서버: 항상 새로운 QueryClient 생성 (요청 범위 내에서 cache로 재사용)
// 클라이언트: 싱글톤 패턴으로 한 번만 생성 (React가 초기 렌더 중 suspend 시 재생성 방지)
const getQueryClient = cache(() => {
    if (isServer) {
        // 서버: 항상 새로운 QueryClient 생성
        return makeQueryClient();
    } else {
        // 브라우저: 싱글톤 패턴으로 한 번만 생성
        // React가 초기 렌더 중 suspend 시 QueryClient를 재생성하지 않도록 방지
        if (!browserQueryClient) {
            browserQueryClient = makeQueryClient();
        }
        return browserQueryClient;
    }
});

export default getQueryClient;
