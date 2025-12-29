@user: Add a CLI flag to specify a custom config file or directory. The flag should accept either a path to a config file directly, or a path to a directory containing a config file.

## Background

Users may want to use a config file from a non-standard location, for example:
- A shared config directory outside the repo
- A different config file for different environments
- Testing with alternate configurations

## Requirements

1. Add `--config <path>` CLI flag
2. The path can be either:
   - A direct path to a JSON config file (e.g., `--config /path/to/my-config.json`)
   - A path to a directory containing `config.json` (e.g., `--config /path/to/config-dir/`)
3. When specified, this config takes precedence over `.cool-branch/config.json`
4. CLI flags (like `--base`) still take highest precedence over config file values
5. If the specified path doesn't exist or is invalid, show an error and exit

## Precedence Order (highest to lowest)

1. CLI flags (`--base`, etc.)
2. `--config` specified config file
3. `.cool-branch/config.local.json`
4. `.cool-branch/config.json`
5. Global config (`<base>/cool-branch.json`)
6. Defaults

## TDD Approach

Add these tests to `test/integration.ts`:

```typescript
test('add: --config flag uses specified config file', ({ dir, base }) => {
	initGitRepo(dir);
	const configDir = path.join(base, 'custom-config');
	fs.mkdirSync(configDir, { recursive: true });
	fs.writeFileSync(
		path.join(configDir, 'my-config.json'),
		JSON.stringify({ dirname: 'from-custom-config' }),
	);
	runCLI(['add', 'feature-x', '--base', base, '--config', path.join(configDir, 'my-config.json')], { cwd: dir });
	assertFileExists(path.join(base, 'from-custom-config', 'feature-x'));
});

test('add: --config flag accepts directory path', ({ dir, base }) => {
	initGitRepo(dir);
	const configDir = path.join(base, 'custom-config-dir');
	fs.mkdirSync(configDir, { recursive: true });
	fs.writeFileSync(
		path.join(configDir, 'config.json'),
		JSON.stringify({ dirname: 'from-config-dir' }),
	);
	runCLI(['add', 'feature-x', '--base', base, '--config', configDir], { cwd: dir });
	assertFileExists(path.join(base, 'from-config-dir', 'feature-x'));
});

test('add: --config overrides .cool-branch/config.json', ({ dir, base }) => {
	initGitRepo(dir);
	// Local config
	fs.mkdirSync(path.join(dir, '.cool-branch'), { recursive: true });
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ dirname: 'from-local' }),
	);
	execSync('git add .cool-branch && git commit -m "Add config"', { cwd: dir });
	// Custom config
	const customConfig = path.join(base, 'custom.json');
	fs.writeFileSync(customConfig, JSON.stringify({ dirname: 'from-custom' }));
	runCLI(['add', 'feature-x', '--base', base, '--config', customConfig], { cwd: dir });
	assertFileExists(path.join(base, 'from-custom', 'feature-x'));
	assert(!fs.existsSync(path.join(base, 'from-local', 'feature-x')));
});

test('add: CLI --base still overrides --config base', ({ dir, base }) => {
	initGitRepo(dir);
	const configBase = path.join(base, 'config-base');
	const cliBase = path.join(base, 'cli-base');
	const customConfig = path.join(base, 'custom.json');
	fs.writeFileSync(customConfig, JSON.stringify({ base: configBase }));
	runCLI(['add', 'feature-x', '--base', cliBase, '--config', customConfig], { cwd: dir });
	const repoName = path.basename(dir);
	assertFileExists(path.join(cliBase, repoName, 'feature-x'));
	assert(!fs.existsSync(path.join(configBase, repoName, 'feature-x')));
});

test('add: --config errors on non-existent path', ({ dir, base }) => {
	initGitRepo(dir);
	const result = runCLI(['add', 'feature-x', '--base', base, '--config', '/nonexistent/path'], { cwd: dir });
	assertExitCode(result, 1);
	assert(result.stderr.includes('not found') || result.stderr.includes('does not exist'));
});

test('add: --config errors on directory without config.json', ({ dir, base }) => {
	initGitRepo(dir);
	const emptyDir = path.join(base, 'empty-dir');
	fs.mkdirSync(emptyDir, { recursive: true });
	const result = runCLI(['add', 'feature-x', '--base', base, '--config', emptyDir], { cwd: dir });
	assertExitCode(result, 1);
	assert(result.stderr.includes('not found') || result.stderr.includes('config.json'));
});

test('list: --config flag works with list command', ({ dir, base }) => {
	initGitRepo(dir);
	const customConfig = path.join(base, 'custom.json');
	fs.writeFileSync(customConfig, JSON.stringify({ dirname: 'custom-list-dir' }));
	// First add a worktree using the custom config
	runCLI(['add', 'feature-x', '--base', base, '--config', customConfig], { cwd: dir });
	// List should work with the same config
	const result = runCLI(['list', '--base', base, '--config', customConfig], { cwd: dir });
	assertExitCode(result, 0);
});
```

## Help Text Update

```
Options:
  --config <path>   Path to config file or directory containing config.json
```

## Verification

- [ ] All new tests pass
- [ ] All existing tests still pass
- [ ] `pnpm run lint:fix` passes
- [ ] `pnpm run typecheck` passes
