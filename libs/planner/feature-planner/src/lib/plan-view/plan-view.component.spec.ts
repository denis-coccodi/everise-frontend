import { pullTimeline, renderPull } from '../planner-page-testing';

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
  async function openPlan(timeline = pullTimeline()) {
    const rendered = await renderPull(timeline);
    const viewTabs = rendered.page.querySelectorAll<HTMLButtonElement>('[aria-label=View] button');
    viewTabs[1].click();
    rendered.fixture.detectChanges();
    return rendered;
  }

  async function plan(rendered: Awaited<ReturnType<typeof openPlan>>, margin?: string) {
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

  const summary = (page: HTMLElement) => page.querySelector('cdt-planner-plan-view cdt-message')?.textContent?.trim();

  it('starts with the margin at 10% and says what it plans', async () => {
    const { page } = await openPlan();

    expect(page.querySelector<HTMLInputElement>('#planner-margin')?.value).toBe('10');
    expect(page.querySelector('label[for=planner-margin]')?.textContent).toContain('HP margin (%)');
    expect(page.querySelector('cdt-planner-plan-view')?.textContent).toContain(
      "Plans the party's mitigations and shields",
    );
    expect(page.querySelector('cdt-planner-plan-log')).toBeNull();
  });

  it("plans the pull, says how it went, and gives the player's part", async () => {
    const rendered = await openPlan(overwhelming());

    await plan(rendered);

    // The scholar's 300,000 hit is more than any mitigation can bring
    // within 90% of their 200,000 HP.
    expect(summary(rendered.page)).toBe(
      '1 hit leaves less than 10% of max HP even with every mitigation, shield and heal the party has free (0 of them on Tank Main).',
    );
    const log = rendered.page.querySelector('cdt-planner-plan-log')?.textContent ?? '';
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

  it('keeps the plan when another player is picked, showing their part', async () => {
    const rendered = await openPlan(overwhelming());
    await plan(rendered);

    rendered.page.querySelectorAll<HTMLButtonElement>('[aria-label=Players] button')[1].click();
    rendered.fixture.detectChanges();

    expect(rendered.page.querySelector('cdt-planner-pull-view h3')?.textContent).toBe("Heal Main's plan");
    const log = rendered.page.querySelector('cdt-planner-plan-log')?.textContent ?? '';
    expect(log).toContain('Short');
    expect(log).toContain('took 210,000 as played');
  });
});
