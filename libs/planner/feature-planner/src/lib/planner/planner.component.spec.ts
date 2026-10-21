import { renderPlanner } from '../planner-page-testing';

describe('PlannerComponent', () => {
  it('tells guests what it does and how to get in, without asking for a report', async () => {
    const { page, http } = await renderPlanner('/planner', { signedIn: false });

    expect(page.querySelector('h1')?.textContent).toBe('Fight Planner');
    expect(page.querySelector('.pitch')?.textContent).toContain('Every hit explained.');
    const links = [...page.querySelectorAll('.actions a')].map((a) => [a.textContent?.trim(), a.getAttribute('href')]);
    expect(links).toEqual([
      ['Sign in', '/login'],
      ['Sign up', '/register'],
    ]);
    expect(page.querySelector('cdt-planner-tool')).toBeNull();
    http.expectNone(() => true);
  });

  it('gives members the tool', async () => {
    const { page } = await renderPlanner();

    expect(page.querySelector('cdt-planner-tool')).not.toBeNull();
    expect(page.querySelector('.pitch')).toBeNull();
  });

  it.each([true, false])('thanks FFLogs and XIVAPI, for everyone (signed in: %s)', async (signedIn) => {
    const { page } = await renderPlanner('/planner', { signedIn });

    const credits = page.querySelector('.credits');
    expect([...(credits?.querySelectorAll('a') ?? [])].map((a) => a.getAttribute('href'))).toEqual([
      'https://www.fflogs.com',
      'https://v2.xivapi.com',
    ]);
  });
});
