import { ActionCatalog, PullTimeline, TimelinePlayer } from '@everise/core/api-types';
import { BURST } from './burst';
import type { FollowUp } from './burst.model';
import type { PlannedUse } from './plan.model';
import type { Occupied } from './weaving.model';
import type { Weaving } from './weaving';

const MS = 1_000;
const DELIRIUM_IMPALEMENT = 36931;
// What each burst action enables, in order, as its tooltip has it ("Can only be executed while..."): Chain
// Stratagem's Impact Imminent (30s) Baneful Impaction; Divination's Divining (30s) Oracle; Presence of Mind's 3
// Sacred Sight (30s) a Glare IV each; Fight or Flight's Goring Blade Ready (30s); No Mercy's Ready to Break (30s)
// Sonic Break; Bloodfest's Ready to Reign (30s) Reign of Beasts, then its combo (Noble Blood, Lion Heart); Delirium's
// 3 stacks (15s) Scarlet Delirium, Comeuppance and Torcleaver, or Impalement for any; Inner Release's Primal Rend
// Ready (30s), then the Primal Ruination Ready (20s) it grants; Infuriate's Nascent Chaos (30s) Inner Chaos, or
// Chaotic Cyclone.
export const FOLLOW_UPS_OF: Record<number, FollowUp[]> = {
  7436: [{ actions: [37012], withinMs: 30 * MS }],
  16552: [{ actions: [37029], withinMs: 30 * MS }],
  136: [1, 2, 3].map(() => ({ actions: [37009], withinMs: 30 * MS })),
  20: [{ actions: [3538], withinMs: 30 * MS }],
  16138: [{ actions: [16153], withinMs: 30 * MS }],
  16164: [
    { actions: [36937], withinMs: 30 * MS },
    { actions: [36938], withinMs: 30 * MS, fromPrevious: true },
    { actions: [36939], withinMs: 30 * MS, fromPrevious: true },
  ],
  7390: [36928, 36929, 36930].map((a) => ({ actions: [a, DELIRIUM_IMPALEMENT], withinMs: 15 * MS })),
  7389: [
    { actions: [25753], withinMs: 30 * MS },
    { actions: [36925], withinMs: 20 * MS, fromPrevious: true },
  ],
  52: [{ actions: [16465, 16463], withinMs: 30 * MS }],
};

// Every action a replanned player's burst enables: theirs as played count only where the plan's burst enables them.
export const FOLLOW_UPS = new Set(
  Object.values(BURST)
    .flat()
    .flatMap((b) => (FOLLOW_UPS_OF[b.action] ?? []).flatMap((f) => f.actions)),
);

// A GCD of theirs a follow-up can take the place of: one nothing later needs, as its tooltip says. Not one that builds
// (grants something, gives gauge, a Cartridge or MP, or has a combo bonus): in the place of a Gnashing Fang or a Royal
// Authority, one left their Jugular Rip, Atonement... without what they need (about 260 in 32 kills). One that spends
// (Bloodspiller, Fell Cleave, Double Down) or uses up a status only leaves it unspent: during Delirium, Bloodspiller
// is Scarlet Delirium. Kept to the plain ones too, the Delirium combo missed half its Torcleavers.
const NEEDED = /grants|combo bonus|restores mp|increases [a-z ]*gauge|adds? (?:a |an )?[a-z ]*cartridge/i;
const plain = (a: { id: number; description: string | null }) =>
  FOLLOW_UPS.has(a.id) || !NEEDED.test(a.description ?? '');

// What the replanned players' burst (in `planned`, the openers' too) enables, after each use in turn: one of theirs
// as played where it's in time (kept where they pressed it), else the first in the GCD (a `plain` one of theirs) or
// weave slot the plan leaves free from the one before; a step that finds none ends the chain, as a combo can't skip one. Placed last, as players
// don't hold a heal for them (placed before the heals, a Baneful Impaction took the weave slots they needed).
export function followUpUses(
  timeline: PullTimeline,
  catalog: ActionCatalog,
  players: TimelinePlayer[],
  weaving: Weaving,
  planned: PlannedUse[],
): PlannedUse[] {
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  const uses: PlannedUse[] = [];
  for (const p of players) {
    const mine = planned.filter((u) => u.player === p.id && u.again !== 'ends');
    const taken: Occupied[] = mine.map((u) => ({
      at: u.at,
      gcd: !!byId.get(u.action)?.gcd,
      castMs: byId.get(u.action)?.castMs ?? 0,
    }));
    // Their GCDs a follow-up can't take the place of: those something else needs (see `plain`).
    for (const c of timeline.playerCasts.filter((x) => x.source === p.id)) {
      const a = byId.get(c.action);
      if (a?.gcd && !plain(a)) taken.push({ at: c.at, gcd: true, castMs: a.castMs });
    }
    const played = timeline.playerCasts.filter((c) => c.source === p.id && FOLLOW_UPS.has(c.action));
    const claimed = new Set<object>();
    for (const b of BURST[p.job ?? ''] ?? []) {
      const steps = FOLLOW_UPS_OF[b.action];
      if (!steps) continue;
      const buffs = [...new Set(mine.filter((u) => u.action === b.action).map((u) => u.at))].sort((x, y) => x - y);
      for (const buff of buffs) {
        let from = buff;
        for (const step of steps) {
          const end = (step.fromPrevious ? from : buff) + step.withinMs;
          const inTime = (c: { action: number; at: number }) =>
            !claimed.has(c) && step.actions.includes(c.action) && c.at >= from && c.at <= end;
          // The plan's own (an opener's step), or theirs as played.
          const own = [...mine.filter(inTime), ...played.filter(inTime)].sort((x, y) => x.at - y.at)[0];
          if (own) {
            claimed.add(own);
            if (!('player' in own)) {
              const action = byId.get(own.action);
              uses.push({
                player: p.id,
                action: own.action,
                name: action?.name ?? '',
                at: own.at,
                target: null,
                covers: [],
                burst: true,
              });
              taken.push({ at: own.at, gcd: !!action?.gcd, castMs: action?.castMs ?? 0 });
            }
            from = own.at;
            continue;
          }
          const action = byId.get(step.actions[0]);
          const at = !action
            ? null
            : action.gcd
              ? weaving.gcdAfter(p.id, from, end, action.castMs, taken)
              : weaving.ogcdAfter(p.id, from, end, taken);
          if (!action || at === null) break;
          uses.push({ player: p.id, action: action.id, name: action.name, at, target: null, covers: [], burst: true });
          taken.push({ at, gcd: action.gcd, castMs: action.castMs });
          from = at;
        }
      }
    }
  }
  return uses;
}
