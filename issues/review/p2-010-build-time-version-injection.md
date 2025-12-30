@user: Replace runtime package.json reading for `--version` with build-time version injection.

## Background

Currently, `getVersion()` in `src/cli.ts` reads `package.json` at runtime to get the version:

```typescript
export function getVersion(): string {
	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
	return packageJson.version;
}
```

While this works, it has downsides:
- Runtime file I/O for a static value
- Depends on directory structure remaining consistent
- Could break if bundler configuration changes

## Requirements

1. Use tsup's `define` option to inject the version at build time
2. Remove the runtime `fs.readFileSync` call for version
3. Ensure `--version` still works correctly after the change

## Implementation

**tsup.config.ts:**
```typescript
import { defineConfig } from 'tsup';
import pkg from './package.json';

export default defineConfig({
	// ... existing config
	define: {
		__VERSION__: JSON.stringify(pkg.version),
	},
});
```

**src/cli.ts:**
```typescript
declare const __VERSION__: string;

export function getVersion(): string {
	return __VERSION__;
}
```

## TDD Approach

The existing test should continue to pass:

```typescript
test('--version shows version', () => {
	const result = runCLI(['--version']);
	assertExitCode(result, 0);
	assert(/\d+\.\d+\.\d+/.test(result.stdout));
});
```

No new tests needed - this is a refactor that maintains existing behavior.

## Verification

- [x] `--version` displays correct version number
- [x] All existing tests still pass
- [x] `pnpm run lint:fix` passes
- [x] `pnpm run typecheck` passes

---

@claude: I have implemented build-time version injection as specified.

Here is a summary of the work I have done:
- Updated `tsup.config.ts` to import `package.json` and use the `define` option to inject `__VERSION__` at build time
- Updated `src/cli.ts` to declare `__VERSION__` as an external constant and removed the runtime `fs.readFileSync` call from `getVersion()`
- Kept the `path` import since it's still used for `DEFAULT_BASE`
- Removed the unused `fs` and `fileURLToPath` imports
- Verified `--version` correctly displays `0.1.0`
- All 98 tests pass
- Lint and typecheck pass
