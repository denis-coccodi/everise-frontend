import { TestBed } from '@angular/core/testing';
import { PlanEntry } from '@everise/planner/data-access';
import { PlanLogComponent } from './plan-log.component';

describe('PlanLogComponent', () => {
  function render(entries: PlanEntry[]) {
    const fixture = TestBed.createComponent(PlanLogComponent);
    fixture.componentRef.setInput('entries', entries);
    fixture.detectChanges();
    const items = [...(fixture.nativeElement as HTMLElement).querySelectorAll('li')];
    return items.map((li) => ({
      text:
        [...li.querySelectorAll('.time, p')].map((b) => b.textContent?.replace(/\s+/g, ' ').trim()).join(' ') ||
        li.textContent?.trim(),
      unsafe: li.classList.contains('unsafe'),
    }));
  }

  it('says what to use when, who for, and for which mechanics', () => {
    expect(
      render([{ kind: 'use', at: 199_500, action: 'Intervention', target: 'Heal Main', covers: ['Killer Voice'] }]),
    ).toEqual([{ text: '3:19 Use Intervention on Heal Main For Killer Voice', unsafe: false }]);
  });

  it('says how each hit lands with the plan, against how it went', () => {
    expect(
      render([
        {
          kind: 'hit',
          at: 65_000,
          action: 'Killer Voice',
          unmitigated: 100_000,
          planned: 90_000,
          asPlayed: 40_000,
          share: 0.45,
          safe: true,
          covers: ['Reprisal'],
        },
        {
          kind: 'hit',
          at: 200_000,
          action: 'Wall',
          unmitigated: 300_000,
          planned: 270_000,
          asPlayed: 210_000,
          share: 1.35,
          safe: false,
          covers: [],
        },
      ]),
    ).toEqual([
      {
        text: '1:05 Hit Killer Voice Takes 90,000 of 100,000 (45% of max HP); took 40,000 as played. Covered by Reprisal',
        unsafe: false,
      },
      {
        text: '3:20 Short Wall Takes 270,000 of 300,000 (135% of max HP); took 210,000 as played. No mitigation was free for it',
        unsafe: true,
      },
    ]);
  });

  it('says when the plan has nothing for the player', () => {
    expect(render([])).toEqual([{ text: 'The plan has nothing for this player.', unsafe: false }]);
  });
});
