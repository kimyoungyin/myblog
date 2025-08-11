import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 데이터베이스 테이블 타입 정의
export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    email: string;
                    full_name: string | null;
                    avatar_url: string | null;
                    is_admin: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email: string;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    is_admin?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    is_admin?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            hashtags: {
                Row: {
                    id: number;
                    name: string;
                    created_at: string;
                };
                Insert: {
                    id?: number;
                    name: string;
                    created_at?: string;
                };
                Update: {
                    id?: number;
                    name?: string;
                    created_at?: string;
                };
            };
            posts: {
                Row: {
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
                };
                Insert: {
                    id?: number;
                    title: string;
                    content: string;
                    content_markdown: string;
                    thumbnail_url?: string | null;
                    view_count?: number;
                    likes_count?: number;
                    comments_count?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: number;
                    title?: string;
                    content?: string;
                    content_markdown?: string;
                    thumbnail_url?: string | null;
                    view_count?: number;
                    likes_count?: number;
                    comments_count?: number;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            post_hashtags: {
                Row: {
                    id: number;
                    post_id: number;
                    hashtag_id: number;
                };
                Insert: {
                    id?: number;
                    post_id: number;
                    hashtag_id: number;
                };
                Update: {
                    id?: number;
                    post_id?: number;
                    hashtag_id?: number;
                };
            };
            comments: {
                Row: {
                    id: number;
                    content: string;
                    post_id: number;
                    author_id: string;
                    parent_id: number | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: number;
                    content: string;
                    post_id: number;
                    author_id: string;
                    parent_id?: number | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: number;
                    content?: string;
                    post_id?: number;
                    author_id?: string;
                    parent_id?: number | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            likes: {
                Row: {
                    id: number;
                    post_id: number;
                    user_id: string;
                    created_at: string;
                };
                Insert: {
                    id?: number;
                    post_id: number;
                    user_id: string;
                    created_at?: string;
                };
                Update: {
                    id?: number;
                    post_id?: number;
                    user_id?: string;
                    created_at?: string;
                };
            };
        };
    };
};
