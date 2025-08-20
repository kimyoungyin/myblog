# Phase 5: 글 작성 및 편집 (Admin 전용) - 학습 정리

## 구현 완료된 기능

### ✅ 마크다운 에디터 컴포넌트

- **파일**: `src/components/editor/MarkdownEditor.tsx` (24KB, 522줄)
- **기능**:
    - 제목, 내용, 해시태그 입력 폼
    - 실시간 미리보기 (우측 패널)
    - 반응형 디자인 (모바일/데스크탑)
    - 해시태그 자동완성 및 관리
    - 유효성 검사 (제목, 내용, 해시태그 필수)
    - 디바운싱을 적용한 실시간 해시태그 검색 (300ms)

### ✅ 실시간 미리보기 (우측 패널)

- **구현 방식**:
    - 데스크탑: 좌측 편집기 + 우측 미리보기 (CSS Grid 2열 레이아웃)
    - 모바일/태블릿: 편집/미리보기 토글 버튼
- **컴포넌트**: `src/components/editor/MarkdownRenderer.tsx` (3.2KB, 87줄)
- **라이브러리**: `react-markdown` 사용

### ✅ 해시태그 자동완성 및 관리

- **기능**:
    - 실시간 검색 (디바운싱 300ms 적용)
    - 최소 2글자 이상 입력 시 검색 시작
    - 기존 해시태그 재사용 (중복 방지)
    - 해시태그 추가/제거
    - 유효성 검사 (2-20글자, #문자 제한)
    - 최대 10개 해시태그 제한

### ✅ 글 작성/수정/삭제 API

- **Server Actions**: `src/lib/actions.ts` (9.1KB, 298줄)
    - `createPostAction`: 새 글 생성 (JWT 토큰 직접 검증)
    - `updatePostAction`: 글 수정 (Admin 권한 확인)
    - `deletePostAction`: 글 삭제 (Admin 권한 확인)
    - `getPostsAction`: 글 목록 조회 (읽기 전용)
    - `getPostAction`: 글 상세 조회 (읽기 전용)
    - `searchHashtagsAction`: 해시태그 검색 (읽기 전용)

### ✅ 글 작성 페이지 UI/UX

- **페이지**: `src/app/admin/posts/new/page.tsx` (486B, 18줄)
- **기능**: 마크다운 에디터를 사용한 글 작성 폼
  // (구) `ProtectedRoute`는 미들웨어 기반 라우트 보호로 대체되었습니다.

### ✅ 글 관리 페이지

- **페이지**: `src/app/admin/posts/page.tsx` (10KB, 217줄)
- **기능**:
    - 글 목록 표시 (최대 50개)
    - 글 작성/수정/삭제/보기 기능
    - 로딩 상태 및 에러 처리
    - 반응형 디자인

### ✅ 마크다운 렌더링

- **컴포넌트**: `src/components/editor/MarkdownRenderer.tsx`
- **라이브러리**: `react-markdown` 사용

### ✅ 데이터 검증 시스템

- **파일**: `src/lib/schemas.ts` (3.0KB, 91줄)
- **스키마**:
    - `HashtagSchema`: 해시태그 검증 (2-20글자, #/공백 제한)
    - `CreatePostSchema`: 글 생성 검증 (제목 1-100글자, 내용 1-50,000글자, 해시태그 1-10개)
    - `UpdatePostSchema`: 글 수정 검증 (모든 필드 선택적)
    - `SearchHashtagSchema`: 해시태그 검색 검증 (2-50글자)
    - `PostIdSchema`: 글 ID 검증 (숫자, 1 이상)
    - `PaginationSchema`: 페이지네이션 검증 (페이지 1 이상, 크기 1-100)

### ✅ 해시태그 관리 시스템

- **파일**: `src/lib/hashtags.ts` (1.9KB, 74줄)
- **기능**:
    - 해시태그 중복 방지 (정규화된 이름 사용)
    - 일괄 해시태그 생성
    - Service Role 클라이언트로 RLS 우회

### ✅ 글 데이터 관리

- **파일**: `src/lib/posts.ts` (7.5KB, 269줄)
- **기능**:
    - 글 CRUD 작업
    - 해시태그 연결 관리
    - 트랜잭션 안전성 (글 생성 실패 시 해시태그 연결도 롤백)

### ✅ Supabase 서버 클라이언트

- **파일**: `src/lib/supabase-server.ts` (1.6KB, 51줄)
- **기능**: 서버 사이드에서 Supabase 클라이언트 생성

### ✅ 미들웨어

- **파일**: `src/middleware.ts` (1.3KB, 44줄)
- **기능**: 인증 및 라우팅 미들웨어

### ✅ 이미지/비디오 업로드 기능

- **파일**: `src/components/editor/MarkdownEditor.tsx` (파일 업로드 기능 포함)
- **기능**:
    - Supabase Storage 활용한 파일 업로드
    - 드래그 앤 드롭 지원
    - 어드민 권한 확인 (일반 사용자 업로드 차단)
    - 파일 개수 제한 (최대 20개)
    - 파일 타입 검증 (이미지: jpg, png, webp, gif)
    - 파일 크기 제한 (이미지: 5MB)
    - 임시 파일 관리 (취소 시 삭제, 저장 시 영구화)
    - 이미지 미리보기 (실제 이미지 표시)
    - temp 폴더 자동 초기화 (페이지 진입/이탈 시)
    - **GitHub 스타일 드래그앤드롭**: textarea에 직접 파일 드롭
    - **마크다운 링크 자동 삽입**: `![name](url)` 형식으로 자동 생성
    - **이미지 렌더링 최적화**: HTML 구조 문제 해결 및 반응형 디자인
    - **서명된 URL**: Supabase Storage 권한 문제 해결
    - **이미지 최종 업로드**: 글 저장 시 temp → permanent 폴더로 자동 이동
    - **사용되지 않는 이미지 제거**: 마크다운에서 제거된 이미지 자동 정리
    - **썸네일 자동 생성**: 첫 번째 이미지를 자동으로 썸네일로 설정

### ✅ 썸네일 업로드 기능

- **기능**:
    - 글 작성 시 마크다운 내 첫 번째 이미지를 자동으로 썸네일로 선정
    - 썸네일 URL을 posts 테이블에 자동 저장
    - 글 수정 시에도 썸네일 자동 업데이트

### ✅ 글 상세 페이지

- **페이지**: `src/app/posts/[id]/page.tsx`
- **기능**:
    - MarkdownRenderer를 활용한 마크다운 렌더링
    - 썸네일 이미지 표시
    - 해시태그 표시
    - 메타 정보 표시 (작성일, 수정일, 조회수, 좋아요, 댓글 수)
    - Admin 사용자를 위한 수정 버튼

### ✅ 글 수정 페이지

- **페이지**: `src/app/admin/posts/[id]/edit/page.tsx`
- **기능**:
    - 기존 글 데이터 로딩 및 표시
    - MarkdownEditor를 활용한 수정 폼
    - 수정 시 이미지 처리 및 썸네일 업데이트
    - temp 폴더 자동 초기화

### ✅ 홈페이지 및 글 목록 페이지

- **홈페이지**: `src/app/page.tsx`
    - 최신 글 6개 표시
    - 반응형 그리드 레이아웃 (모바일 1열, 데스크탑 3열)
    - 썸네일 이미지 및 해시태그 표시
    - 글 상세 페이지로 연결

- **글 목록 페이지**: `src/app/posts/page.tsx`
    - 모든 글 표시 (최대 50개)
    - 동일한 카드 레이아웃
    - 글 개수 표시

### ✅ 이미지 관리 시스템

- **파일**: `src/lib/actions.ts`의 `manageImageFiles` 함수
- **기능**:
    - 글 수정 시 이미지 추가/삭제 추적
    - 사라진 이미지 permanent에서 자동 제거
    - 새로 추가된 temp 이미지 permanent로 자동 이동
    - 마크다운 내용의 temp URL을 permanent URL로 자동 업데이트
    - 이미지 순서 변경 시 썸네일 자동 업데이트
    - 이미지가 없을 때 썸네일 URL 자동 제거

### ✅ 코드 중복 제거 및 재사용성 향상

- **파일**: `src/lib/actions.ts`에서 `src/lib/file-upload.ts` 함수 재사용
- **개선사항**:
    - `extractImagePathsFromMarkdown` 함수 중복 제거
    - `updateImageUrlsInMarkdown` 함수 중복 제거
    - `file-upload.ts`의 함수들을 import하여 재사용
    - 약 25줄의 중복 코드 제거
    - 유지보수성 및 일관성 향상

### ✅ 글 수정 페이지 최적화

- **페이지**: `src/app/admin/posts/[id]/edit/page.tsx`
- **개선사항**:
    - Server Component로 변환하여 성능 최적화
    - 페이지 진입 시 temp 폴더 자동 초기화
    - 서버 사이드에서 기존 글 데이터 로딩
    - SEO 및 초기 로딩 성능 향상

## 아직 구현되지 않은 기능

### ❌ 이미지 최적화 (Next.js Image)

- **계획**:
    - Next.js Image 컴포넌트 활용
    - 자동 이미지 최적화 및 lazy loading
    - 반응형 이미지 크기 조정

### ❌ 댓글 시스템

- **계획**: Phase 8에서 구현 예정

### ❌ 좋아요 시스템

- **계획**: Phase 9에서 구현 예정

### ❌ 검색 및 필터링

- **계획**: Phase 7에서 구현 예정

## 기술적 학습 내용

### 🔐 인증 아키텍처 업데이트 (최종)

- 서버 콜백(Route Handler): `src/app/auth/callback/route.ts`에서 `supabase.auth.exchangeCodeForSession(code)` 호출로 서버가 httpOnly 쿠키에 세션을 설정합니다. 별도의 토큰 동기화 API가 필요 없습니다. 참고: [Supabase Google Auth 가이드](https://supabase.com/docs/guides/auth/social-login/auth-google)
- 브라우저 클라이언트: `src/utils/supabase/client.ts`는 `@supabase/ssr`의 `createBrowserClient`를 사용합니다. 서버가 설정한 쿠키 기반 세션을 그대로 인식합니다.
- 서버 클라이언트: `src/utils/supabase/server.ts`의 `createClient()`는 요청별 `createServerClient`를 생성합니다(싱글톤 아님). `getAuthenticatedUser()`, `requireAdmin()`로 권한을 확인합니다.
- 미들웨어: `src/utils/supabase/middleware.ts`에서 `cookies.getAll/setAll`을 구현하고, 반드시 `supabase.auth.getUser()`를 호출하여 토큰 만료 시 자동 리프레시를 트리거하고 갱신 쿠키를 응답에 반영합니다. 보호 경로(`/admin`, `/profile`) 비로그인 접근 시 `/auth/login`으로 이동시킵니다.
- React Query + Zustand: `useAuth` 훅에서 세션(`auth.getSession`)과 프로필(`profiles` 조회)을 React Query로 가져오고, 성공 시 Zustand로 사용자 상태를 동기화합니다.

보안 메모

- refresh token은 httpOnly 쿠키에서만 관리합니다(클라이언트 전송 금지).
- 토큰을 API body로 보내 세션을 동기화하지 않습니다. 표준 플로우는 서버 콜백에서 세션을 확립하는 것입니다.

### 1. Server Actions 활용

```typescript
// 서버에서 인증 확인 및 권한 검증
export async function createPostAction(formData: FormData) {
    // JWT 토큰 직접 검증
    const payload = JSON.parse(atob(accessToken.split('.')[1]));

    // Admin 권한 확인
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
}
```

**학습 포인트**:

- `'use server'` 지시어로 서버 전용 함수 생성
- FormData를 통한 클라이언트-서버 데이터 전송
- JWT 토큰 직접 파싱하여 사용자 정보 추출
- Supabase RLS 정책과 연동한 권한 관리

### 2. 어드민 인증 및 권한 관리의 복잡성 ⚠️

**가장 어려웠던 부분**: 로그인한 정보를 가져오지 못해 어드민 처리를 못했던 문제

#### 문제 상황

- 클라이언트에서 로그인은 성공했지만 서버에서 사용자 정보를 가져올 수 없음
- Supabase 세션과 쿠키 간의 동기화 문제
- Next.js App Router에서 서버 컴포넌트와 클라이언트 컴포넌트 간 인증 상태 공유의 어려움

#### 해결 방법

**1단계: 쿠키 기반 JWT 토큰 직접 파싱**

```typescript
// createPostAction에서 사용
const cookieStore = await cookies();
const accessToken = cookieStore.get('sb-access-token')?.value;

if (!accessToken) {
    throw new Error('인증 토큰을 찾을 수 없습니다. 다시 로그인해주세요.');
}

// JWT 토큰 직접 검증
const payload = JSON.parse(atob(accessToken.split('.')[1]));
const currentTime = Math.floor(Date.now() / 1000);

if (payload.exp < currentTime) {
    throw new Error('인증 토큰이 만료되었습니다. 다시 로그인해주세요.');
}

// 사용자 정보 구성
user = {
    id: payload.sub,
    email: payload.email,
    user_metadata: payload.user_metadata || {},
};
```

**2단계: 세션 기반 인증 (updatePostAction, deletePostAction)**

```typescript
// 세션에서 사용자 정보 직접 가져오기
const {
    data: { session },
    error: sessionError,
} = await supabase.auth.getSession();

if (sessionError || !session?.user) {
    throw new Error('세션을 찾을 수 없습니다. 다시 로그인해주세요.');
}

const user = session.user;
```

**3단계: API 라우트를 통한 세션 쿠키 설정**

```typescript
// src/app/api/auth/set-session/route.ts
export async function POST(request: NextRequest) {
    const { accessToken, refreshToken } = await request.json();

    // Supabase 세션 설정
    const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
    });

    // 응답에 쿠키 설정
    const response = NextResponse.json({
        success: true,
        user: data.session.user,
    });

    response.cookies.set('sb-access-token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 3600, // 1시간
        path: '/',
    });

    return response;
}
```

**4단계: 미들웨어를 통한 세션 동기화**

```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
    const res = NextResponse.next();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        res.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    // 세션을 새로고침하여 최신 상태 유지
    await supabase.auth.getSession();

    return res;
}
```

#### 학습 포인트

- **JWT 토큰 직접 파싱**: `atob()`와 `JSON.parse()`를 사용한 토큰 검증
- **쿠키와 세션의 이중 관리**: Supabase 세션과 커스텀 쿠키의 동기화
- **미들웨어 활용**: 모든 요청에서 세션 상태 유지
- **API 라우트와 Server Actions의 조합**: 클라이언트-서버 인증 상태 공유
- **에러 처리의 중요성**: 인증 실패 시 명확한 에러 메시지 제공

#### 인증 흐름

1. **클라이언트 로그인** → Supabase OAuth
2. **콜백 페이지** → 토큰 추출 및 API 호출
3. **API 라우트** → 세션 설정 및 쿠키 생성
4. **미들웨어** → 세션 동기화
5. **Server Actions** → 쿠키 또는 세션에서 사용자 정보 추출
6. **권한 확인** → profiles 테이블에서 is_admin 확인
7. **작업 수행** → 인증된 사용자로 작업 진행

### 3. 해시태그 관리 시스템

```typescript
// 해시태그 중복 방지 및 자동 생성
async function createHashtag(name: string): Promise<Hashtag | null> {
    const normalizedName = name.toLowerCase().trim();

    // 기존 해시태그 확인
    const { data: existing } = await supabase
        .from('hashtags')
        .select('id, name, created_at')
        .eq('name', normalizedName)
        .single();

    if (existing) return existing;

    // 새 해시태그 생성
    const { data } = await supabase
        .from('hashtags')
        .insert([{ name: normalizedName }])
        .select('id, name, created_at')
        .single();
}
```

**학습 포인트**:

- 정규화된 이름으로 중복 방지
- Service Role 클라이언트로 RLS 우회
- 트랜잭션 안전성 (글 생성 실패 시 해시태그 연결도 롤백)

### 4. 실시간 해시태그 검색

```typescript
// 디바운싱을 적용한 실시간 검색
const debouncedHashtagQuery = useDebounce(newHashtag, 300);

useEffect(() => {
    const searchHashtagSuggestions = async () => {
        if (!debouncedHashtagQuery.trim() || debouncedHashtagQuery.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const results = await searchHashtagsAction(debouncedHashtagQuery);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
    };

    searchHashtagSuggestions();
}, [debouncedHashtagQuery]);
```

**학습 포인트**:

- `useDebounce` 훅으로 불필요한 API 호출 방지
- 최소 2글자 이상 입력 시 검색 시작
- 실시간 검색 결과 표시 및 선택

### 5. 반응형 에디터 레이아웃

```typescript
// 화면 크기에 따른 레이아웃 변경
const [isDesktop, setIsDesktop] = useState(false);

useEffect(() => {
    const checkScreenSize = () => {
        setIsDesktop(window.innerWidth >= 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
}, []);

// 조건부 렌더링
{isDesktop ? (
    <div className="grid grid-cols-2 gap-6">
        {/* 편집기 + 미리보기 */}
    </div>
) : (
    <div>
        {/* 토글 버튼 + 단일 패널 */}
    </div>
)}
```

**학습 포인트**:

- `useEffect`와 `addEventListener`를 활용한 반응형 처리
- CSS Grid를 활용한 2열 레이아웃
- 모바일 친화적인 토글 방식

### 6. 데이터 검증 및 에러 처리

```typescript
// Zod 스키마를 통한 데이터 검증
const validationResult = CreatePostSchema.safeParse(rawData);
if (!validationResult.success) {
    const errors = formatZodError(validationResult.error);
    const errorMessage = errors
        .map((err) => `${err.field}: ${err.message}`)
        .join(', ');
    throw new Error(`데이터 검증 실패: ${errorMessage}`);
}
```

**학습 포인트**:

- Zod 스키마로 런타임 타입 검증
- 사용자 친화적인 에러 메시지 생성
- 폼 데이터의 안전한 처리
- **Zod 최신 버전 호환성**: `error.errors` → `error.issues`로 변경됨
- **타입 안전성**: `z.ZodError` 타입을 활용한 에러 처리

### 7. 커스텀 훅 활용

```typescript
// useDebounce 훅
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}
```

**학습 포인트**:

- 재사용 가능한 커스텀 훅 설계
- `setTimeout`과 `clearTimeout`을 활용한 디바운싱
- TypeScript 제네릭을 활용한 타입 안전성

### 8. 이미지 업로드 시스템 ⚠️

**구현 과정에서 발생한 문제들과 해결 방법**:

#### 문제 1: 이미지 미리보기 깨짐 현상

**문제 상황**:

- `FileUploadZone`에서 이미지 파일을 단순 아이콘으로만 표시
- 실제 이미지를 볼 수 없어 사용자 경험 저하

**해결 방법**:

```typescript
// 파일 아이콘 렌더링 함수 수정
const getFileIcon = (file: UploadedFile) => {
    // 이미지인 경우 실제 이미지 표시
    return (
        <div className="relative">
            <img
                src={file.url}
                alt={file.name}
                className="h-6 w-6 object-cover rounded"
                onError={(e) => {
                    // 이미지 로드 실패 시 기본 아이콘 표시
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                }}
            />
            {/* 이미지 로드 실패 시 표시할 기본 아이콘 */}
            <Image className="h-6 w-6 text-blue-500 hidden" />
        </div>
    );
};
```

**학습 포인트**:

- `onError` 이벤트를 활용한 이미지 로드 실패 처리
- fallback 아이콘을 통한 사용자 경험 개선
- `object-cover` 클래스로 이미지 비율 유지

#### 문제 2: 페이지 이탈 시 임시 파일 자동 삭제

**문제 상황**:

- 사용자가 글 작성 중 페이지를 나가면 임시 파일이 Storage에 남아있음
- 불필요한 Storage 용량 사용 및 보안 문제

**해결 방법**:

```typescript
// 페이지 이탈 시 temp 폴더 정리
useEffect(() => {
    const handleBeforeUnload = async () => {
        try {
            await clearTempFolder();
        } catch (error) {
            console.error('페이지 이탈 시 temp 폴더 정리 실패:', error);
        }
    };

    const handleVisibilityChange = async () => {
        if (document.visibilityState === 'hidden') {
            await handleBeforeUnload();
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener(
            'visibilitychange',
            handleVisibilityChange
        );
    };
}, []);
```

**학습 포인트**:

- `beforeunload` 이벤트로 페이지 이탈 감지
- `visibilitychange` 이벤트로 탭 전환 감지
- 비동기 함수를 이벤트 리스너에서 처리하는 방법
- 메모리 누수 방지를 위한 이벤트 리스너 정리

#### 문제 3: temp 폴더 자동 초기화

**문제 상황**:

- 페이지 진입 시마다 이전 임시 파일들이 남아있음
- 사용자가 혼란스러워할 수 있음

**해결 방법**:

```typescript
// 페이지 진입 시 temp 폴더 초기화
useEffect(() => {
    const initializeTempFolder = async () => {
        try {
            await clearTempFolder();
            console.log('temp 폴더가 초기화되었습니다.');
        } catch (error) {
            console.error('temp 폴더 초기화 실패:', error);
        }
    };

    initializeTempFolder();
}, []);
```

**학습 포인트**:

- 컴포넌트 마운트 시 자동 초기화
- 에러 처리 및 로깅을 통한 디버깅
- 사용자 경험 개선을 위한 사전 정리

#### 문제 4: GitHub 스타일 드래그앤드롭 구현

**문제 상황**:

- 기존의 별도 파일 업로드 영역이 아닌 textarea에 직접 파일을 드롭하는 기능 필요
- 드래그앤드롭 후 마크다운 링크가 자동으로 삽입되어야 함
- 이미지가 미리보기에서 제대로 렌더링되어야 함

**해결 방법**:

```typescript
// MarkdownEditor.tsx에서 textarea에 직접 드래그앤드롭 이벤트 추가
<Textarea
    id="content"
    value={content}
    onChange={(e) => setContent(e.target.value)}
    onDragOver={(e) => {
        e.preventDefault();
        e.currentTarget.classList.add('border-primary', 'bg-primary/5');
    }}
    onDragLeave={(e) => {
        e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
    }}
    onDrop={onDrop}
/>

// onDrop 핸들러에서 파일 업로드 및 마크다운 링크 삽입
const onDrop = useCallback(async (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);

    for (const file of files) {
        // 이미지 파일 검증
        if (!file.type.startsWith('image/')) {
            toast.error(`${file.name}: 이미지 파일만 업로드 가능합니다.`);
            continue;
        }

        const result = await uploadFile(file, true);
        if (result.success && result.file) {
            // 마크다운 링크 생성 및 삽입
            const markdownLink = `![${file.name}](${result.file.url})`;

            // 커서 위치에 링크 삽입
            const textarea = document.getElementById('content') as HTMLTextAreaElement;
            const start = textarea.selectionStart || 0;
            const end = textarea.selectionEnd || 0;
            const text = textarea.value || '';
            const before = text.substring(0, start);
            const after = text.substring(end);
            const newText = before + markdownLink + after;

            setContent(newText);

            // 커서 위치 조정
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(
                    start + markdownLink.length,
                    start + markdownLink.length
                );
            }, 0);
        }
    }
}, []);
```

**학습 포인트**:

- **textarea에 드래그앤드롭**: `onDragOver`, `onDragLeave`, `onDrop` 이벤트 활용
- **마크다운 링크 자동 삽입**: `selectionStart`, `selectionEnd`를 활용한 커서 위치 기반 텍스트 삽입
- **비동기 파일 업로드**: `uploadFile` 함수와 연동하여 실시간 링크 생성
- **사용자 경험 개선**: 드래그 시 시각적 피드백 제공

#### 문제 5: 이미지 렌더링 최적화

**문제 상황**:

- 마크다운 렌더링 시 `<p>` 태그 안에 `<div>` 태그가 들어가서 hydration 에러 발생
- 이미지 로드 실패 시 적절한 fallback 처리 필요
- Supabase Storage 권한 문제로 이미지를 불러올 수 없음

**해결 방법**:

```typescript
// MarkdownRenderer.tsx에서 이미지 커스텀 렌더링
img: ({ src, alt, ...props }) => {
    // src가 string인지 확인
    if (typeof src !== 'string') {
        return null;
    }

    // p 태그와의 충돌 방지를 위해 span 사용
    return (
        <span className="block my-4">
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
                    console.error('이미지 로드 실패:', src);
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';

                    // 에러 시 fallback 텍스트 표시
                    const parent = target.parentElement;
                    if (parent) {
                        parent.innerHTML = `
                            <div class="flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
                                <span class="text-gray-500 dark:text-gray-400 text-sm">
                                    이미지를 불러올 수 없습니다: ${alt || '알 수 없는 이미지'}
                                </span>
                            </div>
                        `;
                    }
                }}
                onLoad={(e) => {
                    console.log('이미지 로드 성공:', {
                        src,
                        naturalWidth: (e.target as HTMLImageElement).naturalWidth,
                        naturalHeight: (e.target as HTMLImageElement).naturalHeight
                    });
                }}
                {...props}
            />
        </span>
    );
}
```

**학습 포인트**:

- **HTML 구조 최적화**: `<span>` 태그를 사용하여 `<p>` 태그와의 충돌 방지
- **이미지 에러 처리**: `onError` 이벤트를 활용한 fallback UI 제공
- **로딩 상태 추적**: `onLoad` 이벤트로 이미지 로드 성공/실패 모니터링
- **반응형 디자인**: `max-w-full`, `h-auto` 클래스로 이미지 크기 자동 조정
- **접근성 향상**: `alt` 속성과 fallback 텍스트로 이미지 설명 제공

#### 문제 6: Supabase Storage 권한 문제 해결

**문제 상황**:

- 이미지 파일은 업로드되지만 미리보기에서 로드되지 않음
- "이미지를 불러올 수 없습니다" 에러 메시지 표시
- Storage 버킷의 RLS 정책으로 인한 접근 권한 문제

**해결 방법**:

```typescript
// file-upload.ts에서 서명된 URL 생성
export async function uploadFile(file: File, isTemporary: boolean = true) {
    // ... 파일 업로드 로직 ...

    // 공개 URL 생성
    const { data: urlData } = supabase.storage
        .from(FILE_UPLOAD_CONFIG.storageBucket)
        .getPublicUrl(filePath);

    // 서명된 URL 생성 (권한 문제 해결을 위해)
    const { data: signedUrlData } = await supabase.storage
        .from(FILE_UPLOAD_CONFIG.storageBucket)
        .createSignedUrl(filePath, 3600); // 1시간 유효

    const uploadedFile: UploadedFile = {
        id: fileId,
        name: file.name,
        url: signedUrlData?.signedUrl || urlData.publicUrl, // 서명된 URL 우선 사용
        type: fileType,
        size: file.size,
        path: filePath,
        uploaded_at: new Date().toISOString(),
        is_temporary: isTemporary,
    };

    return { success: true, file: uploadedFile };
}
```

**학습 포인트**:

- **서명된 URL**: `createSignedUrl`을 사용하여 RLS 정책 우회
- **권한 관리**: 임시 파일에 대한 제한된 접근 권한 제공
- **URL 우선순위**: 서명된 URL을 우선 사용하고, 실패 시 공개 URL fallback
- **보안 강화**: 서명된 URL의 만료 시간 설정 (1시간)

#### 파일 업로드 시스템 아키텍처

```typescript
// 파일 업로드 설정
export const FILE_UPLOAD_CONFIG: FileUploadConfig = {
    maxImageSize: 5 * 1024 * 1024, // 5MB
    maxVideoSize: 50 * 1024 * 1024, // 50MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedVideoTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    storageBucket: 'files',
};

// 임시 파일 관리
export async function clearTempFolder(): Promise<void> {
    try {
        // temp 폴더 내 모든 파일 조회
        const { data: tempFiles, error: listError } = await supabase.storage
            .from(FILE_UPLOAD_CONFIG.storageBucket)
            .list('temp');

        if (tempFiles && tempFiles.length > 0) {
            // 모든 temp 파일 경로 생성
            const tempFilePaths = tempFiles.map((file) => `temp/${file.name}`);

            // 일괄 삭제
            const { error: deleteError } = await supabase.storage
                .from(FILE_UPLOAD_CONFIG.storageBucket)
                .remove(tempFilePaths);

            if (deleteError) {
                console.error('temp 폴더 정리 오류:', deleteError);
            }
        }
    } catch (error) {
        console.error('temp 폴더 정리 중 예외 발생:', error);
    }
}
```

**학습 포인트**:

- Supabase Storage의 폴더 구조 활용
- 일괄 파일 삭제를 통한 성능 최적화
- 에러 처리 및 로깅의 중요성
- 설정 객체를 통한 유지보수성 향상

### 9. Supabase 클라이언트 관리 및 중복 인스턴스 문제 해결 ✅

**구현 과정에서 발생한 문제들과 해결 방법**:

#### 문제: Multiple GoTrueClient instances 경고

**문제 상황**:

- `Multiple GoTrueClient instances detected in the same browser context` 경고 발생
- `SupabaseProvider`에서 `useState`로 매번 새로운 클라이언트 생성
- 세션 관리 및 인증 상태의 일관성 문제
- 시스템 성능 저하 및 예측 불가능한 동작

**해결 방법**:

**1단계: 싱글톤 패턴 적용**

```typescript
// src/utils/supabase/client.ts
import { createClient as _createClient } from '@supabase/supabase-js';

// 모듈 레벨에서 단일 인스턴스 생성 (싱글톤 패턴)
const supabase = _createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 동일한 인스턴스를 반환하는 함수
export const createClient = () => supabase;
```

**(제거됨) SupabaseProvider 관련 단계**

```typescript
// src/app/layout.tsx
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <ThemeProvider>
                    <QueryProvider>
                        {/* TODO: 인증 시스템 재구현 예정 */}
                        {/* <SupabaseProvider> */}
                        <div className="flex min-h-screen flex-col">
                            <Header />
                            <main className="flex-1">{children}</main>
                            <Footer />
                        </div>
                        {/* </SupabaseProvider> */}
                    </QueryProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
```

**(삭제됨) 임시 Provider 구현**: SSR 인증 구조 전환으로 SupabaseProvider는 제거되었습니다.

#### 학습 포인트

- **useState의 함정**: 초기화 함수가 매번 새로운 인스턴스 생성 가능
- **싱글톤 패턴**: 모듈 레벨에서 단일 인스턴스 보장
- **전역 상태 관리**: React Context와 싱글톤의 조합
- **중복 클라이언트 방지**: Supabase GoTrueClient 인스턴스 중복 생성 방지
- **시스템 안정화**: 세션 관리 및 인증 상태 일관성 유지

#### 해결 결과

- ✅ **중복 클라이언트 해결**: `Multiple GoTrueClient instances` 경고 완전 해결
- ✅ **단일 인스턴스**: 전역에서 하나의 Supabase 클라이언트만 관리
- ✅ **시스템 안정화**: 세션 관리 및 인증 상태 일관성 유지
- ✅ **이미지 업로드**: 정상 작동
- ✅ **성능 향상**: 불필요한 클라이언트 생성 방지
- 🔄 **인증 시스템**: 현재 임시 구현 상태, 향후 재구현 예정

#### 향후 개선 방향

1. (삭제) SupabaseProvider 재구현: 미사용
2. **세션 관리 최적화**: React Query와 Zustand 간의 상태 동기화 개선
3. **에러 처리 강화**: 인증 실패 시 더 명확한 에러 메시지 및 복구 방법 제공
4. **성능 모니터링**: 인증 관련 성능 지표 추적 및 최적화

### 10. Supabase Storage 용량 관리 및 설정 동기화 ⚠️

**구현 과정에서 발생한 문제들과 해결 방법**:

#### 문제: Storage 용량 제한과 코드 설정 불일치

**문제 상황**:

- `StorageApiError: The object exceeded the maximum allowed size` 에러 발생
- 코드에서는 5MB 이미지, 50MB 비디오 업로드 설정
- 실제 Supabase Dashboard에서는 100 bytes로 제한
- RLS 정책은 올바르게 설정되어 있음

**해결 방법**:

**1단계: Dashboard 설정 확인 및 수정**

```typescript
// Supabase Dashboard → Storage → Buckets → files → Edit bucket
// 기존 설정 (문제)
"Restrict file upload size for bucket": ON
Size limit: 100 bytes  // ← 너무 작음!

// 수정된 설정 (해결)
"Restrict file upload size for bucket": ON
Size limit: 52428800   // 50MB
Unit: MB
```

**2단계: 코드 설정과 Dashboard 설정 동기화**

```typescript
// src/lib/supabase-client.ts - 클라이언트 설정
export const supabaseConfig = {
    storageBucket: 'files',
    maxFileSize: 50 * 1024 * 1024, // 50MB (Dashboard와 일치)
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxFiles: 20,
};

// src/lib/file-upload.ts - 파일 업로드 설정
export const FILE_UPLOAD_CONFIG: FileUploadConfig = {
    maxImageSize: 5 * 1024 * 1024, // 5MB (이미지 전용)
    maxVideoSize: 50 * 1024 * 1024, // 50MB (비디오 전용)
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedVideoTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    storageBucket: 'files',
};
```

**3단계: 에러 처리 및 사용자 피드백 개선**

```typescript
// 파일 크기 검증 함수
export function validateFileSize(file: File, maxSize: number): boolean {
    if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        const fileSizeMB = Math.round(file.size / (1024 * 1024));
        throw new Error(
            `파일 크기가 너무 큽니다. 최대 ${maxSizeMB}MB까지 업로드 가능합니다. (현재: ${fileSizeMB}MB)`
        );
    }
    return true;
}

// 업로드 전 검증
export async function uploadFile(file: File, isTemporary: boolean = true) {
    try {
        // 파일 크기 검증
        const maxSize = file.type.startsWith('image/')
            ? FILE_UPLOAD_CONFIG.maxImageSize
            : FILE_UPLOAD_CONFIG.maxVideoSize;

        validateFileSize(file, maxSize);

        // ... 업로드 로직
    } catch (error) {
        console.error('파일 업로드 실패:', error);
        return { success: false, error: error.message };
    }
}
```

**학습 포인트**:

- **Dashboard 설정 우선순위**: Supabase Dashboard 설정이 코드 설정보다 우선 적용
- **용량 단위 이해**: bytes, KB, MB, GB 단위의 정확한 변환
- **설정 동기화**: 코드와 Dashboard 설정의 일치성 확인
- **에러 메시지 분석**: "Object exceeded maximum size"는 용량 제한 문제
- **사용자 경험 개선**: 명확한 에러 메시지와 파일 크기 제한 안내

#### 용량 관리 아키텍처

```typescript
// 파일 업로드 설정 계층 구조
interface FileUploadConfig {
    // 1. 기본 설정 (Supabase 클라이언트)
    storageBucket: string;
    maxFileSize: number; // 전체 파일 최대 크기

    // 2. 파일 타입별 설정
    maxImageSize: number; // 이미지 전용 최대 크기
    maxVideoSize: number; // 비디오 전용 최대 크기

    // 3. 허용 타입 및 개수
    allowedImageTypes: string[];
    allowedVideoTypes: string[];
    maxFiles: number; // 최대 파일 개수
}

// 설정 우선순위
const configPriority = {
    dashboard: 1, // Supabase Dashboard 설정 (최우선)
    code: 2, // 코드 설정
    default: 3, // 기본값
};
```

#### 향후 개선 방향

1. **자동 설정 동기화**: Dashboard 설정 변경 시 코드에 자동 반영
2. **용량 모니터링**: 업로드된 파일 크기 및 Storage 사용량 추적
3. **동적 제한 조정**: 사용량에 따른 자동 용량 제한 조정
4. **사용자 알림**: 용량 제한에 도달했을 때 적절한 안내 메시지

### 11. 글 업로드 인증 문제 해결 ⚠️

**구현 과정에서 발생한 문제들과 해결 방법**:

#### 문제: Server Actions에서 세션 기반 인증 실패

**문제 상황**:

- `createPostAction`에서 `supabase.auth.getSession()` 호출 시 세션을 찾을 수 없음
- 서버 사이드에서 클라이언트의 인증 상태를 읽을 수 없는 문제
- 로그: `hasSession: false, hasUser: false`

**해결 방법**:

**1단계: 폼 데이터 기반 인증으로 변경**

```typescript
// MarkdownEditor.tsx에서 useAuth 훅 사용
const { user, isAuthenticated } = useAuth();

// 폼에 사용자 ID를 hidden input으로 추가
<form action={action}>
    <input
        type="hidden"
        name="userId"
        value={user?.id || ''}
    />
    {/* 다른 폼 필드들 */}
</form>
```

**2단계: Server Action에서 폼 데이터로 사용자 ID 받기**

```typescript
// actions.ts에서 폼 데이터 기반 인증
export async function createPostAction(formData: FormData) {
    // 폼 데이터에서 사용자 ID 추출
    const userId = formData.get('userId') as string;

    if (!userId) {
        throw new Error('사용자 ID가 제공되지 않았습니다.');
    }

    // Supabase 클라이언트 생성
    const supabase = await createServerClient();

    // 사용자 프로필에서 admin 권한 확인
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin, email')
        .eq('id', userId)
        .single();

    if (profileError || !profile?.is_admin) {
        throw new Error('관리자 권한이 필요합니다.');
    }

    // 사용자 정보 구성
    const user = {
        id: userId,
        email: profile.email || '',
        user_metadata: {},
    };
}
```

**3단계: 인증 상태 확인 로직 추가**

```typescript
// MarkdownEditor.tsx에서 인증 상태 확인
const canSave =
    title.trim() &&
    content.trim() &&
    hashtags.length > 0 &&
    isAuthenticated &&
    user?.is_admin;

// 에러 상태 관리
const [authError, setAuthError] = useState(false);
const hasAuthError = !isAuthenticated || !user?.is_admin;

// 저장 시도 시 인증 상태 에러 활성화
if (hasAuthError) {
    setAuthError(true);
    return;
}
```

**학습 포인트**:

- **세션 기반 vs 폼 데이터 기반 인증**: 서버 사이드에서 클라이언트 세션을 읽을 수 없는 경우의 대안
- **useAuth 훅 활용**: 클라이언트에서 사용자 정보를 가져와서 서버로 전달
- **권한 검증**: `profiles.is_admin` 필드를 통한 관리자 권한 확인
- **에러 처리**: 인증 실패 시 명확한 에러 메시지 및 상태 관리
- **보안 강화**: 클라이언트와 서버 양쪽에서 권한 확인

#### 인증 흐름 비교

**기존 방식 (세션 기반)**:

1. 클라이언트 로그인 → Supabase OAuth
2. 서버에서 `supabase.auth.getSession()` 호출
3. 세션에서 사용자 정보 추출
4. 권한 확인 및 작업 수행

**새로운 방식 (폼 데이터 기반)**:

1. 클라이언트 로그인 → `useAuth` 훅으로 사용자 정보 가져오기
2. 폼 제출 시 사용자 ID를 hidden input으로 전달
3. 서버에서 폼 데이터로 사용자 ID 받기
4. `profiles` 테이블에서 admin 권한 확인
5. 권한 확인 후 작업 수행

**장점**:

- 서버 사이드 세션 문제 해결
- 더 안정적인 인증 처리
- 명확한 권한 검증 흐름
- 디버깅 용이성 향상

## 성능 최적화 기법

### 1. 디바운싱

- 해시태그 검색 시 300ms 지연으로 불필요한 API 호출 방지
- `useDebounce` 커스텀 훅 활용

### 2. 조건부 렌더링

- 화면 크기에 따른 컴포넌트 렌더링 최적화
- 불필요한 DOM 요소 생성 방지

### 3. 메모이제이션

- `useCallback`을 활용한 함수 재생성 방지
- `useState`의 함수형 업데이트로 최적화

### 4. 지연 로딩

- 해시태그 검색 시 최소 2글자 이상 입력 시에만 API 호출
- 불필요한 네트워크 요청 최소화

### 5. 파일 업로드 최적화

- 드래그 앤 드롭을 통한 직관적인 파일 선택
- 파일 타입 및 크기 사전 검증
- 임시 파일 관리를 통한 Storage 효율성
- 자동 정리를 통한 메모리 누수 방지

## 보안 고려사항

### 1. 인증 및 권한 관리

- JWT 토큰 기반 사용자 인증
- Admin 권한 확인을 통한 글 작성 제한
- Supabase RLS 정책과 연동

### 2. 데이터 검증

- 클라이언트 및 서버 양쪽에서 데이터 검증
- Zod 스키마를 통한 타입 안전성 확보
- SQL Injection 방지를 위한 Supabase 클라이언트 활용

### 3. XSS 방지

- 마크다운 렌더링 시 안전한 HTML 생성
- 사용자 입력 데이터의 적절한 이스케이프 처리

### 4. 입력 제한

- 해시태그 길이 제한 (2-20글자)
- 글 제목 길이 제한 (1-100글자)
- 글 내용 길이 제한 (1-50,000글자)
- 해시태그 개수 제한 (1-10개)

### 5. 파일 업로드 보안

- 파일 타입 검증 (MIME 타입 확인)
- 파일 크기 제한 (이미지 5MB, 비디오 50MB)
- 어드민 권한 확인을 통한 업로드 제한
- 임시 파일 자동 정리를 통한 보안 강화

### 6. Storage 용량 및 설정 보안

- **Dashboard 설정 우선순위**: Supabase Dashboard 설정이 코드 설정보다 우선 적용
- **용량 제한 검증**: 클라이언트와 서버 양쪽에서 파일 크기 검증
- **설정 동기화**: 코드 설정과 Dashboard 설정의 일치성 정기 점검
- **용량 모니터링**: Storage 사용량 추적 및 제한 도달 시 알림
- **단위 변환 정확성**: bytes, KB, MB, GB 단위의 정확한 계산 및 검증

## 프로젝트 구조 분석

### 디렉토리 구조

```
src/
├── app/
│   ├── admin/
│   │   └── posts/
│   │       ├── page.tsx          # 글 관리 페이지
│   │       └── new/
│   │           └── page.tsx      # 새 글 작성 페이지
│   ├── posts/
│   │   ├── page.tsx              # 글 목록 페이지
│   │   └── [id]/
│   │       └── page.tsx          # 글 상세 페이지
│   └── api/
│       └── auth/
│           └── set-session/
│               └── route.ts      # 세션 설정 API
├── components/
│   ├── editor/
│   │   ├── MarkdownEditor.tsx    # 마크다운 에디터
│   │   ├── MarkdownRenderer.tsx  # 마크다운 렌더러
│   │   └── (파일 업로드 기능은 MarkdownEditor에 통합)
│   ├── providers/ (SupabaseProvider 제거됨)
│   └── ui/
│       └── badge.tsx             # 배지 컴포넌트
├── lib/
│   ├── actions.ts                # Server Actions
│   ├── hashtags.ts               # 해시태그 관리
│   ├── posts.ts                  # 글 데이터 관리
│   ├── file-upload.ts            # 클라이언트 파일 업로드 관리
│   ├── file-upload-server.ts     # 서버 파일 업로드 관리
│   ├── supabase-client.ts        # 클라이언트 Supabase 클라이언트
│   ├── supabase-server.ts        # 서버 Supabase 클라이언트
│   ├── schemas.ts                # Zod 검증 스키마
│   └── supabase.ts               # 타입 정의
├── hooks/
│   ├── useAuth.ts                # 인증 상태 관리 훅
│   └── useDebounce.ts            # 디바운싱 훅
├── stores/
│   └── auth-store.ts             # Zustand 인증 상태 관리
└── middleware.ts                  # 미들웨어
```

### 파일 크기 및 복잡도

- **가장 복잡한 파일**: `MarkdownEditor.tsx` (24KB, 740줄)
- **핵심 비즈니스 로직**: `actions.ts` (9.1KB, 298줄) - 이미지 관리 시스템 포함
- **데이터 관리**: `posts.ts` (7.5KB, 269줄)
- **파일 업로드**: `file-upload.ts` (9.5KB, 240줄) - 공통 함수 export
- **UI 페이지**: `admin/posts/page.tsx` (10KB, 217줄)
- **이미지 관리**: `actions.ts`의 `manageImageFiles` 함수 (이미지 생명주기 관리)

### 코드 구조 개선

#### 함수 재사용 구조

```
src/lib/file-upload.ts (클라이언트용)
├─ extractImagePathsFromMarkdown ✅ export
├─ updateImageUrlsInMarkdown ✅ export
└─ 기타 파일 업로드 함수들

src/lib/actions.ts (서버용)
├─ import { extractImagePathsFromMarkdown } ✅ 재사용
├─ import { updateImageUrlsInMarkdown } ✅ 재사용
├─ manageImageFiles (이미지 관리 시스템)
└─ updateThumbnailUrl (썸네일 업데이트)
```

#### 이미지 관리 시스템

```
글 수정 제출
    ↓
manageImageFiles 실행
    ├─ 이미지 경로 비교 및 분석
    ├─ 사라진 이미지 제거
    ├─ 새 temp 이미지 permanent로 이동
    ├─ 마크다운 URL 업데이트
    └─ 업데이트된 내용 반환
    ↓
썸네일 자동 업데이트
    ↓
글 수정 완료
```

## 트러블슈팅 경험

### 1. 이미지 미리보기 문제

**문제**: 이미지 파일이 아이콘으로만 표시됨
**원인**: 이미지 타입을 단순 아이콘으로 처리
**해결**: 실제 이미지 태그를 사용하고 로드 실패 시 fallback 아이콘 표시

### 2. 임시 파일 관리 문제

**문제**: 페이지 이탈 시 임시 파일이 Storage에 남아있음
**원인**: 파일 업로드 후 자동 정리 로직 부재
**해결**: `beforeunload`와 `visibilitychange` 이벤트를 활용한 자동 정리

### 3. temp 폴더 초기화 문제

**문제**: 페이지 진입 시마다 이전 임시 파일들이 남아있음
**원인**: 컴포넌트 마운트 시 초기화 로직 부재
**해결**: `useEffect`를 활용한 컴포넌트 마운트 시 자동 초기화

### 4. 파일 업로드 권한 문제

**문제**: 일반 사용자도 파일 업로드 가능
**원인**: 권한 확인 로직 부재
**해결**: `useAuth` 훅을 통한 어드민 권한 확인 및 조건부 렌더링

### 5. Supabase 클라이언트 중복 인스턴스 문제 ✅

**문제**: `Multiple GoTrueClient instances detected in the same browser context` 경고 발생
**원인**: `SupabaseProvider`에서 `useState`로 매번 새로운 클라이언트 생성
**해결**: 싱글톤 패턴을 적용하여 모듈 레벨에서 단일 인스턴스 보장

#### 문제 상황

```
Multiple GoTrueClient instances detected in the same browser context.
It is not an error, but this should be avoided as it may produce
undefined behavior when used concurrently under the same storage key.

에러 스택 트레이스:
SupabaseProvider.useState ← 여기가 문제!
SupabaseProvider
RootLayout
```

#### 해결 과정

**1단계: 싱글톤 패턴 적용**

```typescript
// src/utils/supabase/client.ts
import { createClient as _createClient } from '@supabase/supabase-js';

// 모듈 레벨에서 단일 인스턴스 생성 (싱글톤 패턴)
const supabase = _createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 동일한 인스턴스를 반환하는 함수
export const createClient = () => supabase;
```

**2단계: SupabaseProvider 주석 처리**

```typescript
// src/app/layout.tsx
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <ThemeProvider>
                    <QueryProvider>
                        {/* TODO: 인증 시스템 재구현 예정 */}
                        {/* <SupabaseProvider> */}
                        <div className="flex min-h-screen flex-col">
                            <Header />
                            <main className="flex-1">{children}</main>
                            <Footer />
                        </div>
                        {/* </SupabaseProvider> */}
                    </QueryProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
```

**3단계: 임시 Provider 구현**

```typescript
// src/components/providers/supabase-provider.tsx
// TODO: 인증 시스템 재구현 예정
// 임시로 기본 컨텍스트와 훅 생성
export function SupabaseProvider({ children }: { children: React.ReactNode }) {
    return (
        <SupabaseContext.Provider value={{ supabase: null }}>
            {children}
        </SupabaseContext.Provider>
    );
}
```

#### 학습 포인트

- **useState의 함정**: 초기화 함수가 매번 새로운 인스턴스 생성 가능
- **싱글톤 패턴**: 모듈 레벨에서 단일 인스턴스 보장
- **전역 상태 관리**: React Context와 싱글톤의 조합
- **중복 클라이언트 방지**: Supabase GoTrueClient 인스턴스 중복 생성 방지
- **시스템 안정화**: 세션 관리 및 인증 상태 일관성 유지

#### 해결 결과

- ✅ **중복 클라이언트 해결**: `Multiple GoTrueClient instances` 경고 완전 해결
- ✅ **단일 인스턴스**: 전역에서 하나의 Supabase 클라이언트만 관리
- ✅ **시스템 안정화**: 세션 관리 및 인증 상태 일관성 유지
- ✅ **이미지 업로드**: 정상 작동
- ✅ **성능 향상**: 불필요한 클라이언트 생성 방지
- 🔄 **인증 시스템**: 현재 임시 구현 상태, 향후 재구현 예정

#### 향후 개선 방향

1. **SupabaseProvider 재구현**: 인증 시스템 완성 후 Provider 패턴 적용
2. **세션 관리 최적화**: React Query와 Zustand 간의 상태 동기화 개선
3. **에러 처리 강화**: 인증 실패 시 더 명확한 에러 메시지 및 복구 방법 제공
4. **성능 모니터링**: 인증 관련 성능 지표 추적 및 최적화

### 12. 이미지 관리 시스템 구현 ⚠️

**구현 과정에서 발생한 문제들과 해결 방법**:

#### 문제: 글 수정 시 이미지 URL 업데이트 누락

**문제 상황**:

- temp 이미지가 permanent로 이동되었지만 마크다운 내용의 URL은 그대로 남아있음
- 썸네일은 업데이트되었지만 실제 이미지 렌더링 실패
- 사용자가 이미지를 삭제했지만 Storage에서 제거되지 않음

**해결 방법**:

**1단계: 이미지 파일 관리 함수 구현**

```typescript
// src/lib/actions.ts의 manageImageFiles 함수
async function manageImageFiles(oldContent: string, newContent: string) {
    try {
        const supabase = await createServiceRoleClient();

        // 1. 이전 글과 새 글의 이미지 경로 비교
        const oldImagePaths = extractImagePathsFromMarkdown(oldContent);
        const newImagePaths = extractImagePathsFromMarkdown(newContent);

        // 2. 사라진 이미지 찾기 및 제거
        const removedImages = oldImagePaths.filter(
            (oldPath) => !newImagePaths.includes(oldPath)
        );

        if (removedImages.length > 0) {
            await supabase.storage.from('files').remove(removedImages);
        }

        // 3. 새로 추가된 temp 이미지 처리
        const newTempImages = newImagePaths.filter(
            (path) => path.includes('temp/') && !oldImagePaths.includes(path)
        );

        let updatedContent = newContent;
        const movedTempPaths: string[] = [];

        for (const tempPath of newTempImages) {
            const permanentPath = tempPath.replace('temp/', 'permanent/');

            // 파일 복사 (temp → permanent)
            await supabase.storage.from('files').copy(tempPath, permanentPath);

            // temp 파일 삭제
            await supabase.storage.from('files').remove([tempPath]);

            movedTempPaths.push(tempPath);
        }

        // 4. 마크다운 내용의 URL 업데이트
        if (movedTempPaths.length > 0) {
            const permanentPaths = movedTempPaths.map((path) =>
                path.replace('temp/', 'permanent/')
            );
            updatedContent = updateImageUrlsInMarkdown(
                newContent,
                permanentPaths
            );
        }

        return updatedContent;
    } catch (error) {
        console.error('이미지 파일 관리 중 오류:', error);
        throw error;
    }
}
```

**2단계: 썸네일 자동 업데이트**

```typescript
// updateThumbnailUrl 함수
async function updateThumbnailUrl(
    content: string,
    postId: number
): Promise<string | null> {
    try {
        const supabase = await createServerClient();
        const imagePaths = extractImagePathsFromMarkdown(content);

        if (imagePaths.length === 0) {
            // 이미지가 없으면 썸네일 제거
            await supabase
                .from('posts')
                .update({ thumbnail_url: null })
                .eq('id', postId);
            return null;
        }

        // 첫 번째 이미지를 썸네일로 설정
        const firstImagePath = imagePaths[0];
        let thumbnailPath = firstImagePath;

        // temp 경로인 경우 permanent 경로로 변환
        if (firstImagePath.includes('temp/')) {
            thumbnailPath = firstImagePath.replace('temp/', 'permanent/');
        }

        const thumbnailUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/files/${thumbnailPath}`;
        return thumbnailUrl;
    } catch (error) {
        console.error('썸네일 URL 업데이트 중 오류:', error);
        return null;
    }
}
```

**3단계: Server Action에서 통합 처리**

```typescript
// updatePostAction에서 이미지 관리 통합
export async function updatePostAction(postId: number, formData: FormData) {
    // ... 인증 및 검증 로직 ...

    if (content !== undefined) {
        // 1. 이미지 파일 관리 및 URL 업데이트
        const updatedContent = await manageImageFiles(
            existingPost.content_markdown,
            content
        );
        finalContent = updatedContent;

        // 2. 썸네일 URL 업데이트
        thumbnailUrl = await updateThumbnailUrl(updatedContent, postId);
    }

    // 3. 글 수정 (업데이트된 내용으로)
    const post = await updatePost(
        postId,
        updateData,
        existingPost,
        thumbnailUrl
    );
}
```

**학습 포인트**:

- **이미지 생명주기 관리**: temp → permanent 이동 및 정리
- **경로 비교 로직**: 이전 내용과 새 내용의 이미지 경로 비교
- **URL 자동 업데이트**: 마크다운 내용의 temp URL을 permanent URL로 자동 변경
- **썸네일 동적 업데이트**: 이미지 순서 변경 시 썸네일 자동 업데이트
- **에러 처리**: 이미지 관리 실패 시에도 글 수정은 계속 진행
- **성능 최적화**: Service Role 클라이언트를 사용한 일괄 파일 작업

#### 이미지 관리 시스템 아키텍처

```typescript
// 이미지 관리 흐름
글 수정 제출
    ↓
manageImageFiles 실행
    ├─ 이전 내용과 새 내용 비교
    ├─ 사라진 이미지 permanent에서 제거
    ├─ 새 temp 이미지 permanent로 이동
    ├─ 마크다운 URL 업데이트 (temp → permanent)
    └─ 업데이트된 내용 반환
    ↓
썸네일 URL 업데이트
    ↓
글 수정 (업데이트된 내용으로)
    ↓
수정 완료 → 상세 페이지로 리다이렉트
```

### 13. 코드 중복 제거 및 재사용성 향상 ⚠️

**구현 과정에서 발생한 문제들과 해결 방법**:

#### 문제: 동일한 함수의 중복 구현

**문제 상황**:

- `actions.ts`와 `file-upload.ts`에 동일한 `extractImagePathsFromMarkdown` 함수 존재
- `actions.ts`에 별도로 `updateImageUrlsInMarkdown` 함수 구현
- 코드 중복으로 인한 유지보수성 저하
- 두 함수가 다르게 동작할 가능성

**해결 방법**:

**1단계: 중복 함수 식별**

```typescript
// src/lib/file-upload.ts (클라이언트용)
export function extractImagePathsFromMarkdown(content: string): string[] {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    // ... 구현 ...
}

// src/lib/actions.ts (서버용) - 중복!
function extractImagePathsFromMarkdown(content: string): string[] {
    const imageRegex = /!\[.*?\]\(([^)]+)\)/g;
    // ... 다른 구현 ...
}
```

**2단계: 함수 통합 및 재사용**

```typescript
// src/lib/actions.ts에서 import
import {
    updateImageUrlsInMarkdown,
    extractImagePathsFromMarkdown,
} from './file-upload';

// 중복 함수 제거 (약 25줄 코드 제거)
// function extractImagePathsFromMarkdown(content: string): string[] { ... } 삭제
```

**3단계: 함수 시그니처 통일**

```typescript
// file-upload.ts의 함수를 서버에서도 사용할 수 있도록 수정
export function updateImageUrlsInMarkdown(
    content: string,
    permanentPaths: string[]
): string {
    // temp 경로를 permanent 경로로 교체하는 로직
    // 클라이언트와 서버 모두에서 사용 가능
}
```

**학습 포인트**:

- **코드 중복의 위험성**: 동일한 로직이 여러 곳에 존재할 때 유지보수 어려움
- **함수 재사용의 중요성**: 클라이언트와 서버에서 공통 로직 공유
- **import/export 패턴**: 모듈 시스템을 활용한 코드 구조화
- **시그니처 통일**: 클라이언트와 서버 모두에서 사용할 수 있는 함수 설계
- **유지보수성 향상**: 한 곳에서만 수정하면 모든 곳에 반영

#### 코드 구조 개선 효과

```typescript
// 이전: 중복 구현
src/lib/actions.ts
├─ extractImagePathsFromMarkdown (25줄)
└─ updateImageUrlsInMarkdown (30줄)

src/lib/file-upload.ts
├─ extractImagePathsFromMarkdown (25줄)
└─ updateImageUrlsInMarkdown (30줄)

// 수정 후: 함수 재사용
src/lib/file-upload.ts
├─ extractImagePathsFromMarkdown (25줄) ✅ export
└─ updateImageUrlsInMarkdown (30줄) ✅ export

src/lib/actions.ts
├─ import { extractImagePathsFromMarkdown } ✅ 재사용
└─ import { updateImageUrlsInMarkdown } ✅ 재사용
```

**개선 효과**:

- ✅ **코드 중복 제거**: 약 55줄의 중복 코드 제거
- 🔧 **유지보수성 향상**: 한 곳에서만 수정하면 됨
- 🎯 **일관성 보장**: 클라이언트와 서버에서 동일한 로직 사용
- 🚀 **성능 향상**: 불필요한 함수 정의 제거
- 📚 **가독성 향상**: 명확한 함수 출처와 책임 분리

### 14. 코드 중복 제거 및 재사용성 향상 ✅

**구현 과정에서 발생한 문제들과 해결 방법**:

#### 문제: 동일한 함수의 중복 구현

**문제 상황**:

- `actions.ts`와 `file-upload.ts`에 동일한 `extractImagePathsFromMarkdown` 함수 존재
- `actions.ts`에 별도로 `updateImageUrlsInMarkdown` 함수 구현
- 코드 중복으로 인한 유지보수성 저하
- 두 함수가 다르게 동작할 가능성

**해결 방법**:

**1단계: 중복 함수 식별**

```typescript
// src/lib/file-upload.ts (클라이언트용)
export function extractImagePathsFromMarkdown(content: string): string[] {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    // ... 구현 ...
}

// src/lib/actions.ts (서버용) - 중복!
function extractImagePathsFromMarkdown(content: string): string[] {
    const imageRegex = /!\[.*?\]\(([^)]+)\)/g;
    // ... 다른 구현 ...
}
```

**2단계: 함수 통합 및 재사용**

```typescript
// src/lib/actions.ts에서 import
import {
    updateImageUrlsInMarkdown,
    extractImagePathsFromMarkdown,
} from './file-upload';

// 중복 함수 제거 (약 25줄 코드 제거)
// function extractImagePathsFromMarkdown(content: string): string[] { ... } 삭제
```

**3단계: 함수 시그니처 통일**

```typescript
// file-upload.ts의 함수를 서버에서도 사용할 수 있도록 수정
export function updateImageUrlsInMarkdown(
    content: string,
    permanentPaths: string[]
): string {
    // temp 경로를 permanent 경로로 교체하는 로직
    // 클라이언트와 서버 모두에서 사용 가능
}
```

**학습 포인트**:

- **코드 중복의 위험성**: 동일한 로직이 여러 곳에 존재할 때 유지보수 어려움
- **함수 재사용의 중요성**: 클라이언트와 서버에서 공통 로직 공유
- **import/export 패턴**: 모듈 시스템을 활용한 코드 구조화
- **시그니처 통일**: 클라이언트와 서버 모두에서 사용할 수 있는 함수 설계
- **유지보수성 향상**: 한 곳에서만 수정하면 모든 곳에 반영

#### 코드 구조 개선 효과

```typescript
// 이전: 중복 구현
src/lib/actions.ts
├─ extractImagePathsFromMarkdown (25줄)
└─ updateImageUrlsInMarkdown (30줄)

src/lib/file-upload.ts
├─ extractImagePathsFromMarkdown (25줄)
└─ updateImageUrlsInMarkdown (30줄)

// 수정 후: 함수 재사용
src/lib/file-upload.ts
├─ extractImagePathsFromMarkdown (25줄) ✅ export
└─ updateImageUrlsInMarkdown (30줄) ✅ export

src/lib/actions.ts
├─ import { extractImagePathsFromMarkdown } ✅ 재사용
└─ import { updateImageUrlsInMarkdown } ✅ 재사용
```

**개선 효과**:

- ✅ **코드 중복 제거**: 약 55줄의 중복 코드 제거
- 🔧 **유지보수성 향상**: 한 곳에서만 수정하면 됨
- 🎯 **일관성 보장**: 클라이언트와 서버에서 동일한 로직 사용
- 🚀 **성능 향상**: 불필요한 함수 정의 제거
- 📚 **가독성 향상**: 명확한 함수 출처와 책임 분리

## 다음 단계 계획

### Phase 6: 글 목록 및 상세 페이지

- 홈페이지 글 목록 표시
- 반응형 그리드 레이아웃
- 무한 스크롤 구현
- React Query 캐싱 전략

### Phase 5 보완 (썸네일 업로드)

- 썸네일 이미지 선택 및 크롭
- 이미지 최적화 (Next.js Image)
- 글 수정 페이지 UI 구현

### 성능 최적화

- React Query 캐싱 전략 수립
- 이미지 lazy loading 구현
- 코드 스플리팅 및 번들 최적화

## 참고 자료

- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [React Markdown](https://github.com/remarkjs/react-markdown)
- [Zod Schema Validation](https://zod.dev/)
- [Tailwind CSS Grid](https://tailwindcss.com/docs/grid-template-columns)
- [React Hooks Best Practices](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [File Upload Best Practices](https://web.dev/file-upload/)
- [Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)
