# planner-data-access

The fight planner's data. `PlannerService`: `GET /api/planner/available`, `GET /api/planner/reports/:code` (an FFLogs report's players and its Extreme, Savage and Ultimate pulls), `GET /api/planner/reports/:code/pulls/:pullId` (everything that happened in one pull) and `GET /api/planner/catalog` (the jobs' actions with their heals and mitigations). The reports and pulls are for members.

- `PlannerStore`: the tool's state, provided by it: the report and pull in the query string (`?report=<code>&pull=<id>`), the report, the pull and the catalog as resources, the pulls grouped by fight, and `open()` for a pasted link.
- `report-link.ts` reads the report (and pull) a pasted FFLogs link or code names. `player-log.ts` turns a pull into one player's log: the hits they took and what covered each (their mitigations and shields, and the debuffs on the enemy that hit them), the heals and mitigations they used, their deaths. `effect-text.ts` says what an action's effects do in a few words; `pull-time.ts` gives times in a pull ("1:05").
