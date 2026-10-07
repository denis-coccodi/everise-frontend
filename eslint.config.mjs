import nx from '@nx/eslint-plugin';

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
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
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
