import { defineConfig } from 'tsup';

import pkg from './package.json';

export default defineConfig({
	entry: ['src/index.ts'],
	outDir: 'dist',
	format: ['esm'],
	clean: true,
	target: 'node18',
	shims: true,
	define: {
		__VERSION__: JSON.stringify(pkg.version),
	},
});
