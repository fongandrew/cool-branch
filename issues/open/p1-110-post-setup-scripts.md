@user: Implement post-setup script execution after worktree creation.

## TDD Approach

**Write tests first**, then implement to make them pass.

### Tests to Write First

Add to `test/integration.ts`:

```typescript
test('add: runs .cool-branch-setup when it exists', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    // Create a setup script that creates a marker file
    fs.writeFileSync(path.join(dir, '.cool-branch-setup'), `#!/bin/bash
echo "setup ran" > "$1/setup-marker.txt"
`, { mode: 0o755 });
    execSync('git add .cool-branch-setup && git commit -m "Add setup script"', { cwd: dir });

    // Create worktree
    const repoName = path.basename(dir);
    runCLI(['add', 'feature-x', '--base', base], { cwd: dir });

    // Verify setup script ran
    assertFileExists(path.join(base, repoName, 'feature-x', 'setup-marker.txt'));
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});

test('add: respects --no-setup flag', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    // Create a setup script
    fs.writeFileSync(path.join(dir, '.cool-branch-setup'), `#!/bin/bash
echo "setup ran" > "$1/setup-marker.txt"
`, { mode: 0o755 });
    execSync('git add .cool-branch-setup && git commit -m "Add setup script"', { cwd: dir });

    // Create worktree with --no-setup
    const repoName = path.basename(dir);
    runCLI(['add', 'feature-x', '--no-setup', '--base', base], { cwd: dir });

    // Verify setup script did NOT run
    assert(!fs.existsSync(path.join(base, repoName, 'feature-x', 'setup-marker.txt')));
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});

test('add: uses custom script with --setup', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    // Create a custom setup script
    fs.writeFileSync(path.join(dir, 'custom-setup.sh'), `#!/bin/bash
echo "custom setup" > "$1/custom-marker.txt"
`, { mode: 0o755 });
    execSync('git add custom-setup.sh && git commit -m "Add custom script"', { cwd: dir });

    // Create worktree with --setup
    const repoName = path.basename(dir);
    runCLI(['add', 'feature-x', '--setup', 'custom-setup.sh', '--base', base], { cwd: dir });

    // Verify custom script ran
    assertFileExists(path.join(base, repoName, 'feature-x', 'custom-marker.txt'));
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});

test('add: continues if setup script fails', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    // Create a setup script that fails
    fs.writeFileSync(path.join(dir, '.cool-branch-setup'), `#!/bin/bash
exit 1
`, { mode: 0o755 });
    execSync('git add .cool-branch-setup && git commit -m "Add failing script"', { cwd: dir });

    // Create worktree - should still succeed
    const repoName = path.basename(dir);
    const result = runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
    assertExitCode(result, 0);
    assertFileExists(path.join(base, repoName, 'feature-x'));
    // Should warn about script failure
    assert(result.stdout.includes('Warning') || result.stderr.includes('Warning'));
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});

test('add: warns if --setup script does not exist', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    const result = runCLI(['add', 'feature-x', '--setup', 'nonexistent.sh', '--base', base], { cwd: dir });
    assertExitCode(result, 0); // Should still succeed
    assert(result.stdout.includes('Warning') || result.stderr.includes('Warning'));
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});
```

## Requirements

After creating a worktree with `cool-branch add`, run a setup script if available.

### Behavior

After worktree creation (unless `--no-setup` is specified):

1. **Determine script to run:**
   - If `--setup <script>` provided: use that path (relative to repo root)
   - Otherwise: look for `.cool-branch-setup` in repo root

2. **If script path provided via `--setup`:**
   - If script doesn't exist: warn and continue
   - If script exists: execute it

3. **If using default `.cool-branch-setup`:**
   - If file doesn't exist: skip silently (no warning)
   - If file exists: execute it

4. **Script execution:**
   - Execute in the newly created worktree directory (cwd)
   - Pass worktree path as first argument (`$1`)
   - Capture stdout/stderr
   - If script fails: warn but continue (don't fail the whole operation)

### Update `src/commands/add.ts`

1. Add script execution logic after worktree creation
2. Handle `--setup` and `--no-setup` options
3. Print script output (or a summary)

### Create `src/scripts.ts` (optional)

Helper function:

```typescript
interface RunScriptResult {
  success: boolean;
  stdout: string;
  stderr: string;
}

function runSetupScript(
  scriptPath: string,
  worktreePath: string
): RunScriptResult
```

### Output

When script runs successfully:
```
Worktree created at: ~/.worktrees/my-project/feature-x
Running setup script...
Setup complete.
```

When script fails:
```
Worktree created at: ~/.worktrees/my-project/feature-x
Running setup script...
Warning: Setup script failed (exit code 1). Continuing anyway.
```

## Verification

1. All new tests pass
2. Runs `.cool-branch-setup` when it exists
3. Respects `--no-setup` flag
4. Uses custom script with `--setup <path>`
5. Warns but continues if script fails
6. Warns if `--setup` script doesn't exist
7. `pnpm test` shows all tests passing
8. `pnpm run typecheck` passes
9. `pnpm run lint:fix` passes
