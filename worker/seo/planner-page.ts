import { PageMeta, SITE_NAME, text } from './page-meta';

const PLANNER_DESCRIPTION =
  "Plan your party's heals and mitigations for Final Fantasy XIV's Extreme, Savage and Ultimate fights " +
  'from an FFLogs report: when each healer and tank uses what, so every hit leaves the HP you choose. ' +
  'Open to everyone, no account needed to try it.';

// The fight planner's page, once the planner is switched on (the backend
// answers GET /api/planner/available). A report or pull opened in it
// (/planner?report=…) is one group's log: it stays out of search results,
// the planner itself its canonical page.
export function plannerPage(url: URL): PageMeta {
  return {
    title: `FFXIV fight planner · heals and mitigations from FFLogs · ${SITE_NAME}`,
    description: PLANNER_DESCRIPTION,
    path: '/planner',
    ...(url.search ? { noindex: true } : {}),
    body:
      `<h1>Fight planner</h1><p>${text(PLANNER_DESCRIPTION)}</p>` +
      '<p>Paste an FFLogs report, pick a pull, and choose who to replan: the planner places their mitigations, ' +
      "shields and heals around their rotation, with each job's opener, and shows the party's HP with the plan.</p>",
  };
}
