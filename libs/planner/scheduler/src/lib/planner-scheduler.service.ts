import { Service } from '@angular/core';
import { PullPlanner } from './pull-planner';

// Plans a pull on the page itself, where no worker can (`PlanPool`), and
// gives its invulnerability options. The planner page loads it only when
// it's asked for (injectAsync), keeping it out of the page's own bundle.
@Service()
export class PlannerScheduler extends PullPlanner {}
