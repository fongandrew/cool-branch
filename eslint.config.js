import eslint from '@eslint/js';
import * as tsParser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: ['dist/**/*', 'out/**/*', 'node_modules/**/*', '.*/**/*'],
	},

	eslint.configs.recommended,
	{
		linterOptions: {
			reportUnusedDisableDirectives: true,
		},
	},

	// TypeScript configuration
	{
		files: ['**/*.{js,ts}'],
		ignores: ['eslint.config.js'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: './tsconfig.json',
			},
			globals: {
				...globals.node,
			},
		},
	},
	tseslint.configs.recommended,
	tseslint.configs.stylistic,

	eslintConfigPrettier,

	// Base config for all files
	{
		files: ['**/*.{js,ts,cjs,mjs}'],
		plugins: {
			prettier: prettierPlugin,
			'simple-import-sort': simpleImportSort,
			'unused-imports': unusedImports,
			...importPlugin.flatConfigs?.recommended.plugins,
		},
		rules: {
			// Redundant with '@typescript-eslint/no-unused-vars' but this has a fixer
			'unused-imports/no-unused-imports': 'error',

			// General rules
			'comma-dangle': ['error', 'always-multiline'],
			'prefer-const': [
				'error',
				{
					destructuring: 'all',
				},
			],

			// Import rules
			'import/no-cycle': ['error', { ignoreExternal: true }],
			'import/no-duplicates': 'error',
			'import/first': 'error',
			'import/newline-after-import': 'error',
			'simple-import-sort/imports': 'error',
			'simple-import-sort/exports': 'error',

			// Prettier rules
			'prettier/prettier': 'error',
		},
	},

	// TypeScript-specific rules
	{
		files: ['**/*.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					prefer: 'type-imports',
					fixStyle: 'inline-type-imports',
				},
			],
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/no-empty-object-type': 'off',
			'@typescript-eslint/no-unnecessary-type-assertion': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],
			'@typescript-eslint/restrict-template-expressions': [
				'error',
				{
					allowBoolean: true,
					allowNumber: true,
				},
			],
		},
	},
);
