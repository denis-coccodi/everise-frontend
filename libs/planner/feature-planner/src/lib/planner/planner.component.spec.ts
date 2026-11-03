import { renderPlanner } from '../planner-page-testing';

describe('PlannerComponent', () => {
  it('gives guests the tool, and tells them how much they may load', async () => {
    const { page } = await renderPlanner('/planner', { signedIn: false });

    expect(page.querySelector('h1')?.textContent).toBe('Fight Planner');
    expect(page.querySelector('cdt-planner-tool')).not.toBeNull();
    const note = page.querySelector('.guest-note');
    expect(note?.textContent).toContain('up to 10 new reports and 10 new pulls an hour');
    expect(note?.querySelector('a')?.getAttribute('href')).toBe('/register');
  });

  it('gives members the tool, with no note', async () => {
    const { page } = await renderPlanner();

    expect(page.querySelector('cdt-planner-tool')).not.toBeNull();
    expect(page.querySelector('.guest-note')).toBeNull();
  });

  it.each([true, false])(
    "thanks FFLogs, XIVAPI and cactbot's authors, with its license, for everyone (signed in: %s)",
    async (signedIn) => {
      const { page } = await renderPlanner('/planner', { signedIn });

      const credits = page.querySelector('.credits');
      expect([...(credits?.querySelectorAll('a') ?? [])].map((a) => a.getAttribute('href'))).toEqual([
        'https://www.fflogs.com',
        'https://v2.xivapi.com',
        'https://github.com/OverlayPlugin/cactbot',
        'https://github.com/OverlayPlugin/cactbot/blob/main/LICENSE',
      ]);
      // What is read from it, and what isn't.
      expect(credits?.textContent).toContain('Nothing reads from or runs in the game.');
    },
  );
});
