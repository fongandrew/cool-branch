@user: Implement the `rm` command for removing worktrees.

## TDD Approach

**Write tests first**, then implement to make them pass.

### Tests to Write First

Add to `test/integration.ts`:

```typescript
test('rm: removes worktree directory', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    const repoName = path.basename(dir);
    // Create a worktree
    runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
    assertFileExists(path.join(base, repoName, 'feature-x'));
    // Remove it
    const result = runCLI(['rm', 'feature-x', '--base', base], { cwd: dir });
    assertExitCode(result, 0);
    // Directory should be gone
    assert(!fs.existsSync(path.join(base, repoName, 'feature-x')));
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});

test('rm: deletes the branch', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    // Create a worktree
    runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
    // Verify branch exists
    let branches = execSync('git branch', { cwd: dir }).toString();
    assert(branches.includes('feature-x'));
    // Remove it
    runCLI(['rm', 'feature-x', '--base', base], { cwd: dir });
    // Branch should be gone
    branches = execSync('git branch', { cwd: dir }).toString();
    assert(!branches.includes('feature-x'));
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});

test('rm: -f removes even with uncommitted changes', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    const repoName = path.basename(dir);
    // Create a worktree
    runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
    // Make uncommitted changes in the worktree
    const worktreePath = path.join(base, repoName, 'feature-x');
    fs.writeFileSync(path.join(worktreePath, 'uncommitted.txt'), 'changes');
    // Try to remove without -f (should fail or warn)
    const resultNoForce = runCLI(['rm', 'feature-x', '--base', base], { cwd: dir });
    // With -f should succeed
    const resultForce = runCLI(['rm', 'feature-x', '-f', '--base', base], { cwd: dir });
    assertExitCode(resultForce, 0);
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});

test('rm: errors when worktree does not exist', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    const result = runCLI(['rm', 'nonexistent-branch', '--base', base], { cwd: dir });
    assertExitCode(result, 1);
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});
```

## Requirements

Implement `cool-branch rm [-f] [<branch-name>]` for removing worktrees and their branches.

**Note:** This issue covers the non-interactive mode only (when branch-name is provided). Interactive mode will be handled in a separate issue.

### Create `src/commands/remove.ts`

1. **`removeCommand(options: RemoveOptions): void`**

```typescript
interface RemoveOptions {
  base: string;
  branchName: string;
  force: boolean;
}
```

### Implementation Steps

1. **Validate context**
   - Ensure we're in a git repository
   - Get repo root and folder name from config

2. **Find worktree path**
   - Get expected path: `<base>/<repo-name>/<branch-name>`
   - Verify worktree exists at this path

3. **Remove worktree**
   - Run `git worktree remove <path>`
   - If fails and `-f` flag: retry with `--force`
   - If fails without `-f`: show error about uncommitted changes

4. **Delete branch**
   - Run `git branch -D <branch-name>`
   - Handle case where branch deletion fails (e.g., it's checked out elsewhere)

5. **Print success**
   - Output: `Worktree and branch '<branch-name>' removed`

### Error Handling

- If worktree doesn't exist: clear error message
- If branch is the current branch: error with helpful message
- If branch has uncommitted changes without `-f`: suggest using `-f`

### Update `src/index.ts`

- Route `rm` command to the remove command handler
- Pass all relevant options

## Verification

1. All new tests pass
2. Removes worktree directory
3. Deletes the branch
4. `-f` removes even with uncommitted changes
5. Errors appropriately when worktree doesn't exist
6. `pnpm test` shows all tests passing
7. `pnpm run typecheck` passes
8. `pnpm run lint:fix` passes
