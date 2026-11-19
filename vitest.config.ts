import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Not the worktrees Claude agents work in (.claude/worktrees), each a whole copy of the repo.
    projects: [
      '**/vite.config.{mjs,js,ts,mts}',
      '**/vitest.config.{mjs,js,ts,mts}',
      '!vitest.config.ts',
      '!.claude/worktrees/**',
    ],
  },
});
