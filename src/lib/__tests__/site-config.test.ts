import { describe, expect, it } from 'vitest';
import { parseSiteUrl } from '../site-config';

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
});
