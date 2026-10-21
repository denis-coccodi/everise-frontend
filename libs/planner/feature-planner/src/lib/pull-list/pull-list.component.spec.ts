import { CODE, actionCatalog, fightReport, pullTimeline, renderPlanner } from '../planner-page-testing';

describe('PullListComponent', () => {
  async function renderReport() {
    const rendered = await renderPlanner(`/planner?report=${CODE}`);
    rendered.http.expectOne(`/planner/reports/${CODE}`).flush(fightReport());
    await rendered.settle();
    return rendered;
  }

  it("lists the report's pulls, a group per fight, saying how each went", async () => {
    const { page } = await renderReport();

    expect(page.querySelector('cdt-planner-pull-list h2')?.textContent).toBe('M9S prog');
    const groups = [...page.querySelectorAll('.encounter')].map((group) => [
      group.querySelector('h3')?.textContent?.trim(),
      [...group.querySelectorAll('button')].map((b) => b.textContent?.trim()),
    ]);
    expect(groups).toEqual([
      ['Vamp Fatale (Savage)', ['Pull 1: Wipe at 23.46%, 5:02', 'Pull 2: Kill, 5:03']],
      ['Doomtrain (Extreme)', ['Pull 1: Kill, 5:04']],
    ]);
    expect(page.querySelector('.others')?.textContent?.trim()).toBe('1 pull of other fights left out.');
  });

  it('picks a pull, and marks it', async () => {
    const { page, query, http, settle, navigated } = await renderReport();

    page.querySelectorAll<HTMLButtonElement>('.encounter button')[1].click();
    await navigated();
    http.expectOne(`/planner/reports/${CODE}/pulls/3`).flush(pullTimeline());
    http.expectOne('/planner/catalog').flush(actionCatalog());
    await settle();

    expect(query()).toEqual({ report: CODE, pull: '3' });
    expect(page.querySelectorAll('.encounter button')[1].getAttribute('aria-pressed')).toBe('true');
    expect(page.querySelectorAll('.encounter button')[0].getAttribute('aria-pressed')).toBe('false');
    // The pull's view takes the focus, past the rest of the list.
    expect(document.activeElement?.tagName).toBe('CDT-PLANNER-PULL-VIEW');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Vamp Fatale, 5:03');
  });

  it("says why a report can't be read", async () => {
    const { page, http, settle } = await renderPlanner(`/planner?report=${CODE}`);

    http
      .expectOne(`/planner/reports/${CODE}`)
      .flush(
        { errors: { body: ["There's no FFLogs report with that link. Check that it was copied whole."] } },
        { status: 404, statusText: '' },
      );
    await settle();

    expect(page.querySelector('cdt-planner-pull-list cdt-message')?.textContent?.trim()).toBe(
      "There's no FFLogs report with that link. Check that it was copied whole.",
    );
  });
});
