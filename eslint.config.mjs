import nx from '@nx/eslint-plugin';
import ngrx from '@ngrx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          // Each project's type (its project.json tag) says what it may use:
          // a page (feature) never imports another page, data never imports
          // components, and the shared building blocks import neither.
          // Every project's test setup uses type:testing.
          depConstraints: [
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:widget',
                'type:data-access',
                'type:ui',
                'type:util',
                'type:testing',
              ],
            },
            { sourceTag: 'type:e2e', onlyDependOnLibsWithTags: ['type:app'] },
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: ['type:widget', 'type:data-access', 'type:ui', 'type:util', 'type:testing'],
            },
            {
              // A widget may build on another (the articles list shows post media).
              sourceTag: 'type:widget',
              onlyDependOnLibsWithTags: ['type:widget', 'type:data-access', 'type:ui', 'type:util', 'type:testing'],
            },
            {
              sourceTag: 'type:data-access',
              onlyDependOnLibsWithTags: ['type:data-access', 'type:util', 'type:testing'],
            },
            { sourceTag: 'type:ui', onlyDependOnLibsWithTags: ['type:ui', 'type:util', 'type:testing'] },
            { sourceTag: 'type:util', onlyDependOnLibsWithTags: ['type:util', 'type:testing'] },
            { sourceTag: 'type:testing', onlyDependOnLibsWithTags: [] },
          ],
        },
      ],
    },
  },
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  // NgRx's own rules for signal stores (protected state, typed features,
  // type<T>() calls) and its operators. Its typed rules (signalsTypeChecked)
  // would need type-aware linting, which this repo doesn't run.
  ...ngrx.configs.signals.map((config) => ({ ...config, files: ['**/*.ts'] })),
  ...ngrx.configs.operators.map((config) => ({ ...config, files: ['**/*.ts'] })),
  {
    // No `any` outside tests: type it, or use `unknown` and narrow it.
    files: ['**/*.ts'],
    ignores: ['**/*.spec.ts', '**/test-setup.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Nor `$any()` in templates: read a typed template reference instead
    // (<input #name (input)="set(name.value)">).
    files: ['**/*.html'],
    rules: {
      '@angular-eslint/template/no-any': 'error',
    },
  },
];
