# planner-feature-planner

The Fight Planner page (`/planner`). Guests read what it does and how to sign in; members get the tool (`cdt-planner-tool`, which provides `PlannerStore`):

- `cdt-planner-report-form`: the FFLogs report link or code (a pull's link opens that pull).
- `cdt-planner-pull-list`: the report's Extreme, Savage and Ultimate pulls, a group per fight, to pick one.
- `cdt-planner-pull-view`: the pull picked, a tab per player, each with `cdt-planner-player-log`: every hit they took and what covered it, the heals and mitigations they used, and their deaths, in time order.

The planning itself (recommending heals and mitigations) comes next; this shows the pull as it was played.
