# SEO·검색엔진 색인·소셜 공유 품질 개선 가이드

이 문서는 SEO를 처음 구현하는 프론트엔드 개발자를 위한 개념과 실습
가이드다. 목표는 “검색 순위를 억지로 올리는 코드”를 만드는 것이 아니라,
검색엔진과 소셜 플랫폼이 페이지의 주소·제목·설명·이미지를 안정적으로
이해할 수 있는 HTML을 제공하는 것이다.

## 1. 먼저 구분해야 할 세 가지

| 단계 | 의미 | 프론트엔드가 도울 수 있는 것 |
| --- | --- | --- |
| 크롤링 | 검색봇이 링크를 따라 페이지를 요청하는 단계 | 내부 링크, `robots.txt`, 서버 렌더링 |
| 색인 | 요청한 페이지의 내용을 검색엔진 데이터베이스에 저장하는 단계 | canonical, `noindex`, sitemap, 의미 있는 HTML |
| 순위·노출 | 검색어와 품질 신호를 바탕으로 결과에 표시하는 단계 | 정확한 콘텐츠, 구조화 데이터, 성능·접근성 |

`sitemap.xml`을 만든다고 곧바로 색인되는 것은 아니다. sitemap은 발견을
돕는 목록이고, 실제 색인 여부는 검색엔진의 판단과 사이트 상태에 달려 있다.

## 2. 페이지의 기본 SEO 계약

### title과 description

- `title`: 브라우저 탭과 검색 결과 제목에 사용되는 핵심 제목
- `description`: 검색 결과의 설명 후보가 되는 짧은 요약
- 게시글 description은 본문 첫 부분에서 Markdown 문법을 제거해 생성한다.
- 검색엔진은 description을 언제든 다른 본문 구간으로 대체할 수 있으므로,
  원하는 문구가 반드시 노출된다고 보장하지 않는다.

### canonical

같은 콘텐츠에 여러 URL이 존재할 때 대표 URL을 알려준다. 검색어·필터가
붙은 검색 결과 페이지처럼 색인 가치가 낮은 페이지는 canonical과 함께
`noindex`를 고려한다.

### robots 메타데이터

`index`는 색인 허용 여부이고 `follow`는 페이지의 링크를 따라갈지에 대한
힌트다. `noindex`는 sitemap에 URL을 넣는 것으로 무효화할 수 없으므로,
색인하지 않을 URL은 sitemap에서도 제외하는 편이 일관적이다.

## 3. Open Graph와 Twitter 카드

검색엔진용 메타데이터와 소셜 공유용 메타데이터는 목적이 다르다.

- Open Graph: 카카오톡, Facebook 등 여러 공유 미리보기의 공통 규약
- Twitter 카드: X에서 사용하는 카드 형식과 이미지 지정
- `summary_large_image`는 큰 미리보기 카드를 요청한다.
- 이미지 URL은 외부 플랫폼이 접근할 수 있는 절대 URL이어야 한다.

게시글 대표 이미지 정책은 다음처럼 단순하게 유지하는 것이 좋다.

1. CMS에 유효한 HTTPS 썸네일이 있으면 원본을 사용한다.
2. 썸네일이 없거나 안전한 URL이 아니면 서버에서 브랜드 카드를 생성한다.
3. 이미지가 바뀌어도 소셜 플랫폼의 캐시 때문에 미리보기가 즉시 바뀌지 않을
   수 있다.

Next.js의 파일 기반 `opengraph-image`를 fallback으로 사용할 때는 동적
메타데이터에 `images: undefined`를 넣지 말고 `images` 속성 자체를 생략해야
한다. 속성이 존재하면 Next.js가 파일 기반 이미지를 자동으로 채우지 않을
수 있다.

## 4. JSON-LD와 Schema.org

JSON-LD는 화면에 보이는 UI와 별개로 콘텐츠의 의미를 설명하는 구조화 데이터다.
이 프로젝트는 다음 타입을 사용한다.

- `BlogPosting`: 게시글 제목, 작성자, 발행일, 수정일, 본문 요약
- `BreadcrumbList`: 홈 → 글 목록 → 현재 게시글의 이동 경로
- `WebSite`와 `SearchAction`: 사이트와 검색 기능의 관계

구조화 데이터는 rich result의 후보 정보를 제공하지만, rich result나 검색
순위를 보장하지 않는다. 화면에 실제로 존재하지 않는 정보를 JSON-LD에 넣으면
안 된다.

## 5. sitemap, robots.txt, RSS

- `sitemap.xml`: 색인 가치가 있는 공개 URL 목록
- `robots.txt`: 크롤러에게 접근 규칙과 sitemap 위치를 알리는 파일
- RSS: 구독·신디케이션과 새로운 글 발견을 돕는 피드

`robots.txt`는 보안 장치가 아니다. 관리자 페이지 보호는 인증·인가로 처리해야
한다. 반대로 `noindex`가 필요한 페이지를 robots.txt에서 막으면 검색봇이
메타데이터를 읽지 못해 noindex를 확인할 수 없는 상황이 생길 수 있다.

## 6. 의미 있는 HTML과 접근성

검색엔진이 이해하기 쉬운 문서는 사람에게도 읽기 쉽다.

- 페이지 제목은 `<h1>` 하나로 표현한다.
- 본문 제목은 `<h2>`부터 순서대로 사용한다.
- 이미지에는 내용을 설명하는 `alt`를 둔다.
- 링크 텍스트는 “여기”보다 목적을 설명한다.
- 자바스크립트로만 그린 핵심 텍스트는 서버 HTML에도 표현할 방법을 마련한다.

이 프로젝트는 Markdown 본문 제목을 페이지 제목보다 한 단계 낮은 HTML heading으로
렌더링하고, Mermaid 원본을 서버 HTML의 숨겨진 설명으로 남긴다. 이는 SEO만을
위한 꼼수가 아니라 화면 낭독기와 JS 실패 상황에서도 콘텐츠를 설명하기 위한
접근성 보완이다.

## 7. 구현 순서 실습

새 프로젝트에 적용한다면 다음 순서가 안전하다.

1. 공개 사이트의 canonical origin을 환경변수로 정한다.
2. 루트 레이아웃에 `metadataBase`, 기본 title, description을 둔다.
3. 게시글 상세 페이지에 동적 metadata와 canonical을 추가한다.
4. 본문에서 description을 추출하고 JSON-LD를 만든다.
5. sitemap·robots·RSS를 공개 URL 정책과 연결한다.
6. 썸네일이 없을 때 사용할 OG 이미지 fallback을 만든다.
7. 테스트와 실제 HTTP 응답으로 head·XML·이미지를 확인한다.

환경변수는 다음처럼 공개 origin만 담는다.

```bash
NEXT_PUBLIC_SITE_URL=https://blog.example.com
```

운영 환경에서는 HTTPS를 사용해야 한다. 비밀키를 `NEXT_PUBLIC_` 변수에 넣으면
브라우저 번들에 노출될 수 있으므로, 이 변수에는 공개 URL만 넣는다.

## 8. SEO가 해결하지 못하는 것

- 메타 태그만으로 검색 순위를 보장할 수 없다.
- JSON-LD만으로 rich result를 보장할 수 없다.
- sitemap만으로 새 글이 즉시 색인되지 않는다.
- 소셜 플랫폼의 이미지 캐시를 코드만으로 즉시 삭제할 수 없다.
- 검색엔진마다 지원하는 메타데이터와 처리 속도가 다르다.
- 실제 색인 상태는 배포 후 Search Console과 각 플랫폼의 디버거에서 확인해야 한다.

## 공식 참고 자료

- [Google Search Central](https://developers.google.com/search)
- [Google: 구조화 데이터 소개](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [Google: robots 메타 태그](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Google: sitemap 만들기](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Open Graph Protocol](https://ogp.me/)
- [Schema.org BlogPosting](https://schema.org/BlogPosting)
- [Schema.org BreadcrumbList](https://schema.org/BreadcrumbList)
- [Next.js Metadata와 OG 이미지](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
- [Next.js `opengraph-image`](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)
