import { describe, expect, it } from 'vitest';
import {
    getPostSeoFields,
    getSocialImageMetadata,
    resolveSocialImageSource,
} from '../seo-metadata';

describe('resolveSocialImageSource', () => {
    it('uses a valid HTTPS thumbnail', () => {
        expect(
            resolveSocialImageSource(
                'https://images.example.com/post.png?width=1200'
            )
        ).toEqual({
            kind: 'thumbnail',
            url: 'https://images.example.com/post.png?width=1200',
        });
    });

    it.each([undefined, null, '', 'http://images.example.com/post.png', 'not a url'])(
        'falls back to the generated card for %s',
        (thumbnailUrl) => {
            expect(resolveSocialImageSource(thumbnailUrl)).toEqual({
                kind: 'generated',
            });
        }
    );
});

describe('getSocialImageMetadata', () => {
    it('includes images only when a thumbnail is valid', () => {
        const metadata = getSocialImageMetadata(
            'https://images.example.com/post.png'
        );

        expect(metadata.openGraph.images).toEqual([
            {
                url: 'https://images.example.com/post.png',
                alt: '게시글 대표 이미지',
            },
        ]);
        expect(metadata.twitter.images).toEqual([
            'https://images.example.com/post.png',
        ]);
    });

    it('omits images so Next.js can use the file-based fallback', () => {
        const metadata = getSocialImageMetadata(null);

        expect(metadata.openGraph).not.toHaveProperty('images');
        expect(metadata.twitter).not.toHaveProperty('images');
    });
});

describe('getPostSeoFields', () => {
    it('uses the default description and generated image when content and thumbnail are empty', () => {
        expect(
            getPostSeoFields(
                {
                    id: 42,
                    content_markdown: '',
                    thumbnail_url: null,
                },
                'https://example.com'
            )
        ).toEqual({
            description:
                '김영인의 기술 블로그에서 공유하는 개발 경험과 지식입니다.',
            imageUrl: 'https://example.com/posts/42/opengraph-image',
            postUrl: 'https://example.com/posts/42',
        });
    });
});
