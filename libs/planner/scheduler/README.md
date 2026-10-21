# planner-scheduler

The fight planner's scheduler: plans a pull in the browser. Only ever loaded on demand (`injectAsync(() => import('@everise/planner/scheduler').then((m) => m.PlannerScheduler))`), so it stays out of the planner page's bundle.

- `mechanics.ts` groups a pull's hits into boss mechanics (raidwides, tank busters, targeted), leaving out ticks, auto-attacks and hits that did no damage.
- `heal-power.ts` reads each player's heal power from the pull: HP healed per potency, from their direct heals (overheal included), with their role's or the party's for those who didn't heal.
- `tools.ts` lists the mitigations and shields each player has at their level, from the action catalog (actions a trait replaces left out, statuses that don't stack across jobs counted as one), each shield sized from the caster's heal power or max HP.
- `mitigation-plan.ts` plans them: the most dangerous mechanics first, each given mitigations and shields until every hit leaves the HP margin (so long cooldowns aren't spent early on small hits), respecting recasts, charges and shared recasts; GCD shields count for less than oGCDs, so they come last and are never spent on spare margin. Then what's left goes where it adds the most margin. `coverage.ts` says what a hit does with the planned uses up: mitigations first, then shields absorb what's left, each only for as many hits as it lasts.
- `heal-tools.ts` lists the heals the plan counts on: the healers' heals and healing over time, and the heals of the mitigations it plans, sized like the shields.
- `hp-events.ts` and `hp-track.ts` follow each player's HP over the pull: the mechanics' hits as planned, every other hit (auto-attacks, damage over time, the floor) as played, and the healing the plan doesn't schedule (tanks' own, Kardia, the faerie, Earthly Star, and the like) as played, with its overheal.
- `heal-plan.ts` then plans the healers' heals in time order: before each mechanic, enough that every hit leaves the margin of the HP its player has then, oGCDs first, respecting recasts, charges, gauges and one GCD at a time. Each hit is then judged by the HP it leaves.
- `PlannerScheduler` (`@Service()`) puts them together.

Not yet: heals that depend on what happens later (Excogitation, Liturgy of the Bell, Kardia) or on healing buffs, mitigations replanned around the HP the heals leave, magic and physical apart (it takes the smaller share where they differ), tank invulnerabilities, avoidable hits.
