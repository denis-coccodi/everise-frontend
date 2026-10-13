import { describe, expect, it } from 'vitest';
import worker from './index';

const env = {
  API: { fetch: async () => new Response('{}') },
  ASSETS: { fetch: async () => new Response('<html></html>') },
  SITE_URL: 'https://everise.dev',
  SEARCH_ENGINES: 'allow',
};

describe('the Worker', () => {
  it("moves the home page's old address, /home, to / for good", async () => {
    const response = await worker.fetch(new Request('https://everise.dev/home?tag=roulette'), env);

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('https://everise.dev/?tag=roulette');
  });

  it("moves a data centre's old address to its query string for good, keeping the rest", async () => {
    const response = await worker.fetch(
      new Request('https://everise.dev/party-finder/chaos?listing=7&from=discord'),
      env,
    );

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('https://everise.dev/party-finder?dc=chaos&listing=7&from=discord');
  });
});
