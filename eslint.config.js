import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';

const unusedVarsOptions = {
  argsIgnorePattern: '^_',
  varsIgnorePattern: '^_',
  destructuredArrayIgnorePattern: '^_',
  ignoreRestSiblings: true,
};

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: true },
    },
    plugins: { '@typescript-eslint': ts },
    rules: {
      ...ts.configs.recommended.rules,
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', unusedVarsOptions],
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: { parser: tsParser },
    },
    plugins: { svelte, '@typescript-eslint': ts },
    rules: {
      ...svelte.configs.recommended.rules,
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', unusedVarsOptions],
    },
  },
  {
    ignores: ['**/dist/**', '**/.svelte-kit/**', '**/build/**', 'node_modules/**'],
  },
];
