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
});
