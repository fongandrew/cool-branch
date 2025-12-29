@user: Add a `cool-branch setup` command to view and manage setup scripts.

## Background

Users need an easy way to:
- See which setup script would run for the current repo
- Create or edit setup scripts
- Manage local setup script variants

## Requirements

### Command Syntax
```bash
cool-branch setup                 # Show which setup script would run (and its path)
cool-branch setup --edit          # Open setup script in $EDITOR (create if missing)
cool-branch setup --local         # Show local setup script info
cool-branch setup --local --edit  # Open/create setup.local in $EDITOR
cool-branch setup --path          # Print only the path (for scripting)
```

### Behavior

#### `cool-branch setup` (no flags)
1. Check for setup scripts in `.cool-branch/` directory
2. Show which script would run (following the priority: local > regular)
3. Show the full path to the script
4. If no setup script exists, say so

#### `cool-branch setup --edit`
1. If setup script exists, open it in editor
2. If no setup script exists:
   - Create `.cool-branch/` if needed
   - Create `setup` with executable permissions and a template
   - Open in editor
3. Use `--local` to target `setup.local` instead

#### `cool-branch setup --path`
1. Print only the path to the setup script that would run
2. Exit with code 1 if no setup script exists
3. Useful for scripting: `$(cool-branch setup --path)`

### Setup Script Template
```bash
#!/bin/bash
# cool-branch setup script
# This script runs after creating a new worktree.
# The worktree path is passed as the first argument: $1

WORKTREE_PATH="$1"

# Example: Install dependencies
# cd "$WORKTREE_PATH" && npm install

# Example: Copy local environment files
# cp .env.example "$WORKTREE_PATH/.env"

echo "Setup complete for $WORKTREE_PATH"
```

### Editor Detection
Same as `init` command:
1. Use `$VISUAL` if set
2. Fall back to `$EDITOR` if set
3. Fall back to `vi` (or `notepad` on Windows)

## TDD Approach

Add these tests to `test/integration.ts`:

```typescript
test('setup: shows no setup script message when none exists', ({ dir, base }) => {
	initGitRepo(dir);
	const result = runCLI(['setup', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assert(
		result.stdout.includes('No setup script') || result.stdout.includes('not found'),
	);
});

test('setup: shows setup script path when exists', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'), { recursive: true });
	fs.writeFileSync(path.join(dir, '.cool-branch', 'setup'), '#!/bin/bash\necho hi', { mode: 0o755 });
	const result = runCLI(['setup', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assert(result.stdout.includes('.cool-branch'));
	assert(result.stdout.includes('setup'));
});

test('setup: shows local setup when it exists', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'), { recursive: true });
	fs.writeFileSync(path.join(dir, '.cool-branch', 'setup'), '#!/bin/bash\necho regular', { mode: 0o755 });
	fs.writeFileSync(path.join(dir, '.cool-branch', 'setup.local'), '#!/bin/bash\necho local', { mode: 0o755 });
	const result = runCLI(['setup', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	// Should show that local script will be used
	assert(result.stdout.includes('setup.local') || result.stdout.includes('local'));
});

test('setup: --local shows only local setup info', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'), { recursive: true });
	fs.writeFileSync(path.join(dir, '.cool-branch', 'setup'), '#!/bin/bash\necho regular', { mode: 0o755 });
	const result = runCLI(['setup', '--local', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assert(
		result.stdout.includes('No local') || result.stdout.includes('not found'),
	);
});

test('setup: --path prints only the path', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'), { recursive: true });
	fs.writeFileSync(path.join(dir, '.cool-branch', 'setup.sh'), '#!/bin/bash\necho hi', { mode: 0o755 });
	const result = runCLI(['setup', '--path', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	// Should be just the path, no extra text
	const output = result.stdout.trim();
	assert(output.endsWith('setup.sh'));
	assert(!output.includes(' ')); // No spaces = just the path
});

test('setup: --path exits 1 when no setup exists', ({ dir, base }) => {
	initGitRepo(dir);
	const result = runCLI(['setup', '--path', '--base', base], { cwd: dir });
	assertExitCode(result, 1);
});

test('setup: --edit creates setup script if missing', ({ dir, base }) => {
	initGitRepo(dir);
	// Use a non-interactive "editor" that just exits
	const result = runCLI(['setup', '--edit', '--base', base], {
		cwd: dir,
		env: { ...process.env, EDITOR: 'true' } // 'true' command just exits 0
	});
	// The script should be created even if editor "fails"
	assertFileExists(path.join(dir, '.cool-branch', 'setup'));
	const content = fs.readFileSync(path.join(dir, '.cool-branch', 'setup'), 'utf-8');
	assert(content.includes('#!/bin/bash'));
});

test('setup: errors when not in git repo', ({ dir, base }) => {
	const result = runCLI(['setup', '--base', base], { cwd: dir });
	assertExitCode(result, 1);
});
```

## Verification

- [ ] All new tests pass
- [ ] All existing tests still pass
- [ ] `pnpm run lint:fix` passes
- [ ] `pnpm run typecheck` passes

## Notes

Testing `--edit` with actual editor interaction is difficult. The test uses `EDITOR=true` to simulate an editor that immediately exits. Manual testing should verify actual editor behavior.
