@user: Add a `cool-branch init` command to initialize the `.cool-branch` directory with a config file template.

## Background

Users need an easy way to create the `.cool-branch/` directory structure with a starter config file. This command provides a quick way to get started with cool-branch configuration.

## Requirements

### Command Syntax
```bash
cool-branch init              # Create .cool-branch/ with config.json template
cool-branch init --local      # Create .cool-branch/ with config.local.json template
cool-branch init --edit       # Create and open config.json in $EDITOR
cool-branch init --local --edit  # Create and open config.local.json in $EDITOR
```

### Behavior
1. Create `.cool-branch/` directory if it doesn't exist
2. Create `config.json` (or `config.local.json` with `--local`) with a template
3. If config file already exists, do nothing (don't overwrite) unless `--force` is used
4. With `--edit`, open the config file in the user's editor after creation
5. Print path to created file on success

### Template Content
```json
{
  "dirname": "",
  "base": "",
  "copyConfig": "local"
}
```

Note: Empty strings indicate "use default". The template serves as documentation of available options.

### Editor Detection
1. Use `$VISUAL` if set
2. Fall back to `$EDITOR` if set
3. Fall back to `vi` (or `notepad` on Windows)
4. If `--edit` is used but no editor can be found/run, print error and exit

### Error Cases
- Not in a git repository: error
- Config file already exists (without `--force`): print message, exit 0
- Editor not found (with `--edit`): error

## TDD Approach

Add these tests to `test/integration.ts`:

```typescript
test('init: creates .cool-branch directory and config.json', ({ dir, base }) => {
	initGitRepo(dir);
	assert(!fs.existsSync(path.join(dir, '.cool-branch')));
	const result = runCLI(['init', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assertFileExists(path.join(dir, '.cool-branch', 'config.json'));
	// Should be valid JSON
	const config = JSON.parse(fs.readFileSync(path.join(dir, '.cool-branch', 'config.json'), 'utf-8'));
	assert(typeof config === 'object');
});

test('init: --local creates config.local.json', ({ dir, base }) => {
	initGitRepo(dir);
	const result = runCLI(['init', '--local', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assertFileExists(path.join(dir, '.cool-branch', 'config.local.json'));
	assert(!fs.existsSync(path.join(dir, '.cool-branch', 'config.json')));
});

test('init: does not overwrite existing config', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'), { recursive: true });
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ dirname: 'existing' }),
	);
	const result = runCLI(['init', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	const config = JSON.parse(fs.readFileSync(path.join(dir, '.cool-branch', 'config.json'), 'utf-8'));
	assert.strictEqual(config.dirname, 'existing', 'Should not overwrite existing config');
});

test('init: --force overwrites existing config', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'), { recursive: true });
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ dirname: 'existing' }),
	);
	const result = runCLI(['init', '--force', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	const config = JSON.parse(fs.readFileSync(path.join(dir, '.cool-branch', 'config.json'), 'utf-8'));
	assert.notStrictEqual(config.dirname, 'existing', 'Should overwrite with --force');
});

test('init: errors when not in git repo', ({ dir, base }) => {
	// dir is not a git repo
	const result = runCLI(['init', '--base', base], { cwd: dir });
	assertExitCode(result, 1);
	assert(result.stderr.includes('git') || result.stderr.includes('repository'));
});

test('init: prints path to created file', ({ dir, base }) => {
	initGitRepo(dir);
	const result = runCLI(['init', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assert(result.stdout.includes('.cool-branch') && result.stdout.includes('config.json'));
});
```

## Verification

- [ ] All new tests pass
- [ ] All existing tests still pass
- [ ] `pnpm run lint:fix` passes
- [ ] `pnpm run typecheck` passes

## Notes

Testing `--edit` is difficult in automated tests since it opens an interactive editor. Manual testing should verify:
- `VISUAL` is preferred over `EDITOR`
- Falls back to `vi` when neither is set
- Works correctly on the user's system
