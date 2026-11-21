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

- **HP margin:** the HP that counts as dangerously low. The plan makes sure no hit takes anyone below it. Before a heavy hit (40% of a player's HP or more) it tops everyone up to full, as healers do, and before every raidwide it also shields everyone (Succor, Eukrasian Prognosis, Aspected Helios...), as healers do; before other light hits it only uses healing that costs no damage, and doesn't spend GCD heals just to top people up. An astrologian shields the party with Helios Conjunction during Neutral Sect, before the raidwides in it, and Horoscope can go with that same Helios. A sage's Zoe goes before a Eukrasian Prognosis whenever it's back, making its shield bigger, as sages play it.
- **Healing:** free oGCDs and gauges come first, then the GCD heals healers play (the Afflatus heals, Medica III, Helios Conjunction, Aspected Benefic, Regen). Cure II, Medica, Benefic II, Helios, Diagnosis and Prognosis are a last resort, as in the guides, except Helios right after a Helios Conjunction, as astrologians play it. Cure, Benefic and Physick are never planned: other heals do the same job better. To top players up, the plan uses heals on everyone, and keeps heals on one player for the tanks and for someone who took a big hit, as healers do. Tanks heal themselves too, with Equilibrium and Aurora. Where everyone is sent to their own instance (Necron's solo phase), each player is planned on their own: their heals and shields reach only themselves. An astrologian's Arrow and a scholar's Protraction go on the tank about to take the next big hit, so the heals after it count for more. An astrologian's Earthly Star and Macrocosmos and a sage's Pneuma go out whenever they're back, timed for the next big raidwide; the Earthly Star is set off just after the hit, to heal what it took. A DPS's Second Wind is only for when no healer's heal would be in time. The other Aetherflow heals top players up only before heavy hits, since each stack spent is an Energy Drain lost, and Lustrate is kept for when a hit needs it. Single-target shields (Celestial Intersection, Divine Benison, Taurochole, Haima, Aquaveil, Exaltation, the Spire) go on the tanks for their tank busters, as healers usually play them, not before raidwides or lighter hits unless someone would otherwise drop too low. A shield cast before a hit (Succor, Adloquium, Eukrasian Prognosis) counts for what it will absorb, so it often beats a bigger heal, but not on someone who already has one: those shields don't stack.
- **Guests:** they can plan too, up to 10 new reports and 10 new pulls an hour.
- **Wipes:** a wipe is planned through to the end of the fight, with the mechanics the party never reached.
- **Planning time:** most pulls plan in seconds; a long ultimate pull with hits hard to cover can take a few minutes. A bar under the plan button shows how far it has got, and the page stays usable meanwhile.
