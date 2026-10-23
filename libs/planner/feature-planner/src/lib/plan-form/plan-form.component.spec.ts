import {
  click,
  formButton,
  openPlan,
  planEveryone,
  pullTimeline,
  renderPull,
  replanTick,
} from '../planner-page-testing';

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

describe('PlanFormComponent', () => {
  beforeEach(() => localStorage.clear());

  const submit = (page: HTMLElement) =>
    page.querySelector<HTMLButtonElement>('cdt-planner-plan-form button[type=submit]');
  const summary = (page: HTMLElement) => page.querySelector('cdt-planner-plan-form cdt-message')?.textContent?.trim();
  const warning = (page: HTMLElement) =>
    page.querySelector('cdt-planner-plan-form cdt-message[data-tone=warning]')?.textContent?.trim();
  // What the plan's side of the timeline has.
  const planSide = (page: HTMLElement) =>
    [...page.querySelectorAll('cdt-planner-pull-compare td.plan')].map((td) => td.textContent).join(' ');

  it('starts with the margin at 10%, above the tabs, and says what it plans', async () => {
    const { page } = await renderPull();

    expect(page.querySelector<HTMLInputElement>('#planner-margin')?.value).toBe('10');
    expect(page.querySelector('label[for=planner-margin]')?.textContent).toContain('HP margin (%)');
    expect(page.querySelector('cdt-planner-plan-form ~ [aria-label=Players]')).not.toBeNull();
    expect(page.querySelector('cdt-planner-plan-form')?.textContent).toContain(
      'Plans the mitigations, shields and invulnerabilities of the players ticked on their tabs',
    );
    // Not planned yet: nothing on the plan's side.
    expect(page.querySelector('cdt-planner-plan-entry')).toBeNull();
  });

  it('waits for someone to be replanned, ticked on their tab', async () => {
    const rendered = await openPlan();

    expect(submit(rendered.page)?.disabled).toBe(true);
    expect(warning(rendered.page)).toBe('Tick who to replan on their tab, or replan everyone.');

    click(rendered, replanTick(rendered.page, 'Tank Main'));

    expect(submit(rendered.page)?.disabled).toBe(false);
    expect(warning(rendered.page)).toBeUndefined();
    expect(replanTick(rendered.page, 'Heal Main').checked).toBe(false);

    click(rendered, formButton(rendered.page, 'Everyone'));
    expect(replanTick(rendered.page, 'Heal Main').checked).toBe(true);
    click(rendered, formButton(rendered.page, 'Nobody'));
    expect(replanTick(rendered.page, 'Tank Main').checked).toBe(false);
  });

  it('remembers who was replanned, for the next report', async () => {
    const rendered = await openPlan();

    click(rendered, replanTick(rendered.page, 'Tank Main'));

    expect(JSON.parse(localStorage.getItem('planner.replan') ?? '[]')).toEqual(['Tank Main@Phoenix']);
  });

  it('replans those remembered by default', async () => {
    localStorage.setItem('planner.replan', JSON.stringify(['Heal Main@Phoenix', 'Someone Else@Phoenix']));

    const { page } = await openPlan();

    expect(replanTick(page, 'Heal Main').checked).toBe(true);
    expect(replanTick(page, 'Tank Main').checked).toBe(false);
  });

  it('plans the pull and says how it went', async () => {
    const rendered = await openPlan(overwhelming());

    await planEveryone(rendered);

    // The scholar's 300,000 hit is more than any mitigation can bring
    // within 90% of their 200,000 HP.
    expect(summary(rendered.page)).toBe(
      '1 hit leaves less than 10% of max HP, even with everything those replanned have free.',
    );
    expect(planSide(rendered.page)).toContain('Use Reprisal');
    expect(submit(rendered.page)?.textContent?.trim()).toBe('Plan again');
  });

  it('plans with the margin set', async () => {
    const rendered = await openPlan(survivable());

    await planEveryone(rendered, '0');

    expect(summary(rendered.page)).toMatch(
      /^Every hit leaves at least 0% of max HP, with \d+ mitigations, shields and heals\.$/,
    );
  });

  it('refuses a margin out of range', async () => {
    const rendered = await openPlan();
    const input = rendered.page.querySelector<HTMLInputElement>('#planner-margin') as HTMLInputElement;
    click(rendered, formButton(rendered.page, 'Everyone'));

    input.value = '80';
    input.dispatchEvent(new Event('input'));
    rendered.fixture.detectChanges();

    expect(rendered.page.querySelector('cdt-planner-plan-form cdt-input-errors')?.textContent).toContain(
      'Use 50 or less.',
    );
    expect(submit(rendered.page)?.disabled).toBe(true);
  });
});
