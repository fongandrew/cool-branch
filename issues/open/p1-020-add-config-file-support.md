@user: Add support for a config file in `.cool-branch/config.json` that can override default settings like the base directory and dirname.

## Background

Currently, configuration is stored globally in `<base>/cool-branch.json`. We want to support per-repo configuration in `.cool-branch/config.json` that can override global defaults. This allows repos to specify their own preferences without affecting the global config.

## Requirements

1. Look for `.cool-branch/config.json` in the repo root
2. Supported config options:
   - `base`: Override the default worktree base directory
   - `dirname`: Override the directory name for this repo's worktrees
3. Config file is optional - if not present, use existing behavior
4. Per-repo config takes precedence over global config and CLI defaults
5. CLI flags (like `--base`) still take highest precedence
6. Do NOT update `<base>/cool-branch.json` with dirname from `.cool-branch/config.json` - the local config always takes precedence at runtime, so there's no need to sync it to the global config

## Config File Format

```json
{
  "base": "/custom/worktree/path",
  "dirname": "my-custom-name"
}
```

## TDD Approach

Add these tests to `test/integration.ts`:

```typescript
test('add: uses base from .cool-branch/config.json', ({ dir, base }) => {
	initGitRepo(dir);
	const customBase = path.join(base, 'custom-base');
	fs.mkdirSync(path.join(dir, '.cool-branch'), { recursive: true });
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ base: customBase }),
	);
	execSync('git add .cool-branch && git commit -m "Add config"', { cwd: dir });
	runCLI(['add', 'feature-x'], { cwd: dir });
	const repoName = path.basename(dir);
	assertFileExists(path.join(customBase, repoName, 'feature-x'));
});

test('add: uses dirname from .cool-branch/config.json', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'), { recursive: true });
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ dirname: 'custom-dirname' }),
	);
	execSync('git add .cool-branch && git commit -m "Add config"', { cwd: dir });
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, 'custom-dirname', 'feature-x'));
});

test('add: CLI --base flag overrides .cool-branch/config.json base', ({ dir, base }) => {
	initGitRepo(dir);
	const configBase = path.join(base, 'config-base');
	const cliBase = path.join(base, 'cli-base');
	fs.mkdirSync(path.join(dir, '.cool-branch'), { recursive: true });
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ base: configBase }),
	);
	execSync('git add .cool-branch && git commit -m "Add config"', { cwd: dir });
	runCLI(['add', 'feature-x', '--base', cliBase], { cwd: dir });
	const repoName = path.basename(dir);
	assertFileExists(path.join(cliBase, repoName, 'feature-x'));
	assert(!fs.existsSync(path.join(configBase, repoName, 'feature-x')));
});

test('add: .cool-branch/config.json dirname overrides global config', ({ dir, base }) => {
	initGitRepo(dir);
	// Set global dirname first
	runCLI(['dirname', 'global-name', '--base', base], { cwd: dir });
	// Then set local config
	fs.mkdirSync(path.join(dir, '.cool-branch'), { recursive: true });
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ dirname: 'local-name' }),
	);
	execSync('git add .cool-branch && git commit -m "Add config"', { cwd: dir });
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, 'local-name', 'feature-x'));
	assert(!fs.existsSync(path.join(base, 'global-name', 'feature-x')));
});

test('config: works without .cool-branch/config.json', ({ dir, base }) => {
	initGitRepo(dir);
	// No .cool-branch directory
	const result = runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	const repoName = path.basename(dir);
	assertFileExists(path.join(base, repoName, 'feature-x'));
});

test('config: .cool-branch/config.json dirname does not update global config', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'), { recursive: true });
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ dirname: 'local-dirname' }),
	);
	execSync('git add .cool-branch && git commit -m "Add config"', { cwd: dir });
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	// Global config should NOT contain the local dirname
	const globalConfig = JSON.parse(fs.readFileSync(path.join(base, 'cool-branch.json'), 'utf-8'));
	assert(
		!Object.values(globalConfig).includes('local-dirname'),
		'Global config should not be updated with local dirname',
	);
});
```

## Verification

- [ ] All new tests pass
- [ ] All existing tests still pass
- [ ] `pnpm run lint:fix` passes
- [ ] `pnpm run typecheck` passes
