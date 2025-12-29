@user: Add support for `*.local.*` variants of setup and config files. For setup, run ONLY the local variant if found (not both). For config, prefer the local file but fall back to non-local config if applicable.

## Background

Users may want machine-specific configuration that isn't committed to the repo. The `.local.` naming convention is common for this purpose (e.g., `.env.local`). Local files are typically gitignored.

## Requirements

### Setup Script (`.cool-branch/setup.local` or `.cool-branch/setup.local.*`)
1. If a local setup script exists, run ONLY that script (not the non-local version)
2. If no local setup script exists, fall back to the regular setup script
3. Local scripts should support any extension: `setup.local`, `setup.local.sh`, `setup.local.bash`, etc.

### Config File (`.cool-branch/config.local.json`)
1. If local config exists, use it as the primary config
2. Values from local config override values from non-local config
3. If a key is not in local config, fall back to non-local config for that key
4. If no local config exists, use only the non-local config

### Gitignore
- The tool should NOT automatically modify `.gitignore`
- Document that users should add `*.local*` or `.cool-branch/*.local*` to their `.gitignore`

## TDD Approach

Add these tests to `test/integration.ts`:

```typescript
// Setup local variant tests
test('add: runs setup.local instead of setup when both exist', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	// Regular setup
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup'),
		`#!/bin/bash
echo "regular" > "$1/which-setup.txt"
`,
		{ mode: 0o755 },
	);
	// Local setup
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup.local'),
		`#!/bin/bash
echo "local" > "$1/which-setup.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add .cool-branch/setup && git commit -m "Add setup"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	const content = fs.readFileSync(path.join(base, repoName, 'feature-x', 'which-setup.txt'), 'utf-8');
	assert(content.includes('local'), 'Should run local setup only');
});

test('add: runs setup.local.sh with extension', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup.local.sh'),
		`#!/bin/bash
echo "local ran" > "$1/setup-marker.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add .cool-branch && git commit -m "Add dir"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, repoName, 'feature-x', 'setup-marker.txt'));
});

test('add: falls back to regular setup when no local exists', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup'),
		`#!/bin/bash
echo "regular ran" > "$1/setup-marker.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add .cool-branch && git commit -m "Add setup"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, repoName, 'feature-x', 'setup-marker.txt'));
});

// Config local variant tests
test('add: config.local.json overrides config.json values', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ dirname: 'from-config' }),
	);
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.local.json'),
		JSON.stringify({ dirname: 'from-local' }),
	);
	execSync('git add .cool-branch/config.json && git commit -m "Add config"', { cwd: dir });
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, 'from-local', 'feature-x'));
});

test('add: config.local.json falls back to config.json for missing keys', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ dirname: 'from-config' }),
	);
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.local.json'),
		JSON.stringify({}), // Empty local config
	);
	execSync('git add .cool-branch/config.json && git commit -m "Add config"', { cwd: dir });
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, 'from-config', 'feature-x'));
});

test('add: uses only config.json when no local exists', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ dirname: 'from-config' }),
	);
	execSync('git add .cool-branch && git commit -m "Add config"', { cwd: dir });
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, 'from-config', 'feature-x'));
});
```

## Verification

- [ ] All new tests pass
- [ ] All existing tests still pass
- [ ] `pnpm run lint:fix` passes
- [ ] `pnpm run typecheck` passes
