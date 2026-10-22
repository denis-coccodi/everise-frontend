import { TestBed } from '@angular/core/testing';
import { HitEntry, LogEntry } from '@everise/planner/data-access';
import { PlayedEntryComponent } from './played-entry.component';

const hit = (values: Partial<HitEntry> = {}): HitEntry => ({
  kind: 'hit',
  at: 65_000,
  action: 'Killer Voice',
  source: 'Vamp Fatale',
  amount: 40_000,
  unmitigated: 100_000,
  mitigated: 0.34,
  absorbed: 26_000,
  overkill: 0,
  hp: 285_090,
  hpShare: 0.877,
  covers: ['Rampart', 'Reprisal'],
  ...values,
});

describe('PlayedEntryComponent', () => {
  // The entry's lines, a space between, and its kind.
  function render(entry: LogEntry) {
    const fixture = TestBed.createComponent(PlayedEntryComponent);
    fixture.componentRef.setInput('entry', entry);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const text = [...host.querySelectorAll('p')].map((p) => p.textContent?.replace(/\s+/g, ' ').trim()).join(' ');
    return { text, kind: host.className };
  }

  it('says what a hit did and what covered it', () => {
    expect(render(hit())).toEqual({
      text: 'Hit Killer Voice from Vamp Fatale Took 40,000 of 100,000: 34% mitigated, 26,000 shielded. HP 88%. Covered by Rampart, Reprisal',
      kind: 'hit',
    });
  });

  it('says when nothing covered a hit, and what went past 0 HP', () => {
    const lethal = hit({
      amount: 210_000,
      unmitigated: 210_000,
      mitigated: 0,
      absorbed: 0,
      overkill: 10_000,
      hp: 0,
      hpShare: 0,
      covers: [],
    });

    expect(render(lethal).text).toBe(
      'Hit Killer Voice from Vamp Fatale Took 210,000 of 210,000: 10,000 past 0 HP. HP 0%. Nothing covered it',
    );
  });

  it('gives what the player used, and their death', () => {
    expect(render({ kind: 'use', at: 60_000, action: 'Rampart', effects: 'Self: −20% damage taken (20s)' })).toEqual({
      text: 'Used Rampart Self: −20% damage taken (20s)',
      kind: 'use',
    });
    expect(render({ kind: 'death', at: 200_000, action: 'Killer Voice' })).toEqual({
      text: 'Died to Killer Voice',
      kind: 'death',
    });
  });
});
