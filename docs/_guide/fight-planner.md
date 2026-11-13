---
title: Fight Planner
nav_order: 9
description: Plan a party's heals and mitigations from its FFLogs report.
---

# Fight Planner

> The Fight Planner is still being built, so it's switched on only on the staging site for now. It will appear under **Tools** when it's released.
{: .note}

It plans a party's heals and mitigations for a pull of an Extreme, Savage or Ultimate fight, from that party's FFLogs report.

![A planned pull of Futures Rewritten (Ultimate): each player's actions as played next to the plan](/docs/frontend/screenshots/guide/fight-planner.png)

Player names in this picture are replaced with "Player 1", "Player 2" and so on.

1. **Paste the report's link** from FFLogs. The report must be public or unlisted.
2. **Pick a pull.** Pulls are grouped by fight.
3. **Compare:** each player has a tab showing what they did, next to what the plan suggests, on one timeline.
4. **Adjust:** choose who to replan, and add or remove skills. The plan rebuilds around your changes.
{: .steps}

- **HP margin:** the HP that counts as dangerously low. The plan makes sure no hit takes anyone below it, then refills everyone to full before each mechanic with the healing that's left, as healers do.
- **Guests:** they can plan too, up to 10 new reports and 10 new pulls an hour.
- **Wipes:** a wipe is planned through to the end of the fight, with the mechanics the party never reached.
