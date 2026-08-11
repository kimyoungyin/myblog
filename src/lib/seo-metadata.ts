import { extractDescription } from '@/lib/markdown';
import type { Post } from '@/types';

export const DEFAULT_POST_DESCRIPTION =
    '김영인의 기술 블로그에서 공유하는 개발 경험과 지식입니다.';

export type SocialImageSource =
    | { kind: 'thumbnail'; url: string }
    | { kind: 'generated' };

export interface SocialImageMetadata {
    openGraph: {
        images?: Array<{
            url: string;
            alt: string;
        }>;
    };
    twitter: {
        images?: string[];
    };
}

export interface PostSeoFields {
    description: string;
    imageUrl: string;
    postUrl: string;
}

/**
 * Select the explicit thumbnail or the route-based generated OG card.
 *
 * A HEAD request is intentionally avoided here. Metadata generation should
 * stay deterministic and fast; the URL policy is limited to safe HTTPS URLs.
 */
export function resolveSocialImageSource(
    thumbnailUrl: string | null | undefined
): SocialImageSource {
    const value = thumbnailUrl?.trim();
    if (!value) return { kind: 'generated' };

    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password) {
            return { kind: 'generated' };
        }

        return { kind: 'thumbnail', url: url.toString() };
    } catch {
        return { kind: 'generated' };
    }
}

/**
 * Build only explicit social image fields. An empty object is deliberate:
 * Next.js uses the file-based opengraph-image route when `images` is absent.
 */
export function getSocialImageMetadata(
    thumbnailUrl: string | null | undefined
): SocialImageMetadata {
    const source = resolveSocialImageSource(thumbnailUrl);

    if (source.kind === 'generated') {
        return {
            openGraph: {},
            twitter: {},
        };
    }

    return {
        openGraph: {
            images: [
                {
                    url: source.url,
                    alt: '게시글 대표 이미지',
                },
            ],
        },
        twitter: {
            images: [source.url],
        },
    };
}

export function getPostSeoFields(
    post: Pick<Post, 'id' | 'content_markdown' | 'thumbnail_url'>,
    siteUrl: string
): PostSeoFields {
    const postUrl = `${siteUrl}/posts/${post.id}`;
    const imageSource = resolveSocialImageSource(post.thumbnail_url);

    return {
        description:
            extractDescription(post.content_markdown) ||
            DEFAULT_POST_DESCRIPTION,
        imageUrl:
            imageSource.kind === 'thumbnail'
                ? imageSource.url
                : `${postUrl}/opengraph-image`,
        postUrl,
    };
}
