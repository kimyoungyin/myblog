'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
    oneDark,
    oneLight,
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';
interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
    content,
    className = '',
}) => {
    const { theme } = useTheme();
    const codeStyle = theme === 'light' ? oneLight : oneDark;
    return (
        <div
            className={`prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap ${className}`}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // 이미지 커스텀 렌더링 - p 태그와의 충돌 방지
                    img: ({ src, alt, ...props }) => {
                        // src가 string인지 확인
                        if (typeof src !== 'string') {
                            return null;
                        }

                        // props에서 width와 height 제거 (타입 충돌 방지)
                        const { ...imageProps } = props;

                        // p 태그와의 충돌을 방지하기 위해 span만 사용
                        // display: block으로 블록 레벨 요소처럼 동작
                        return (
                            <span
                                className="my-4 block"
                                style={{ display: 'block' }}
                            >
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
                            </span>
                        );
                    },
                    // p 태그 커스텀 렌더링 - 이미지가 포함된 경우 div로 변경
                    p: ({ children, ...props }) => {
                        // children이 이미지를 포함하고 있는지 확인
                        const hasImage = React.Children.toArray(children).some(
                            (child) =>
                                React.isValidElement(child) &&
                                child.type === 'img'
                        );

                        if (hasImage) {
                            // 이미지가 포함된 경우 p 태그를 div로 변경하여 HTML 구조 문제 방지
                            return (
                                <div className="mb-4" {...props}>
                                    {children}
                                </div>
                            );
                        }

                        // 일반적인 경우 p 태그 사용
                        return <p {...props}>{children}</p>;
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
                    // pre 태그 오버라이드 - 코드 블록의 외부 래퍼 제거
                    pre: ({ children, ...props }) => {
                        // pre 태그 내부의 code 요소를 찾아서 직접 렌더링
                        const codeElement = React.Children.toArray(
                            children
                        ).find(
                            (child) =>
                                React.isValidElement(child) &&
                                child.type === 'code'
                        );

                        if (codeElement && React.isValidElement(codeElement)) {
                            // code 컴포넌트가 직접 처리하도록 반환
                            return codeElement;
                        }

                        // 일반적인 pre 태그인 경우 기본 렌더링
                        return <pre {...props}>{children}</pre>;
                    },
                    // 코드 블록 스타일링
                    code: ({ className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline =
                            !className || !className.includes('language-');

                        // 인라인 코드인 경우
                        if (isInline || !match) {
                            return (
                                <code
                                    className="bg-muted rounded px-1 py-0.5 font-mono text-sm"
                                    {...props}
                                >
                                    {children}
                                </code>
                            );
                        }

                        // 코드 블록인 경우 - 이제 외부 pre 태그 없이 직접 렌더링
                        const language = match[1];

                        try {
                            return (
                                <div className="my-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div className="bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                        {language}
                                    </div>
                                    <SyntaxHighlighter
                                        language={language}
                                        style={codeStyle}
                                        customStyle={{
                                            margin: 0,
                                            borderRadius: 0,
                                            fontSize: '14px',
                                            lineHeight: '1.5',
                                            padding: '16px',
                                        }}
                                        codeTagProps={{
                                            className: 'font-mono',
                                        }}
                                        showLineNumbers={false}
                                        wrapLines={true}
                                        wrapLongLines={true}
                                    >
                                        {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                </div>
                            );
                        } catch (error) {
                            // 언어가 지원되지 않거나 에러가 발생한 경우 fallback
                            console.warn(
                                `Syntax highlighting failed for language: ${language}`,
                                error
                            );
                            return (
                                <div className="my-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div className="bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                        {language} (highlighting unavailable)
                                    </div>
                                    <pre className="overflow-x-auto bg-gray-50 p-4 dark:bg-gray-900">
                                        <code
                                            className="font-mono text-sm"
                                            style={{
                                                fontFamily:
                                                    'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                                            }}
                                        >
                                            {String(children).replace(
                                                /\n$/,
                                                ''
                                            )}
                                        </code>
                                    </pre>
                                </div>
                            );
                        }
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
                    // 텍스트 공백 보존
                    span: ({ children, ...props }) => (
                        <span style={{ whiteSpace: 'pre-wrap' }} {...props}>
                            {children}
                        </span>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};
