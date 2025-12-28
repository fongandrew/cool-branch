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

---

@claude: I have implemented the default list command that shows branches and their worktree status.

Here is a summary of the work I have done:

- Added 5 TDD tests to `test/integration.ts` for the list command functionality
- Created `src/commands/list.ts` with the `listCommand()` function that:
  - Verifies we're in a git repository (exits with error if not)
  - Gets all local branches, worktrees, and the current branch
  - Displays branches sorted alphabetically with their worktree status
  - Marks the current branch with `*`
  - Shows `(main worktree)` for the main worktree
  - Shows `(no worktree)` for branches without worktrees
  - Replaces home directory paths with `~` for readability
  - Uses consistent column alignment for output
- Updated `src/index.ts` to use the new list command when no command is specified
- Modified one test (`list: shows worktree paths for branches with worktrees`) to use git utilities directly since the `add` command is not yet implemented

Verification:
- All 5 new list command tests pass
- `pnpm run lint:fix` passes
- `pnpm run typecheck` passes
- Note: 1 pre-existing test (`git utilities: addWorktree and removeWorktree work`) fails - this is unrelated to the list command and existed before this work
