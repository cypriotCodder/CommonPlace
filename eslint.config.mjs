import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import nextPlugin from '@next/eslint-plugin-next';

export default tseslint.config(
  { ignores: ['.next/**', '.next-*/**', 'node_modules/**', 'data/**', 'reference/**', 'public/index.html', 'next-env.d.ts', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { '@next/next': nextPlugin },
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  { files: ['app/**/*.tsx'], rules: nextPlugin.configs.recommended.rules },
  // Fonts are defined once in the App Router root layout, not a Pages Router page.
  { files: ['app/layout.tsx'], rules: { '@next/next/no-page-custom-font': 'off' } },
  { files: ['**/*.cjs'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
);
