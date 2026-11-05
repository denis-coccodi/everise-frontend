import type { CatalogAction } from '@everise/core/api-types';
import type { PlanEntry } from './plan-log.model';
import { withStandInGcds } from './plan-gcds';

const use = (at: number, action: string, gcd = false): PlanEntry => ({
  kind: 'use',
  at,
  action,
  target: null,
  covers: [],
  damage: false,
  overcap: false,
  ...(gcd ? { gcd: true } : {}),
});
const glare = { name: 'Glare III', icon: 2_000, description: 'Deals unaspected damage.' } as CatalogAction;
const shown = (entries: PlanEntry[]) =>
  entries.map((e) => (e.kind === 'use' ? `${e.standIn ? '*' : ''}${e.action}@${e.at / 1000}` : e.kind));

describe('withStandInGcds', () => {
  it('gives an oGCD with no GCD before it a stand-in just before: their usual damage GCD', () => {
    const entries = withStandInGcds([use(10_000, 'Glare III', true), use(20_000, 'Divine Benison')], glare);

    expect(shown(entries)).toEqual(['Glare III@10', '*Glare III@19.3', 'Divine Benison@20']);
    expect(entries[1]).toMatchObject({ gcd: true, standIn: true, icon: 2_000 });
  });

  it('adds none for an oGCD woven after a GCD, in the countdown, or where none fits', () => {
    const entries = withStandInGcds(
      [
        use(-3_000, 'Kardia'),
        use(10_000, 'Glare III', true),
        use(10_700, 'Assize'),
        // 3 s after one GCD and 1 s before the next: no room, a late weave.
        use(13_000, 'Divine Benison'),
        use(14_000, 'Glare III', true),
      ],
      glare,
    );

    expect(entries.some((e) => e.kind === 'use' && e.standIn)).toBe(false);
  });

  it('makes do with a plain GCD for a player with no damage GCD in the log', () => {
    expect(shown(withStandInGcds([use(20_000, 'Rampart')], undefined))).toEqual(['*GCD@19.3', 'Rampart@20']);
  });
});
