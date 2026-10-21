# planner-scheduler

The fight planner's scheduler: plans a pull in the browser. Only ever loaded on demand (`injectAsync(() => import('@everise/planner/scheduler').then((m) => m.PlannerScheduler))`), so it stays out of the planner page's bundle.

- `mechanics.ts` groups a pull's hits into boss mechanics (raidwides, tank busters, targeted), leaving out ticks, auto-attacks and hits that did no damage.
- `tools.ts` lists the mitigations each player has at their level, from the action catalog (actions a trait replaces left out, statuses that don't stack across jobs counted as one).
- `mitigation-plan.ts` plans them: the most dangerous mechanics first, each given mitigations until every hit leaves the HP margin (so long cooldowns aren't spent early on small hits), respecting recasts, charges and shared recasts; then what's left where it adds the most margin. `coverage.ts` says what a hit does with the planned uses up.
- `PlannerScheduler` (`@Service()`) puts them together.

Not yet: shields and heals, magic and physical apart (it takes the smaller share where they differ), tank invulnerabilities, avoidable hits.
