import type { ActionCatalog, TimelineDeath, TimelineHit } from '@everise/core/api-types';
import { mechanicsOf, type ReferencedTimeline } from '@everise/planner/scheduler';
import {
  aliveAt,
  missedBefore,
  missingMitigations,
  unmitigated,
  usualPartners,
  usualTargets,
  vulnerabilityBefore,
} from './played-deaths-evidence';
import { mechanicLabel } from './played-deaths-label';
import type { PlayedDeath } from './played-deaths.model';
import { pullClock } from './pull-time';

// A death this soon after a hit is the hit's (as `mechanicsOf` has it).
const DEATH_MS = 3_000;
// Hits of one attack this close together are one use of it.
const SAME_USE_MS = 1_000;
// Deaths this close one after the other are one string of deaths.
const STRING_MS = 10_000;
// A shared hit (a stack) this much bigger than usual had players missing.
const SHARED_GROWTH = 1.4;
// A hit this many times a player's max HP is beyond any mitigation or healing.
const UNSURVIVABLE = 3;
// Below this share of their max HP before a normal hit: not healed up.
const LOW_HP = 0.6;

// Every death of the pull as it was played, before any replanning, with why
// it happened and who is to blame, in order. Read from the pull's own log
// (and the pulls loaded to complete it, to know what an attack usually
// does); never from a plan.
export function playedDeaths(timeline: ReferencedTimeline, catalog: ActionCatalog): PlayedDeath[] {
  const played: ReferencedTimeline = { ...timeline, completion: undefined };
  const mechanics = mechanicsOf(played);
  const actionName = new Map(played.actions.map((a) => [a.id, a.name]));
  const statusName = new Map(played.statuses.map((s) => [s.id, s.name]));
  const players = new Map(played.players.map((p) => [p.id, p]));
  const who = (id: number | null) => {
    const p = id === null ? undefined : players.get(id);
    return p ? `${p.name}${p.job ? ` (${p.job})` : ''}` : 'someone';
  };
  const list = (ids: number[]) =>
    ids
      .map(who)
      .join(', ')
      .replace(/, ([^,]*)$/, ' and $1');
  const aliveIds = (at: number) => played.players.filter((p) => aliveAt(played, p.id, at)).map((p) => p.id);

  const killingHit = (death: TimelineDeath): TimelineHit | undefined => {
    const before = played.damage.filter(
      (h) => h.target === death.player && h.at <= death.at && death.at - h.at <= DEATH_MS,
    );
    return (
      before.filter((h) => h.action === death.action).at(-1) ?? before.filter((h) => !h.tick).at(-1) ?? before.at(-1)
    );
  };

  const explain = (death: TimelineDeath): PlayedDeath => {
    const at = death.at;
    const player = death.player;
    const hit = killingHit(death);
    if (!hit) {
      const killedBy = death.action === null ? null : (actionName.get(death.action) ?? null);
      const reason =
        death.source === -1
          ? 'Killed by the environment (a fall, or the floor): the log says no more.'
          : "The log doesn't say what killed them.";
      return { player, at, killedBy, cause: 'unknown', blame: [], reason };
    }
    const name = actionName.get(hit.action) ?? 'an unknown attack';
    const base = { player, at, killedBy: name };
    // In every reason: which time in the pull, and when.
    const attack = mechanicLabel(played, name, hit.at);
    const mechanic = mechanics.find(
      (m) =>
        m.action === hit.action &&
        hit.at >= m.at &&
        hit.at - m.at <= SAME_USE_MS &&
        m.hits.some((h) => h.player === player),
    );
    if (mechanic?.wipe === 'enrage') {
      return { ...base, cause: 'wipe', blame: [], reason: `${attack} is the enrage: the boss wasn't killed in time.` };
    }
    // A raidwide that kills everyone it lands on, each many times over: an
    // enrage too (Enuo's Almagest), whatever the fight's script says.
    const killedAll =
      mechanic?.kind === 'raidwide' &&
      mechanic.hits
        .filter((h) => h.unmitigated > 0)
        .every(
          (h) =>
            h.unmitigated >= UNSURVIVABLE * (players.get(h.player)?.maxHp ?? Infinity) &&
            played.deaths.some((d) => d.player === h.player && d.at >= mechanic.at && d.at - mechanic.at <= DEATH_MS),
        );
    if (mechanic?.wipe || killedAll) {
      return {
        ...base,
        cause: 'wipe',
        blame: [],
        reason: `${attack} is a raidwide nobody survives, likely an enrage.`,
      };
    }

    // A punishment for a missed mechanic (an unsoaked tower): the players
    // missing from that mechanic are to blame, not the ones it killed.
    const punished = missedBefore(played, name, hit.at);
    if (punished) {
      const one = punished.missing.length === 1;
      return {
        ...base,
        cause: 'missedShare',
        blame: punished.missing,
        reason: `${attack} only comes when something was missed (it's in none of the clears): ${list(punished.missing)} ${one ? 'is' : 'are'} usually in ${mechanicLabel(played, punished.attack, punished.at)}, and ${one ? "wasn't" : "weren't"}.`,
      };
    }

    // A hit the party shares, with players missing: the ones in it took more.
    const targets = new Set(
      played.damage
        .filter((h) => !h.tick && actionName.get(h.action) === name && Math.abs(h.at - hit.at) <= SAME_USE_MS)
        .map((h) => h.target),
    );
    const alive = aliveIds(hit.at - SAME_USE_MS);
    const usualUse = usualTargets(played, name, hit.at);
    const usual = usualUse?.count ?? 0;
    const grew = !!usualUse && unmitigated(hit) >= SHARED_GROWTH * usualUse.damage;
    if (usual >= 2 && grew && targets.size < Math.min(usual, alive.length)) {
      if (usual >= alive.length) {
        const missing = alive.filter((p) => !targets.has(p));
        return {
          ...base,
          cause: 'missedShare',
          blame: missing,
          reason: `${attack} is shared by the whole party, but ${list(missing)} ${missing.length === 1 ? "wasn't" : "weren't"} in it, so the ${targets.size} in it took more.`,
        };
      }
      // Who usually takes it with the ones in it (a tower's partner).
      const inIt = [...targets];
      const partners = usualPartners(played, name, inIt, hit.at)
        .filter((p) => alive.includes(p) && !targets.has(p))
        .slice(0, usual - targets.size);
      if (partners.length) {
        return {
          ...base,
          cause: 'missedShare',
          blame: partners,
          reason: `${attack} is taken by ${usual}, but only ${list(inIt)} ${inIt.length === 1 ? 'was' : 'were'} in it, so ${inIt.length === 1 ? 'they' : 'each'} took more. ${list(partners)} usually ${partners.length === 1 ? 'takes' : 'take'} it with them.`,
        };
      }
      return {
        ...base,
        cause: 'missedShare',
        blame: [],
        reason: `${attack} usually hits ${usual} players, but only ${targets.size} ${targets.size === 1 ? 'was' : 'were'} in it, so each took more. The log can't tell who should have been there.`,
      };
    }

    const maxHp = players.get(player)?.maxHp ?? null;
    const share = (amount: number) => (maxHp ? `${Math.round((amount / maxHp) * 100)}% of their max HP` : 'a lot');
    if (mechanic?.hits.some((h) => h.player === player && h.failed)) {
      return {
        ...base,
        cause: 'failed',
        blame: [player],
        reason: `Hit by ${attack} for ${share(unmitigated(hit))}, far more than it usually does: they failed the mechanic.`,
      };
    }

    const vulnerability = vulnerabilityBefore(played, hit);
    const earlier = vulnerability && actionName.get(vulnerability.from.action);
    if (vulnerability && !vulnerability.designed) {
      return {
        ...base,
        cause: 'earlierMistake',
        blame: [player],
        reason: `${attack} was lethal because of the Vulnerability Up they got from ${earlier && mechanicLabel(played, earlier, vulnerability.from.at)}, an earlier mistake.`,
      };
    }

    // A normal hit: too little mitigation, HP or a missed tank swap.
    const missing = missingMitigations(played, catalog, hit);
    if (missing.length) {
      const by = [...new Set(missing.map((m) => m.by).filter((id): id is number => id !== null))];
      const names = missing.map((m) => statusName.get(m.status) ?? 'a mitigation').join(' and ');
      return {
        ...base,
        cause: 'shortfall',
        blame: by,
        reason: `A normal hit of ${attack}, but ${names} wasn't up, as it usually is${by.length ? ` (from ${list(by)})` : ''}.`,
      };
    }
    // What they had left when it landed: all of it went, the rest is overkill.
    const hpBefore = hit.overkill > 0 ? hit.amount : hit.amount + (hit.hp ?? 0);
    const survivable = !!maxHp && unmitigated(hit) * (hit.multiplier ?? 1) < maxHp;
    if (maxHp && survivable && hpBefore < LOW_HP * maxHp) {
      const healers = alive.filter((p) => players.get(p)?.role === 'healer');
      return {
        ...base,
        cause: 'shortfall',
        blame: healers,
        reason: `They were at ${Math.round((hpBefore / maxHp) * 100)}% HP when ${attack} hit: not healed up in time.`,
      };
    }
    if (vulnerability?.designed && players.get(player)?.role === 'tank') {
      const tanks = alive.filter((p) => players.get(p)?.role === 'tank');
      return {
        ...base,
        cause: 'shortfall',
        blame: tanks,
        reason: `${attack} hit while they still had Vulnerability Up from ${earlier && mechanicLabel(played, earlier, vulnerability.from.at)}: likely a missed tank swap.`,
      };
    }
    if (mechanic?.kind === 'tankbuster') {
      return {
        ...base,
        cause: 'shortfall',
        blame: [player],
        reason: `${attack} hit them for ${share(unmitigated(hit))}: more than their own mitigation covered.`,
      };
    }
    return {
      ...base,
      cause: 'shortfall',
      blame: [],
      reason: `${attack} hit them for ${share(unmitigated(hit))}: too much for them, with no mitigation or HP clearly missing.`,
    };
  };

  // Once half the party is down, a death is part of the wipe already under
  // way: blamed like the death that started that string.
  const results: PlayedDeath[] = [];
  for (const death of [...played.deaths].sort((a, b) => a.at - b.at)) {
    const own = explain(death);
    const dead = played.players.length - aliveIds(death.at - 1).length;
    let first = results.length;
    while (first > 0 && results[first - 1].at >= (results[first]?.at ?? death.at) - STRING_MS) first--;
    const starter = results.slice(first).find((r) => r.cause !== 'cascade');
    const minor = own.cause === 'shortfall' || own.cause === 'unknown';
    if (starter && minor && dead >= Math.ceil(played.players.length / 2)) {
      results.push({
        ...own,
        cause: 'cascade',
        blame: starter.blame,
        reason: `The party was already going down (${dead} of ${played.players.length} dead) after ${who(starter.player)} died at ${pullClock(starter.at)}: blamed as that death.`,
      });
    } else results.push(own);
  }
  return results;
}
