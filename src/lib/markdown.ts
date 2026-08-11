/**
 * 마크다운 → 평문 변환 유틸.
 *
 * 메타 디스크립션 · Open Graph · JSON-LD 등 검색엔진/소셜에 노출되는
 * 텍스트를 만들 때 사용한다. 마크다운 문법 기호뿐 아니라 링크/이미지의
 * 원본 URL까지 제거해, 스니펫에 날 URL이 섞이지 않도록 한다.
 *
 * 신규 의존성 없이 정규식 기반으로 구현한다(서버 컴포넌트에서 동기 호출).
 */

/**
 * 마크다운 문자열을 사람이 읽는 평문으로 변환한다.
 * - 코드펜스/인라인 코드, 이미지/링크 문법, 헤딩·강조·인용 기호, HTML 태그 제거
 * - 이미지/링크는 표시 텍스트(alt/label)만 남기고 URL은 버린다
 * - 연속 공백/개행은 하나의 공백으로 정리
 */
export function stripMarkdown(markdown: string): string {
    if (!markdown) return '';

    return (
        markdown
            // 코드펜스 블록 전체 제거 (```lang\n...\n```)
            .replace(/```[\s\S]*?```/g, ' ')
            // 인라인 코드 → 내용만 유지
            .replace(/`([^`]+)`/g, '$1')
            // 이미지 ![alt](url) → alt (URL 제거)
            .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
            // 링크 [text](url) → text (URL 제거)
            .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
            // 참조식 링크/이미지 정의 라인 제거 ([id]: url)
            .replace(/^\s*\[[^\]]*\]:\s*\S+.*$/gm, ' ')
            // HTML 태그 제거
            .replace(/<[^>]+>/g, ' ')
            // 헤딩 기호 (#) 제거
            .replace(/^\s{0,3}#{1,6}\s+/gm, '')
            // 인용부호 (>) 제거
            .replace(/^\s{0,3}>\s?/gm, '')
            // 순서 없는 목록 기호 (-, *, +) 제거
            .replace(/^\s{0,3}[-*+]\s+/gm, '')
            // 순서 있는 목록 기호 (1.) 제거
            .replace(/^\s{0,3}\d+\.\s+/gm, '')
            // 수평선 (---, ***, ___) 제거
            .replace(/^\s{0,3}([-*_])\1{2,}\s*$/gm, ' ')
            // 굵게/기울임/취소선 기호 제거
            .replace(/(\*\*|__)(.*?)\1/g, '$2')
            .replace(/(\*|_)(.*?)\1/g, '$2')
            .replace(/~~(.*?)~~/g, '$1')
            // 남은 강조/문법 기호 제거
            .replace(/[*_~`>#]/g, '')
            // 개행/연속 공백 정리
            .replace(/\s+/g, ' ')
            .trim()
    );
}

/**
 * 마크다운에서 검색엔진용 디스크립션을 추출한다.
 * 평문화 후 maxLen 근처의 자연스러운 문장/단어 경계에서 자른다.
 * (구글 스니펫 권장 길이 ~160자)
 */
export function extractDescription(markdown: string, maxLen = 160): string {
    const plain = stripMarkdown(markdown);
    if (maxLen <= 0 || !plain) return '';
    if (plain.length <= maxLen) return plain;

    const slice = plain.slice(0, maxLen);

    // 문장 종결부호(., !, ?, 。) 기준으로 자를 수 있으면 우선 적용
    const sentenceEnd = Math.max(
        slice.lastIndexOf('. '),
        slice.lastIndexOf('! '),
        slice.lastIndexOf('? '),
        slice.lastIndexOf('。')
    );
    if (sentenceEnd >= maxLen * 0.6) {
        return slice.slice(0, sentenceEnd + 1).trim();
    }

    // 아니면 마지막 공백(단어 경계)에서 자르고 말줄임표
    const lastSpace = slice.lastIndexOf(' ');
    const cut =
        lastSpace > 0
            ? slice.slice(0, lastSpace)
            : slice.slice(0, Math.max(0, maxLen - 1));
    return `${cut.trim()}…`;
}

/** 평문 기준 단어 수(JSON-LD wordCount용). 한글은 공백 분절이 약하므로 공백 기준. */
export function countWords(markdown: string): number {
    const plain = stripMarkdown(markdown);
    if (!plain) return 0;
    return plain.split(/\s+/).filter(Boolean).length;
}
