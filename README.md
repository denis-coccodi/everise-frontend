![Conduit Running Image](https://raw.githubusercontent.com/denis-coccodi/nx-angular-social-example/refs/heads/main/apps/conduit/src/assets/images/Screenshot%202026-04-15%20125706.png)

- Conduit project from [Real World](https://codebase.show/projects/realworld?category=backend&language=typescript) adapted to a different forked backend having a firebase hosted DB and a node server for authentication and user management (set up for local use) $${\color{yellow}\[MANUAL\]}$$
- Fixed Profile follow buttons spacing and visibility update, as it wouldn't hide when viewing own profile $${\color{yellow}\[MANUAL\]}$$
- Fixed home and profile paths to be protected by the auth guard $${\color{yellow}\[MANUAL\]}$$
- Added Dark mode option $${\color{yellow}\[MANUAL\]}$$
- Added GET api caching and replay in offline mode with service workers $${\color{red}\[AI\]}$$
- Added posts like in offline mode, synced once back online $${\color{red}\[AI\]}$$

$${\color{red}\[AI\]}$$: Change mainly implemented through the use of AI. <br>
$${\color{yellow}\[MANUAL\]}$$: Change mainly implemented manually.

## Environments and deployment

The app runs on Cloudflare Workers as static assets. `/api/*` is forwarded by a small Worker ([apps/conduit/worker.js](apps/conduit/worker.js)) to the [backend](../typescript-cloudflare-backend) Worker of the same environment, so the API is same-origin.

| Environment | URL                                                   | Backend           | Deployed by                                                                               |
| ----------- | ----------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------- |
| staging     | https://conduit-web-staging.denis-coccodi.workers.dev | `conduit-staging` | every merge to `main` ([CI/CD](.github/workflows/ci-cd.yaml))                             |
| production  | https://conduit-web.denis-coccodi.workers.dev         | `conduit`         | by hand: Actions → Deploy production → Run workflow, only for commits that passed staging |

Local development: start the backend (`npx wrangler dev --port 8080` in the backend repo), then `npm start` (proxies `/api` to it). `npm run start:staging-api` uses the staging backend instead. `npm run start-sw` builds and serves the app through the Worker itself, as in production.
