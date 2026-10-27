import {
  click,
  openPlan,
  planEveryone,
  pullTimeline,
  replanTick,
  waitFor,
  withHallowedGround,
} from '../planner-page-testing';

describe('PlanViewComponent', () => {
  beforeEach(() => localStorage.clear());

  const select = (page: HTMLElement) =>
    page.querySelector<HTMLSelectElement>('cdt-planner-plan-view .invulnerabilities select');
  const messages = (page: HTMLElement) =>
    [...page.querySelectorAll('cdt-planner-plan-view cdt-message')].map((m) => m.textContent?.trim());

  it("offers a replanned tank's invulnerabilities, where the pull had them by default", async () => {
    const timeline = pullTimeline();
    timeline.playerCasts.push({ at: 62_000, source: 1, target: null, action: 30, castMs: null });
    const rendered = await openPlan(timeline, withHallowedGround());

    expect(select(rendered.page)).toBeNull();
    click(rendered, replanTick(rendered.page, 'Tank Main'));
    await waitFor(rendered, () => !!select(rendered.page));

    expect(rendered.page.querySelector('label[for^=planner-invulnerability]')?.textContent).toContain(
      'Hallowed Ground',
    );
    const field = select(rendered.page) as HTMLSelectElement;
    expect([...field.options].map((o) => o.textContent?.trim())).toEqual([
      'Only if needed',
      'Never',
      '1:05 Killer Voice',
    ]);
    expect(field.selectedOptions[0].textContent).toBe('1:05 Killer Voice');

    field.value = 'never';
    field.dispatchEvent(new Event('change'));
    rendered.fixture.detectChanges();
    expect(select(rendered.page)?.selectedOptions[0].textContent).toBe('Never');
  });

  it("says how the plan went for the player, and which invulnerability it couldn't use", async () => {
    // Hallowed Ground twice for one hit: the second is within its recast.
    const timeline = pullTimeline();
    timeline.playerCasts.push(
      { at: 62_000, source: 1, target: null, action: 30, castMs: null },
      { at: 63_000, source: 1, target: null, action: 30, castMs: null },
    );
    const rendered = await openPlan(timeline, withHallowedGround());
    await waitFor(rendered, () => !!replanTick(rendered.page, 'Tank Main'));

    await planEveryone(rendered);
    await waitFor(rendered, () => !!messages(rendered.page)[0]);

    expect(messages(rendered.page)).toEqual([
      "Every hit on Tank Main leaves at least 10% of their max HP. The plan couldn't use Hallowed Ground at 1:05 Killer Voice: the recast doesn't allow it.",
    ]);
  });

  it('lets a replanned healer favour damage or healing', async () => {
    const rendered = await openPlan();
    const favour = () => rendered.page.querySelector<HTMLSelectElement>('#planner-favour');

    // The tank's tab: no such choice.
    click(rendered, replanTick(rendered.page, 'Tank Main'));
    expect(favour()).toBeNull();

    click(rendered, rendered.page.querySelectorAll<HTMLButtonElement>('[aria-label=Players] button')[1]);
    expect(favour()).toBeNull();
    click(rendered, replanTick(rendered.page, 'Heal Main'));
    expect(favour()?.selectedOptions[0].textContent).toBe('Damage');

    const field = favour() as HTMLSelectElement;
    field.value = 'healing';
    field.dispatchEvent(new Event('change'));
    rendered.fixture.detectChanges();
    expect(favour()?.selectedOptions[0].textContent).toBe('Healing');
  });

  it('lets a replanned scholar pick their opener, the standard one by default', async () => {
    const rendered = await openPlan();
    const opener = () => rendered.page.querySelector<HTMLSelectElement>('#planner-opener');

    click(rendered, rendered.page.querySelectorAll<HTMLButtonElement>('[aria-label=Players] button')[1]);
    expect(opener()).toBeNull();
    click(rendered, replanTick(rendered.page, 'Heal Main'));
    expect([...(opener()?.options ?? [])].map((o) => o.textContent?.trim())).toEqual([
      'Use standard opener',
      'Dissipation first',
      'None: planned without an opener',
    ]);
    expect(opener()?.selectedOptions[0].textContent?.trim()).toBe('Use standard opener');

    const field = opener() as HTMLSelectElement;
    field.value = 'dissipation-first';
    field.dispatchEvent(new Event('change'));
    rendered.fixture.detectChanges();
    expect(opener()?.selectedOptions[0].textContent?.trim()).toBe('Dissipation first');
    expect(rendered.page.querySelector('cdt-planner-plan-view cdt-field')?.textContent).toContain(
      'Dissipation first, from Icy Veins (7.55), The Balance (7.4)',
    );
  });

  it('keeps the plan when another player is picked, showing their part', async () => {
    const timeline = pullTimeline();
    timeline.damage[3].unmitigated = 300_000;
    const rendered = await openPlan(timeline);
    await planEveryone(rendered);

    click(rendered, rendered.page.querySelectorAll<HTMLButtonElement>('[aria-label=Players] button')[1]);

    expect(rendered.page.querySelector('#planner-timeline-heading')?.textContent?.trim()).toBe(
      "Heal Main's pull and plan",
    );
    expect(messages(rendered.page)[0]).toBe('1 hit on Heal Main leaves less than 10% of their max HP.');
    const log = [...rendered.page.querySelectorAll('cdt-planner-pull-compare td.plan')].map((td) => td.textContent);
    expect(log.join(' ')).toContain('Short');
    expect(log.join(' ')).toContain('took 210,000 as played');
  });
});
