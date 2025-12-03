# Phase 5 학습정리: 글 작성 및 편집 시스템 (관리자 전용)

## 개요

Phase 5에서는 **관리자 전용 글 작성 및 편집 시스템**을 구축했습니다. 실시간 미리보기가 있는 **마크다운 에디터**와 **해시태그 관리 시스템**을 통해 효율적인 콘텐츠 작성 환경을 완성했으며, **Zod 스키마 기반 데이터 검증**과 **트랜잭션 안전성**을 확보한 견고한 백엔드 시스템을 구현했습니다.

특히 **반응형 에디터 인터페이스**와 **실시간 해시태그 자동완성** 기능을 통해 사용자 경험을 극대화했으며, Phase 1-4에서 구축한 기반 위에 **완전한 콘텐츠 관리 시스템**을 완성했습니다.

---

## 핵심 학습 내용

### 1. 마크다운 에디터 시스템 구축

#### 실시간 미리보기 에디터 구현

```typescript
// src/components/editor/MarkdownEditor.tsx - 핵심 에디터 컴포넌트
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Eye, Edit, Save, ArrowLeft } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useDebounce } from 'use-debounce';
import { createClient } from '@/utils/supabase/client';
import type { CreatePostData, UpdatePostData, Post, Hashtag } from '@/types';

interface MarkdownEditorProps {
    initialTitle?: string;
    initialContent?: string;
    initialHashtags?: string[];
    action: (formData: FormData) => Promise<void>;
    mode?: 'create' | 'edit';
    postId?: number;
}

export function MarkdownEditor({
    initialTitle = '',
    initialContent = '',
    initialHashtags = [],
    action,
    mode = 'create',
    postId,
}: MarkdownEditorProps) {
    // 폼 상태 관리
    const [title, setTitle] = useState(initialTitle);
    const [content, setContent] = useState(initialContent);
    const [hashtags, setHashtags] = useState<string[]>(initialHashtags);
    const [hashtagInput, setHashtagInput] = useState('');

    // UI 상태 관리
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // 해시태그 자동완성
    const [hashtagSuggestions, setHashtagSuggestions] = useState<Hashtag[]>([]);
    const [debouncedHashtagInput] = useDebounce(hashtagInput, 300);

    const router = useRouter();
    const supabase = createClient();

    // 해시태그 검색 (디바운싱 적용)
    useEffect(() => {
        const searchHashtags = async () => {
            if (debouncedHashtagInput.length < 2) {
                setHashtagSuggestions([]);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('hashtags')
                    .select('id, name')
                    .ilike('name', `%${debouncedHashtagInput}%`)
                    .limit(10);

                if (error) throw error;
                setHashtagSuggestions(data || []);
            } catch (error) {
                console.error('해시태그 검색 오류:', error);
                setHashtagSuggestions([]);
            }
        };

        searchHashtags();
    }, [debouncedHashtagInput, supabase]);

    // 해시태그 추가
    const addHashtag = useCallback((tag: string) => {
        const normalizedTag = tag.trim().toLowerCase();

        // 유효성 검사
        if (!normalizedTag) return;
        if (normalizedTag.length < 2 || normalizedTag.length > 20) {
            setErrors(prev => ({ ...prev, hashtags: '해시태그는 2-20글자여야 합니다.' }));
            return;
        }
        if (normalizedTag.includes('#') || normalizedTag.includes(' ')) {
            setErrors(prev => ({ ...prev, hashtags: '해시태그에는 #이나 공백을 포함할 수 없습니다.' }));
            return;
        }
        if (hashtags.length >= 10) {
            setErrors(prev => ({ ...prev, hashtags: '해시태그는 최대 10개까지 추가할 수 있습니다.' }));
            return;
        }
        if (hashtags.some(h => h.toLowerCase() === normalizedTag)) {
            setErrors(prev => ({ ...prev, hashtags: '이미 추가된 해시태그입니다.' }));
            return;
        }

        setHashtags(prev => [...prev, normalizedTag]);
        setHashtagInput('');
        setHashtagSuggestions([]);
        setErrors(prev => ({ ...prev, hashtags: '' }));
    }, [hashtags]);

    // 해시태그 제거
    const removeHashtag = useCallback((tagToRemove: string) => {
        setHashtags(prev => prev.filter(tag => tag !== tagToRemove));
    }, []);

    // 폼 검증
    const validateForm = useCallback(() => {
        const newErrors: Record<string, string> = {};

        if (!title.trim()) {
            newErrors.title = '제목을 입력해주세요.';
        } else if (title.trim().length > 100) {
            newErrors.title = '제목은 100글자 이하여야 합니다.';
        }

        if (!content.trim()) {
            newErrors.content = '내용을 입력해주세요.';
        } else if (content.trim().length > 50000) {
            newErrors.content = '내용은 50,000글자 이하여야 합니다.';
        }

        if (hashtags.length === 0) {
            newErrors.hashtags = '최소 하나의 해시태그가 필요합니다.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [title, content, hashtags]);

    // 폼 제출
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setIsSubmitting(true);

            const formData = new FormData();
            formData.append('title', title.trim());
            formData.append('content', content.trim());
            formData.append('hashtags', hashtags.join(','));

            if (mode === 'edit' && postId) {
                formData.append('postId', postId.toString());
            }

            await action(formData);

        } catch (error) {
            console.error('글 저장 오류:', error);
            setErrors({ submit: '글 저장 중 오류가 발생했습니다.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto max-w-7xl py-6 px-4">
            {/* 헤더 */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        뒤로가기
                    </Button>
                    <h1 className="text-2xl font-bold">
                        {mode === 'create' ? '새 글 작성' : '글 편집'}
                    </h1>
                </div>

                {/* 모바일 미리보기 토글 */}
                <div className="lg:hidden">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                    >
                        {isPreviewMode ? (
                            <>
                                <Edit className="h-4 w-4 mr-2" />
                                편집
                            </>
                        ) : (
                            <>
                                <Eye className="h-4 w-4 mr-2" />
                                미리보기
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 편집기 패널 */}
                    <div className={`space-y-6 ${isPreviewMode ? 'hidden lg:block' : ''}`}>
                        <Card>
                            <CardHeader>
                                <CardTitle>글 정보</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* 제목 입력 */}
                                <div className="space-y-2">
                                    <Label htmlFor="title">제목 *</Label>
                                    <Input
                                        id="title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="글 제목을 입력하세요"
                                        className={errors.title ? 'border-red-500' : ''}
                                    />
                                    {errors.title && (
                                        <p className="text-sm text-red-600">{errors.title}</p>
                                    )}
                                </div>

                                {/* 해시태그 입력 */}
                                <div className="space-y-2">
                                    <Label htmlFor="hashtags">해시태그 *</Label>
                                    <div className="space-y-2">
                                        <Input
                                            id="hashtags"
                                            value={hashtagInput}
                                            onChange={(e) => setHashtagInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addHashtag(hashtagInput);
                                                }
                                            }}
                                            placeholder="해시태그를 입력하고 Enter를 누르세요"
                                            className={errors.hashtags ? 'border-red-500' : ''}
                                        />

                                        {/* 해시태그 자동완성 */}
                                        {hashtagSuggestions.length > 0 && (
                                            <div className="border rounded-md bg-background shadow-md">
                                                {hashtagSuggestions.map((suggestion) => (
                                                    <button
                                                        key={suggestion.id}
                                                        type="button"
                                                        className="w-full px-3 py-2 text-left hover:bg-muted"
                                                        onClick={() => addHashtag(suggestion.name)}
                                                    >
                                                        {suggestion.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* 선택된 해시태그 */}
                                        {hashtags.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {hashtags.map((tag) => (
                                                    <Badge
                                                        key={tag}
                                                        variant="secondary"
                                                        className="flex items-center gap-1"
                                                    >
                                                        #{tag}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeHashtag(tag)}
                                                            className="ml-1 hover:text-red-600"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {errors.hashtags && (
                                        <p className="text-sm text-red-600">{errors.hashtags}</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* 내용 편집기 */}
                        <Card>
                            <CardHeader>
                                <CardTitle>내용 *</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="마크다운 형식으로 글을 작성하세요..."
                                    className={`min-h-[400px] font-mono ${errors.content ? 'border-red-500' : ''}`}
                                />
                                {errors.content && (
                                    <p className="text-sm text-red-600 mt-2">{errors.content}</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* 제출 버튼 */}
                        <div className="flex justify-end space-x-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                            >
                                취소
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>저장 중...</>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        {mode === 'create' ? '글 작성' : '글 수정'}
                                    </>
                                )}
                            </Button>
                        </div>

                        {errors.submit && (
                            <p className="text-sm text-red-600 text-center">{errors.submit}</p>
                        )}
                    </div>

                    {/* 미리보기 패널 */}
                    <div className={`${!isPreviewMode ? 'hidden lg:block' : ''}`}>
                        <Card className="sticky top-6">
                            <CardHeader>
                                <CardTitle>미리보기</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* 제목 미리보기 */}
                                    <div>
                                        <h1 className="text-2xl font-bold">
                                            {title || '제목을 입력하세요'}
                                        </h1>
                                        {hashtags.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {hashtags.map((tag) => (
                                                    <Badge key={tag} variant="outline">
                                                        #{tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* 내용 미리보기 */}
                                    <div className="border-t pt-4">
                                        <MarkdownRenderer content={content || '*내용을 입력하세요*'} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    );
}
```

**학습한 핵심 개념:**

- **실시간 미리보기**: 입력과 동시에 마크다운 렌더링 결과 표시
- **디바운싱**: `use-debounce`로 해시태그 검색 API 호출 최적화
- **반응형 UI**: 데스크탑은 분할 화면, 모바일은 토글 방식
- **폼 검증**: 실시간 유효성 검사와 사용자 피드백
- **상태 관리**: 복잡한 폼 상태의 효율적인 관리

#### 마크다운 렌더러 구현

```typescript
// src/components/editor/MarkdownRenderer.tsx - 마크다운 렌더링
'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
    return (
        <div className={cn('prose prose-slate max-w-none dark:prose-invert', className)}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight, rehypeRaw]}
                components={{
                    // 코드 블록 커스터마이징
                    code: ({ node, inline, className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';

                        if (inline) {
                            return (
                                <code
                                    className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
                                    {...props}
                                >
                                    {children}
                                </code>
                            );
                        }

                        return (
                            <div className="relative">
                                {language && (
                                    <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                        {language}
                                    </div>
                                )}
                                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                                    <code className={className} {...props}>
                                        {children}
                                    </code>
                                </pre>
                            </div>
                        );
                    },

                    // 링크 보안 강화
                    a: ({ href, children, ...props }) => (
                        <a
                            href={href}
                            target={href?.startsWith('http') ? '_blank' : undefined}
                            rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                            className="text-primary hover:underline"
                            {...props}
                        >
                            {children}
                        </a>
                    ),

                    // 이미지 최적화
                    img: ({ src, alt, ...props }) => (
                        <img
                            src={src}
                            alt={alt}
                            className="rounded-lg shadow-md max-w-full h-auto"
                            loading="lazy"
                            {...props}
                        />
                    ),

                    // 테이블 스타일링
                    table: ({ children, ...props }) => (
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse border border-border" {...props}>
                                {children}
                            </table>
                        </div>
                    ),

                    th: ({ children, ...props }) => (
                        <th className="border border-border bg-muted p-2 text-left font-semibold" {...props}>
                            {children}
                        </th>
                    ),

                    td: ({ children, ...props }) => (
                        <td className="border border-border p-2" {...props}>
                            {children}
                        </td>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
```

**학습 포인트:**

- **플러그인 시스템**: `remarkGfm`, `rehypeHighlight` 등으로 기능 확장
- **컴포넌트 커스터마이징**: 기본 HTML 요소를 React 컴포넌트로 대체
- **보안 고려사항**: 외부 링크에 `noopener noreferrer` 속성 추가
- **접근성**: `loading="lazy"`로 이미지 지연 로딩, `alt` 속성 필수

### 2. 해시태그 관리 시스템

#### 실시간 해시태그 자동완성

```typescript
// src/lib/hashtags.ts - 해시태그 관리 로직
import { createClient } from '@/utils/supabase/client';
import { createServiceClient } from '@/utils/supabase/service';
import type { Hashtag } from '@/types';

export class HashtagManager {
    private supabase = createClient();
    private serviceSupabase = createServiceClient();

    // 해시태그 검색 (사용자용)
    async searchHashtags(query: string, limit = 10): Promise<Hashtag[]> {
        if (query.length < 2) return [];

        try {
            const { data, error } = await this.supabase
                .from('hashtags')
                .select('id, name, created_at')
                .ilike('name', `%${query}%`)
                .order('name')
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('해시태그 검색 오류:', error);
            return [];
        }
    }

    // 해시태그 일괄 생성 (관리자용)
    async createHashtags(names: string[]): Promise<Hashtag[]> {
        if (names.length === 0) return [];

        try {
            // 중복 제거 및 정규화
            const normalizedNames = [
                ...new Set(
                    names
                        .map((name) => name.trim().toLowerCase())
                        .filter(Boolean)
                ),
            ];

            // 기존 해시태그 확인
            const { data: existingHashtags } = await this.serviceSupabase
                .from('hashtags')
                .select('id, name')
                .in('name', normalizedNames);

            const existingNames = new Set(
                existingHashtags?.map((h) => h.name.toLowerCase()) || []
            );

            // 새로운 해시태그만 필터링
            const newNames = normalizedNames.filter(
                (name) => !existingNames.has(name)
            );

            if (newNames.length === 0) {
                return existingHashtags || [];
            }

            // 새 해시태그 생성
            const { data: newHashtags, error } = await this.serviceSupabase
                .from('hashtags')
                .insert(newNames.map((name) => ({ name })))
                .select('id, name, created_at');

            if (error) throw error;

            // 기존 + 새로운 해시태그 반환
            return [...(existingHashtags || []), ...(newHashtags || [])];
        } catch (error) {
            console.error('해시태그 생성 오류:', error);
            throw error;
        }
    }

    // 글과 해시태그 연결
    async linkPostHashtags(
        postId: number,
        hashtagIds: number[]
    ): Promise<void> {
        if (hashtagIds.length === 0) return;

        try {
            // 기존 연결 삭제
            await this.serviceSupabase
                .from('post_hashtags')
                .delete()
                .eq('post_id', postId);

            // 새 연결 생성
            const { error } = await this.serviceSupabase
                .from('post_hashtags')
                .insert(
                    hashtagIds.map((hashtag_id) => ({
                        post_id: postId,
                        hashtag_id,
                    }))
                );

            if (error) throw error;
        } catch (error) {
            console.error('해시태그 연결 오류:', error);
            throw error;
        }
    }

    // 사용되지 않는 해시태그 정리
    async cleanupUnusedHashtags(): Promise<number> {
        try {
            const { data: unusedHashtags } = await this.serviceSupabase
                .from('hashtags')
                .select('id')
                .filter('post_hashtags.post_id', 'is', null);

            if (!unusedHashtags || unusedHashtags.length === 0) {
                return 0;
            }

            const { error } = await this.serviceSupabase
                .from('hashtags')
                .delete()
                .in(
                    'id',
                    unusedHashtags.map((h) => h.id)
                );

            if (error) throw error;

            return unusedHashtags.length;
        } catch (error) {
            console.error('해시태그 정리 오류:', error);
            return 0;
        }
    }
}

// 싱글톤 인스턴스
export const hashtagManager = new HashtagManager();
```

**학습한 핵심 개념:**

- **Service Client**: RLS를 우회하는 관리자 권한 클라이언트
- **중복 방지**: Set을 활용한 해시태그 중복 제거
- **트랜잭션 안전성**: 기존 연결 삭제 후 새 연결 생성
- **정규화**: 대소문자 통일과 공백 제거로 일관성 확보
- **성능 최적화**: 배치 처리로 데이터베이스 호출 최소화

#### 해시태그 유효성 검증

```typescript
// src/lib/schemas.ts - Zod 스키마 기반 검증
import { z } from 'zod';

// 해시태그 개별 검증
export const HashtagSchema = z
    .string()
    .min(2, '해시태그는 최소 2글자여야 합니다.')
    .max(20, '해시태그는 최대 20글자여야 합니다.')
    .regex(
        /^[a-zA-Z0-9가-힣]+$/,
        '해시태그는 한글, 영문, 숫자만 사용할 수 있습니다.'
    )
    .transform((val) => val.trim().toLowerCase());

// 해시태그 배열 검증
export const HashtagArraySchema = z
    .array(HashtagSchema)
    .min(1, '최소 하나의 해시태그가 필요합니다.')
    .max(10, '해시태그는 최대 10개까지 추가할 수 있습니다.')
    .refine(
        (hashtags) => new Set(hashtags).size === hashtags.length,
        '중복된 해시태그가 있습니다.'
    );

// 글 생성 스키마
export const CreatePostSchema = z.object({
    title: z
        .string()
        .min(1, '제목을 입력해주세요.')
        .max(100, '제목은 100글자 이하여야 합니다.')
        .transform((val) => val.trim()),

    content: z
        .string()
        .min(1, '내용을 입력해주세요.')
        .max(50000, '내용은 50,000글자 이하여야 합니다.')
        .transform((val) => val.trim()),

    hashtags: HashtagArraySchema,
});

// 글 수정 스키마 (모든 필드 선택적)
export const UpdatePostSchema = CreatePostSchema.partial().extend({
    postId: z.number().int().positive('유효하지 않은 글 ID입니다.'),
});

// 해시태그 검색 스키마
export const SearchHashtagSchema = z.object({
    query: z
        .string()
        .min(2, '검색어는 최소 2글자여야 합니다.')
        .max(50, '검색어는 최대 50글자여야 합니다.')
        .transform((val) => val.trim()),

    limit: z.number().int().min(1).max(50).default(10),
});
```

**학습 포인트:**

- **체이닝 검증**: 여러 검증 규칙을 체인으로 연결
- **변환 함수**: `transform`으로 데이터 정규화
- **커스텀 검증**: `refine`으로 복잡한 비즈니스 로직 검증
- **재사용성**: 작은 스키마를 조합하여 큰 스키마 구성
- **타입 안전성**: Zod 스키마에서 TypeScript 타입 자동 추론

### 3. Server Actions 기반 백엔드 로직

#### 글 작성 Server Action

```typescript
// src/lib/actions.ts - 글 관련 Server Actions
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/utils/supabase/service';
import { createServerClient } from '@/utils/supabase/server';
import { CreatePostSchema, UpdatePostSchema } from '@/lib/schemas';
import { hashtagManager } from '@/lib/hashtags';
import type { CreatePostData, UpdatePostData } from '@/types';

// 글 생성 Action
export async function createPostAction(formData: FormData) {
    try {
        // 폼 데이터 추출
        const rawData = {
            title: formData.get('title') as string,
            content: formData.get('content') as string,
            hashtags:
                (formData.get('hashtags') as string)
                    ?.split(',')
                    .map((tag) => tag.trim())
                    .filter((tag) => tag.length > 0) || [],
        };

        // 데이터 검증
        const validationResult = CreatePostSchema.safeParse(rawData);
        if (!validationResult.success) {
            const errorMessage = validationResult.error.issues
                .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                .join(', ');
            throw new Error(`데이터 검증 실패: ${errorMessage}`);
        }

        const validatedData = validationResult.data;

        // 인증 확인
        const supabase = createServerClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new Error('인증이 필요합니다.');
        }

        // 관리자 권한 확인
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!profile?.is_admin) {
            throw new Error('관리자 권한이 필요합니다.');
        }

        // 트랜잭션 시작
        const serviceSupabase = createServiceClient();

        // 1. 해시태그 생성/조회
        const hashtags = await hashtagManager.createHashtags(
            validatedData.hashtags
        );

        // 2. 글 생성
        const { data: post, error: postError } = await serviceSupabase
            .from('posts')
            .insert({
                title: validatedData.title,
                content_markdown: validatedData.content,
                author_id: user.id,
            })
            .select('id, title')
            .single();

        if (postError) {
            throw new Error(`글 생성 실패: ${postError.message}`);
        }

        // 3. 해시태그 연결
        await hashtagManager.linkPostHashtags(
            post.id,
            hashtags.map((h) => h.id)
        );

        // 캐시 무효화
        revalidatePath('/admin/posts');
        revalidatePath('/posts');
        revalidatePath('/'); // 홈페이지 캐시 무효화

        // 성공 시 글 상세 페이지로 리디렉션
        redirect(`/posts/${post.id}`);
    } catch (error) {
        console.error('글 생성 오류:', error);
        throw error;
    }
}

// 글 수정 Action
export async function updatePostAction(formData: FormData) {
    try {
        const rawData = {
            postId: parseInt(formData.get('postId') as string),
            title: formData.get('title') as string,
            content: formData.get('content') as string,
            hashtags:
                (formData.get('hashtags') as string)
                    ?.split(',')
                    .map((tag) => tag.trim())
                    .filter((tag) => tag.length > 0) || [],
        };

        // 데이터 검증
        const validationResult = UpdatePostSchema.safeParse(rawData);
        if (!validationResult.success) {
            const errorMessage = validationResult.error.issues
                .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                .join(', ');
            throw new Error(`데이터 검증 실패: ${errorMessage}`);
        }

        const { postId, ...validatedData } = validationResult.data;

        // 인증 및 권한 확인
        const supabase = createServerClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new Error('인증이 필요합니다.');
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!profile?.is_admin) {
            throw new Error('관리자 권한이 필요합니다.');
        }

        // 글 존재 확인
        const { data: existingPost } = await supabase
            .from('posts')
            .select('id, title')
            .eq('id', postId)
            .single();

        if (!existingPost) {
            throw new Error('존재하지 않는 글입니다.');
        }

        const serviceSupabase = createServiceClient();

        // 1. 해시태그 처리
        if (validatedData.hashtags) {
            const hashtags = await hashtagManager.createHashtags(
                validatedData.hashtags
            );
            await hashtagManager.linkPostHashtags(
                postId,
                hashtags.map((h) => h.id)
            );
        }

        // 2. 글 업데이트
        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        if (validatedData.title) updateData.title = validatedData.title;
        if (validatedData.content)
            updateData.content_markdown = validatedData.content;

        const { error: updateError } = await serviceSupabase
            .from('posts')
            .update(updateData)
            .eq('id', postId);

        if (updateError) {
            throw new Error(`글 수정 실패: ${updateError.message}`);
        }

        // 캐시 무효화
        revalidatePath(`/admin/posts/${postId}/edit`);
        revalidatePath(`/posts/${postId}`);
        revalidatePath('/admin/posts');
        revalidatePath('/posts');
        revalidatePath('/'); // 홈페이지 캐시 무효화

        // 성공 시 글 상세 페이지로 리디렉션
        redirect(`/posts/${postId}`);
    } catch (error) {
        console.error('글 수정 오류:', error);
        throw error;
    }
}

// 글 삭제 Action
export async function deletePostAction(formData: FormData) {
    try {
        const postId = parseInt(formData.get('postId') as string);

        if (!postId || isNaN(postId)) {
            throw new Error('유효하지 않은 글 ID입니다.');
        }

        // 인증 및 권한 확인
        const supabase = createServerClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new Error('인증이 필요합니다.');
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!profile?.is_admin) {
            throw new Error('관리자 권한이 필요합니다.');
        }

        // 글 존재 확인
        const { data: existingPost } = await supabase
            .from('posts')
            .select('id, title')
            .eq('id', postId)
            .single();

        if (!existingPost) {
            throw new Error('존재하지 않는 글입니다.');
        }

        // 글 삭제 (CASCADE로 관련 데이터 자동 삭제)
        const serviceSupabase = createServiceClient();
        const { error: deleteError } = await serviceSupabase
            .from('posts')
            .delete()
            .eq('id', postId);

        if (deleteError) {
            throw new Error(`글 삭제 실패: ${deleteError.message}`);
        }

        // 사용되지 않는 해시태그 정리
        await hashtagManager.cleanupUnusedHashtags();

        // 캐시 무효화
        revalidatePath('/admin/posts');
        revalidatePath('/posts');
        revalidatePath('/'); // 홈페이지 캐시 무효화

        // 성공 시 관리자 페이지로 리디렉션
        redirect('/admin/posts');
    } catch (error) {
        console.error('글 삭제 오류:', error);
        throw error;
    }
}
```

**학습한 핵심 개념:**

- **Server Actions**: 서버에서 실행되는 안전한 데이터 변경 함수
- **트랜잭션 안전성**: 여러 데이터베이스 작업의 원자성 보장
- **권한 검증**: 각 단계에서 인증과 권한 확인
- **캐시 무효화**: 관련된 모든 페이지의 캐시 갱신
- **에러 처리**: 상세한 에러 메시지와 적절한 예외 처리

### 4. 관리자 페이지 UI 구현

#### 글 관리 대시보드

```typescript
// src/app/admin/posts/page.tsx - 관리자 글 관리 페이지
import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, Calendar, User } from 'lucide-react';
import { getPostsAction } from '@/lib/actions';
import { DeletePostButton } from '@/components/admin/DeletePostButton';
import { formatDate } from '@/lib/utils';

export default async function AdminPostsPage() {
    return (
        <div className="container mx-auto max-w-6xl py-6 px-4">
            {/* 헤더 */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">글 관리</h1>
                    <p className="text-muted-foreground">
                        블로그 글을 작성, 수정, 삭제할 수 있습니다.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/admin/posts/new">
                        <Plus className="h-4 w-4 mr-2" />
                        새 글 작성
                    </Link>
                </Button>
            </div>

            {/* 글 목록 */}
            <Suspense fallback={<PostsListSkeleton />}>
                <PostsList />
            </Suspense>
        </div>
    );
}

// 글 목록 컴포넌트
async function PostsList() {
    try {
        const posts = await getPostsAction({ page: 1, limit: 50 });

        if (!posts || posts.length === 0) {
            return (
                <Card>
                    <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground">아직 작성된 글이 없습니다.</p>
                        <Button asChild className="mt-4">
                            <Link href="/admin/posts/new">
                                <Plus className="h-4 w-4 mr-2" />
                                첫 번째 글 작성하기
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            );
        }

        return (
            <div className="space-y-4">
                {posts.map((post) => (
                    <Card key={post.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="space-y-2">
                                    <CardTitle className="text-xl">
                                        <Link
                                            href={`/posts/${post.id}`}
                                            className="hover:text-primary transition-colors"
                                        >
                                            {post.title}
                                        </Link>
                                    </CardTitle>

                                    {/* 메타 정보 */}
                                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                        <div className="flex items-center space-x-1">
                                            <Calendar className="h-4 w-4" />
                                            <span>{formatDate(post.created_at)}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <User className="h-4 w-4" />
                                            <span>{post.profiles?.full_name || '작성자'}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <Eye className="h-4 w-4" />
                                            <span>조회 {post.view_count}</span>
                                        </div>
                                    </div>

                                    {/* 해시태그 */}
                                    {post.hashtags && post.hashtags.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {post.hashtags.map((hashtag) => (
                                                <Badge key={hashtag.id} variant="outline">
                                                    #{hashtag.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* 액션 버튼 */}
                                <div className="flex items-center space-x-2">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/posts/${post.id}`}>
                                            <Eye className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/admin/posts/${post.id}/edit`}>
                                            <Edit className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                    <DeletePostButton postId={post.id} postTitle={post.title} />
                                </div>
                            </div>
                        </CardHeader>

                        {/* 글 미리보기 */}
                        <CardContent>
                            <CardDescription className="line-clamp-3">
                                {post.content_markdown.substring(0, 200)}
                                {post.content_markdown.length > 200 && '...'}
                            </CardDescription>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );

    } catch (error) {
        console.error('글 목록 조회 오류:', error);
        return (
            <Card>
                <CardContent className="py-8 text-center">
                    <p className="text-red-600">글 목록을 불러오는 중 오류가 발생했습니다.</p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => window.location.reload()}
                    >
                        다시 시도
                    </Button>
                </CardContent>
            </Card>
        );
    }
}

// 로딩 스켈레톤
function PostsListSkeleton() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <div className="space-y-2">
                            <div className="h-6 bg-muted animate-pulse rounded w-3/4" />
                            <div className="flex space-x-4">
                                <div className="h-4 bg-muted animate-pulse rounded w-24" />
                                <div className="h-4 bg-muted animate-pulse rounded w-20" />
                                <div className="h-4 bg-muted animate-pulse rounded w-16" />
                            </div>
                            <div className="flex space-x-2">
                                <div className="h-6 bg-muted animate-pulse rounded w-16" />
                                <div className="h-6 bg-muted animate-pulse rounded w-20" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="h-4 bg-muted animate-pulse rounded w-full" />
                            <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
                            <div className="h-4 bg-muted animate-pulse rounded w-4/6" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
```

**학습한 핵심 개념:**

- **서버 컴포넌트**: 데이터 페칭을 서버에서 처리하여 SEO 최적화
- **Suspense 경계**: 로딩 상태를 우아하게 처리
- **스켈레톤 UI**: 로딩 중에도 레이아웃 구조 유지
- **에러 경계**: 에러 발생 시 적절한 폴백 UI 제공
- **접근성**: 의미론적 HTML과 ARIA 속성 활용

---

## 고민했던 부분과 해결책

### 1. 실시간 미리보기 성능 최적화

**문제**: 사용자가 타이핑할 때마다 마크다운 렌더링으로 인한 성능 저하

**시도한 방식들**:

1. **즉시 렌더링 (성능 문제)**:

```typescript
// ❌ 모든 키 입력마다 렌더링
const [content, setContent] = useState('');

return (
    <div>
        <textarea onChange={(e) => setContent(e.target.value)} />
        <MarkdownRenderer content={content} />
    </div>
);
```

2. **디바운싱 적용 (선택된 방식)**:

```typescript
// ✅ 300ms 지연 후 렌더링
import { useDebounce } from 'use-debounce';

const [content, setContent] = useState('');
const [debouncedContent] = useDebounce(content, 300);

return (
    <div>
        <textarea onChange={(e) => setContent(e.target.value)} />
        <MarkdownRenderer content={debouncedContent} />
    </div>
);
```

3. **가상화 (복잡함)**:

```typescript
// 🤔 과도한 최적화
import { FixedSizeList as List } from 'react-window';
// 마크다운 렌더링에는 부적합
```

**학습한 내용**:

- **디바운싱**: 사용자 입력 최적화의 핵심 패턴
- **성능 측정**: React DevTools Profiler로 렌더링 성능 분석
- **적절한 최적화**: 과도한 최적화보다는 실용적인 접근

### 2. 해시태그 중복 처리 전략

**문제**: 대소문자나 공백 차이로 인한 해시태그 중복 생성

**발생 시나리오**:

```typescript
// 사용자가 입력한 해시태그들
const userInputs = ['React', 'react', ' React ', 'REACT'];
// 모두 같은 해시태그로 처리해야 함
```

**해결책**:

```typescript
// 정규화 함수
const normalizeHashtag = (tag: string): string => {
    return tag.trim().toLowerCase();
};

// 중복 제거 로직
const createUniqueHashtags = (tags: string[]): string[] => {
    const normalized = tags.map(normalizeHashtag).filter(Boolean);
    return [...new Set(normalized)];
};

// 데이터베이스 저장 시 정규화된 이름 사용
const { data: existingHashtags } = await supabase
    .from('hashtags')
    .select('id, name')
    .in('name', normalizedNames);
```

**추가 고려사항**:

```typescript
// 한글 해시태그 처리
const normalizeKoreanHashtag = (tag: string): string => {
    return tag.trim().toLowerCase().normalize('NFC'); // 한글 정규화
};

// 특수문자 제거
const sanitizeHashtag = (tag: string): string => {
    return tag.replace(/[#\s]/g, ''); // # 기호와 공백 제거
};
```

**학습한 내용**:

- **데이터 정규화**: 일관된 데이터 저장을 위한 전처리
- **Set 활용**: 중복 제거의 효율적인 방법
- **유니코드 정규화**: 다국어 텍스트 처리 시 고려사항

### 3. 트랜잭션 안전성 확보

**문제**: 글 생성 중 해시태그 연결 실패 시 데이터 불일치

**위험 시나리오**:

```typescript
// ❌ 트랜잭션 없이 순차 실행
const post = await createPost(postData);
const hashtags = await createHashtags(hashtagNames);
await linkPostHashtags(post.id, hashtags); // 여기서 실패 시 고아 글 생성
```

**해결책**:

```typescript
// ✅ 트랜잭션 패턴 적용
export async function createPostAction(formData: FormData) {
    const serviceSupabase = createServiceClient();

    try {
        // 1. 해시태그 먼저 생성/조회
        const hashtags = await hashtagManager.createHashtags(
            validatedData.hashtags
        );

        // 2. 글 생성
        const { data: post, error: postError } = await serviceSupabase
            .from('posts')
            .insert(postData)
            .select('id')
            .single();

        if (postError) {
            throw new Error(`글 생성 실패: ${postError.message}`);
        }

        // 3. 해시태그 연결 (실패 시 글도 롤백되도록)
        await hashtagManager.linkPostHashtags(
            post.id,
            hashtags.map((h) => h.id)
        );

        // 모든 작업 성공 시에만 캐시 무효화
        revalidatePath('/admin/posts');
        redirect(`/posts/${post.id}`);
    } catch (error) {
        // 에러 발생 시 모든 변경사항 롤백
        console.error('글 생성 트랜잭션 실패:', error);
        throw error;
    }
}
```

**PostgreSQL 트랜잭션 활용 (향후 개선)**:

```sql
-- 데이터베이스 레벨 트랜잭션
BEGIN;

INSERT INTO posts (title, content_markdown, author_id)
VALUES ($1, $2, $3)
RETURNING id;

INSERT INTO post_hashtags (post_id, hashtag_id)
VALUES ($4, $5), ($4, $6);

COMMIT;
```

**학습한 내용**:

- **트랜잭션 패턴**: 여러 데이터베이스 작업의 원자성 보장
- **에러 처리**: 부분 실패 시 전체 롤백 전략
- **데이터 일관성**: 관련 데이터 간의 무결성 유지

### 4. 반응형 에디터 UI 설계

**문제**: 데스크탑과 모바일에서 다른 에디터 경험 제공

**고려사항**:

- 데스크탑: 분할 화면으로 편집과 미리보기 동시 표시
- 모바일: 화면 공간 부족으로 토글 방식 필요
- 태블릿: 중간 크기에서의 적절한 경험

**해결책**:

```typescript
// 반응형 레이아웃 구현
const [isPreviewMode, setIsPreviewMode] = useState(false);

return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 편집기 패널 */}
        <div className={`space-y-6 ${isPreviewMode ? 'hidden lg:block' : ''}`}>
            <MarkdownEditor />
        </div>

        {/* 미리보기 패널 */}
        <div className={`${!isPreviewMode ? 'hidden lg:block' : ''}`}>
            <MarkdownRenderer />
        </div>
    </div>
);

// 모바일 토글 버튼
<div className="lg:hidden">
    <Button onClick={() => setIsPreviewMode(!isPreviewMode)}>
        {isPreviewMode ? '편집' : '미리보기'}
    </Button>
</div>
```

**CSS Grid 활용**:

```css
/* 반응형 그리드 레이아웃 */
.editor-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
}

@media (min-width: 1024px) {
    .editor-container {
        grid-template-columns: 1fr 1fr;
    }
}
```

**학습한 내용**:

- **모바일 우선**: 작은 화면부터 설계하여 점진적 향상
- **CSS Grid**: 복잡한 레이아웃의 효율적인 구현
- **상태 기반 UI**: 화면 크기와 사용자 선택에 따른 동적 UI

---

## 기존 Phase에서 활용한 기술

### Phase 1-4 기반 기술의 확장

#### TypeScript 타입 시스템 고도화

- **Phase 1-4**: 기본 타입 정의와 인터페이스
- **Phase 5**: 복잡한 폼 상태와 제네릭 타입 활용
- **확장 내용**: Zod 스키마와 TypeScript 타입의 완벽한 통합

#### React Query 캐싱 전략 심화

- **Phase 2-4**: 인증 상태 관리
- **Phase 5**: 해시태그 검색과 글 목록 캐싱 최적화
- **확장 내용**: 디바운싱과 조건부 쿼리의 고급 활용

#### shadcn/ui 컴포넌트 시스템 확장

- **Phase 3**: 기본 UI 컴포넌트
- **Phase 5**: 복잡한 폼 컴포넌트와 에디터 UI 구성
- **확장 내용**: 카드, 배지, 텍스트에어리어 등 고급 컴포넌트 활용

#### 인증 및 권한 시스템 활용

- **Phase 4**: 기본 인증 시스템
- **Phase 5**: 관리자 전용 기능과 Server Actions 보안
- **확장 내용**: 세밀한 권한 검증과 보안 강화

---

## 핵심 의사결정과 그 이유

### 1. 마크다운 vs 리치 텍스트 에디터

**결정**: 마크다운 에디터 선택

**이유**:

- **개발자 친화적**: 기술 블로그에 적합한 마크다운 문법
- **버전 관리**: 텍스트 기반으로 Git 등에서 추적 용이
- **성능**: HTML 에디터보다 가벼운 렌더링
- **확장성**: 플러그인으로 기능 확장 가능
- **호환성**: GitHub, Notion 등 다양한 플랫폼과 호환

### 2. 실시간 미리보기 vs 탭 방식

**결정**: 실시간 미리보기 구현

**이유**:

- **사용자 경험**: 즉시 결과 확인으로 작성 효율성 향상
- **오류 방지**: 마크다운 문법 오류 즉시 발견
- **반응형 대응**: 데스크탑은 분할, 모바일은 토글로 최적화
- **성능 균형**: 디바운싱으로 성능과 실시간성 균형

### 3. Server Actions vs API Routes

**결정**: Server Actions 우선 사용

**이유**:

- **타입 안전성**: 클라이언트와 서버 간 완전한 타입 공유
- **보안성**: CSRF 보호와 자동 직렬화
- **개발 효율성**: API 엔드포인트 별도 구현 불필요
- **캐시 통합**: `revalidatePath`로 Next.js 캐시와 완벽 통합

### 4. 해시태그 정규화 전략

**결정**: 저장 시점 정규화 + 표시 시점 원본 유지

**이유**:

- **검색 효율성**: 정규화된 데이터로 일관된 검색 결과
- **사용자 경험**: 원본 형태 유지로 자연스러운 표시
- **중복 방지**: 대소문자/공백 차이로 인한 중복 해시태그 방지
- **확장성**: 향후 다국어 해시태그 지원 용이

---

## 성능 및 보안 고려사항

### 성능 최적화

#### 디바운싱 최적화

```typescript
// 해시태그 검색 디바운싱
const [debouncedHashtagInput] = useDebounce(hashtagInput, 300);

useEffect(() => {
    if (debouncedHashtagInput.length < 2) {
        setHashtagSuggestions([]);
        return;
    }

    searchHashtags(debouncedHashtagInput);
}, [debouncedHashtagInput]);
```

#### 마크다운 렌더링 최적화

```typescript
// React.memo로 불필요한 리렌더링 방지
const MarkdownRenderer = React.memo(({ content }: { content: string }) => {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
        >
            {content}
        </ReactMarkdown>
    );
});
```

#### 이미지 최적화

```typescript
// 마크다운 이미지 최적화
img: ({ src, alt, ...props }) => (
    <img
        src={src}
        alt={alt}
        className="rounded-lg shadow-md max-w-full h-auto"
        loading="lazy" // 지연 로딩
        {...props}
    />
),
```

### 보안 강화

#### 입력 데이터 검증

```typescript
// Zod 스키마로 서버 사이드 검증
export const CreatePostSchema = z.object({
    title: z
        .string()
        .min(1)
        .max(100)
        .transform((val) => val.trim()),
    content: z
        .string()
        .min(1)
        .max(50000)
        .transform((val) => val.trim()),
    hashtags: z
        .array(z.string().regex(/^[a-zA-Z0-9가-힣]+$/))
        .min(1)
        .max(10),
});
```

#### XSS 방지

```typescript
// 마크다운 렌더링 시 HTML 이스케이프
<ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeHighlight]}
    components={{
        // 외부 링크 보안 강화
        a: ({ href, children, ...props }) => (
            <a
                href={href}
                target={href?.startsWith('http') ? '_blank' : undefined}
                rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                {...props}
            >
                {children}
            </a>
        ),
    }}
>
    {content}
</ReactMarkdown>
```

#### 권한 검증 강화

```typescript
// 다중 권한 검증
export async function createPostAction(formData: FormData) {
    // 1. 인증 확인
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('인증이 필요합니다.');

    // 2. 관리자 권한 확인
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (!profile?.is_admin) {
        throw new Error('관리자 권한이 필요합니다.');
    }

    // 3. 데이터 검증
    const validationResult = CreatePostSchema.safeParse(rawData);
    if (!validationResult.success) {
        throw new Error('데이터 검증 실패');
    }
}
```

---

## 향후 개선 방향

### 1. 에디터 기능 확장

#### 이미지 업로드 시스템

```typescript
// Supabase Storage 연동 이미지 업로드
const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `posts/${fileName}`;

    const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file);

    if (error) throw error;

    const {
        data: { publicUrl },
    } = supabase.storage.from('images').getPublicUrl(filePath);

    return publicUrl;
};

// 드래그 앤 드롭 이미지 업로드
const handleImageDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    for (const file of imageFiles) {
        const url = await uploadImage(file);
        const markdown = `![${file.name}](${url})`;
        insertTextAtCursor(markdown);
    }
};
```

#### 코드 에디터 개선

```typescript
// Monaco Editor 통합 (VS Code 에디터)
import { Editor } from '@monaco-editor/react';

const CodeEditor = ({ value, onChange }: CodeEditorProps) => {
    return (
        <Editor
            height="400px"
            defaultLanguage="markdown"
            value={value}
            onChange={onChange}
            theme="vs-dark"
            options={{
                minimap: { enabled: false },
                wordWrap: 'on',
                lineNumbers: 'on',
                folding: true,
                bracketMatching: 'always',
            }}
        />
    );
};
```

#### 실시간 협업 기능

```typescript
// WebSocket을 통한 실시간 협업
const useCollaborativeEditor = (postId: number) => {
    const [collaborators, setCollaborators] = useState<User[]>([]);
    const [cursors, setCursors] = useState<Map<string, CursorPosition>>(
        new Map()
    );

    useEffect(() => {
        const ws = new WebSocket(`ws://localhost:3001/collaborate/${postId}`);

        ws.onmessage = (event) => {
            const { type, data } = JSON.parse(event.data);

            switch (type) {
                case 'user-joined':
                    setCollaborators((prev) => [...prev, data.user]);
                    break;
                case 'cursor-moved':
                    setCursors((prev) =>
                        new Map(prev).set(data.userId, data.position)
                    );
                    break;
                case 'content-changed':
                    // 충돌 해결 로직
                    handleContentChange(data.content, data.userId);
                    break;
            }
        };

        return () => ws.close();
    }, [postId]);
};
```

### 2. 사용자 경험 향상

#### 자동 저장 기능

```typescript
// 주기적 자동 저장
const useAutoSave = (content: string, postId?: number) => {
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const interval = setInterval(async () => {
            if (content && content.length > 0) {
                setIsSaving(true);
                try {
                    await saveDraft(postId, content);
                    setLastSaved(new Date());
                } catch (error) {
                    console.error('자동 저장 실패:', error);
                } finally {
                    setIsSaving(false);
                }
            }
        }, 30000); // 30초마다 자동 저장

        return () => clearInterval(interval);
    }, [content, postId]);

    return { lastSaved, isSaving };
};
```

#### 키보드 단축키

```typescript
// 에디터 키보드 단축키
const useEditorShortcuts = (editorRef: RefObject<HTMLTextAreaElement>) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        handleSave();
                        break;
                    case 'b':
                        e.preventDefault();
                        insertMarkdown('**', '**'); // Bold
                        break;
                    case 'i':
                        e.preventDefault();
                        insertMarkdown('*', '*'); // Italic
                        break;
                    case 'k':
                        e.preventDefault();
                        insertMarkdown('[', '](url)'); // Link
                        break;
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);
};
```

### 3. 고급 기능 구현

#### 글 버전 관리

```typescript
// 글 수정 히스토리 관리
interface PostVersion {
    id: number;
    post_id: number;
    title: string;
    content: string;
    version: number;
    created_at: string;
    created_by: string;
}

const savePostVersion = async (postId: number, content: PostContent) => {
    const { data: currentVersion } = await supabase
        .from('post_versions')
        .select('version')
        .eq('post_id', postId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

    const nextVersion = (currentVersion?.version || 0) + 1;

    await supabase.from('post_versions').insert({
        post_id: postId,
        title: content.title,
        content: content.content,
        version: nextVersion,
        created_by: user.id,
    });
};
```

#### SEO 최적화 도구

```typescript
// SEO 분석 및 제안
const useSEOAnalysis = (title: string, content: string) => {
    const [seoScore, setSeoScore] = useState(0);
    const [suggestions, setSuggestions] = useState<string[]>([]);

    useEffect(() => {
        const analysis = {
            titleLength: title.length,
            contentLength: content.length,
            headingCount: (content.match(/^#+\s/gm) || []).length,
            imageCount: (content.match(/!\[.*?\]\(.*?\)/g) || []).length,
            linkCount: (content.match(/\[.*?\]\(.*?\)/g) || []).length,
        };

        const newSuggestions = [];
        let score = 0;

        if (analysis.titleLength >= 30 && analysis.titleLength <= 60) {
            score += 20;
        } else {
            newSuggestions.push('제목은 30-60자 사이가 SEO에 좋습니다.');
        }

        if (analysis.contentLength >= 300) {
            score += 20;
        } else {
            newSuggestions.push('내용은 최소 300자 이상 작성하세요.');
        }

        if (analysis.headingCount >= 2) {
            score += 15;
        } else {
            newSuggestions.push('소제목(헤딩)을 2개 이상 사용하세요.');
        }

        setSeoScore(score);
        setSuggestions(newSuggestions);
    }, [title, content]);

    return { seoScore, suggestions };
};
```

---

## 결론

Phase 5 글 작성 및 편집 시스템 구축을 통해 **전문적인 콘텐츠 관리 시스템**의 핵심 기능을 완성할 수 있었습니다.

특히 **실시간 미리보기 마크다운 에디터**와 **해시태그 자동완성 시스템**을 통해 효율적인 글 작성 환경을 제공했으며, **Zod 스키마 기반 데이터 검증**과 **Server Actions를 활용한 안전한 백엔드 처리**로 견고한 시스템을 구축했습니다.

**반응형 에디터 인터페이스**와 **트랜잭션 안전성을 고려한 데이터 처리**를 통해 사용자 경험과 데이터 무결성을 동시에 확보했으며, **성능 최적화된 해시태그 관리**로 확장 가능한 콘텐츠 분류 시스템을 완성했습니다.

이러한 경험은 향후 **대규모 콘텐츠 관리 시스템 구축**과 **복잡한 폼 인터페이스 설계**에서도 활용할 수 있는 실무 역량이 될 것입니다.

---

## 다음 단계 (Phase 6)

### Phase 6에서 구현할 기능들

#### 1. 글 목록 및 상세 페이지

- 무한 스크롤 또는 페이지네이션 글 목록
- 해시태그별 필터링 및 검색 기능
- 글 상세 페이지와 마크다운 렌더링

#### 2. 조회수 및 상호작용 시스템

- 글 조회수 자동 증가 시스템
- 좋아요 기능 기본 구조
- 댓글 시스템 준비

#### 3. 검색 및 필터링

- 전문 검색 (제목, 내용, 해시태그)
- 정렬 옵션 (최신순, 인기순, 조회수순)
- 해시태그 기반 관련 글 추천

**Phase 5에서 구축한 기반이 Phase 6에서 활용되는 방식:**

- 마크다운 렌더러 → 글 상세 페이지 콘텐츠 표시
- 해시태그 시스템 → 필터링 및 관련 글 추천
- Server Actions → 조회수 증가 및 상호작용 처리
- 데이터 검증 → 검색 쿼리 및 필터 파라미터 검증

---

## 참고 자료

### 공식 문서

- [React Markdown](https://github.com/remarkjs/react-markdown) - 마크다운 렌더링 라이브러리
- [Remark Plugins](https://github.com/remarkjs/remark/blob/main/doc/plugins.md) - 마크다운 파싱 플러그인
- [Rehype Plugins](https://github.com/rehypejs/rehype/blob/main/doc/plugins.md) - HTML 변환 플러그인
- [use-debounce](https://github.com/xnimorz/use-debounce) - React 디바운싱 훅

### 에디터 & UX

- [CodeMirror](https://codemirror.net/) - 고급 코드 에디터
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - VS Code 에디터 엔진
- [Tiptap](https://tiptap.dev/) - 현대적인 리치 텍스트 에디터
- [Editor.js](https://editorjs.io/) - 블록 기반 에디터

### 성능 & 최적화

- [React Performance](https://react.dev/learn/render-and-commit) - React 렌더링 최적화
- [Web Vitals](https://web.dev/vitals/) - 웹 성능 메트릭
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - 성능 분석 도구

### 보안 & 검증

- [Zod Documentation](https://zod.dev/) - 스키마 검증 라이브러리
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) - XSS 방지 가이드
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) - CSP 보안 헤더
