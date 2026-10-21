import { CODE, fightReport, renderPlanner, renderPull } from '../planner-page-testing';

describe('PullViewComponent', () => {
  it('heads the pull with its fight and length, and gives a tab per player', async () => {
    const { page } = await renderPull();

    expect(page.querySelector('cdt-planner-pull-view')?.textContent).toContain('Vamp Fatale, 5:03');
    const tabs = [...page.querySelectorAll('[aria-label=Players] button')];
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual(['PLD Tank Main', 'SCH Heal Main']);
    expect(page.querySelector('cdt-planner-player-log')?.textContent).toContain('Rampart');
    // Opened from a link, not picked: the focus stays where it was.
    expect(document.activeElement?.tagName).not.toBe('CDT-PLANNER-PULL-VIEW');
  });

  it("shows another player's pull from their tab", async () => {
    const { page, fixture } = await renderPull();

    page.querySelectorAll<HTMLButtonElement>('[aria-label=Players] button')[1].click();
    fixture.detectChanges();

    expect(page.querySelector('cdt-planner-pull-view h3')?.textContent).toBe("Heal Main's pull");
    expect(page.querySelector('cdt-planner-player-log')?.textContent).toContain('Adloquium');
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
