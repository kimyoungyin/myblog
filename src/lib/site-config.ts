export type SiteEnvironment = 'development' | 'test' | 'production';

const SITE_URL_ENV_NAME = 'NEXT_PUBLIC_SITE_URL';

function currentEnvironment(): SiteEnvironment {
    if (process.env.NODE_ENV === 'production') return 'production';
    if (process.env.NODE_ENV === 'test') return 'test';
    return 'development';
}

/**
 * Validate and normalize the public origin used in canonical URLs and feeds.
 *
 * The parser is kept pure so build-time configuration and unit tests can use
 * the same contract without mutating process.env.
 */
export function parseSiteUrl(
    rawValue: string | undefined,
    environment: SiteEnvironment = currentEnvironment()
): string {
    const value = rawValue?.trim();

    if (!value) {
        throw new Error(
            `${SITE_URL_ENV_NAME} is required. Set it to the public site origin, for example https://example.com.`
        );
    }

    let url: URL;
    try {
        url = new URL(value);
    } catch {
        throw new Error(
            `${SITE_URL_ENV_NAME} must be an absolute URL, for example https://example.com.`
        );
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(
            `${SITE_URL_ENV_NAME} must use the http or https protocol.`
        );
    }

    if (environment === 'production' && url.protocol !== 'https:') {
        throw new Error(
            `${SITE_URL_ENV_NAME} must use HTTPS in production.`
        );
    }

    if (url.username || url.password || url.search || url.hash) {
        throw new Error(
            `${SITE_URL_ENV_NAME} must contain only the public site origin and optional path.`
        );
    }

    const pathname = url.pathname.replace(/\/+$/, '');
    url.pathname = pathname || '/';

    const normalized = url.toString();
    return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

/** Return the validated public site origin. */
export function getSiteUrl(): string {
    return parseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
}

/** Build an absolute URL from the validated public site origin. */
export function toSiteUrl(path = '/'): string {
    const relativePath = path.replace(/^\/+/, '');
    return new URL(relativePath, `${getSiteUrl()}/`).toString();
}
