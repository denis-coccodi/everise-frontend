import { TestBed } from '@angular/core/testing';
import { PlanEntry, PlanHitEntry } from '@everise/planner/data-access';
import { PlanEntryComponent } from './plan-entry.component';

const hit = (values: Partial<PlanHitEntry> = {}): PlanHitEntry => ({
  kind: 'hit',
  at: 65_000,
  action: 'Killer Voice',
  unmitigated: 100_000,
  planned: 90_000,
  asPlayed: 40_000,
  absorbed: 20_000,
  share: 0.45,
  before: 0.9,
  after: 0.45,
  safe: true,
  avoidable: false,
  covers: ['Reprisal'],
  ...values,
});

describe('PlanEntryComponent', () => {
  // The entry's lines, a space between, and whether it's marked short.
  function render(entry: PlanEntry) {
    const fixture = TestBed.createComponent(PlanEntryComponent);
    fixture.componentRef.setInput('entry', entry);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const text = [...host.querySelectorAll('p')].map((p) => p.textContent?.replace(/\s+/g, ' ').trim()).join(' ');
    return { text, unsafe: host.classList.contains('unsafe') };
  }

  it('says what to use, who for, and for which mechanics', () => {
    expect(
      render({
        kind: 'use',
        at: 199_500,
        action: 'Intervention',
        target: 'Heal Main',
        covers: ['Killer Voice'],
        damage: false,
      }),
    ).toEqual({ text: 'Use Intervention on Heal Main For Killer Voice', unsafe: false });
  });

  it('says why a use for no hit is there', () => {
    expect(render({ kind: 'use', at: 40_000, action: 'Assize', target: null, covers: [], damage: false }).text).toBe(
      'Use Assize On cooldown, or before it would go to waste',
    );
  });

  it('says a damage action is there for the Blood Lily', () => {
    const misery = { kind: 'use' as const, at: 0, action: 'Afflatus Misery', target: null, covers: [], damage: true };

    expect(render(misery).text).toBe('Use Afflatus Misery Damage: the Blood Lily is in full bloom');
  });

  it('says how a hit lands with the plan, against how it went', () => {
    expect(render(hit())).toEqual({
      text: 'Hit Killer Voice Takes 90,000 of 100,000 (45% of max HP), 20,000 shielded; at 90% HP, leaves 45%; took 40,000 as played. Covered by Reprisal',
      unsafe: false,
    });
  });

  it('marks a hit the plan leaves short of the margin', () => {
    const short = hit({
      at: 200_000,
      action: 'Wall',
      unmitigated: 300_000,
      planned: 270_000,
      asPlayed: 210_000,
      absorbed: 0,
      share: 1.35,
      before: null,
      after: null,
      safe: false,
      covers: [],
    });

    expect(render(short)).toEqual({
      text: 'Short Wall Takes 270,000 of 300,000 (135% of max HP); took 210,000 as played. No mitigation, shield or heal was free for it',
      unsafe: true,
    });
  });

  it('says a failed mechanic is taken as avoided, not short', () => {
    const failed = hit({
      unmitigated: 2_751_033,
      planned: 0,
      asPlayed: 194_883,
      safe: true,
      avoidable: true,
      covers: [],
    });

    expect(render(failed)).toEqual({
      text: 'Avoidable Killer Voice A failed mechanic: 2,751,033 before mitigation, more than their HP; took 194,883 as played. Not planned for: the plan takes it as avoided',
      unsafe: false,
    });
  });
});
