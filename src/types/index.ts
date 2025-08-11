// 기본 사용자 타입
export interface User {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
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
    thumbnail_url?: string;
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
