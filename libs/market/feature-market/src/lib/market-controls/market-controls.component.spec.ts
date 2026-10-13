import { history, ORE, renderMarket } from '../market-page-testing';

describe('MarketControlsComponent', () => {
  async function shown(url = '/market?items=5111') {
    const rendered = await renderMarket(url);
    rendered.http.expectOne('/market/items/5111').flush({ items: [ORE] });
    rendered.http.expectOne((r) => r.url === '/market/history').flush(history([5111]));
    await rendered.fixture.whenStable();
    const field = (id: string) => rendered.page.querySelector(`#${id}`) as HTMLInputElement & HTMLSelectElement;
    const change = async (id: string, value: string) => {
      field(id).value = value;
      field(id).dispatchEvent(new Event('change'));
      await rendered.fixture.whenStable();
    };
    return { ...rendered, field, change };
  }

  it('lists each data centre and its worlds, and reads another place or quality', async () => {
    const { http, field, change, query } = await shown();

    const options = [...field('market-scope').querySelectorAll('option')].map((o) => o.textContent?.trim());
    expect(options).toEqual(['All of Light', 'Odin', 'Shiva']);
    expect(field('market-scope').value).toBe('odin');

    await change('market-scope', 'light');
    expect(http.expectOne((r) => r.params.get('scope') === 'light').request.params.get('items')).toBe('5111');
    expect(query()['scope']).toBe('light');

    await change('market-quality', 'hq');
    http.expectOne((r) => r.params.get('quality') === 'hq');
    expect(query()['quality']).toBe('hq');
  });

  it('keeps the days within the history, and has quick ranges', async () => {
    const { fixture, page, field, change, query, http } = await shown();

    await change('market-from', '2020-05-05');
    expect(query()['from']).toBeUndefined();
    expect(field('market-from').value).toBe('2023-01-02');

    await change('market-from', '2024-02-01');
    expect(query()['from']).toBe('2024-02-01');

    const presets = [...page.querySelectorAll('[aria-label="Quick ranges"] button')] as HTMLButtonElement[];
    expect(presets.map((b) => b.textContent?.trim())).toEqual(['Month', '3 months', 'Year', 'All']);
    presets[3].click();
    await fixture.whenStable();
    expect(query()['from']).toBeUndefined();
    expect(presets[3].getAttribute('aria-pressed')).toBe('true');
    http.expectNone((r) => r.url === '/market/history');
  });

  it('switches the price axis to a log scale', async () => {
    const { fixture, page, query } = await shown();

    (page.querySelector('cdt-checkbox input') as HTMLInputElement).click();
    await fixture.whenStable();
    expect(query()['scale']).toBe('log');
  });
});
