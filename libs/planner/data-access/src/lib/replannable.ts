// Who the page lets the user tick to replan: tanks and healers, for now. The planner itself still plans anyone a log
// leaves out (a completed wipe's players past its wipe point).
const REPLANNABLE_JOBS = new Set(['PLD', 'WAR', 'DRK', 'GNB', 'WHM', 'SCH', 'AST', 'SGE']);

export const replannable = (job: string | null | undefined): boolean => !!job && REPLANNABLE_JOBS.has(job);
