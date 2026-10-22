import { Routes } from '@angular/router';
import { discordLinkGuard } from '@everise/auth/data-access';
import { dataCentreTitle } from '@everise/core/data-access';
import { EventPageComponent } from './lib/event-page/event-page.component';
import { EventsComponent } from './lib/events/events.component';

// The community's events, from Partake; open to everyone.
export const EVENTS_ROUTES: Routes = [
  {
    // This week's events: every data centre's, or one's (?dc=chaos); the
    // title follows it.
    path: '',
    title: dataCentreTitle('Events'),
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
    component: EventsComponent,
  },
  {
    // One event's own page, which event cards and shares in the Everise
    // Discord open (the page names the event once loaded).
    path: ':id',
    title: 'Event',
    canActivate: [discordLinkGuard],
    component: EventPageComponent,
  },
];
