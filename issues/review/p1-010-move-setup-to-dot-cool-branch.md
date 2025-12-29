@user: Move the setup script location from `cool-branch.sh` (or `cool-branch.*`) in the repo root to `.cool-branch/setup` (or `.cool-branch/setup.*` with any extension).

## Background

Currently, the setup script is looked for at the repo root as `cool-branch` or `cool-branch.*`. We want to move this to a dedicated `.cool-branch/` directory to keep configuration organized and prepare for additional config file support.

## Requirements

1. Look for setup scripts in `.cool-branch/setup` or `.cool-branch/setup.*` (any extension like `.sh`, `.bash`, `.zsh`, etc.)
2. Fall back to the old location (`cool-branch` or `cool-branch.*` in repo root) for backwards compatibility
3. If both exist, prefer the new `.cool-branch/setup` location
4. The `--setup` flag should still work to specify a custom script path

## TDD Approach

Add these tests to `test/integration.ts`:

```typescript
test('add: runs .cool-branch/setup when it exists', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup'),
		`#!/bin/bash
echo "new setup ran" > "$1/setup-marker.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add .cool-branch && git commit -m "Add setup script"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, repoName, 'feature-x', 'setup-marker.txt'));
});

test('add: runs .cool-branch/setup.sh when it exists', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup.sh'),
		`#!/bin/bash
echo "new setup ran" > "$1/setup-marker.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add .cool-branch && git commit -m "Add setup script"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, repoName, 'feature-x', 'setup-marker.txt'));
});

test('add: prefers .cool-branch/setup over legacy cool-branch.sh', ({ dir, base }) => {
	initGitRepo(dir);
	// Create legacy script
	fs.writeFileSync(
		path.join(dir, 'cool-branch.sh'),
		`#!/bin/bash
echo "legacy" > "$1/which-setup.txt"
`,
		{ mode: 0o755 },
	);
	// Create new script
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup'),
		`#!/bin/bash
echo "new" > "$1/which-setup.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add . && git commit -m "Add both scripts"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	const content = fs.readFileSync(path.join(base, repoName, 'feature-x', 'which-setup.txt'), 'utf-8');
	assert(content.includes('new'), 'Should run .cool-branch/setup over legacy');
});

test('add: falls back to legacy cool-branch.sh if no .cool-branch/setup', ({ dir, base }) => {
	initGitRepo(dir);
	fs.writeFileSync(
		path.join(dir, 'cool-branch.sh'),
		`#!/bin/bash
echo "legacy ran" > "$1/setup-marker.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add cool-branch.sh && git commit -m "Add legacy script"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, repoName, 'feature-x', 'setup-marker.txt'));
});
```

## Verification

- [x] All new tests pass
- [x] All existing tests still pass
- [x] `pnpm run lint:fix` passes
- [x] `pnpm run typecheck` passes

---

@claude: I have implemented support for `.cool-branch/setup` as the new location for setup scripts, with backwards compatibility for the legacy `cool-branch.*` location.

Here is a summary of the work I have done:
- Added 4 TDD tests to `test/integration.ts` covering the new `.cool-branch/setup` location, extension support (`.sh`, etc.), priority over legacy scripts, and fallback behavior
- Refactored `findSetupScript()` in `src/commands/add.ts` into three functions:
  - `findSetupScriptInCoolBranchDir()` - looks for `setup` or `setup.*` in `.cool-branch/` directory
  - `findLegacySetupScript()` - looks for `cool-branch` or `cool-branch.*` in repo root
  - `findSetupScript()` - orchestrates the lookup, preferring new location with legacy fallback
- All 53 tests pass (including 4 new tests for this feature)
- `pnpm run lint:fix` passes
- `pnpm run typecheck` passes
