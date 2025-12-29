@user: Add a `cool-branch config` command to get and set config values in `.cool-branch/config.json`. This replaces the current `dirname` command functionality.

## Background

Currently there's no easy way to programmatically manage `.cool-branch/config.json`. The existing `dirname` command updates the global config at `<base>/cool-branch.json`, but we want config to be managed locally in the repo's `.cool-branch/` directory.

## Requirements

### Command Syntax
```bash
cool-branch config                      # List all config (merged local + regular)
cool-branch config <key>                # Get a specific key's value
cool-branch config <key> <value>        # Set a key in config.json
cool-branch config --local <key> <val>  # Set a key in config.local.json
cool-branch config --unset <key>        # Remove a key from config.json
cool-branch config --unset --local <key> # Remove a key from config.local.json
```

### Supported Keys
- `dirname` - Directory name for this repo's worktrees
- `base` - Base directory for worktrees
- `copyConfig` - Copy mode for .cool-branch directory (`all`, `none`, `local`)

### Behavior
1. Auto-create `.cool-branch/` directory if it doesn't exist when setting a value
2. Auto-create `config.json` or `config.local.json` if it doesn't exist
3. When listing/getting, show merged config (local overrides regular)
4. Validate values where applicable (e.g., `copyConfig` must be `all`, `none`, or `local`)

### Deprecate `dirname` Command
- Keep the `dirname` command working for backwards compatibility
- Have it print a deprecation warning suggesting `cool-branch config dirname` instead
- Internally, have it call the new config system

## TDD Approach

Add these tests to `test/integration.ts`:

```typescript
// Config get/set tests
test('config: set creates .cool-branch/config.json', ({ dir, base }) => {
	initGitRepo(dir);
	assert(!fs.existsSync(path.join(dir, '.cool-branch', 'config.json')));
	const result = runCLI(['config', 'dirname', 'my-dirname', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assertFileExists(path.join(dir, '.cool-branch', 'config.json'));
	const config = JSON.parse(fs.readFileSync(path.join(dir, '.cool-branch', 'config.json'), 'utf-8'));
	assert.strictEqual(config.dirname, 'my-dirname');
});

test('config: get returns value from config.json', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'), { recursive: true });
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ dirname: 'test-value' }),
	);
	const result = runCLI(['config', 'dirname', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assert(result.stdout.includes('test-value'));
});

test('config: list shows all config values', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'), { recursive: true });
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ dirname: 'my-dir', base: '/custom/base' }),
	);
	const result = runCLI(['config', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assert(result.stdout.includes('dirname'));
	assert(result.stdout.includes('my-dir'));
	assert(result.stdout.includes('base'));
});

test('config: --local sets value in config.local.json', ({ dir, base }) => {
	initGitRepo(dir);
	const result = runCLI(['config', '--local', 'dirname', 'local-dirname', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assertFileExists(path.join(dir, '.cool-branch', 'config.local.json'));
	const config = JSON.parse(fs.readFileSync(path.join(dir, '.cool-branch', 'config.local.json'), 'utf-8'));
	assert.strictEqual(config.dirname, 'local-dirname');
});

test('config: get merges local and regular config', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'), { recursive: true });
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ dirname: 'regular', base: '/regular/base' }),
	);
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.local.json'),
		JSON.stringify({ dirname: 'local' }),
	);
	const result = runCLI(['config', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	// Local dirname should override
	assert(result.stdout.includes('local'));
	// Base from regular config should still show
	assert(result.stdout.includes('/regular/base'));
});

test('config: --unset removes key from config', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'), { recursive: true });
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ dirname: 'to-remove', base: '/keep/this' }),
	);
	const result = runCLI(['config', '--unset', 'dirname', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	const config = JSON.parse(fs.readFileSync(path.join(dir, '.cool-branch', 'config.json'), 'utf-8'));
	assert(!('dirname' in config));
	assert.strictEqual(config.base, '/keep/this');
});

test('config: validates copyConfig values', ({ dir, base }) => {
	initGitRepo(dir);
	const result = runCLI(['config', 'copyConfig', 'invalid-value', '--base', base], { cwd: dir });
	assertExitCode(result, 1);
	assert(result.stderr.includes('invalid') || result.stderr.includes('must be'));
});

// Dirname deprecation test
test('dirname: shows deprecation warning', ({ dir, base }) => {
	initGitRepo(dir);
	const result = runCLI(['dirname', 'old-way', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assert(
		result.stdout.includes('deprecated') || result.stderr.includes('deprecated'),
		'Should show deprecation warning',
	);
});
```

## Verification

- [ ] All new tests pass
- [ ] All existing tests still pass
- [ ] `pnpm run lint:fix` passes
- [ ] `pnpm run typecheck` passes
