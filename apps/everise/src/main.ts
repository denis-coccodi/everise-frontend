import { appConfig } from './app/app.config';
import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// Cloudflare Web Analytics: page views, referrers and Web Vitals, without
// cookies. "spa" counts each route change as a page view.
if (environment.webAnalyticsToken) {
  const beacon = document.createElement('script');
  beacon.defer = true;
  beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  beacon.dataset['cfBeacon'] = JSON.stringify({ token: environment.webAnalyticsToken, spa: true });
  document.head.appendChild(beacon);
}

bootstrapApplication(AppComponent, appConfig).catch((err) => console.log(err));
