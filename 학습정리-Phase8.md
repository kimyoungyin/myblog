# Phase 8 학습정리: 댓글 시스템 구현

## 개요

Phase 8에서는 블로그 글에 대한 댓글 시스템을 구현했습니다. 로그인한 사용자가 댓글을 작성할 수 있고, 대댓글(1단계 깊이)을 지원하며, 작성자만 자신의 댓글을 수정/삭제할 수 있는 완전한 댓글 시스템을 만들었습니다.

## 핵심 학습 내용

### 1. 데이터베이스 설계와 관계형 모델링

#### 댓글 테이블 구조

```sql
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**학습 포인트:**

- **자기 참조 관계(Self-Referencing)**: `parent_id`가 같은 테이블의 `id`를 참조하여 계층 구조 구현
- **CASCADE 삭제**: 글이 삭제되면 댓글도 함께 삭제, 부모 댓글이 삭제되면 대댓글도 함께 삭제
- **외래 키 제약**: 데이터 무결성 보장

### 2. TypeScript 타입 안전성과 Supabase 조인 처리

#### 복잡한 조인 결과 타입 정의

```typescript
interface CommentWithAuthor {
    id: number;
    content: string;
    post_id: number;
    author_id: string;
    parent_id: number | null;
    created_at: string;
    updated_at: string;
    author: User | User[] | null; // Supabase 조인 결과는 배열일 수 있음
}
```

**고민했던 부분과 해결책:**

**문제**: Supabase의 조인 결과가 `User | User[] | null` 형태로 반환되어 타입 안전성이 떨어짐

**해결책**: 유틸리티 함수로 안전한 타입 변환

```typescript
function extractAuthor(author: User | User[] | null): User {
    if (Array.isArray(author) && author.length > 0) {
        return author[0];
    }
    if (author && !Array.isArray(author)) {
        return author;
    }
    // 기본값 반환으로 null 안전성 확보
    return {
        id: '',
        email: '',
        full_name: undefined,
        avatar_url: undefined,
        is_admin: false,
        created_at: '',
        updated_at: '',
    };
}
```

**학습한 내용:**

- Supabase 조인 결과의 불확실성 처리
- 타입 가드를 통한 런타임 안전성 확보
- `any` 타입 완전 제거를 통한 타입 안전성 강화

### 3. Server Actions와 폼 데이터 처리

#### Zod 스키마 기반 검증

```typescript
export const CreateCommentSchema = z.object({
    post_id: z.number().int().positive(),
    content: z
        .string()
        .min(1, '내용을 입력해주세요.')
        .max(1000, '내용은 1000글자 이하여야 합니다.')
        .transform((val) => val.trim()),
    parent_id: z.number().int().positive().optional(),
});
```

#### Server Action 구현 패턴

```typescript
export async function createCommentAction(formData: FormData) {
    try {
        // 1. 인증 확인
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        // 2. 데이터 추출 및 검증
        const rawData = {
            post_id: parseInt(formData.get('post_id') as string),
            content: formData.get('content') as string,
            parent_id: formData.get('parent_id')
                ? parseInt(formData.get('parent_id') as string)
                : undefined,
        };

        const validationResult = CreateCommentSchema.safeParse(rawData);
        if (!validationResult.success) {
            const errorMessage = validationResult.error.issues
                .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                .join(', ');
            throw new Error(`데이터 검증 실패: ${errorMessage}`);
        }

        // 3. 댓글 생성
        await createComment({
            ...validationResult.data,
            author_id: user.id,
        });

        // 4. 캐시 무효화
        revalidatePath(`/posts/${validationResult.data.post_id}`);
    } catch (error) {
        throw error;
    }
}
```

**학습 포인트:**

- FormData에서 타입 안전한 데이터 추출
- Zod의 `safeParse`를 통한 검증과 에러 처리
- `revalidatePath`를 통한 Next.js 캐시 무효화

### 4. React 상태 관리: useState vs useReducer vs useOptimistic

#### 상태 관리 방식 비교와 선택

**초기 고민**: 댓글 목록과 낙관적 업데이트를 어떻게 관리할 것인가?

**시도한 방식들:**

1. **useState + useReducer 이중 구조 (문제 발생)**

```typescript
const [baseComments, setBaseComments] = useState<Comment[]>(initialComments);
const [optimisticComments, dispatchOptimistic] = useReducer(
    optimisticReducer,
    initialComments
);

// 문제: 복잡한 동기화 로직 필요
useEffect(() => {
    dispatchOptimistic({ type: 'reset', comments: baseComments });
}, [baseComments]);
```

2. **useOptimistic 시도 (React 18+ 기능, 문제 발생)**

```typescript
const [optimisticComments, addOptimistic] = useOptimistic(
    comments,
    (state, action) => {
        // 문제: base state가 업데이트되지 않아 낙관적 업데이트가 제대로 작동하지 않음
    }
);
```

3. **단일 useReducer 최종 선택**

```typescript
interface CommentState {
    comments: Comment[];
    isLoading: boolean;
    error: string | null;
}

function commentReducer(
    state: CommentState,
    action: CommentAction
): CommentState {
    switch (action.type) {
        case 'LOAD_SUCCESS':
            return {
                ...state,
                comments: action.comments,
                isLoading: false,
                error: null,
            };
        case 'ADD_OPTIMISTIC':
            return { ...state, comments: [...state.comments, action.comment] };
        // ...
    }
}
```

**최종 결정 이유:**

- 상태 변화의 예측 가능성 (Redux 패턴)
- 복잡한 동기화 로직 제거
- 액션 기반의 명확한 의도 표현
- 디버깅 용이성

### 5. 낙관적 UI 업데이트 (Optimistic Updates) 구현

#### 문제 발견과 해결 과정

**초기 문제**: Server Action이 먼저 실행되어 "낙관적"이지 않음

```typescript
// 문제가 있던 방식
<form action={handleSubmit}>  // Server Action이 먼저 실행됨
```

**해결책**: onSubmit 이벤트 핸들러 사용

```typescript
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // 기본 form 제출 방지

    // 1. 즉시 UI에 반영 (낙관적 업데이트)
    onOptimisticAdd?.(optimisticComment);
    setContent(''); // 폼 초기화

    // 2. 대댓글인 경우 즉시 폼 닫기
    if (parentId) {
        onSuccess?.(); // 대댓글 폼 즉시 닫기
    }

    try {
        // 3. 백그라운드에서 서버 요청
        await createCommentAction(formData);
        toast.success('댓글이 작성되었습니다.');
    } catch (error) {
        // 실패 시 복원 로직
        setContent(commentContent);
        if (parentId) {
            onFailure?.(); // 폼 다시 열기
        } else {
            onSuccess?.(); // 데이터 새로고침
        }
    }
};
```

**학습한 핵심 개념:**

- **진정한 낙관적 업데이트**: UI 변경 → 서버 요청 순서
- **실패 시 복원 전략**: 상황별 차별화된 복원 로직
- **사용자 경험 최적화**: 즉시 반응하는 인터페이스

### 6. React 컴포넌트 아키텍처와 Props Drilling 해결

#### 컴포넌트 계층 구조

```
CommentSection (상태 관리)
├── CommentForm (댓글 작성)
└── CommentList (목록 표시)
    └── CommentItem (개별 댓글)
        └── CommentForm (대댓글 작성)
```

#### Props 전파 패턴

```typescript
// CommentSection에서 모든 핸들러 정의
const handleOptimisticAdd = useCallback((comment: Comment) => {
    dispatch({ type: 'ADD_OPTIMISTIC', comment });
}, []);

// 하위 컴포넌트로 전파
<CommentList
    comments={comments}
    onOptimisticAdd={handleOptimisticAdd}
    onOptimisticUpdate={handleOptimisticUpdate}
    onOptimisticDelete={handleOptimisticDelete}
/>
```

**고민했던 부분**: Context API vs Props Drilling

**선택한 방식**: Props Drilling
**이유:**

- 컴포넌트 계층이 깊지 않음 (3-4단계)
- 명시적인 데이터 흐름으로 디버깅 용이
- Context의 오버엔지니어링 방지

### 7. 접근성(Accessibility)과 사용자 경험

#### 시맨틱 HTML과 ARIA 속성

```typescript
<label htmlFor="content" className="sr-only">
    {parentId ? '대댓글 작성' : '댓글 작성'}
</label>
<Textarea
    id="content"
    name="content"
    placeholder={placeholder}
    aria-describedby="content-help"
    required
    maxLength={1000}
/>
```

#### 키보드 네비게이션과 포커스 관리

- Enter 키로 폼 제출
- Escape 키로 편집 모드 취소
- 적절한 탭 순서 (tab index)

### 8. 에러 처리와 사용자 피드백

#### 계층적 에러 처리

```typescript
// 1. Zod 검증 에러
const validationResult = CreateCommentSchema.safeParse(rawData);
if (!validationResult.success) {
    const errorMessage = validationResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
    throw new Error(`데이터 검증 실패: ${errorMessage}`);
}

// 2. 인증 에러
if (!user) {
    throw new Error('로그인이 필요합니다.');
}

// 3. 권한 에러
if (comment.author_id !== user.id) {
    throw new Error('댓글을 수정할 권한이 없습니다.');
}
```

#### Toast 알림을 통한 사용자 피드백

```typescript
toast.success('댓글이 작성되었습니다.');
toast.error('댓글 작성 중 오류가 발생했습니다.');
```

### 9. 성능 최적화 전략

#### React.memo와 useCallback 활용

```typescript
const CommentItem = React.memo<CommentItemProps>(({ comment, ...props }) => {
    const handleEdit = useCallback(async (e: React.FormEvent) => {
        // 편집 로직
    }, [comment.id, onOptimisticUpdate]);

    return (
        // JSX
    );
});
```

#### 불필요한 상태 제거

- 낙관적 업데이트로 `isSubmitting` 상태 제거
- 즉시 UI 반영으로 로딩 스피너 불필요

### 10. 보안 고려사항

#### 서버 사이드 권한 검증

```typescript
// 클라이언트 사이드: UI만 숨김
{isAuthor && (
    <DropdownMenuItem onClick={handleDelete}>
        삭제
    </DropdownMenuItem>
)}

// 서버 사이드: 실제 권한 검증
export async function deleteCommentAction(formData: FormData) {
    const { data: { user } } = await supabase.auth.getUser();

    const comment = await getComment(commentId);
    if (comment.author_id !== user.id) {
        throw new Error('댓글을 삭제할 권한이 없습니다.');
    }

    // 삭제 실행
}
```

#### 입력 데이터 검증과 이스케이프

- Zod 스키마를 통한 서버 사이드 검증
- HTML 이스케이프 (React가 자동 처리)
- SQL Injection 방지 (Supabase 클라이언트 사용)

## 기존 Phase에서 활용한 기술

### Phase 1-3: 기본 인프라

- **Next.js App Router**: 파일 기반 라우팅으로 `/posts/[id]` 페이지에 댓글 시스템 통합
- **TypeScript**: 강타입 언어로 댓글 관련 모든 인터페이스와 함수에 타입 안전성 확보
- **Tailwind CSS + shadcn/ui**: 일관된 디자인 시스템으로 댓글 UI 컴포넌트 구현

### Phase 4: 인증 시스템 연동

- **Supabase Auth**: 댓글 작성 권한 확인과 작성자 식별에 활용
- **useAuth 훅**: 로그인 상태 확인과 사용자 정보 접근
- **미들웨어**: 보호된 댓글 작성 기능을 위한 인증 상태 관리

### Phase 5: Server Actions 패턴 재사용

- **폼 데이터 기반 처리**: 기존 글 작성과 동일한 패턴으로 댓글 CRUD 구현
- **Zod 검증**: 기존 스키마 패턴을 댓글에 적용하여 일관된 데이터 검증
- **revalidatePath**: 캐시 무효화를 통한 실시간 업데이트

### Phase 6-7: 성능 최적화 기법 적용

- **React Query**: 댓글 목록 캐싱과 무효화 전략
- **무한 스크롤 패턴**: 향후 댓글 페이지네이션에 적용 가능한 기반 마련

## 핵심 의사결정과 그 이유

### 1. 대댓글 깊이 제한 (1단계)

**결정**: 대댓글의 대댓글은 부모 댓글의 대댓글로 처리
**이유**:

- UI 복잡도 감소
- 모바일 화면에서의 가독성 확보
- 대부분의 소셜 플랫폼이 채택한 방식

### 2. 마크다운 미지원 결정

**결정**: 댓글은 일반 텍스트만 지원
**이유**:

- 글 본문과의 차별화
- XSS 공격 위험 최소화
- 빠른 댓글 작성 경험 제공

### 3. 낙관적 업데이트 적용 범위

**결정**: 작성, 수정, 삭제 모든 작업에 낙관적 업데이트 적용
**이유**:

- 현대적 웹 앱 수준의 반응성 제공
- 네트워크 지연에 관계없는 즉시 피드백
- 사용자 경험 대폭 개선

### 4. 단일 useReducer 상태 관리 선택

**결정**: useState + useReducer 이중 구조 대신 단일 useReducer 사용
**이유**:

- 복잡한 동기화 로직 제거
- Redux 패턴의 예측 가능한 상태 변화
- 액션 기반의 명확한 의도 표현

## 향후 개선 방향

### 1. 실시간 댓글 업데이트

- Supabase Realtime을 활용한 실시간 댓글 동기화
- 다른 사용자의 댓글 실시간 반영

### 2. 댓글 페이지네이션

- 무한 스크롤을 통한 대용량 댓글 처리
- 가상화(Virtualization)를 통한 성능 최적화

### 3. 댓글 검색 및 필터링

- 댓글 내용 검색 기능
- 작성자별 댓글 필터링

### 4. 리치 텍스트 에디터

- 제한적 마크다운 지원 (링크, 볼드 등)
- 멘션(@username) 기능

## 결론

Phase 8 댓글 시스템 구현을 통해 복잡한 상태 관리, 낙관적 업데이트, 타입 안전성, 사용자 경험 최적화 등 현대적 웹 애플리케이션 개발의 핵심 개념들을 깊이 있게 학습할 수 있었습니다.

특히 낙관적 UI 업데이트를 통해 Instagram, Twitter와 같은 현대적 소셜 플랫폼 수준의 반응성을 구현할 수 있었고, useReducer를 활용한 예측 가능한 상태 관리로 복잡한 인터랙션을 안정적으로 처리할 수 있게 되었습니다.

이러한 경험은 향후 더 복잡한 실시간 기능이나 대용량 데이터 처리가 필요한 프로젝트에서도 활용할 수 있는 견고한 기반이 될 것입니다.
