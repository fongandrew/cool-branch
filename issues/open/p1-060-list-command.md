@user: Implement the default list command that shows branches and their worktree status.

## TDD Approach

**Write tests first**, then implement to make them pass.

### Tests to Write First

Add to `test/integration.ts`:

```typescript
test('list: shows branches in a git repo', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    const result = runCLI(['--base', base], { cwd: dir });
    assertExitCode(result, 0);
    assert(result.stdout.includes('main') || result.stdout.includes('master'));
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});

test('list: marks current branch with asterisk', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    const result = runCLI(['--base', base], { cwd: dir });
    assertExitCode(result, 0);
    assert(result.stdout.includes('*'));
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});

test('list: shows worktree paths for branches with worktrees', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    // Create a worktree
    runCLI(['add', 'feature-branch', '--base', base], { cwd: dir });
    // List should show it
    const result = runCLI(['--base', base], { cwd: dir });
    assertExitCode(result, 0);
    assert(result.stdout.includes('feature-branch'));
    assert(result.stdout.includes(base)); // path should be shown
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});

test('list: shows (no worktree) for branches without worktrees', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    // Create a branch without a worktree
    execSync('git branch no-worktree-branch', { cwd: dir });
    const result = runCLI(['--base', base], { cwd: dir });
    assertExitCode(result, 0);
    assert(result.stdout.includes('no worktree'));
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});

test('list: errors when not in a git repo', async () => {
  const dir = createTempDir(); // Not a git repo
  const base = createTempDir();
  try {
    const result = runCLI(['--base', base], { cwd: dir });
    assertExitCode(result, 1);
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});
```

## Requirements

When `cool-branch` is run with no command, display all branches with their worktree paths.

### Expected Output Format

```
Branches:
  feature-a    ~/.worktrees/my-project/feature-a
  feature-b    (no worktree)
* main         /Users/dev/my-project (main worktree)
  bugfix-c     ~/.worktrees/my-project/bugfix-c
```

### Create `src/commands/list.ts`

1. **`listCommand(options: { base: string }): void`**
   - Get all local branches using git utilities
   - Get all worktrees using git utilities
   - Get current branch
   - For each branch:
     - Mark with `*` if it's the current branch
     - Show worktree path if one exists
     - Show "(main worktree)" for the main/bare worktree
     - Show "(no worktree)" if no worktree exists
   - Sort branches alphabetically

### Output Formatting

- Use consistent column alignment
- Replace home directory with `~` in paths for readability
- Handle long branch names gracefully

### Update `src/index.ts`

- When no command is provided, run the list command
- Pass the `--base` option value

## Verification

1. All new tests pass
2. Output matches expected format
3. Current branch is marked with `*`
4. Main worktree is labeled correctly
5. Paths use `~` shorthand
6. `pnpm test` shows all tests passing
7. `pnpm run typecheck` passes
8. `pnpm run lint:fix` passes
