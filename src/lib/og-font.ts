import { readFile } from 'node:fs/promises';

/**
 * OG 이미지(ImageResponse)용 한국어 폰트 로더.
 *
 * `next/og`의 렌더러(satori)는 시스템 한글 폰트를 갖고 있지 않다. 외부
 * 네트워크에 의존하지 않도록 저장소의 Noto Sans KR Korean subset을 읽고,
 * 모듈 단위 Promise cache로 같은 프로세스의 반복 요청에서 재사용한다.
 */
const fontCache = new Map<400 | 700, Promise<ArrayBuffer>>();

export interface OgFont {
    name: string;
    data: ArrayBuffer;
    weight: 400 | 700;
}

export function loadKoreanFont(weight: 400 | 700): Promise<ArrayBuffer> {
    const cached = fontCache.get(weight);
    if (cached) return cached;

    const filename =
        weight === 700 ? 'NotoSansKR-Bold.ttf' : 'NotoSansKR-Regular.ttf';
    const fontPromise = readFile(
        new URL(`../assets/fonts/${filename}`, import.meta.url)
    )
        .then((buffer) => {
            const arrayBuffer = new ArrayBuffer(buffer.byteLength);
            new Uint8Array(arrayBuffer).set(buffer);
            return arrayBuffer;
        })
        .catch((error: unknown) => {
            // 실패한 Promise를 캐시에 남기지 않아 다음 요청이 재시도할 수 있게 한다.
            fontCache.delete(weight);
            throw error;
        });

    fontCache.set(weight, fontPromise);
    return fontPromise;
}

export async function loadKoreanFonts(): Promise<OgFont[]> {
    const [bold, regular] = await Promise.all([
        loadKoreanFont(700),
        loadKoreanFont(400),
    ]);

    return [
        { name: 'Noto Sans KR', data: bold, weight: 700 },
        { name: 'Noto Sans KR', data: regular, weight: 400 },
    ];
}
