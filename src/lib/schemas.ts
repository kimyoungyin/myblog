import { z } from 'zod';

// 해시태그 검증 스키마
export const HashtagSchema = z.object({
    name: z
        .string()
        .min(2, '해시태그는 2글자 이상이어야 합니다.')
        .max(20, '해시태그는 20글자 이하여야 합니다.')
        .regex(/^[^#\s]+$/, '해시태그에 #, 공백을 포함할 수 없습니다.')
        .transform((val) => val.toLowerCase().trim()),
});

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
    hashtags: z
        .array(z.string().min(2).max(20))
        .min(1, '최소 하나의 해시태그가 필요합니다.')
        .max(10, '해시태그는 최대 10개까지 입력할 수 있습니다.')
        .transform((val) => val.map((tag) => tag.toLowerCase().trim())),
});

// 글 수정 스키마 (모든 필드가 선택적)
export const UpdatePostSchema = CreatePostSchema.partial();

// 해시태그 검색 스키마
export const SearchHashtagSchema = z.object({
    query: z
        .string()
        .min(2, '검색어는 2글자 이상이어야 합니다.')
        .max(50, '검색어는 50글자 이하여야 합니다.')
        .transform((val) => val.toLowerCase().trim()),
});

// 글 ID 검증 스키마
export const PostIdSchema = z.object({
    id: z
        .string()
        .regex(/^\d+$/, '올바른 글 ID가 아닙니다.')
        .transform((val) => parseInt(val, 10))
        .refine((val) => val > 0, '글 ID는 1 이상이어야 합니다.'),
});

// 페이지네이션 스키마
export const PaginationSchema = z.object({
    page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .refine((val) => val > 0, '페이지는 1 이상이어야 합니다.'),
    limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10))
        .refine(
            (val) => val >= 1 && val <= 100,
            '페이지 크기는 1-100 사이여야 합니다.'
        ),
});

// 사용자 프로필 검증 스키마
export const UserProfileSchema = z.object({
    id: z.string().min(1, '사용자 ID가 필요합니다.'),
    email: z.string().email('올바른 이메일 형식이 아닙니다.'),
    full_name: z.string().nullable().optional(),
    avatar_url: z.string().nullable().optional(),
    is_admin: z.boolean().default(false),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

// 댓글 생성 스키마
export const CreateCommentSchema = z.object({
    content: z
        .string()
        .min(1, '댓글 내용을 입력해주세요.')
        .max(1000, '댓글은 1,000글자 이하여야 합니다.')
        .transform((val) => val.trim()),
    post_id: z.number().int().positive('올바른 글 ID가 아닙니다.'),
    parent_id: z
        .number()
        .int()
        .positive('올바른 부모 댓글 ID가 아닙니다.')
        .nullable()
        .optional(),
});

// 댓글 수정 스키마
export const UpdateCommentSchema = z.object({
    content: z
        .string()
        .min(1, '댓글 내용을 입력해주세요.')
        .max(1000, '댓글은 1,000글자 이하여야 합니다.')
        .transform((val) => val.trim()),
});

// 댓글 ID 검증 스키마
export const CommentIdSchema = z.object({
    id: z
        .string()
        .regex(/^\d+$/, '올바른 댓글 ID가 아닙니다.')
        .transform((val) => parseInt(val, 10))
        .refine((val) => val > 0, '댓글 ID는 1 이상이어야 합니다.'),
});

// 좋아요 토글 스키마
export const ToggleLikeSchema = z.object({
    post_id: z.number().int().positive('올바른 글 ID가 아닙니다.'),
});

// 좋아요 상태 조회 스키마
export const GetLikeStatusSchema = z.object({
    post_id: z.number().int().positive('올바른 글 ID가 아닙니다.'),
    user_id: z.string().min(1, '사용자 ID가 필요합니다.').optional(),
});

// 타입 추론
export type CreatePostData = z.infer<typeof CreatePostSchema>;
export type UpdatePostData = z.infer<typeof UpdatePostSchema>;
export type HashtagData = z.infer<typeof HashtagSchema>;
export type SearchHashtagData = z.infer<typeof SearchHashtagSchema>;
export type PostIdData = z.infer<typeof PostIdSchema>;
export type PaginationData = z.infer<typeof PaginationSchema>;
export type UserProfileData = z.infer<typeof UserProfileSchema>;
export type CreateCommentData = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentData = z.infer<typeof UpdateCommentSchema>;
export type CommentIdData = z.infer<typeof CommentIdSchema>;
export type ToggleLikeData = z.infer<typeof ToggleLikeSchema>;
export type GetLikeStatusData = z.infer<typeof GetLikeStatusSchema>;

// 검증 에러 타입
export type ValidationError = {
    field: string;
    message: string;
};

// 검증 에러 변환 함수
export function formatZodError(error: z.ZodError): ValidationError[] {
    return error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
    }));
}
