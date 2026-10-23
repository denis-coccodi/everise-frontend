import { CODE, fightReport, renderPlanner, renderPull } from '../planner-page-testing';

describe('PullViewComponent', () => {
  it('heads the pull with its fight and length, and gives a tab per player', async () => {
    const { page } = await renderPull();

    expect(page.querySelector('cdt-planner-pull-view')?.textContent).toContain('Vamp Fatale, 5:03');
    const tabs = [...page.querySelectorAll('[aria-label=Players] button')];
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual(['PLD Tank Main', 'SCH Heal Main']);
    expect(page.querySelector('cdt-planner-pull-compare tbody')?.textContent).toContain('Rampart');
    // Opened from a link, not picked: the focus stays where it was.
    expect(document.activeElement?.tagName).not.toBe('CDT-PLANNER-PULL-VIEW');
  });

  it("shows another player's pull from their tab", async () => {
    const { page, fixture } = await renderPull();

    page.querySelectorAll<HTMLButtonElement>('[aria-label=Players] button')[1].click();
    fixture.detectChanges();

    expect(page.querySelector('#planner-timeline-heading')?.textContent?.trim()).toBe("Heal Main's pull");
    expect(page.querySelector('cdt-planner-pull-compare tbody')?.textContent).toContain('Adloquium');
  });

  it('folds the HP chart away, and remembers it', async () => {
    localStorage.removeItem('planner.hpChart');
    const { page, fixture } = await renderPull();
    const toggle = page.querySelector('#planner-hp-heading button') as HTMLButtonElement;

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(page.querySelector('#planner-hp cdt-planner-hp-chart')).not.toBeNull();

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(page.querySelector('#planner-hp cdt-planner-hp-chart')).toBeNull();
    expect(localStorage.getItem('planner.hpChart')).toBe('closed');
    localStorage.removeItem('planner.hpChart');
  });

  it('folds the timeline away, and opens it again at a moment picked on the chart', async () => {
    localStorage.removeItem('planner.timeline');
    const { page, fixture } = await renderPull();
    const toggle = page.querySelector('#planner-timeline-heading button') as HTMLButtonElement;

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(page.querySelector('cdt-planner-pull-compare')).toBeNull();
    expect(localStorage.getItem('planner.timeline')).toBe('closed');

    Element.prototype.scrollIntoView = () => undefined;
    const slider = page.querySelector('cdt-planner-hp-chart [role=slider]') as HTMLElement;
    slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(page.querySelector('cdt-planner-pull-compare tr.revealed')).not.toBeNull();
    localStorage.removeItem('planner.timeline');
  });

  it("says why a pull can't be read", async () => {
    const { page, http, settle } = await renderPlanner(`/planner?report=${CODE}&pull=3`);
    http.expectOne(`/planner/reports/${CODE}`).flush(fightReport());
    http
      .expectOne(`/planner/reports/${CODE}/pulls/3`)
      .flush(
        { errors: { body: ["FFLogs couldn't be reached. Try again in a few minutes."] } },
        { status: 502, statusText: '' },
      );
    http.expectOne('/planner/catalog').flush({ errors: { body: ['Later.'] } }, { status: 503, statusText: '' });
    await settle();

    expect(page.querySelector('cdt-planner-pull-view cdt-message')?.textContent?.trim()).toBe(
      "FFLogs couldn't be reached. Try again in a few minutes.",
    );
  });
});
