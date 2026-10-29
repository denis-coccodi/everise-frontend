import { TestBed } from '@angular/core/testing';
import { API_URL } from '@everise/core/http-client';
import { LogEntry, PlanEntry } from '@everise/planner/data-access';
import { PullCompareComponent } from './pull-compare.component';

const used = (at: number, action: string): LogEntry => ({ kind: 'use', at, action, effects: 'Self' });
const plannedUse = (at: number, action: string): PlanEntry => ({
  kind: 'use',
  at,
  action,
  target: null,
  covers: ['Killer Voice'],
  damage: false,
  overcap: false,
});

describe('PullCompareComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [{ provide: API_URL, useValue: '' }] }));

  function render(played: LogEntry[], planned: PlanEntry[] | null, shown: 'played' | 'plan' = 'played') {
    const fixture = TestBed.createComponent(PullCompareComponent);
    fixture.componentRef.setInput('player', 'Tank Main');
    fixture.componentRef.setInput('played', played);
    fixture.componentRef.setInput('planned', planned);
    fixture.componentRef.setInput('shown', shown);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const cells = (row: Element, side: string) =>
      [...row.querySelectorAll(`td.${side} strong`)].map((strong) => strong.textContent?.trim());
    return {
      host,
      // Each row: its time, then what each side has.
      rows: [...host.querySelectorAll('tbody tr')].map((row) => [
        row.querySelector('th')?.textContent?.trim(),
        cells(row, 'played'),
        cells(row, 'plan'),
      ]),
    };
  }

  it('lines up what happened and what the plan has, moment by moment', () => {
    const { host, rows } = render(
      [used(60_000, 'Rampart'), used(65_400, 'Vengeance')],
      [plannedUse(65_000, 'Reprisal'), plannedUse(90_000, 'Feint')],
    );

    expect(rows).toEqual([
      ['1:00.0', ['Rampart'], []],
      ['1:05.0', ['Vengeance'], ['Reprisal']],
      ['1:30.0', [], ['Feint']],
    ]);
    expect([...host.querySelectorAll('thead th')].map((th) => th.textContent?.trim())).toEqual([
      'Time',
      'As played',
      'Plan',
    ]);
    expect(host.querySelector('caption')?.textContent?.trim()).toBe("Tank Main's pull and plan, in time order");
  });

  it('marks which side the narrower screens show, and when there is no plan yet', () => {
    expect(render([used(60_000, 'Rampart')], null).host.className).toBe('no-plan');
    expect(render([used(60_000, 'Rampart')], [], 'plan').host.className).toBe('show-plan');
  });

  it('says when a side has nothing', () => {
    const { host } = render([], []);

    expect([...host.querySelectorAll('.empty')].map((p) => p.textContent?.trim())).toEqual([
      'Nothing happened to this player in the pull.',
      'The plan has nothing for this player.',
    ]);
  });

  it('opens at a moment: the first from then on, scrolled to and marked', () => {
    const fixture = TestBed.createComponent(PullCompareComponent);
    fixture.componentRef.setInput('player', 'Tank Main');
    fixture.componentRef.setInput('played', [used(60_000, 'Rampart'), used(90_000, 'Reprisal')]);
    fixture.componentRef.setInput('planned', null);
    fixture.detectChanges();
    const scrolled: string[] = [];
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this.getAttribute('data-at') ?? '');
    };

    fixture.componentInstance.reveal(70_000);
    fixture.detectChanges();

    expect(scrolled).toEqual(['90000']);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('tr.revealed th')?.textContent?.trim()).toBe('1:30.0');
    expect(host.querySelector('.scroller')?.getAttribute('aria-label')).toBe("Tank Main's timeline");
  });

  it('lets the user remove a planned skill, and add one at a slot near a row, while editing', () => {
    const fixture = TestBed.createComponent(PullCompareComponent);
    const planned: PlanEntry[] = [
      { ...plannedUse(60_000, 'Rampart'), id: 7531 } as PlanEntry,
      { ...plannedUse(90_000, 'Sentinel'), id: 17, edited: true } as PlanEntry,
    ];
    fixture.componentRef.setInput('player', 'Tank Main');
    fixture.componentRef.setInput('played', []);
    fixture.componentRef.setInput('planned', planned);
    fixture.componentRef.setInput('shown', 'plan');
    fixture.componentRef.setInput('slotsFor', () => [{ at: 58_000, label: 'After Fast Blade at 0:58.0' }]);
    fixture.componentRef.setInput('party', [
      { id: 1, name: 'Tank Main' },
      { id: 2, name: 'Heal Main' },
    ]);
    fixture.componentRef.setInput('defaultTarget', 1);
    const icons = { icon: null, description: null, replacesIcon: null };
    fixture.componentRef.setInput('choicesFor', () => [
      { action: 7535, name: 'Reprisal', gcd: false, ok: true, reason: null, replaces: null, targeted: false, ...icons },
      {
        action: 7382,
        name: 'Intervention',
        gcd: false,
        ok: true,
        reason: null,
        replaces: null,
        targeted: true,
        ...icons,
      },
      {
        action: 17,
        name: 'Sentinel',
        gcd: false,
        ok: false,
        reason: 'Recast: back at 3:30',
        replaces: null,
        targeted: false,
        ...icons,
      },
    ]);
    const removed: unknown[] = [];
    const added: unknown[] = [];
    fixture.componentInstance.removed.subscribe((e) => removed.push(e));
    fixture.componentInstance.added.subscribe((e) => added.push(e));
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const buttons = () => [...host.querySelectorAll<HTMLButtonElement>('td.plan button')];

    // Not editing: nothing to press, but the user's own says so.
    expect(buttons()).toEqual([]);
    expect(host.querySelector('.yours')?.textContent).toBe('Added by you');

    fixture.componentRef.setInput('editing', true);
    fixture.detectChanges();
    buttons()
      .find((b) => b.textContent?.includes('Remove'))
      ?.click();
    expect(removed).toEqual([planned[0]]);

    buttons()
      .find((b) => b.textContent?.includes('Add a skill'))
      ?.click();
    fixture.detectChanges();
    const picker = host.querySelector('cdt-planner-edit-picker') as HTMLElement;
    expect(picker.querySelector('option')?.textContent?.trim()).toBe('After Fast Blade at 0:58.0');
    expect(picker.textContent).toContain('Recast: back at 3:30');
    const press = (text: string) =>
      [...host.querySelectorAll<HTMLButtonElement>('cdt-planner-edit-picker button')]
        .find((b) => b.textContent?.includes(text))
        ?.click();
    press('Add Reprisal');
    expect(added).toEqual([{ at: 58_000, action: 7535, target: null }]);

    // One that goes on a party member: on the tank until another is picked.
    host.querySelector<HTMLButtonElement>('td.plan button.add')?.click();
    fixture.detectChanges();
    expect(host.querySelector('cdt-planner-edit-picker')?.textContent).toContain('Add Intervention on Tank Main');
    const on = host.querySelector<HTMLSelectElement>('select[id^=planner-edit-target]') as HTMLSelectElement;
    on.value = '2';
    on.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    press('Add Intervention on Heal Main');
    expect(added[1]).toEqual({ at: 58_000, action: 7382, target: 2 });

    // Where none of their GCDs comes before (none in the ten seconds), no Add.
    fixture.componentRef.setInput('slotsFor', () => []);
    fixture.detectChanges();
    expect(buttons().filter((b) => b.textContent?.includes('Add a skill'))).toEqual([]);
  });
});
