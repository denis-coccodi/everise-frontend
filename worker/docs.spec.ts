import { describe, expect, it } from 'vitest';
import { docsResponse, isDocs } from './docs';

// A GitHub Pages stand-in: answers with the address it was asked for.
function pages(answer: (url: string) => Response) {
  const asked: string[] = [];
  const fetcher = (async (input: RequestInfo | URL) => {
    const url = String(input);
    asked.push(url);
    return answer(url);
  }) as typeof fetch;
  return { asked, fetcher };
}

const html = () =>
  new Response('<h1>Page</h1>', { headers: { 'content-type': 'text/html', 'x-github-request-id': '1' } });

describe('the documentation', () => {
  it('is the guide and /docs, nothing else', () => {
    expect(['/guide', '/guide/tools/', '/docs', '/docs/backend/api.html'].every(isDocs)).toBe(true);
    expect(['/', '/guides', '/docsy', '/party-finder'].some(isDocs)).toBe(false);
  });

  it('reads each section from its GitHub Pages site', async () => {
    const { asked, fetcher } = pages(html);
    for (const path of ['/guide/tools/', '/docs/frontend/theme.html', '/docs/backend/features/admin.html?x=1']) {
      await docsResponse(new Request(`https://everise.dev${path}`), fetcher);
    }

    expect(asked).toEqual([
      'https://denis-coccodi.github.io/everise-frontend/guide/tools/',
      'https://denis-coccodi.github.io/everise-frontend/theme.html',
      'https://denis-coccodi.github.io/everise-backend/features/admin.html?x=1',
    ]);
  });

  it('keeps the page and its type, drops GitHub headers, and caches it for 5 minutes', async () => {
    const response = await docsResponse(new Request('https://everise.dev/guide/'), pages(html).fetcher);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('<h1>Page</h1>');
    expect(response.headers.get('content-type')).toBe('text/html');
    expect(response.headers.get('x-github-request-id')).toBeNull();
    expect(response.headers.get('cache-control')).toBe('public, max-age=300');
  });

  it("sends a section without its slash, and /docs, to the section's front page", async () => {
    const { asked, fetcher } = pages(html);
    const cases = {
      '/guide': 'https://everise.dev/guide/',
      '/docs/backend': 'https://everise.dev/docs/backend/',
      '/docs': 'https://everise.dev/docs/frontend/',
    };
    for (const [path, to] of Object.entries(cases)) {
      const response = await docsResponse(new Request(`https://everise.dev${path}`), fetcher);
      expect(response.status).toBe(301);
      expect(response.headers.get('location')).toBe(to);
    }
    expect(asked).toEqual([]);
  });

  it("turns GitHub Pages' redirects into this site's addresses", async () => {
    const { fetcher } = pages(
      () =>
        new Response(null, {
          status: 301,
          headers: { location: 'https://denis-coccodi.github.io/everise-backend/features/' },
        }),
    );

    const response = await docsResponse(new Request('https://everise.dev/docs/backend/features'), fetcher);

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('https://everise.dev/docs/backend/features/');
  });

  it('passes a missing page on as a 404', async () => {
    const { fetcher } = pages(
      () => new Response('Not found', { status: 404, headers: { 'content-type': 'text/html' } }),
    );

    expect((await docsResponse(new Request('https://everise.dev/docs/frontend/nope.html'), fetcher)).status).toBe(404);
  });
});
