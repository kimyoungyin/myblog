import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseSiteUrl, toSiteUrl } from '../site-config';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('parseSiteUrl', () => {
    it('requires a site URL', () => {
        expect(() => parseSiteUrl(undefined, 'development')).toThrow(
            /NEXT_PUBLIC_SITE_URL/
        );
    });

    it('normalizes trailing slashes', () => {
        expect(
            parseSiteUrl(' https://example.com/// ', 'production')
        ).toBe('https://example.com');
    });

    it('rejects invalid URLs', () => {
        expect(() => parseSiteUrl('myblog.example.com', 'development')).toThrow(
            /absolute URL/
        );
    });

    it('requires HTTPS in production', () => {
        expect(() =>
            parseSiteUrl('http://example.com', 'production')
        ).toThrow(/HTTPS/);
    });

    it('rejects non-http protocols', () => {
        expect(() =>
            parseSiteUrl('ftp://example.com', 'development')
        ).toThrow(/http or https protocol/);
    });

    it.each([
        ['credentials', 'https://user:password@example.com'],
        ['query strings', 'https://example.com?source=test'],
        ['hashes', 'https://example.com#section'],
    ])('rejects %s in the site URL', (_kind, value) => {
        expect(() => parseSiteUrl(value, 'development')).toThrow(
            /public site origin/
        );
    });

    it('preserves a configured base path while normalizing its trailing slash', () => {
        expect(parseSiteUrl('https://example.com/blog///')).toBe(
            'https://example.com/blog'
        );
    });

    it('resolves route paths below a configured base path', () => {
        vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com/blog');

        expect(toSiteUrl('/posts/42')).toBe(
            'https://example.com/blog/posts/42'
        );
    });
});
