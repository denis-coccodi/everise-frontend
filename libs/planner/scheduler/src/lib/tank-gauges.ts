import { ActionCatalog, CatalogAction } from '@everise/core/api-types';

// A tank's gauge as their tooltips have it: a warrior's Beast Gauge, a dark knight's Blood Gauge, a gunbreaker's
// Cartridges. Gained by combo bonuses ("Combo Bonus: Increases Beast Gauge by 20", "Adds a Cartridge"), only in a
// combo; by Infuriate (50) and Bloodfest (3, and up to 6 for its 30s); by Delirium's Blood Weapon (10 for each of the
// next 3 GCDs in 15s). Spent by "Beast Gauge Cost: 50", "Cartridge Cost: 2"...; Inner Release makes the next 3 Fell
// Cleaves or Decimates in 15s free.
const RULES: Record<string, { max: number; gain: RegExp; cost: RegExp }> = {
  WAR: { max: 100, gain: /increases beast gauge by (\d+)/i, cost: /beast gauge cost: (\d+)/i },
  DRK: { max: 100, gain: /increases blood gauge by (\d+)/i, cost: /blood gauge cost: (\d+)/i },
  GNB: { max: 3, gain: /adds a (cartridge)/i, cost: /cartridge cost: (\d+)/i },
};
const INFURIATE = 52;
const BLOODFEST = 16164;
const BLOODFEST_MAX = 6;
const INNER_RELEASE = 7389;
const FREE_IN_RELEASE = new Set([3549, 3550]); // Fell Cleave, Decimate
const DELIRIUM = 7390;
const STACKS = 3;
const STACKS_MS = 15_000;
// Inner Release's stacks: its tooltip's 15s is Inner Strength's; the logs' warriors press their third free Fell Cleave up to RELEASE_MS on.
const RELEASE_MS = 30_000;
const BLOODFEST_MS = 30_000;
const COMBO_MS = 30_000;

export interface GaugeCast {
  action: number;
  at: number;
  // The plan's own: it gets the gauge first.
  own: boolean;
}

const text = (a: CatalogAction | undefined) => (a?.description ?? '').replace(/\n/g, ' | ');
// The action a combo step follows ("Combo Action: Heavy Swing").
const comboOf = (a: CatalogAction | undefined) => /combo action: ([^|]+?)\s*(?:\||$)/i.exec(text(a))?.[1].split(' or ');

// Whether a job has a gauge here.
export const hasTankGauge = (job: string) => job in RULES;

// Of a tank's casts (in time order, the plan's own and theirs as played), those of theirs the gauge can't pay for:
// each of theirs that spends is kept only where the gauge, after it, still pays every spend of the plan's own and
// theirs kept before. `start`: what they had at the pull (`gaugeAtPull`).
export function unpaidSpends(job: string, casts: GaugeCast[], catalog: ActionCatalog, start: number): Set<GaugeCast> {
  const rules = RULES[job];
  const dropped = new Set<GaugeCast>();
  if (!rules) return dropped;
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  const chains = chainsOf(catalog);
  const costOf = (c: GaugeCast) => +(rules.cost.exec(text(byId.get(c.action)))?.[1] ?? 0);
  for (const c of casts) {
    if (c.own || !costOf(c)) continue;
    // Theirs: with it, and without the later ones of theirs, is every spend still paid?
    const later = new Set(casts.filter((o) => !o.own && o.at > c.at && costOf(o)));
    if (!paid(rules, casts, byId, chains, start, (o) => !dropped.has(o) && !later.has(o))) dropped.add(c);
  }
  return dropped;
}

// Whether every spend of a tank's casts is paid, from `start`.
export function allPaid(job: string, casts: GaugeCast[], catalog: ActionCatalog, start: number): boolean {
  const rules = RULES[job];
  if (!rules) return true;
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  return paid(rules, casts, byId, chainsOf(catalog), start, () => true);
}

// The spender a tank presses where they have the gauge: Fell Cleave, Bloodspiller, Burst Strike.
export const SPENDER: Record<string, number> = { WAR: 3549, DRK: 7392, GNB: 16162 };

// What a tank needed at the pull for their casts as played to be paid (none of a gauge is lost at the pull).
export function gaugeAtPull(job: string, casts: GaugeCast[], catalog: ActionCatalog): number {
  const rules = RULES[job];
  if (!rules) return 0;
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  const chains = chainsOf(catalog);
  for (let start = 0; start < rules.max; start++) if (paid(rules, casts, byId, chains, start, () => true)) return start;
  return rules.max;
}

// Whether every spend of the casts `kept` is paid, from `start`.
function paid(
  rules: (typeof RULES)[string],
  casts: GaugeCast[],
  byId: Map<number, CatalogAction>,
  chains: Map<string, string>,
  start: number,
  kept: (c: GaugeCast) => boolean,
): boolean {
  let level = start;
  let bloodfestUntil = -Infinity;
  let release = { left: 0, until: -Infinity };
  let bloodWeapon = { left: 0, until: -Infinity };
  const last = new Map<string, { name: string; at: number }>();
  for (const c of casts) {
    if (!kept(c)) continue;
    const a = byId.get(c.action);
    if (!a) continue;
    const max = c.at <= bloodfestUntil ? BLOODFEST_MAX : rules.max;
    const add = (n: number) => (level = Math.min(max, level + n));
    if (c.action === INFURIATE) add(50);
    if (c.action === BLOODFEST) {
      bloodfestUntil = c.at + BLOODFEST_MS;
      level = Math.min(BLOODFEST_MAX, level + STACKS);
    }
    if (c.action === INNER_RELEASE) release = { left: STACKS, until: c.at + RELEASE_MS };
    if (c.action === DELIRIUM) bloodWeapon = { left: STACKS, until: c.at + STACKS_MS };
    if (!a.gcd) continue;
    if (bloodWeapon.left && c.at <= bloodWeapon.until) {
      bloodWeapon.left--;
      add(10);
    }
    const follows = comboOf(a);
    const chain = chains.get(a.name) ?? a.name;
    if (follows) {
      const before = last.get(chain);
      const gain = rules.gain.exec(text(a));
      if (gain && before && follows.includes(before.name) && c.at - before.at <= COMBO_MS) add(+gain[1] || 1);
    }
    last.set(chain, { name: a.name, at: c.at });
    const cost = rules.cost.exec(text(a));
    if (!cost) continue;
    let n = +cost[1];
    if (FREE_IN_RELEASE.has(c.action) && release.left && c.at <= release.until) {
      release.left--;
      n = 0;
    }
    if (n > level) return false;
    level -= n;
  }
  return true;
}

// Each combo step's chain: the first action of its combo (Heavy Swing for Maim and Storm's Path), each chain on its own.
function chainsOf(catalog: ActionCatalog): Map<string, string> {
  const byName = new Map(catalog.actions.map((x) => [x.name, x]));
  const chains = new Map<string, string>();
  for (const a of catalog.actions) {
    let name = a.name;
    for (let i = 0; i < 4; i++) {
      const before = comboOf(byName.get(name))?.[0];
      if (!before) break;
      name = before;
    }
    chains.set(a.name, name);
  }
  return chains;
}
