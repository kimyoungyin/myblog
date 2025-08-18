'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
    content,
    className = '',
}) => {
    return (
        <div
            className={`prose prose-sm dark:prose-invert max-w-none ${className}`}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // 이미지 커스텀 렌더링
                    img: ({ src, alt, ...props }) => {
                        // src가 string인지 확인
                        if (typeof src !== 'string') {
                            return null;
                        }

                        // temp 폴더 이미지인 경우 경고

                        // 이미지 렌더링 - p 태그와의 충돌 방지를 위해 span 사용

                        return (
                            <span className="my-4 block">
                                <img
                                    src={src}
                                    alt={alt || '이미지'}
                                    className="mx-auto h-auto max-w-full rounded-lg border border-gray-200 shadow-md dark:border-gray-700"
                                    style={{
                                        display: 'block',
                                        maxWidth: '100%',
                                        height: 'auto',
                                        objectFit: 'contain',
                                    }}
                                    onError={(e) => {
                                        const target =
                                            e.target as HTMLImageElement;
                                        const errorInfo = {
                                            src,
                                            alt,
                                            error: e,
                                            target: e.target,
                                            isTempImage: src.includes('/temp/'),
                                            isPermanentImage:
                                                src.includes('/permanent/'),
                                            timestamp: new Date().toISOString(),
                                        };

                                        // temp 폴더 이미지인 경우 특별한 에러 메시지
                                        if (src.includes('/temp/')) {
                                        }

                                        target.style.display = 'none';
                                        // 에러 시 fallback 텍스트 표시
                                        const parent = target.parentElement;
                                        if (parent) {
                                            const errorMessage = src.includes(
                                                '/temp/'
                                            )
                                                ? '임시 이미지 (권한 문제로 표시할 수 없음)'
                                                : `이미지를 불러올 수 없습니다: ${alt || '알 수 없는 이미지'}`;

                                            parent.innerHTML = `
                                                <div class="flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
                                                    <span class="text-gray-500 dark:text-gray-400 text-sm">
                                                        ${errorMessage}
                                                    </span>
                                                </div>
                                            `;
                                        }
                                    }}
                                    onLoad={(e) => {}}
                                    {...props}
                                />
                            </span>
                        );
                    },
                    // 링크 커스텀 렌더링 (일반 링크만)
                    a: ({ href, children, ...props }) => {
                        // 일반 링크는 기본 렌더링
                        return (
                            <a
                                href={href}
                                className="text-primary hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                                {...props}
                            >
                                {children}
                            </a>
                        );
                    },
                    // 코드 블록 스타일링
                    code: ({ className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline =
                            !className || !className.includes('language-');
                        return !isInline && match ? (
                            <pre className="bg-muted overflow-x-auto rounded-lg p-4">
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            </pre>
                        ) : (
                            <code
                                className="bg-muted rounded px-1 py-0.5 text-sm"
                                {...props}
                            >
                                {children}
                            </code>
                        );
                    },
                    // 테이블 스타일링
                    table: ({ children }) => (
                        <div className="overflow-x-auto">
                            <table className="border-border min-w-full border-collapse border">
                                {children}
                            </table>
                        </div>
                    ),
                    th: ({ children }) => (
                        <th className="border-border bg-muted border px-4 py-2 text-left font-semibold">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="border-border border px-4 py-2">
                            {children}
                        </td>
                    ),
                    // 인용구 스타일링
                    blockquote: ({ children }) => (
                        <blockquote className="border-primary text-muted-foreground border-l-4 pl-4 italic">
                            {children}
                        </blockquote>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};
