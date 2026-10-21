# planner-feature-planner

The Fight Planner page (`/planner`). Guests read what it does and how to sign in; members get the tool (`cdt-planner-tool`, which provides `PlannerStore` and `PlanStore`):

- `cdt-planner-report-form`: the FFLogs report link or code (a pull's link opens that pull).
- `cdt-planner-pull-list`: the report's Extreme, Savage and Ultimate pulls, a group per fight, to pick one.
- `cdt-planner-pull-view`: the pull picked, a tab per player, as played or planned:
  - `cdt-planner-player-log`: every hit they took and what covered it, the heals and mitigations they used, and their deaths, in time order;
  - `cdt-planner-plan-view`: the HP margin, planning the party's mitigations and shields (`PlanStore`, which runs the scheduler in the browser), how the plan went for the party, and `cdt-planner-plan-log`: what the player should use when, and each hit with the plan's mitigations and shields up (and what the shields absorb), against how it went.

Both logs share `log-entries.scss`. Heals come next in the plan.
