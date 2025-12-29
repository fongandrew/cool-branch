@user: Change setup script behavior so that the script that runs is the one in the NEW worktree (after copy), not from the main repo. If there is no `.cool-branch/setup` in the new worktree, no setup script runs.

## Background

Currently, the setup script is found and run from the main repo. With the new copy behavior (p1-040), we want to run the setup script that exists in the worktree AFTER copying. This allows:
1. Branch-specific setup scripts (different setup on different branches)
2. Local setup scripts that are copied to the worktree
3. No setup running if the branch doesn't have a `.cool-branch/setup`

## Requirements

1. After creating the worktree and copying `.cool-branch` files (per p1-040), look for the setup script in the WORKTREE's `.cool-branch/` directory
2. Run the setup script from the worktree directory (cwd = worktree path)
3. If no setup script exists in the worktree, skip setup silently (don't fall back to main repo)
4. The `--setup` flag should still work to specify a custom script path (relative to main repo or absolute)
5. Legacy `cool-branch.sh` in the main repo should NOT run if it doesn't exist in the worktree

## Important Change

This is a breaking change from current behavior where setup scripts in the main repo always run. The new behavior is:
- Setup script must exist in the worktree (either from git checkout or from copy)
- Main repo's setup script is only used as the source for copying, not for direct execution

## TDD Approach

Add these tests to `test/integration.ts`:

```typescript
test('add: runs setup from worktree, not main repo', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup'),
		`#!/bin/bash
echo "main repo" > "$1/which-setup.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add .cool-branch && git commit -m "Add setup"', { cwd: dir });
	// Create a branch with different setup
	execSync('git checkout -b feature-branch', { cwd: dir });
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup'),
		`#!/bin/bash
echo "feature branch" > "$1/which-setup.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add .cool-branch && git commit -m "Update setup"', { cwd: dir });
	execSync('git checkout main', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-branch', '--base', base], { cwd: dir });
	const content = fs.readFileSync(path.join(base, repoName, 'feature-branch', 'which-setup.txt'), 'utf-8');
	assert(content.includes('feature branch'), 'Should run setup from worktree branch');
});

test('add: no setup runs if worktree branch has no setup script', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup'),
		`#!/bin/bash
echo "setup ran" > "$1/setup-marker.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add .cool-branch && git commit -m "Add setup"', { cwd: dir });
	// Create a branch without setup
	execSync('git checkout -b no-setup-branch', { cwd: dir });
	fs.rmSync(path.join(dir, '.cool-branch'), { recursive: true });
	execSync('git add -A && git commit -m "Remove setup"', { cwd: dir });
	execSync('git checkout main', { cwd: dir });
	const repoName = path.basename(dir);
	const result = runCLI(['add', 'no-setup-branch', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	// Setup marker should NOT exist
	assert(!fs.existsSync(path.join(base, repoName, 'no-setup-branch', 'setup-marker.txt')));
});

test('add: runs copied local setup from worktree', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	// Only a local setup (not in git)
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup.local'),
		`#!/bin/bash
echo "local setup ran" > "$1/setup-marker.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add .cool-branch && git commit --allow-empty -m "Add dir"', { cwd: dir });
	const repoName = path.basename(dir);
	// Default copy mode copies local files
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, repoName, 'feature-x', 'setup-marker.txt'));
});

test('add: --setup flag still works with explicit path', ({ dir, base }) => {
	initGitRepo(dir);
	fs.writeFileSync(
		path.join(dir, 'custom-setup.sh'),
		`#!/bin/bash
echo "custom" > "$1/setup-marker.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add custom-setup.sh && git commit -m "Add custom setup"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base, '--setup', 'custom-setup.sh'], { cwd: dir });
	assertFileExists(path.join(base, repoName, 'feature-x', 'setup-marker.txt'));
});

test('add: legacy cool-branch.sh in main repo does not run if not in worktree', ({ dir, base }) => {
	initGitRepo(dir);
	// Legacy setup only in main, not on branch
	fs.writeFileSync(
		path.join(dir, 'cool-branch.sh'),
		`#!/bin/bash
echo "legacy ran" > "$1/setup-marker.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add cool-branch.sh && git commit -m "Add legacy setup"', { cwd: dir });
	// Create branch without the script
	execSync('git checkout -b no-legacy-branch', { cwd: dir });
	fs.unlinkSync(path.join(dir, 'cool-branch.sh'));
	execSync('git add -A && git commit -m "Remove legacy setup"', { cwd: dir });
	execSync('git checkout main', { cwd: dir });
	const repoName = path.basename(dir);
	const result = runCLI(['add', 'no-legacy-branch', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	// Legacy setup should NOT have run
	assert(!fs.existsSync(path.join(base, repoName, 'no-legacy-branch', 'setup-marker.txt')));
});
```

## Verification

- [ ] All new tests pass
- [ ] All existing tests still pass
- [ ] `pnpm run lint:fix` passes
- [ ] `pnpm run typecheck` passes

## Notes

This issue depends on p1-040 (copy behavior) being completed first. The setup script execution happens AFTER the copy step.
