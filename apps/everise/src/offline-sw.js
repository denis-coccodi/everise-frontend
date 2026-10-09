// The site no longer works offline: its offline mode served stale data (an
// empty Party Finder after an idle tab, posts missing their newest parts,
// old versions of the site). Browsers that installed the old worker check
// this file for updates; this one deletes everything it saved, unregisters
// itself and reloads the open pages, which then come straight from the
// network. Keep it deployed for a few weeks, until returning visitors have
// all picked it up; the app no longer registers a worker (environment.*.ts).
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) await caches.delete(key);
      for (const name of ['everise-api-cache', 'everise-offline']) indexedDB.deleteDatabase(name);
      await self.registration.unregister();
      for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
    })(),
  );
});
