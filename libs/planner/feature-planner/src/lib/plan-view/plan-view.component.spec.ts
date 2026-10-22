import { actionCatalog, pullTimeline, renderPull } from '../planner-page-testing';

// The pull with the scholar's last hit far past what any mitigation could
// bring within the margin.
function overwhelming() {
  const timeline = pullTimeline();
  timeline.damage[3].unmitigated = 300_000;
  return timeline;
}

// The pull with the scholar's last hit small enough to survive without a
// heal: nothing in the pull says what their heals do.
function survivable() {
  const timeline = pullTimeline();
  timeline.damage[3].unmitigated = 50_000;
  return timeline;
}

describe('PlanViewComponent', () => {
  beforeEach(() => localStorage.clear());

  async function openPlan(timeline = pullTimeline(), catalog = actionCatalog()) {
    const rendered = await renderPull(timeline, catalog);
    const viewTabs = rendered.page.querySelectorAll<HTMLButtonElement>('[aria-label=View] button');
    viewTabs[1].click();
    rendered.fixture.detectChanges();
    // The scheduler (imported on first use) gives the plan's options.
    await waitFor(rendered, () => !!rendered.page.querySelector('cdt-planner-plan-view .replan'));
    return rendered;
  }

  async function waitFor(rendered: Awaited<ReturnType<typeof renderPull>>, done: () => boolean) {
    for (let tries = 0; tries < 100 && !done(); tries++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      rendered.fixture.detectChanges();
    }
  }

  const button = (page: HTMLElement, text: string) =>
    [...page.querySelectorAll<HTMLButtonElement>('cdt-planner-plan-view button')].find((b) =>
      b.textContent?.includes(text),
    ) as HTMLButtonElement;
  const checkbox = (page: HTMLElement, text: string) =>
    [...page.querySelectorAll('cdt-planner-plan-view cdt-checkbox')]
      .find((c) => c.textContent?.includes(text))
      ?.querySelector('input') as HTMLInputElement;
  const click = (rendered: Awaited<ReturnType<typeof renderPull>>, element: HTMLElement) => {
    element.click();
    rendered.fixture.detectChanges();
  };

  async function plan(rendered: Awaited<ReturnType<typeof openPlan>>, margin?: string) {
    click(rendered, button(rendered.page, 'Everyone'));
    const input = rendered.page.querySelector<HTMLInputElement>('#planner-margin');
    if (!input) throw new Error('no margin field');
    if (margin !== undefined) {
      input.value = margin;
      input.dispatchEvent(new Event('input'));
      rendered.fixture.detectChanges();
    }
    rendered.page.querySelector<HTMLButtonElement>('cdt-planner-plan-view button[type=submit]')?.click();
    // The scheduler is imported on first use, outside what Angular waits
    // for: wait for the plan (or a failure) to show.
    for (let tries = 0; tries < 100; tries++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      rendered.fixture.detectChanges();
      const messages = [...rendered.page.querySelectorAll('cdt-planner-plan-view cdt-message')];
      if (messages.some((m) => m.textContent?.trim())) return;
    }
    throw new Error('no plan');
  }

  // What the plan's side of the timeline has.
  const planSide = (page: HTMLElement) =>
    [...page.querySelectorAll('cdt-planner-pull-compare td.plan')].map((td) => td.textContent).join(' ');
  const summary = (page: HTMLElement) => page.querySelector('cdt-planner-plan-view cdt-message')?.textContent?.trim();

  it('starts with the margin at 10% and says what it plans', async () => {
    const { page } = await openPlan();

    expect(page.querySelector<HTMLInputElement>('#planner-margin')?.value).toBe('10');
    expect(page.querySelector('label[for=planner-margin]')?.textContent).toContain('HP margin (%)');
    expect(page.querySelector('cdt-planner-plan-view')?.textContent).toContain(
      'Plans the mitigations, shields and invulnerabilities of those replanned',
    );
    // Not planned yet: nothing on the plan's side.
    expect(page.querySelector('cdt-planner-plan-entry')).toBeNull();
  });

  it("plans the pull, says how it went, and gives the player's part", async () => {
    const rendered = await openPlan(overwhelming());

    await plan(rendered);

    // The scholar's 300,000 hit is more than any mitigation can bring
    // within 90% of their 200,000 HP.
    expect(summary(rendered.page)).toBe(
      '1 hit leaves less than 10% of max HP, even with everything those replanned have free (0 of them on Tank Main).',
    );
    const log = planSide(rendered.page);
    expect(log).toContain('Use Reprisal');
    expect(
      rendered.page.querySelector<HTMLButtonElement>('cdt-planner-plan-view button[type=submit]')?.textContent?.trim(),
    ).toBe('Plan again');
  });

  it('plans with the margin set', async () => {
    const rendered = await openPlan(survivable());

    await plan(rendered, '0');

    expect(summary(rendered.page)).toMatch(
      /^Every hit leaves at least 0% of max HP, with \d+ mitigations, shields and heals\.$/,
    );
  });

  it('refuses a margin out of range', async () => {
    const rendered = await openPlan();
    const input = rendered.page.querySelector<HTMLInputElement>('#planner-margin') as HTMLInputElement;

    input.value = '80';
    input.dispatchEvent(new Event('input'));
    rendered.fixture.detectChanges();

    expect(rendered.page.querySelector('cdt-planner-plan-view cdt-input-errors')?.textContent).toContain(
      'Use 50 or less.',
    );
    expect(rendered.page.querySelector<HTMLButtonElement>('cdt-planner-plan-view button[type=submit]')?.disabled).toBe(
      true,
    );
  });

  it('asks who to replan before planning, and marks them in their tab', async () => {
    const rendered = await openPlan();
    const submit = () => rendered.page.querySelector<HTMLButtonElement>('cdt-planner-plan-view button[type=submit]');

    expect(submit()?.disabled).toBe(true);
    expect(rendered.page.querySelector('cdt-planner-plan-view cdt-message[data-tone=warning]')?.textContent).toContain(
      'Choose who to replan',
    );

    click(rendered, checkbox(rendered.page, 'Replan Tank Main'));

    expect(submit()?.disabled).toBe(false);
    expect(rendered.page.querySelector('[aria-label=Players] button .visually-hidden')?.textContent).toBe(
      ', replanned',
    );
  });

  it("remembers the member's own character, replanned by default from then on", async () => {
    const first = await openPlan();
    click(first, checkbox(first.page, 'This is my character'));

    expect(localStorage.getItem('planner.me')).toBe('Tank Main@Phoenix');
    expect(checkbox(first.page, 'Replan Tank Main').checked).toBe(true);
  });

  it("offers a replanned tank's invulnerabilities, where the pull had them by default", async () => {
    const catalog = withHallowedGround();
    const timeline = pullTimeline();
    timeline.playerCasts.push({ at: 62_000, source: 1, target: null, action: 30, castMs: null });
    const rendered = await openPlan(timeline, catalog);
    const select = () =>
      rendered.page.querySelector<HTMLSelectElement>('cdt-planner-plan-view .invulnerabilities select');

    expect(select()).toBeNull();
    click(rendered, checkbox(rendered.page, 'Replan Tank Main'));
    await waitFor(rendered, () => !!select());

    expect(rendered.page.querySelector('label[for^=planner-invulnerability]')?.textContent).toContain(
      'Hallowed Ground',
    );
    const options = [...(select()?.options ?? [])].map((o) => o.textContent?.trim());
    expect(options).toEqual(['Only if needed', 'Never', '1:05 Killer Voice']);
    expect(select()?.selectedOptions[0].textContent).toBe('1:05 Killer Voice');

    const field = select() as HTMLSelectElement;
    field.value = 'never';
    field.dispatchEvent(new Event('change'));
    rendered.fixture.detectChanges();
    expect(select()?.selectedOptions[0].textContent).toBe('Never');
  });

  it("says which invulnerability the plan couldn't use where asked", async () => {
    // Hallowed Ground twice for one hit: the second is within its recast.
    const timeline = pullTimeline();
    timeline.playerCasts.push(
      { at: 62_000, source: 1, target: null, action: 30, castMs: null },
      { at: 63_000, source: 1, target: null, action: 30, castMs: null },
    );
    const rendered = await openPlan(timeline, withHallowedGround());
    await waitFor(rendered, () => !!rendered.page.querySelector('cdt-planner-plan-view .invulnerabilities'));

    await plan(rendered);

    expect(
      rendered.page.querySelector('cdt-planner-plan-view cdt-message[data-tone=warning]')?.textContent?.trim(),
    ).toBe("The plan couldn't use Hallowed Ground at 1:05 Killer Voice: the recast doesn't allow it.");
  });

  it('keeps the plan when another player is picked, showing their part', async () => {
    const rendered = await openPlan(overwhelming());
    await plan(rendered);

    rendered.page.querySelectorAll<HTMLButtonElement>('[aria-label=Players] button')[1].click();
    rendered.fixture.detectChanges();

    expect(rendered.page.querySelector('cdt-planner-pull-view h3')?.textContent).toBe("Heal Main's pull and plan");
    const log = planSide(rendered.page);
    expect(log).toContain('Short');
    expect(log).toContain('took 210,000 as played');
  });
});

// The catalog with the paladin's Hallowed Ground.
function withHallowedGround() {
  const catalog = actionCatalog();
  catalog.actions.push({
    ...catalog.actions[0],
    id: 30,
    name: 'Hallowed Ground',
    recastMs: 420_000,
    cooldownGroup: 30,
    effects: [
      {
        kind: 'invulnerable',
        target: 'self',
        status: 'Hallowed Ground',
        statusId: null,
        percent: null,
        physical: null,
        magic: null,
        potency: null,
        of: null,
        durationMs: 10_000,
        stacks: null,
        condition: null,
      },
    ],
  });
  return catalog;
}
