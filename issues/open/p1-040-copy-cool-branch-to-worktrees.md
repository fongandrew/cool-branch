@user: Add a config option and CLI flag to control copying the `.cool-branch` directory to new worktrees. Three modes: copy everything, copy nothing, or copy only local content (default).

## Background

When creating a worktree, users may want their local configuration (like `setup.local.sh` or `config.local.json`) available in the new worktree. Since these files are typically gitignored, they won't be present in the worktree by default.

## Requirements

### Copy Modes
1. **`all`**: Copy the entire `.cool-branch` directory to the new worktree
2. **`none`**: Don't copy anything (current behavior)
3. **`local`** (default): Copy only local variants (`*.local*` files and `*.local` files without extension)

### Configuration
1. Add `copyConfig` option to `.cool-branch/config.json` with values: `"all"`, `"none"`, `"local"`
2. Add `--copy-config` CLI flag with same values
3. CLI flag overrides config file setting
4. Default is `"local"` if not specified

### Behavior
1. Copy happens AFTER the worktree is created by git, but BEFORE the setup script runs
2. If copying, create `.cool-branch` directory in worktree if it doesn't exist
3. When mode is `local`, copy files matching patterns:
   - `*.local` (e.g., `setup.local`)
   - `*.local.*` (e.g., `setup.local.sh`, `config.local.json`)

## TDD Approach

Add these tests to `test/integration.ts`:

```typescript
test('add: copies local files by default', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(path.join(dir, '.cool-branch', 'setup.local.sh'), '#!/bin/bash\necho "local"', { mode: 0o755 });
	fs.writeFileSync(path.join(dir, '.cool-branch', 'config.local.json'), '{}');
	fs.writeFileSync(path.join(dir, '.cool-branch', 'setup.sh'), '#!/bin/bash\necho "regular"', { mode: 0o755 });
	execSync('git add .cool-branch/setup.sh && git commit -m "Add setup"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	const worktreePath = path.join(base, repoName, 'feature-x');
	// Local files should be copied
	assertFileExists(path.join(worktreePath, '.cool-branch', 'setup.local.sh'));
	assertFileExists(path.join(worktreePath, '.cool-branch', 'config.local.json'));
	// Non-local file should NOT be copied (it comes from git)
});

test('add: --copy-config=all copies everything', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(path.join(dir, '.cool-branch', 'custom-file.txt'), 'custom content');
	fs.writeFileSync(path.join(dir, '.cool-branch', 'setup.local'), '#!/bin/bash\necho "local"', { mode: 0o755 });
	execSync('git add .cool-branch && git commit -m "Add cool-branch dir"', { cwd: dir });
	// Add an untracked file after commit
	fs.writeFileSync(path.join(dir, '.cool-branch', 'untracked.txt'), 'untracked');
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base, '--copy-config', 'all'], { cwd: dir });
	const worktreePath = path.join(base, repoName, 'feature-x');
	assertFileExists(path.join(worktreePath, '.cool-branch', 'untracked.txt'));
	assertFileExists(path.join(worktreePath, '.cool-branch', 'setup.local'));
});

test('add: --copy-config=none copies nothing', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(path.join(dir, '.cool-branch', 'setup.local.sh'), '#!/bin/bash\necho "local"', { mode: 0o755 });
	execSync('git add .cool-branch && git commit -m "Add dir"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base, '--copy-config', 'none'], { cwd: dir });
	const worktreePath = path.join(base, repoName, 'feature-x');
	// Local files should NOT be copied
	assert(!fs.existsSync(path.join(worktreePath, '.cool-branch', 'setup.local.sh')));
});

test('add: copyConfig in config.json controls copy behavior', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ copyConfig: 'none' }),
	);
	fs.writeFileSync(path.join(dir, '.cool-branch', 'setup.local.sh'), '#!/bin/bash\necho "local"', { mode: 0o755 });
	execSync('git add .cool-branch/config.json && git commit -m "Add config"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	const worktreePath = path.join(base, repoName, 'feature-x');
	assert(!fs.existsSync(path.join(worktreePath, '.cool-branch', 'setup.local.sh')));
});

test('add: --copy-config flag overrides config.json copyConfig', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ copyConfig: 'none' }),
	);
	fs.writeFileSync(path.join(dir, '.cool-branch', 'setup.local.sh'), '#!/bin/bash\necho "local"', { mode: 0o755 });
	execSync('git add .cool-branch/config.json && git commit -m "Add config"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base, '--copy-config', 'local'], { cwd: dir });
	const worktreePath = path.join(base, repoName, 'feature-x');
	assertFileExists(path.join(worktreePath, '.cool-branch', 'setup.local.sh'));
});
```

## Verification

- [ ] All new tests pass
- [ ] All existing tests still pass
- [ ] `pnpm run lint:fix` passes
- [ ] `pnpm run typecheck` passes
