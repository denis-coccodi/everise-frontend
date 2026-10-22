import { Routes } from '@angular/router';
import { PlannerComponent } from './lib/planner/planner.component';

export const PLANNER_ROUTES: Routes = [
  {
    // A pull of an FFLogs report, hit by hit, with what covered each; what's
    // open is in the query string (?report=<code>&pull=<id>). Open to
    // everyone, who can read what it does; the tool itself, and the API
    // behind it, are for members (each report reads FFLogs).
    path: '',
    title: 'Fight Planner',
    component: PlannerComponent,
  },
];
