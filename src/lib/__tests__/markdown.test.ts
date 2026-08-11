import { describe, expect, it } from 'vitest';
import { countWords, extractDescription, stripMarkdown } from '../markdown';

describe('stripMarkdown', () => {
    it('keeps readable labels while removing markup and URLs', () => {
        const markdown = `
            # 제목
            본문 **강조**와 [문서 링크](https://example.com),
            ![대체 텍스트](https://example.com/image.png)
            <span>HTML</span>
            \`인라인 코드\`
            \`\`\`ts
            const hidden = true;
            \`\`\`
        `;

        const plain = stripMarkdown(markdown);

        expect(plain).toContain('제목');
        expect(plain).toContain('문서 링크');
        expect(plain).toContain('대체 텍스트');
        expect(plain).toContain('HTML');
        expect(plain).not.toContain('https://');
        expect(plain).not.toContain('hidden');
    });
});

describe('extractDescription', () => {
    it('cuts at a natural sentence boundary when possible', () => {
        const description = extractDescription(
            '검색엔진에 노출될 설명으로 충분히 긴 첫 번째 문장입니다. 다음 문장은 잘려야 합니다. '.repeat(
                10
            ),
            40
        );

        expect(description).toBe(
            '검색엔진에 노출될 설명으로 충분히 긴 첫 번째 문장입니다.'
        );
    });

    it('does not exceed the requested length for a long word', () => {
        const description = extractDescription('가'.repeat(200), 80);

        expect(description.length).toBe(80);
        expect(description.endsWith('…')).toBe(true);
    });
});

describe('countWords', () => {
    it('counts plain-text words after Markdown is removed', () => {
        expect(countWords('# 제목\n\n첫 번째 **본문**입니다.')).toBe(4);
        expect(countWords('')).toBe(0);
    });
});
