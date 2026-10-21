import { TestBed } from '@angular/core/testing';
import { HitEntry, LogEntry } from '@everise/planner/data-access';
import { PlayerLogComponent } from './player-log.component';

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

describe('PlayerLogComponent', () => {
  function render(entries: LogEntry[]) {
    const fixture = TestBed.createComponent(PlayerLogComponent);
    fixture.componentRef.setInput('entries', entries);
    fixture.detectChanges();
    // Each entry's blocks (the time, then each line), a space between.
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll('li')].map((li) => {
      const blocks = [...li.querySelectorAll('.time, p')].map((block) =>
        block.textContent?.replace(/\s+/g, ' ').trim(),
      );
      return blocks.length ? blocks.join(' ') : li.textContent?.trim();
    });
  }

  it('says what each hit did and what covered it', () => {
    expect(render([hit()])).toEqual([
      '1:05 Hit Killer Voice from Vamp Fatale Took 40,000 of 100,000: 34% mitigated, 26,000 shielded. HP 88%. Covered by Rampart, Reprisal',
    ]);
  });

  it('says when nothing covered a hit, and what went past 0 HP', () => {
    expect(
      render([
        hit({
          at: 200_000,
          amount: 210_000,
          unmitigated: 210_000,
          mitigated: 0,
          absorbed: 0,
          overkill: 10_000,
          hp: 0,
          hpShare: 0,
          covers: [],
        }),
      ]),
    ).toEqual([
      '3:20 Hit Killer Voice from Vamp Fatale Took 210,000 of 210,000: 10,000 past 0 HP. HP 0%. Nothing covered it',
    ]);
  });

  it('gives what the player used and their deaths', () => {
    expect(
      render([
        { kind: 'use', at: 60_000, action: 'Rampart', effects: 'Self: −20% damage taken (20s)' },
        { kind: 'death', at: 200_000, action: 'Killer Voice' },
      ]),
    ).toEqual(['1:00 Used Rampart Self: −20% damage taken (20s)', '3:20 Died to Killer Voice']);
  });

  it('says when nothing happened', () => {
    expect(render([])).toEqual(['Nothing happened to this player in the pull.']);
  });
});
