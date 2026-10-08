import { defineConfig } from 'vitest/config';

// The Worker's own pieces (worker/seo), outside the Nx projects:
// `npx vitest run --config worker/vitest.config.mts`.
export default defineConfig({
  // Vitest's cache with the others, not in worker/.
  cacheDir: '../node_modules/.vite/worker',
  test: { name: 'worker', root: __dirname, include: ['**/*.spec.ts'], environment: 'node' },
});
