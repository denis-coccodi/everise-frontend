import { CODE, renderPlanner } from '../planner-page-testing';

describe('ReportFormComponent', () => {
  async function submit(link: string) {
    const rendered = await renderPlanner();
    const input = rendered.page.querySelector<HTMLInputElement>('#planner-report');
    if (!input) throw new Error('no field');
    input.value = link;
    input.dispatchEvent(new Event('input'));
    rendered.fixture.detectChanges();
    rendered.page.querySelector<HTMLButtonElement>('button[type=submit]')?.click();
    await rendered.navigated();
    rendered.fixture.detectChanges();
    return rendered;
  }

  it('labels the field and says what to paste', async () => {
    const { page } = await renderPlanner();

    expect(page.querySelector('label[for=planner-report]')?.textContent).toContain('FFLogs report link');
    expect(page.querySelector('cdt-planner-report-form')?.textContent).toContain('Public and unlisted reports.');
  });

  it("opens the report a pull's link names, and that pull", async () => {
    const { query, http } = await submit(`https://www.fflogs.com/reports/${CODE}#fight=3`);

    expect(query()).toEqual({ report: CODE, pull: '3' });
    expect(http.match(() => true).map((r) => r.request.url)).toEqual([
      `/planner/reports/${CODE}`,
      `/planner/reports/${CODE}/pulls/3`,
      '/planner/catalog',
    ]);
  });

  it("says when what's pasted isn't a report link", async () => {
    const { page, query } = await submit('https://www.fflogs.com/character/eu/odin/someone');

    expect(query()).toEqual({});
    expect(page.querySelector('cdt-planner-report-form cdt-message')?.textContent?.trim()).toBe(
      "That isn't an FFLogs report link. Copy it from the report's page on fflogs.com.",
    );
  });
});
