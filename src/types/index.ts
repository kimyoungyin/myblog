// 기본 사용자 타입 (Supabase Auth 확장)
export interface User {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
}

// Supabase Auth 세션 타입
export interface AuthSession {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    user: {
        id: string;
        email: string;
        user_metadata: {
            full_name?: string;
            avatar_url?: string;
        };
    };
}

// 해시태그 타입
export interface Hashtag {
    id: number;
    name: string;
    created_at: string;
}

// 글 타입
export interface Post {
    id: number;
    title: string;
    content: string;
    content_markdown: string;
    thumbnail_url: string | null;
    view_count: number;
    likes_count: number;
    comments_count: number;
    created_at: string;
    updated_at: string;
    hashtags?: Hashtag[];
}

// 댓글 타입
export interface Comment {
    id: number;
    content: string;
    post_id: number;
    author_id: string;
    parent_id?: number;
    created_at: string;
    updated_at: string;
    author?: User;
    replies?: Comment[];
}

// 좋아요 타입
export interface Like {
    id: number;
    post_id: number;
    user_id: string;
    created_at: string;
}

// 검색 파라미터 타입
export interface SearchParams {
    query?: string;
    hashtags?: string[];
    page?: number;
    limit?: number;
    sort?: 'latest' | 'popular';
}

// 파일 업로드 관련 타입
export interface UploadedFile {
    id: string;
    name: string;
    url: string;
    type: 'image'; // 이미지만 허용
    size: number;
    path: string;
    uploaded_at: string;
    is_temporary: boolean;
}

export interface FileUploadConfig {
    maxFileSize: number; // 5MB in bytes
    allowedTypes: string[]; // 이미지 타입만
    storageBucket: string;
    maxFiles: number; // 최대 파일 개수
}

export interface FileUploadResult {
    success: boolean;
    error?: string;
    url: string;
    path: string;
    file?: UploadedFile; // 업로드된 파일 정보 (성공 시에만)
}

export interface FileUploadProgress {
    fileId: string;
    progress: number;
    status: 'uploading' | 'completed' | 'error';
}
