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

interface MermaidBlockProps {
    code: string;
}

/**
 * Mermaid가 파싱/렌더 실패 시 반환하는 에러 출력인지 확인.
 * - v11: 에러 시 SVG 대신 에러용 SVG를 반환하거나, "Syntax error in text" 문구가 포함된
 *   HTML/SVG를 반환할 수 있음. 또한 suppressErrorRendering 전까지는 DOM에
 *   id="dmermaid-{id}" div를 직접 삽입함.
 */
function isMermaidErrorOutput(output: string): boolean {
    return (
        output.includes('aria-roledescription="error"') ||
        output.includes('class="error-text"') ||
        output.includes('Syntax error in text') ||
        output.includes('id="dmermaid-') ||
        /Syntax error.*mermaid version/i.test(output)
    );
}

const MermaidBlock: React.FC<MermaidBlockProps> = ({ code }) => {
    const { theme } = useTheme();
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    // SVG id 규격에 맞게 영숫자만 사용, 인스턴스당 한 번만 생성
    const rawId = React.useId();
    const safeIdRef = React.useRef<string | null>(null);
    if (safeIdRef.current === null) {
        const cleaned = rawId.replace(/[^a-zA-Z0-9]/g, '');
        safeIdRef.current = cleaned
            ? `mermaid-${cleaned}`
            : `mermaid-${Math.random().toString(36).slice(2, 11)}`;
    }
    const safeId = safeIdRef.current;

    React.useEffect(() => {
        let cancelled = false;

        const renderDiagram = async () => {
            try {
                const { default: mermaid } = await import('mermaid');

                mermaid.initialize({
                    startOnLoad: false,
                    theme: theme === 'light' ? 'default' : 'dark',
                    securityLevel: 'strict',
                    logLevel: 'warn',
                    suppressErrorRendering: true,
                    flowchart: {
                        useMaxWidth: true,
                        htmlLabels: true,
                    },
                });

                if (cancelled || !containerRef.current) {
                    return;
                }

                const { svg, bindFunctions } = await mermaid.render(
                    safeId,
                    code
                );

                if (cancelled || !containerRef.current) {
                    return;
                }

                if (isMermaidErrorOutput(svg)) {
                    setError('다이어그램 문법 오류입니다. 원본 코드를 확인해 주세요.');
                    if (containerRef.current) {
                        containerRef.current.innerHTML = '';
                    }
                    return;
                }

                containerRef.current.innerHTML = svg;

                if (bindFunctions) {
                    bindFunctions(containerRef.current);
                }

                setError(null);
            } catch (err) {
                console.warn('Mermaid render failed:', err);
                if (!cancelled) {
                    setError('다이어그램을 렌더링할 수 없습니다.');
                }
            }
        };

        renderDiagram();

        return () => {
            cancelled = true;
            document.getElementById(`dmermaid-${safeId}`)?.remove();
        };
    }, [code, safeId, theme]);

    return (
        <div className="my-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                mermaid
            </div>
            <div
                ref={containerRef}
                className="bg-background overflow-x-auto p-4 text-sm [&_svg]:mx-auto [&_svg]:max-w-full"
            >
                {error && (
                    <pre className="text-xs break-all whitespace-pre-wrap text-red-500">
                        {error}
                        {'\n\n원본 코드:\n'}
                        {code}
                    </pre>
                )}
            </div>
        </div>
    );
};

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
            className={`prose prose-base md:prose-lg dark:prose-invert prose-headings:mt-8 prose-headings:mb-4 prose-p:my-3 prose-li:my-1 prose-blockquote:my-4 max-w-none ${className} `}
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

                        const language = match[1];
                        const codeString = String(children).replace(/\n$/, '');

                        // mermaid 코드 블록은 전용 컴포넌트로 렌더링
                        if (language === 'mermaid') {
                            return <MermaidBlock code={codeString} />;
                        }

                        // 코드 블록인 경우 - 외부 pre 태그 없이 직접 렌더링
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
                                        {codeString}
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
                                            {codeString}
                                        </code>
                                    </pre>
                                </div>
                            );
                        }
                    },
                    // 리스트 스타일링
                    ul: ({ children, ...props }) => (
                        <ul
                            className="my-2 list-outside list-disc pl-6"
                            {...props}
                        >
                            {children}
                        </ul>
                    ),
                    ol: ({ children, ...props }) => (
                        <ol
                            className="my-2 list-outside list-decimal pl-6"
                            {...props}
                        >
                            {children}
                        </ol>
                    ),
                    li: ({ children, ...props }) => (
                        <li className="my-0.5" {...props}>
                            {children}
                        </li>
                    ),
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
                    // 구분선 스타일링
                    hr: (props) => (
                        <hr
                            className="border-border/60 my-10 border-t"
                            {...props}
                        />
                    ),
                    // 인용구 스타일링
                    blockquote: ({ children }) => (
                        <blockquote className="border-primary text-muted-foreground my-4 border-l-4 pl-4 italic">
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
