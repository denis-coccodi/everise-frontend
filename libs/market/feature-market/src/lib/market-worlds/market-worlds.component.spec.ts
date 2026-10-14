import { renderOre } from '../market-page-testing';

describe('MarketWorldsComponent', () => {
  const buttons = (page: HTMLElement) => [...page.querySelectorAll('cdt-market-worlds button')] as HTMLButtonElement[];
  const pressed = (page: HTMLElement) =>
    buttons(page)
      .filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.textContent?.trim());

  it("lists the region's worlds by data centre, the home world and today's cheapest drawn", async () => {
    const { page } = await renderOre();

    const groups = [...page.querySelectorAll('cdt-market-worlds .data-centre')].map((g) =>
      g.getAttribute('aria-label'),
    );
    expect(groups).toEqual(['Light', 'Chaos']);
    expect(buttons(page).map((b) => b.textContent?.trim())).toEqual(['Odin', 'Phoenix', 'Shiva', 'Moogle']);
    expect(pressed(page)).toEqual(['Odin', 'Phoenix']);
  });

  it('draws the worlds pressed, in the link', async () => {
    const { fixture, page, query } = await renderOre();

    buttons(page)[3].click();
    await fixture.whenStable();
    expect(pressed(page)).toEqual(['Odin', 'Phoenix', 'Moogle']);
    expect(query()['worlds']).toBe('odin,phoenix,moogle');
    const legend = [...page.querySelectorAll('cdt-line-chart .legend li .name')].map((n) => n.textContent);
    expect(legend).toEqual(['Odin', 'Phoenix', 'Moogle']);

    buttons(page)[0].click();
    await fixture.whenStable();
    expect(query()['worlds']).toBe('phoenix,moogle');
  });
});
