import { readFile } from 'node:fs/promises';

/**
 * OG 이미지(ImageResponse)용 한국어 폰트 로더.
 *
 * `next/og`의 렌더러(satori)는 시스템 한글 폰트를 갖고 있지 않다. 외부
 * 네트워크에 의존하지 않도록 저장소의 Noto Sans KR Korean subset을 읽고,
 * 모듈 단위 Promise cache로 같은 프로세스의 반복 요청에서 재사용한다.
 */
const fontCache = new Map<400 | 700, Promise<ArrayBuffer>>();

export function loadKoreanFont(weight: 400 | 700): Promise<ArrayBuffer> {
    const cached = fontCache.get(weight);
    if (cached) return cached;

    const filename =
        weight === 700 ? 'NotoSansKR-Bold.ttf' : 'NotoSansKR-Regular.ttf';
    const fontPromise = readFile(
        new URL(`../assets/fonts/${filename}`, import.meta.url)
    ).then((buffer) => {
        const arrayBuffer = new ArrayBuffer(buffer.byteLength);
        new Uint8Array(arrayBuffer).set(buffer);
        return arrayBuffer;
    });

    fontCache.set(weight, fontPromise);
    return fontPromise;
}
