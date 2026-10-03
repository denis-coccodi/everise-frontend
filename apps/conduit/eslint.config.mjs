import globals from 'globals';
import baseConfig from '../../eslint.config.mjs';
import nx from '@nx/eslint-plugin';

export default [
  ...baseConfig,
  ...nx.configs['flat/angular'],
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'cdt',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'cdt',
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/prefer-standalone': 'off',
    },
  },
  ...nx.configs['flat/angular-template'],
  {
    // Template accessibility rules newly enabled by the angular-eslint v22 presets; not previously enforced.
    files: ['**/*.html'],
    rules: {
      '@angular-eslint/template/alt-text': 'off',
      '@angular-eslint/template/click-events-have-key-events': 'off',
      '@angular-eslint/template/interactive-supports-focus': 'off',
    },
  },
  {
    files: ['**/*-sw.js', '**/sw-*.js'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        _IMG_EXT: 'readonly',
        isImageRequest: 'readonly',
        handleImageCacheRequest: 'readonly',
        getArticleFromApiCache: 'readonly',
        patchArticleInApiCache: 'readonly',
        handleApiCacheRequest: 'readonly',
        handleFavoriteRequest: 'readonly',
        syncFavorites: 'readonly',
      },
    },
    rules: {
      // Newly enabled by the typescript-eslint v8 presets; not previously enforced.
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
  {
    ignores: ['**/vite.config.*.timestamp*', '**/vitest.config.*.timestamp*'],
  },
];
