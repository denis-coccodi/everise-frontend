# planner-feature-planner

The Fight Planner page (`/planner`). Guests read what it does and how to sign in; members get the tool (`cdt-planner-tool`, which provides `PlannerStore` and `PlanStore`):

- `cdt-planner-report-form`: the FFLogs report link or code (a pull's link opens that pull).
- `cdt-planner-pull-list`: the report's Extreme, Savage and Ultimate pulls, a group per fight, to pick one; the one open is shown pressed.
- `cdt-planner-pull-view`: the pull picked, a tab per player, as played and as planned on one timeline (side by side on laptops and up; on narrower screens one at a time, from the view tabs):
  - `cdt-planner-pull-compare`: the timeline, a table with a row per moment (`compareLog`): what happened then as played (`cdt-planner-played-entry`: a hit they took and what covered it, a heal or mitigation they used, their death) beside what the plan has then (`cdt-planner-plan-entry`: what to use, and each hit with the plan's mitigations and shields up, what the shields absorb, the HP it lands on and what it leaves, against how it went);
  - `cdt-planner-plan-view`: the HP margin, planning the party's mitigations, shields and heals (`PlanStore`, which runs the scheduler in the browser), and how the plan went for the party and for the player.

Both kinds of entry share `log-entries.scss`.
