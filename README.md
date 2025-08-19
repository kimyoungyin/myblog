# 마크다운 기반 블로그 프로젝트 설계 명세서

## 프로젝트 개요

- 마크다운 기반 블로그. 개발자로서 정리한 자신의 경험과 지식을 공유하는 블로그
- 글마다 해시태그 N개 저장 후 검색 및 분류에 사용
- admin(나)만 글 작성 가능
- 관련 단계를 하나씩 거쳐나갈 때마다 최종 확인 요청 받고, 이후 실행
- 구현해나갈 때마다, Phase 별로 추가하거나, 내가 직접 구현했다면 학습했어야 하는 것들에 대해 `학습정리.md`에 정리하여 추후 참고 가능하도록 함

## 기술 스택

- **개발 환경**: Vite
- **언어**: TypeScript
- **프레임워크**: Next.js 14+ (App Router)
- **서비스**: Supabase + Vercel
- **DB**: PostgreSQL (Supabase)
- **호스팅**: Vercel
- **UI 프레임워크**: Tailwind CSS + shadcn/ui
- **전역 상태 관리**: Zustand
- **캐싱 및 쿼리 관리**: TanStack Query (React Query)
- **데이터 검증**: Zod
- **테스트**: Vitest + @testing-library/react + happy-dom + Storybook
- **함수형 프로그래밍**: 최대한 함수형 프로그래밍 패러다임 적용

## 데이터베이스 스키마

### 테이블 구조

```sql
-- 사용자 테이블 (Supabase Auth 확장)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 해시태그 테이블
CREATE TABLE hashtags (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 글 테이블
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  thumbnail_url TEXT,
  view_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 글-해시태그 연결 테이블
CREATE TABLE post_hashtags (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id INTEGER REFERENCES hashtags(id) ON DELETE CASCADE,
  UNIQUE(post_id, hashtag_id)
);

-- 댓글 테이블
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 좋아요 테이블
CREATE TABLE likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);
```

## 구현 순서 및 체크리스트

### Phase 1: 프로젝트 셋업 및 기본 구조 ✅

- [x] Next.js 프로젝트 생성 및 초기 설정
- [x] TypeScript 설정 및 타입 정의
- [x] Tailwind CSS + shadcn/ui 설정
- [x] 프로젝트 디렉토리 구조 설정
    - [x] `@/app` - 페이지 구조
    - [x] `@/components` - 컴포넌트 구조
    - [x] `@/lib` - 유틸 함수 및 server actions
    - [x] `@/hooks` - 커스텀 훅
    - [x] `@/styles` - 스타일 설정
    - [x] `@/types` - 타입 정의 (Zod 스키마)
    - [x] `@/utils` - 유틸리티 함수
- [x] 환경 변수 설정 (.env.local)
- [x] ESLint, Prettier 설정
- [x] Git 설정 및 초기 커밋

### Phase 2: Supabase 설정 및 인증

- [x] Supabase 프로젝트 생성
- [x] 환경 변수 설정 (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- [x] Supabase 클라이언트 설정
- [x] 데이터베이스 스키마 생성 (위의 SQL 실행)
- [x] RLS (Row Level Security) 정책 설정
- [x] 인증 관련 타입 정의
- [x] 기본 인증 훅 생성 (useAuth)

### Phase 3: 기본 UI 컴포넌트

- [x] 레이아웃 컴포넌트 (Layout, Header, Footer)
- [x] 공통 UI 컴포넌트 (Button, Input, Dialog 등)
- [x] 반응형 디자인 기본 설정
- [x] 테마 설정 (다크/라이트 모드)

### Phase 4: 사용자 인증 및 권한 관리 ✅

- [x] 소셜 로그인 구현 (Google, GitHub)
- [x] 로그인/로그아웃 상태 관리 (Zustand)
- [x] 인증 상태 유지 (새로고침, 페이지 이동)
- [x] Admin 권한 확인 로직
- [x] 보호된 라우트 설정
- [x] 사용자 프로필 관리
- [x] React Query 캐싱 전략 설정
    - [x] 인증 상태 캐싱 (useAuth)
    - [x] 사용자 프로필 캐싱
    - [x] 캐시 무효화 전략 수립

#### 인증 플로우 (최신)

- 서버 라우트 콜백 처리: `src/app/auth/callback/route.ts`에서 `supabase.auth.exchangeCodeForSession(code)`를 호출해 서버가 httpOnly 쿠키에 세션을 설정합니다.
- 클라이언트 Supabase: `@supabase/ssr`의 `createBrowserClient`를 사용해 서버가 설정한 쿠키 기반 세션을 그대로 활용합니다.
- 미들웨어: `cookies.getAll/setAll` 구현 후 반드시 `supabase.auth.getUser()`를 호출하여 토큰 만료 시 자동 리프레시 및 쿠키 갱신을 수행합니다.
- 보호 경로: `'/admin'`, `'/profile'` 등은 미들웨어에서 비로그인 접근 시 `/auth/login`으로 리디렉션합니다.
- 더 이상 토큰을 API body/헤더로 보내 동기화하지 않습니다. 콜백 서버 라우트가 세션 설정을 전담합니다. 참고: [Supabase Google Auth 가이드](https://supabase.com/docs/guides/auth/social-login/auth-google)

### Phase 5: 글 작성 및 편집 (Admin 전용) ✅

- [x] 마크다운 에디터 컴포넌트
    - [x] 제목, 내용, 해시태그 입력 폼
    - [x] 실시간 미리보기 (우측 패널)
    - [x] 반응형 디자인 (모바일/데스크탑)
    - [x] 해시태그 자동완성 및 관리
    - [x] 글 작성/수정/삭제 API
    - [x] 글 작성 페이지 UI/UX
    - [x] 마크다운 렌더링 (react-markdown)
    - [x] 해시태그 실시간 검색 (디바운싱 300ms)
    - [x] 해시태그 유효성 검사 (2-20글자, #문자 제한)
    - [x] 최대 10개 해시태그 제한
    - [x] 글 제목 길이 제한 (1-100글자)
    - [x] 글 내용 길이 제한 (1-50,000글자)
    - [x] CSS Grid를 활용한 2열 레이아웃
    - [x] 모바일/태블릿 토글 방식
    - [x] 화면 크기 감지 및 반응형 처리
- [x] 해시태그 관리 시스템
    - [x] 해시태그 중복 방지 (정규화된 이름 사용)
    - [x] 일괄 해시태그 생성
    - [x] Service Role 클라이언트로 RLS 우회
    - [x] 트랜잭션 안전성 (글 생성 실패 시 해시태그 연결도 롤백)
- [x] 데이터 검증 시스템 (Zod)
    - [x] HashtagSchema (2-20글자, #/공백 제한)
    - [x] CreatePostSchema (제목 1-100글자, 내용 1-50,000글자, 해시태그 1-10개)
    - [x] UpdatePostSchema (모든 필드 선택적)
    - [x] SearchHashtagSchema (2-50글자)
    - [x] PostIdSchema (숫자, 1 이상)
    - [x] PaginationSchema (페이지 1 이상, 크기 1-100)
    - [x] Zod 최신 버전 호환성 (errors → issues)
- [x] Server Actions 구현
    - [x] createPostAction (폼 데이터 기반 사용자 ID 검증)
    - [x] updatePostAction (폼 데이터 기반 사용자 ID 검증)
    - [x] deletePostAction (세션 기반 인증)
    - [x] getPostsAction (읽기 전용)
    - [x] getPostAction (읽기 전용)
    - [x] searchHashtagsAction (읽기 전용)
- [x] Admin 권한 관리 시스템
    - [x] 폼 데이터 기반 사용자 ID 검증 (createPostAction, updatePostAction)
    - [x] 세션 기반 인증 (deletePostAction)
    - [x] profiles 테이블에서 is_admin 확인
    - [x] 서버 라우트 콜백에서 세션 쿠키 설정 (`/auth/callback/route.ts`)
    - [x] 미들웨어를 통한 세션 자동 동기화 (`auth.getUser()` 필수)
    - [x] httpOnly 쿠키 기반의 단일 세션 관리
    - [x] 인증 실패 시 명확한 에러 메시지
- [x] 글 관리 페이지
    - [x] 글 목록 표시 (최대 50개)
    - [x] 글 작성/수정/삭제/보기 기능
    - [x] 로딩 상태 및 에러 처리
    - [x] 반응형 디자인
- [x] 커스텀 훅
    - [x] useDebounce (디바운싱 300ms)
    - [x] TypeScript 제네릭 활용
    - [x] 재사용 가능한 훅 설계
- [x] 성능 최적화
    - [x] 디바운싱을 통한 불필요한 API 호출 방지
    - [x] 조건부 렌더링을 통한 DOM 최적화
    - [x] useCallback을 활용한 함수 재생성 방지
    - [x] 지연 로딩 (최소 2글자 이상 입력 시 검색)
- [x] 보안 고려사항
    - [x] 폼 데이터 기반 사용자 ID 검증
    - [x] Admin 권한 확인을 통한 글 작성 제한
    - [x] Supabase RLS 정책과 연동
    - [x] 클라이언트 및 서버 양쪽에서 데이터 검증
    - [x] SQL Injection 방지를 위한 Supabase 클라이언트 활용
    - [x] 마크다운 렌더링 시 안전한 HTML 생성
    - [x] 사용자 입력 데이터의 적절한 이스케이프 처리
    - [x] 입력 제한 (해시태그 2-20글자, 제목 1-100글자, 내용 1-50,000글자)
    - [x] refresh token은 httpOnly 쿠키에서만 관리(클라이언트 전송 금지)
- [x] 프로젝트 구조
    - [x] 디렉토리 구조 설계
    - [x] 파일 크기 및 복잡도 관리
    - [x] 컴포넌트 분리 및 재사용성
- [x] 이미지/비디오 업로드 기능
    - [x] Supabase Storage 활용
    - [x] 드래그 앤 드롭 지원
    - [x] 어드민 권한 확인 (일반 사용자 업로드 차단)
    - [x] 파일 개수 제한 (최대 20개)
    - [x] 파일 타입 검증 (이미지: jpg, png, webp, gif)
    - [x] 파일 크기 제한 (이미지: 5MB)
    - [x] 임시 파일 관리 (취소 시 삭제, 저장 시 영구화)
    - [x] 이미지 미리보기 (실제 이미지 표시)
    - [x] temp 폴더 자동 초기화 (페이지 진입/이탈 시)
    - [x] GitHub 스타일 드래그앤드롭 (textarea에 직접 파일 드롭)
    - [x] 마크다운 링크 자동 삽입 (![name](url) 형식)
    - [x] 이미지 렌더링 최적화 (HTML 구조 문제 해결)
    - [x] 서명된 URL을 통한 이미지 접근 권한 해결
    - [x] 이미지 최종 업로드 (temp → permanent 폴더 자동 이동)
    - [x] 사용되지 않는 이미지 자동 제거
    - [x] 썸네일 자동 생성 (첫 번째 이미지)
    - [x] 이미지 URL 자동 업데이트 (temp → permanent 경로 변경)
    - [x] 이미지 최적화 (Next.js Image)
        - [x] 홈페이지 썸네일 최적화
        - [x] 글 목록 썸네일 최적화
        - [x] 글 내용 이미지 최적화 (MarkdownRenderer)
        - [x] 파일 미리보기 이미지 최적화 (FileUploadZone)
        - [x] 우선순위 로딩 (첫 3개 이미지)
        - [x] 자동 이미지 포맷 최적화 (WebP, AVIF)
        - [x] 반응형 이미지 및 lazy loading
- [x] 썸네일 업로드 기능
    - [x] 글 작성 시 썸네일 이미지 자동 선정
    - [x] 썸네일 URL 자동 저장
    - [x] 글 수정 시 썸네일 자동 업데이트
    - [x] 이미지 순서 변경 시 썸네일 자동 업데이트
- [x] 글 수정 페이지 UI
    - [x] `/admin/posts/[id]/edit` 페이지 구현
    - [x] 기존 데이터 로딩 및 표시
    - [x] 수정 폼 및 유효성 검사
    - [x] Server Component로 변환 (성능 최적화)
    - [x] temp 폴더 자동 초기화
- [x] 글 상세 페이지
    - [x] `/posts/[id]` 페이지 구현
    - [x] MarkdownRenderer 활용한 마크다운 렌더링
    - [x] 썸네일 이미지 표시
    - [x] 해시태그 및 메타 정보 표시
    - [x] Admin 수정 버튼
- [x] 홈페이지 글 목록
    - [x] 최신 글 6개 표시
    - [x] 반응형 그리드 레이아웃 (모바일 1열, 데스크탑 3열)
    - [x] 썸네일 및 해시태그 표시
- [x] 글 목록 페이지
    - [x] `/posts` 페이지 구현
    - [x] 모든 글 표시 (최대 50개)
    - [x] 동일한 카드 레이아웃
- [x] 이미지 관리 시스템
    - [x] 글 수정 시 이미지 추가/삭제 추적
    - [x] 사라진 이미지 permanent에서 자동 제거
    - [x] 새로 추가된 temp 이미지 permanent로 자동 이동
    - [x] 마크다운 내용의 temp URL을 permanent URL로 자동 업데이트
    - [x] 이미지 순서 변경 시 썸네일 자동 업데이트
    - [x] 이미지가 없을 때 썸네일 URL 자동 제거
- [x] 코드 중복 제거 및 재사용성 향상
    - [x] extractImagePathsFromMarkdown 함수 재사용
    - [x] updateImageUrlsInMarkdown 함수 재사용
    - [x] file-upload.ts의 함수들을 actions.ts에서 import하여 사용

### Phase 6: 글 목록 및 상세 페이지

- [x] 홈페이지 글 목록 표시
- [x] 반응형 그리드 레이아웃 (모바일 1열, 데스크탑 3열)
- [ ] 무한 스크롤 구현
- [ ] 정렬 기능 (최신순, 인기순)
- [ ] 해시태그별 필터링
- [x] 글 상세 페이지
- [x] 조회수 증가 로직
    - [x] Server Action으로 조회수 증가
    - [x] 원자적 업데이트를 위한 PostgreSQL RPC 함수 구현
    - [x] 경쟁 조건 방지 및 동시성 안전성 확보
- [ ] React Query 캐싱 구현
    - [ ] 글 목록 캐싱 (페이지네이션)
    - [ ] 글 상세 캐싱
    - [ ] 해시태그별 글 목록 캐싱
    - [ ] 무한 스크롤 캐싱 최적화

### Phase 7: 검색 및 필터링

- [ ] 검색바 컴포넌트
- [ ] 검색어 + 해시태그 조합 검색
- [ ] 해시태그 자동완성 검색
- [ ] 검색 결과 페이지
- [ ] URL 파라미터 기반 검색 상태 관리
- [ ] 검색 결과 캐싱 전략
    - [ ] 검색어별 결과 캐싱
    - [ ] 해시태그별 결과 캐싱
    - [ ] 검색 결과 페이지네이션 캐싱

### Phase 8: 댓글 시스템

- [ ] 댓글 작성/수정/삭제
- [ ] 대댓글 기능 (1단계 계층)
- [ ] 댓글 목록 표시
- [ ] 댓글 권한 관리 (작성자만 수정/삭제)
- [ ] 댓글 실시간 업데이트
- [ ] 댓글 캐싱 및 실시간 동기화
    - [ ] 댓글 목록 캐싱
    - [ ] 댓글 작성/수정/삭제 시 캐시 무효화
    - [ ] Optimistic Updates 구현

### Phase 9: 좋아요 시스템

- [ ] 좋아요 토글 기능
- [ ] 좋아요 수 실시간 업데이트
- [ ] 좋아요 상태 관리
- [ ] 좋아요 권한 관리 (로그인 사용자만)
- [ ] 좋아요 캐싱 및 실시간 동기화
    - [ ] 좋아요 상태 캐싱
    - [ ] 좋아요 수 캐싱
    - [ ] Optimistic Updates 구현
    - [ ] 좋아요 토글 시 관련 캐시 무효화

### Phase 10: 최적화 및 테스트

- [ ] 이미지 최적화 (Next.js Image)
- [ ] SEO 최적화
- [ ] 성능 최적화 (React.memo, useMemo, useCallback)
- [ ] React Query 성능 최적화
    - [ ] 캐시 TTL 설정
    - [ ] 백그라운드 리페치 설정
    - [ ] 캐시 크기 제한 및 가비지 컬렉션
- [ ] 단위 테스트 작성 (Vitest)
- [ ] 컴포넌트 테스트 (Testing Library)
- [ ] E2E 테스트 (Playwright)

### Phase 11: 배포 및 운영

- [ ] Vercel 배포 설정
- [ ] 환경 변수 설정 (프로덕션)
- [ ] 도메인 연결
- [ ] 모니터링 및 로깅
- [ ] 백업 전략

## 재사용 가능한 컴포넌트 목록

- [ ] Header (네비게이션, 로그인 상태, Admin 메뉴)
- [ ] UserMenu (프로필 클릭 시 나타나는 Dialog)
- [ ] SearchBar (검색어 + 해시태그 입력)
- [ ] HashtagAutocomplete (해시태그 자동완성)
- [ ] PostCard (글 목록의 개별 글)
- [ ] CommentForm (댓글 작성 폼)
- [ ] CommentItem (댓글/대댓글 표시)
- [ ] MarkdownEditor (마크다운 작성 + 미리보기)
- [ ] Pagination (페이지네이션)
- [ ] LoadingSpinner (로딩 상태)
- [ ] QueryProvider (React Query 설정)
- [ ] CacheBoundary (캐시 경계 컴포넌트)

## 환경 설정 파일

- [ ] `.env.local` - 로컬 환경 변수
- [ ] `.env.example` - 환경 변수 예시
- [ ] `next.config.js` - Next.js 설정
- [ ] `tailwind.config.js` - Tailwind CSS 설정
- [ ] `tsconfig.json` - TypeScript 설정
- [ ] `package.json` - 의존성 관리
- [ ] `supabase/config.toml` - Supabase 설정

## 각 단계별 완료 기준

1. **기능 구현 완료**: 해당 기능이 요구사항에 맞게 동작
2. **테스트 통과**: 관련 테스트 코드 작성 및 통과
3. **코드 리뷰**: 코드 품질 및 아키텍처 검토
4. **문서화**: API 문서, 컴포넌트 사용법 등 문서 작성
5. **배포 테스트**: 스테이징 환경에서 기능 검증

## 브랜치 전략

- `main`: 메인 브랜치 (안정 버전)
- `develop`: 개발 브랜치
- `feature/phase-{번호}-{기능명}`: 기능별 개발 브랜치
- `hotfix/긴급수정`: 긴급 수정 브랜치

각 Phase 완료 시 develop 브랜치에 머지하고, 모든 Phase 완료 후 main 브랜치에 머지
