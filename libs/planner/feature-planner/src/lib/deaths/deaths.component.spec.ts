import { pullTimeline, renderPull } from '../planner-page-testing';

describe('DeathsComponent', () => {
  beforeEach(() => localStorage.removeItem('planner.deaths'));

  it("lists the pull's deaths as played, with why and who is to blame", async () => {
    const { page } = await renderPull();
    const toggle = page.querySelector('#planner-deaths-heading button');
    expect(toggle?.textContent?.trim()).toBe('Deaths in this pull (1)');
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');

    const deaths = [...page.querySelectorAll('#planner-deaths .death')];
    expect(deaths).toHaveLength(1);
    expect(deaths[0].querySelector('.time')?.textContent).toBe('3:20');
    expect(deaths[0].querySelector('.who')?.textContent).toBe('Heal Main (SCH)');
    expect(deaths[0].querySelector('.reason')?.textContent?.trim()).toBeTruthy();
    expect(deaths[0].querySelector('.blame')?.textContent).toContain('To blame');
  });

  it('says when nobody died', async () => {
    const { page } = await renderPull({ ...pullTimeline(), deaths: [] });
    expect(page.querySelector('#planner-deaths-heading button')?.textContent?.trim()).toBe('Deaths in this pull (0)');
    expect(page.querySelector('#planner-deaths')?.textContent?.trim()).toBe('Nobody died in this pull.');
  });

  it('folds away, and remembers it', async () => {
    const { page, fixture } = await renderPull();
    const toggle = page.querySelector('#planner-deaths-heading button') as HTMLButtonElement;

    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(page.querySelector('#planner-deaths .death')).toBeNull();
    expect(localStorage.getItem('planner.deaths')).toBe('closed');
  });
});
