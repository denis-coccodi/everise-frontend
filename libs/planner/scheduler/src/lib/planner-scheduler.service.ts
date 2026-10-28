import { Service } from '@angular/core';
import { better } from './plan-score';
import { MpModel, mpShortOf } from './mp';
import { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import { planHeals } from './heal-plan';
import { healPower } from './heal-power';
import { healPairings, healTools } from './heal-tools';
import { HealingBuffs, healingBuffsOf } from './healing-buffs';
import { invulnerabilityOptions, playedInvulnerabilities } from './invulnerabilities';
import { LUCID_DREAMING, lucidTimes, lucidUse } from './lucid';
import { mechanicsOf } from './mechanics';
import { planMitigation } from './mitigation-plan';
import { playedUses } from './played-uses';
import { Weaving, WEAVE_MS } from './weaving';
import { HealTool, InvulnerabilityOptions, MitigationTool, Plan, PlanOptions, PlannedUse } from './plan.model';
import { AUTOMATIC, mitigationTools, withGrantedCovers } from './tools';
import { catalogAtLevel, pullLevel } from './trait-levels';
import { withAetherflow } from './aetherflow';
import { openingOf, placedSteps, shownSteps, withDraws } from './opening';
import { fairyPotency, fairyPower, scholarsFairy, withFairyAway } from './fairy-heals';
import { burstActions, burstUses, placeLightspeed } from './burst';
import { withEnablerWindows } from './enabled-windows';
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
    const { dissipations, refills } = opening;
    const opened = <T extends MitigationTool | HealTool>(tools: T[]) =>
      withEnablerWindows(
        timeline,
        withDraws(withAetherflow(timeline, withFairyAway(timeline, tools, dissipations), refills), opening),
      );
    // A scholar's fairy orders wait for her while Dissipation has her away;
    // Lux Solaris waits for the burst that grants it; Soteria heals Kardion's.
    const mitigation = opened(mitigationTools(timeline.players, catalog, power));
    // The others' heals stay in the pull's healing, as played.
    const heals = opened(healTools(timeline.players, catalog, mitigation, power).filter(replanned));
    // An opener's heals and mitigations (The Blackest Night) stay as it has them.
    const tools = new Set([...heals, ...mitigation.filter(replanned)].map((t) => t.player + ':' + t.action));
    const placed = placedSteps(opening, (u) => tools.has(u.player + ':' + u.action));
    const mitigates = new Set(mitigation.map((t) => t.player + ':' + t.action));
    const played = playedUses(
      timeline,
      mitigation.filter((t) => !replanned(t)),
    );
    const fixed = [...played, ...placed.filter((u) => mitigates.has(u.player + ':' + u.action))];
    const mechanics = mechanicsOf(timeline, asked.failedMechanics === 'ignore');
    const buffs = healingBuffsOf(catalog);
    const options: PlanOptions = {
      ...asked,
      invulnerabilities: (asked.invulnerabilities ?? playedInvulnerabilities(timeline, mechanics, mitigation)).filter(
        replanned,
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
    const lucids = healers.map((player) => ({ player, action: LUCID_DREAMING }));
    const scheduled = new Set([...mitigation.filter(replanned), ...heals, ...pairings, ...bursts, ...lucids].map(key));
    const weaving = Weaving.of(timeline, catalog, (player, action) => scheduled.has(`${player}:${action}`));
    const byId = new Map(catalog.actions.map((a) => [a.id, a]));
    const slot = (u: PlannedUse) => ({ ...u, gcd: !!byId.get(u.action)?.gcd, castMs: byId.get(u.action)?.castMs ?? 0 });
    weaving.keep(opening.uses.filter((u) => u.action !== ENERGY_DRAIN).map(slot));
    // An astrologian's Lightspeeds go first: they make weave room.
    const lightspeed = placeLightspeed(timeline, catalog, replannedPlayers, opening, weaving);
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
    const mpModel = () => MpModel.of(timeline, catalog, ids, scheduled);
    const once = (from?: Plan) => {
      const mp = mpModel();
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
        { ...mitigated, uses: [...mitigated.uses.filter((u) => !u.opener), ...placed, ...lucid] },
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
    const low = mpModel();
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
    const taken = [...best.uses, ...drains, ...rhizomata, ...lightspeed];
    const burst = [...lightspeed, ...burstUses(timeline, catalog, replannedPlayers, opening, weaving, taken)];
    const own = withGrantedCovers(best.uses).filter((u) => !AUTOMATIC.has(u.action));
    const uses = [...own, ...drains, ...burst, ...rhizomata].sort((a, b) => a.at - b.at || a.player - b.player);
    const finalMp = mpModel();
    return {
      ...best,
      replanned: ids,
      scheduled: [...scheduled],
      uses,
      mp: ids.map((player) => ({
        player,
        points: finalMp.curve(
          player,
          uses.filter((u) => u.player === player),
        ),
        dropped: finalMp.dropped(
          player,
          uses.filter((u) => u.player === player),
        ),
      })),
    };
  }

  // What the plan's options offer for the tanks' invulnerabilities.
  invulnerabilityOptions(timeline: PullTimeline, catalog: ActionCatalog): InvulnerabilityOptions {
    return invulnerabilityOptions(timeline, mitigationTools(timeline.players, catalog));
  }
}
