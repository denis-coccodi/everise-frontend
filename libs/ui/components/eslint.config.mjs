import baseConfig from '../../../eslint.config.mjs';
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
  {
    // Components on native elements, selected by a cdt attribute
    // (button[cdtButton], input[cdtInput]), as Angular Material does: they keep
    // native semantics, forms and accessibility, and unlike directives can
    // carry their own styles.
    files: [
      'src/button/button.component.ts',
      'src/input/input.component.ts',
      'src/tabs/tab.component.ts',
      'src/tabs/tabs.component.ts',
      'src/tag/tag.component.ts',
    ],
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'cdt',
          style: 'camelCase',
        },
      ],
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
];
