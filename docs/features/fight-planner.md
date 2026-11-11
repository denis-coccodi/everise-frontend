---
title: Fight planner
parent: Features
nav_order: 9
---

# Fight planner

The fight planner (`/planner`, behind the `planner` flag) plans a party's heals and mitigations for one pull of an Extreme, Savage or Ultimate fight, from that party's FFLogs report. The backend only reads FFLogs ([backend docs](/docs/backend/features/fight-planner.html)); the planning runs in the browser.

## Libraries

| Library                   | What it holds                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `planner/feature-planner` | The page: report and pull pickers, the per-player tabs, the plan's chart and rotation, edits, the XLS export |
| `planner/data-access`     | Stores and API services; the plan as played (`plan-as-played.ts`)                                            |
| `planner/scheduler`       | The scheduler itself, loaded only on demand, so it stays out of the page's bundle                            |

Each library's `README.md` describes its files in detail. The scheduler's is the reference for how a plan is made.

## How a pull is planned

The flow, in `pull-planner.ts`:

1. **Mechanics:** the pull's hits are grouped into boss mechanics: raidwides, tank busters and targeted hits (`mechanics.ts`). A hit far bigger than that attack usually does is a failed mechanic, taken as avoided. A hit the fight doesn't let kill can't take the last HP: one logged at no HP with the player alive, or an attack that takes everyone to 1 HP whatever their HP (TEA's Photon).
2. **Tools:**
   - each player's mitigations, shields and heals at their level, from the backend's action catalog (`tools.ts`, `heal-tools.ts`);
   - each player's heal power, read from the pull (`heal-power.ts`).
3. **Openers:** a replanned player starts with their opener (`openers.ts`), as The Balance (or Icy Veins) gives it.
4. **Mitigation:** the party's mitigations and shields are planned first, as if every hit landed at full HP (`mitigation-plan.ts`).
5. **Heals:** then the healers' heals (`heal-plan.ts`). Several rounds replan the mitigations around the lowest HP the heals left.
6. **Resources:**
   - each healer's MP (`mp.ts`, Lucid Dreaming, Thin Air);
   - a Dark Knight's MP: The Blackest Night costs nothing in the end when it breaks, as Dark Arts makes the next Edge of Shadow free (`dark-arts.ts`: it breaks once its target takes a quarter of their max HP in its 7s, as played). One that won't break costs an Edge, so it's planned only where a hit needs it, never for spare margin;
   - gauges (Aetherflow, Addersgall with Rhizomata, the astrologian's cards);
   - each replanned player's burst windows.
7. **Strategies:** the whole plan is made several ways, and the one with the fewest deaths is kept (`strategies.ts`). The ways: the plain one, the party waiting for bigger hits, big heals first, tank-buster chains, healers favouring healing, and Macrocosmos on cooldown.
8. **Death repair:** each death left is retried with one big cooldown held back so it's up for that hit; a replan with fewer deaths is kept (`death-repair.ts`).
9. **Deaths that remain** are modelled, with a raise planned for each (`plan-deaths.ts`).

**Wipes:** a pull that wiped is completed with the mechanics the party never reached, from the fight's script (`completion-*.ts`). Players are planned from the wipe point on.

**Workers:** planning runs in web workers (`plan.worker.ts`, `plan-pool.service.ts`), so the page stays usable while it plans.

## Planning rules

- Always plan with the latest patch's values. Reports from an earlier expansion aren't planned.
- Prevent deaths first. If a death can't be prevented, model it and plan a raise.
- Hits past a wipe's end were never played, so they never count as failed.
- Every oGCD sits under a GCD in the rotation view.
- Openers come from The Balance, or from Icy Veins when The Balance's guide is older.
