import { Service } from '@angular/core';
import { better } from './plan-score';
import { aliveIn, MpModel, mpShortOf } from './mp';
import { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import { planHeals } from './heal-plan';
import { healPower } from './heal-power';
import { healPairings, healTools } from './heal-tools';
import { HealingBuffs, healingBuffsOf } from './healing-buffs';
import { invulnerabilityOptions, playedInvulnerabilities } from './invulnerabilities';
import { LUCID_DREAMING, lucidTimes, lucidUse } from './lucid';
import { THIN_AIR, thinAirTimes, thinAirUse } from './thin-air';
import { mechanicsOf } from './mechanics';
import { planMitigation } from './mitigation-plan';
import { playedUses } from './played-uses';
import { Weaving, WEAVE_MS } from './weaving';
import { InvulnerabilityOptions, Plan, PlanOptions, PlannedUse } from './plan.model';
import { mitigationTools, notAutomatic, withGrantedCovers } from './tools';
import { catalogAtLevel, pullLevel } from './trait-levels';
import { openingOf, placedSteps, shownSteps } from './opening';
import { fairyPotency, fairyPower, scholarsFairy } from './fairy-heals';
import { burstActions, burstUses, placeLightspeed } from './burst';
import { addedUses, keptInvulnerabilities, notRemoved, withAddedCovers } from './edits';
import { toolWindows } from './tool-windows';
import { RHIZOMATA, rhizomataOf, rhizomataUse, withRhizomata } from './rhizomata';
import { ENERGY_DRAIN } from './opener-presets';

// Plans of the pull, at most: the first, and replans around the HP its
// heals leave.
const ROUNDS = 3;

// Plans a pull in the browser. The planner page loads it only when it's
// asked for (injectAsync), keeping it out of the page's own bundle.
@Service()
export class PlannerScheduler {
  // The party's mitigations and shields over the pull, then the healers'
  // heals, every hit left the margin of the player's HP where the party's
  // cooldowns allow. The mitigations are planned first as if every hit
  // landed at full HP; where a hit is still short, again around the HP the
  // heals leave it, then the heals again, as long as that makes the plan
  // better. Only the players `asked` to replan are planned, the others as
  // they played; the tanks' invulnerabilities go where `asked` says, or
  // where the pull had them.
  plan(timeline: PullTimeline, full: ActionCatalog, asked: PlanOptions): Plan {
    // The actions as the pull's level has them (its traits).
    const level = pullLevel(timeline);
    const catalog = catalogAtLevel(full, level);
    const maxHp = new Map<number, number>();
    for (const player of timeline.players) if (player.maxHp) maxHp.set(player.id, player.maxHp);
    const replanned = (t: { player: number }) => !asked.replan || asked.replan.includes(t.player);
    const power = healPower(timeline, catalog);
    // A replanned player starts with their opener (the standard one unless
    // asked otherwise): a scholar's says when their Aetherflow stacks come
    // and their fairy goes away for Dissipation, an astrologian's when their
    // cards come; its heals are planned where it has them.
    const scholars = timeline.players.filter((p) => p.job === 'SCH' && replanned({ player: p.id }));
    const replannedPlayers = timeline.players.filter((p) => replanned({ player: p.id }));
    const opening = openingOf(timeline, catalog, replannedPlayers, asked.openers);
    const { dissipations } = opening;
    const mechanics = mechanicsOf(timeline, asked.failedMechanics === 'ignore');
    const opened = toolWindows(timeline, opening, asked.edits, mechanics);
    // A scholar's fairy orders wait for her while Dissipation has her away;
    // Lux Solaris waits for the burst that grants it; Soteria heals Kardion's.
    const mitigation = opened(mitigationTools(timeline.players, catalog, power));
    // The others' heals stay in the pull's healing, as played.
    const heals = opened(healTools(timeline.players, catalog, mitigation, power).filter(replanned));
    // An opener's heals and mitigations (The Blackest Night) stay as it has them.
    const tools = new Set([...heals, ...mitigation.filter(replanned)].map((t) => t.player + ':' + t.action));
    // The user's added skills stay where they put them, as the opener's do.
    const added = addedUses(asked.edits, catalog);
    const placed = [...placedSteps(opening, (u) => tools.has(u.player + ':' + u.action)), ...added].filter(
      notRemoved(asked.edits),
    );
    const mitigates = new Set(mitigation.map((t) => t.player + ':' + t.action));
    const played = playedUses(
      timeline,
      mitigation.filter((t) => !replanned(t)),
    );
    const fixed = [...played, ...placed.filter((u) => mitigates.has(u.player + ':' + u.action))];
    const buffs = healingBuffsOf(catalog);
    const options: PlanOptions = {
      ...asked,
      invulnerabilities: keptInvulnerabilities(
        (asked.invulnerabilities ?? playedInvulnerabilities(timeline, mechanics, mitigation)).filter(replanned),
        mechanics,
        asked.edits,
      ),
    };
    // The oGCDs that only pay with a GCD heal (Plenary Indulgence) are
    // planned with one, by the heals, never on their own.
    const pairings = healPairings(timeline.players, catalog, power).filter(replanned);
    const key = (t: { player: number; action: number }) => `${t.player}:${t.action}`;
    const paired = new Set(pairings.map(key));
    // A tool without effects of its own goes with what it makes better or
    // grants, which the mitigations plan: Recitation with a spreadlo's
    // Adloquium (it goes with a GCD heal too), Neutral Sect with Sun Sign.
    const alone = mitigation.filter((t) => !paired.has(key(t)) || !t.effects.length);
    // Where each player can act: their GCDs as played, and the oGCDs they
    // used that the plan doesn't schedule, and their opener's steps (but
    // the Energy Drains, which a heal can take the stacks of). A replanned
    // player's raid buffs and burst go on cooldown after the opener, in the
    // slots the heals and mitigations leave.
    const sages = replannedPlayers.filter((p) => p.job === 'SGE');
    const bursts = [
      ...replannedPlayers.flatMap((p) => burstActions(p.job ?? '').map((action) => ({ player: p.id, action }))),
      ...sages.map((p) => ({ player: p.id, action: RHIZOMATA })),
    ];
    const healers = replannedPlayers.filter((p) => p.role === 'healer').map((p) => p.id);
    const whms = replannedPlayers.filter((p) => p.job === 'WHM').map((p) => p.id);
    const lucids = [
      ...healers.map((player) => ({ player, action: LUCID_DREAMING })),
      ...whms.map((player) => ({ player, action: THIN_AIR })),
    ];
    const scheduled = new Set([...mitigation.filter(replanned), ...heals, ...pairings, ...bursts, ...lucids].map(key));
    const weaving = Weaving.of(timeline, catalog, (player, action) => scheduled.has(`${player}:${action}`));
    const byId = new Map(catalog.actions.map((a) => [a.id, a]));
    const slot = (u: PlannedUse) => ({ ...u, gcd: !!byId.get(u.action)?.gcd, castMs: byId.get(u.action)?.castMs ?? 0 });
    weaving.keep([...opening.uses.filter((u) => u.action !== ENERGY_DRAIN), ...added].map(slot));
    // An astrologian's Lightspeeds go first: they make weave room.
    const lightspeed = placeLightspeed(timeline, catalog, replannedPlayers, opening, weaving, options.lightspeed);
    // A GCD shield grows with its caster's healing potency buffs: those the
    // plan has up when it's cast, and the rest as played.
    const party = timeline.players.map((p) => p.id);
    const potency = new HealingBuffs(buffs, party, timeline, new Set([...mitigation, ...heals, ...pairings].map(key)));
    const shieldTimes = (use: PlannedUse, uses: PlannedUse[]) => potency.potencyAt(use.player, use.at, uses);
    // A replanned scholar's fairy heals on her own, as the HP the round
    // before leaves calls for (as played in the first round).
    const fairyHeal = fairyPotency(level);
    const fairyPowers = new Map(
      scholars.map((s) => [s.id, fairyPower(timeline, s.id, power.get(s.id) ?? null, fairyHeal)]),
    );
    // Seraph's Seraphic Veils, as uses of a tool the plan never orders, for
    // their barriers.
    const veils = mitigationTools(
      scholars,
      catalog,
      new Map([...fairyPowers].filter((e): e is [number, number] => e[1] !== null)),
      true,
    );
    const fairy = (from?: Plan) => scholarsFairy(timeline, scholars, fairyPowers, maxHp, fairyHeal, dissipations, from);
    // A sage's Addersgall with their Rhizomata's stacks, once planned (below).
    const bonus = new Map<number, number[]>();
    let lucid: PlannedUse[] = [];
    // The replanned players' MP, which a heal must be affordable with.
    const ids = replannedPlayers.map((p) => p.id);
    // Until the plan places its own Lucid Dreaming, their Lucids as played stay.
    const lucidKeys = new Set(healers.map((h) => key({ player: h, action: LUCID_DREAMING })));
    const current = () => (lucid.length ? scheduled : new Set([...scheduled].filter((k) => !lucidKeys.has(k))));
    const mpModel = (from?: Plan) => MpModel.of(timeline, catalog, ids, current(), from && aliveIn(from));
    const once = (from?: Plan) => {
      const mp = mpModel(from);
      const { healing, casts } = fairy(from);
      const mitigated = planMitigation(
        mechanics,
        [...withRhizomata(alone, bonus), ...veils],
        maxHp,
        options,
        from,
        fixed,
        weaving,
        shieldTimes,
        casts,
        mp,
      );
      const planned = planHeals(
        { ...mitigated, uses: [...mitigated.uses.filter((u) => !u.opener && !u.edited), ...placed, ...lucid] },
        timeline,
        [...withRhizomata(mitigation, bonus), ...veils],
        withRhizomata(heals, bonus),
        maxHp,
        options,
        buffs,
        weaving,
        pairings,
        healing,
        mp,
      );
      return { ...planned, mpShort: mpShortOf(mp, planned) };
    };

    let best = once();
    // The fairy's heals from the plan's own HP replace hers as played,
    // whichever plan comes out better.
    if (scholars.length) best = once(best);
    for (let round = 1; round < ROUNDS && best.hits.some((h) => !h.safe); round++) {
      const next = once(best);
      if (!better(next, best, maxHp, options)) break;
      best = next;
    }
    // A replanned sage uses Rhizomata where the plan's heals leave their
    // Addersgall low; the heals are planned again with its stacks, unless
    // that comes out worse.
    const sageTools = [...mitigation, ...heals];
    for (const s of sages) bonus.set(s.id, rhizomataOf(s.id, best.uses, sageTools, weaving, byId, timeline.durationMs));
    let rhizomata = [...bonus].flatMap(([player, times]) => times.map((at) => rhizomataUse(player, at)));
    if (rhizomata.length) {
      weaving.keep(rhizomata.map((u) => ({ player: u.player, at: u.at, gcd: false, castMs: 0 })));
      const next = once(best);
      if (better(best, next, maxHp, options)) rhizomata = [];
      else best = next;
    }
    // Seraph casts her Veils herself: they're no use to list. The openers'
    // other steps (Energy Drains, Chain Stratagem...) show with it, but for
    // the Energy Drains whose stacks the heals took.
    const stackTools = new Set([...mitigation, ...heals].filter((t) => t.pool?.name === 'Aetherflow').map(key));
    const shown = shownSteps(opening, placed, (player) =>
      best.uses.filter((u) => u.player === player && stackTools.has(key(u))).map((u) => u.at),
    );
    // An opener's Energy Drain gives its slot to what the plan put there.
    const drains = shown.filter(
      (u) =>
        u.action !== ENERGY_DRAIN || !best.uses.some((b) => b.player === u.player && Math.abs(b.at - u.at) < WEAVE_MS),
    );
    // A replanned healer's Lucid Dreaming where the plan runs their MP low;
    // the heals are planned again with it, unless that comes out worse.
    const low = MpModel.of(timeline, catalog, ids, scheduled, aliveIn(best));
    const withLucid = [...best.uses, ...rhizomata];
    lucid = healers.flatMap((h) =>
      lucidTimes(h, low, withLucid, weaving, byId, timeline.durationMs).map((at) => lucidUse(h, at)),
    );
    if (lucid.length) {
      weaving.keep(lucid.map((u) => ({ player: u.player, at: u.at, gcd: false, castMs: 0 })));
      const next = once(best);
      if (better(best, next, maxHp, options)) lucid = [];
      else best = next;
    }
    // A replanned white mage's Thin Air: a charge for each raise, the rest on costly spells.
    const thinAir = whms.flatMap((w) =>
      thinAirTimes(w, timeline, best.uses, weaving, byId).map((at) => thinAirUse(w, at)),
    );
    const taken = [...best.uses, ...drains, ...rhizomata, ...lightspeed, ...thinAir];
    const burst = [...lightspeed, ...burstUses(timeline, catalog, replannedPlayers, opening, weaving, taken)];
    const own = withAddedCovers(withGrantedCovers(best.uses), mechanics, catalog).filter(notAutomatic);
    const uses = [...own, ...drains, ...burst, ...rhizomata, ...thinAir].sort(
      (a, b) => a.at - b.at || a.player - b.player,
    );
    const finalMp = mpModel(best);
    return {
      ...best,
      replanned: ids,
      scheduled: [...current()],
      uses,
      mp: finalMp.plannedMp(ids, uses),
    };
  }

  // What the plan's options offer for the tanks' invulnerabilities.
  invulnerabilityOptions(timeline: PullTimeline, catalog: ActionCatalog): InvulnerabilityOptions {
    return invulnerabilityOptions(timeline, mitigationTools(timeline.players, catalog));
  }
}
