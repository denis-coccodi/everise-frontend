import { asBarrier, barrierFor, pairedWithBarrier } from './barrier-worth';
import type { HealPairing } from './plan.model';
import type { HpEvent } from './hp-track.model';

describe('pairedWithBarrier', () => {
  // A Eukrasian Prognosis healing 2,000 and its barrier saving 1,000 of the hit at 10s.
  const events = (): HpEvent[] => [
    { at: 5000, player: 1, amount: 2000 },
    asBarrier({ at: 9999, player: 1, amount: 1000 }),
  ];
  const paired = (pairing: Partial<HealPairing>) => {
    const p = { times: 1.5, converts: false, shields: false, ...pairing } as HealPairing;
    const [found] = pairedWithBarrier(events(), (healing) => [
      { pairing: p, events: healing.map((e) => ({ ...e, amount: e.amount * p.times })) },
    ]);
    return found.events;
  };

  it("makes the barrier bigger with Zoe, a pairing that grows the heal's shield", () => {
    const zoe = paired({ shields: true });

    expect(barrierFor(zoe, 1, 10_000)).toBe(1500);
    expect(zoe[0].amount).toBe(3000);
  });

  it('keeps the barrier as it is with a pairing that grows only the healing', () => {
    expect(barrierFor(paired({}), 1, 10_000)).toBe(1000);
  });

  it('drops the barrier where the pairing turns it into healing (Emergency Tactics)', () => {
    expect(barrierFor(paired({ converts: true }), 1, 10_000)).toBe(0);
  });
});
