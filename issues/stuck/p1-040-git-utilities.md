@user: Implement git utility functions for interacting with git repositories.

## TDD Approach

**Write tests first**, then implement to make them pass.

### Tests to Write First

Add to `test/integration.ts`:

```typescript
test('git utilities: getRepoRoot returns repo path', async () => {
  const dir = createTempDir();
  try {
    initGitRepo(dir);
    // Test by running CLI in the repo (once list command exists)
    // For now, we can test indirectly or create unit tests
  } finally {
    cleanupTempDir(dir);
  }
});

test('git utilities: listBranches returns branches', async () => {
  const dir = createTempDir();
  try {
    initGitRepo(dir);
    // Create additional branches, verify they're listed
  } finally {
    cleanupTempDir(dir);
  }
});

test('git utilities: worktree operations work', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    // This will be tested more fully with add/rm commands
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});
```

## Requirements

Create a module with helper functions for git operations using `child_process`.

### Create `src/git.ts`

1. **`getRepoRoot(): string | null`**
   - Run `git rev-parse --show-toplevel`
   - Return the path or null if not in a git repo

2. **`getOriginUrl(): string | null`**
   - Run `git remote get-url origin`
   - Return the URL or null if no origin

3. **`listBranches(): string[]`**
   - Run `git branch --list --format='%(refname:short)'`
   - Return array of branch names

4. **`listWorktrees(): Array<{ path: string; branch: string; isMain: boolean }>`**
   - Run `git worktree list --porcelain`
   - Parse output to extract path, branch, and whether it's the main worktree

5. **`getCurrentBranch(): string | null`**
   - Run `git rev-parse --abbrev-ref HEAD`
   - Return branch name or null

6. **`branchExists(branchName: string): boolean`**
   - Check if branch exists locally

7. **`remoteBranchExists(branchName: string): boolean`**
   - Run `git fetch origin` first (with error handling)
   - Check if `origin/<branchName>` exists

8. **`addWorktree(path: string, branchName: string, createBranch: boolean): void`**
   - Run `git worktree add [-b] <path> <branchName>`
   - Throw on failure with descriptive error

9. **`removeWorktree(path: string, force: boolean): void`**
   - Run `git worktree remove <path> [--force]`
   - Throw on failure

10. **`deleteBranch(branchName: string): void`**
    - Run `git branch -D <branchName>`
    - Throw on failure

### Helper

Create a `runGit(args: string[]): { stdout: string; stderr: string; exitCode: number }` helper that:
- Uses `execSync` or `spawnSync`
- Captures output
- Handles errors gracefully

## Verification

1. All new tests pass
2. Functions work correctly in a git repository
3. Proper error handling for non-git directories
4. `pnpm test` shows all tests passing
5. `pnpm run typecheck` passes
6. `pnpm run lint:fix` passes

---

@claude: I have implemented the git utility functions as requested.

Here is a summary of the work I have done:
- Created `src/git.ts` with all 10 required git utility functions plus the `runGit` helper
- Implemented functions: `getRepoRoot`, `getOriginUrl`, `listBranches`, `listWorktrees`, `getCurrentBranch`, `branchExists`, `remoteBranchExists`, `addWorktree`, `removeWorktree`, `deleteBranch`
- Added comprehensive integration tests to `test/integration.ts` covering all functions:
  - getRepoRoot returns repo path and null for non-git directories
  - getOriginUrl returns null when no origin configured
  - listBranches returns branches and includes newly created branches
  - getCurrentBranch returns current branch name
  - branchExists returns true/false correctly
  - listWorktrees returns worktree info with isMain flag
  - addWorktree and removeWorktree create/remove worktrees
  - deleteBranch removes branches
- `pnpm run typecheck` passes
- `pnpm run lint:fix` passes

**Note:** I was unable to run `pnpm test` due to sandbox restrictions preventing tsx from creating a Unix socket. The user should verify tests pass by running `pnpm test` manually.
