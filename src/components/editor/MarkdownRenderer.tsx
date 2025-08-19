import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';

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

                        // props에서 width와 height 제거 (타입 충돌 방지)
                        const { ...imageProps } = props;

                        return (
                            <span className="my-4 block">
                                <div className="relative">
                                    <Image
                                        {...imageProps}
                                        src={src}
                                        alt={alt || '이미지'}
                                        className="mx-auto h-auto max-w-full rounded-lg border border-gray-200 shadow-md dark:border-gray-700"
                                        width={800}
                                        height={600}
                                        style={{
                                            display: 'block',
                                            maxWidth: '100%',
                                            height: 'auto',
                                            objectFit: 'contain',
                                        }}
                                    />
                                </div>
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
