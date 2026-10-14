import { day, history, renderOre } from '../market-page-testing';

describe('MarketControlsComponent', () => {
  async function shown() {
    const rendered = await renderOre();
    const field = (id: string) => rendered.page.querySelector(`#${id}`) as HTMLInputElement & HTMLSelectElement;
    const change = async (id: string, value: string) => {
      field(id).value = value;
      field(id).dispatchEvent(new Event('change'));
      await rendered.fixture.whenStable();
    };
    return { ...rendered, field, change };
  }

  it('picks the region, and Oceania too', async () => {
    const { fixture, http, page, field, change, query } = await shown();

    expect([...field('market-region').querySelectorAll('option')].map((o) => o.textContent?.trim())).toEqual([
      'Europe',
      'North America',
      'Oceania',
    ]);
    await change('market-region', 'north-america');
    expect(http.expectOne((r) => r.params.get('region') === 'north-america').request.params.get('item')).toBe('5111');
    expect(query()['region']).toBe('north-america');

    await change('market-region', 'europe');
    http.expectOne((r) => r.params.get('region') === 'europe').flush(history());
    (page.querySelector('cdt-checkbox input') as HTMLInputElement).click();
    await fixture.whenStable();
    const read = http.match((r) => r.url === '/market/history').map((r) => r.request.params.get('region'));
    expect(read).toEqual(['europe', 'oceania']);
    expect(query()['oceania']).toBe('show');
  });

  it('reads another quality', async () => {
    const { http, change, query } = await shown();

    await change('market-quality', 'hq');
    http.expectOne((r) => r.params.get('quality') === 'hq');
    expect(query()['quality']).toBe('hq');
  });

  it('shows the last month by default, keeps the days within the history, and has quick ranges', async () => {
    const { fixture, page, field, change, query, http } = await shown();
    expect(field('market-from').value).toBe(day(30));
    expect(field('market-from').min).toBe('2022-10-01');

    await change('market-from', '2020-05-05');
    expect(field('market-from').value).toBe('2022-10-01');
    expect(query()['from']).toBe('2022-10-01');
    http.expectOne((r) => r.params.get('from') === '2022-10-01').flush(history());

    const presets = [...page.querySelectorAll('[aria-label="Quick ranges"] button')] as HTMLButtonElement[];
    expect(presets.map((b) => b.textContent?.trim())).toEqual(['Week', 'Month', '3 months', 'Year', 'All']);
    expect(presets[4].getAttribute('aria-pressed')).toBe('true');
    presets[1].click();
    await fixture.whenStable();
    expect(query()['from']).toBeUndefined();
    expect(presets[1].getAttribute('aria-pressed')).toBe('true');
    http.expectOne((r) => r.params.get('from') === day(30));
  });

  it('switches the price axis to a log scale', async () => {
    const { fixture, page, query } = await shown();

    const boxes = [...page.querySelectorAll('cdt-checkbox')];
    (boxes.at(-1)?.querySelector('input') as HTMLInputElement).click();
    await fixture.whenStable();
    expect(query()['scale']).toBe('log');
  });
});
