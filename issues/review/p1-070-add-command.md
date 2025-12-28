@user: Implement the `add` command for creating new worktrees.

## TDD Approach

**Write tests first**, then implement to make them pass.

### Tests to Write First

Add to `test/integration.ts`:

```typescript
test('add: creates worktree at correct path', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    const result = runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
    assertExitCode(result, 0);
    // Verify worktree directory exists
    const repoName = path.basename(dir);
    assertFileExists(path.join(base, repoName, 'feature-x'));
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});

test('add: creates new branch when it does not exist', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    runCLI(['add', 'new-branch', '--base', base], { cwd: dir });
    // Verify branch was created
    const branches = execSync('git branch', { cwd: dir }).toString();
    assert(branches.includes('new-branch'));
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});

test('add: uses existing branch when it exists', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    execSync('git branch existing-branch', { cwd: dir });
    const result = runCLI(['add', 'existing-branch', '--base', base], { cwd: dir });
    assertExitCode(result, 0);
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});

test('add: errors without -f when directory exists', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    // Create worktree first time
    runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
    // Remove the worktree but leave directory (simulate conflict)
    execSync('git worktree remove ' + path.join(base, path.basename(dir), 'feature-x'), { cwd: dir });
    fs.mkdirSync(path.join(base, path.basename(dir), 'feature-x'), { recursive: true });
    fs.writeFileSync(path.join(base, path.basename(dir), 'feature-x', 'file.txt'), 'content');
    // Try to add again without -f
    const result = runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
    assertExitCode(result, 1);
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});

test('add: -f overwrites existing directory', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    // Create conflicting directory
    const repoName = path.basename(dir);
    fs.mkdirSync(path.join(base, repoName, 'feature-x'), { recursive: true });
    fs.writeFileSync(path.join(base, repoName, 'feature-x', 'file.txt'), 'content');
    // Add with -f
    const result = runCLI(['add', 'feature-x', '-f', '--base', base], { cwd: dir });
    assertExitCode(result, 0);
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});
```

## Requirements

Implement `cool-branch add [-f] [<branch-name>]` for creating worktrees.

**Note:** This issue covers the non-interactive mode only (when branch-name is provided). Interactive mode will be handled in a separate issue.

### Create `src/commands/add.ts`

1. **`addCommand(options: AddOptions): void`**

```typescript
interface AddOptions {
  base: string;
  branchName: string;
  force: boolean;
  setup?: string;    // --setup <script> path
  noSetup: boolean;  // --no-setup flag
}
```

### Implementation Steps

1. **Validate context**
   - Ensure we're in a git repository
   - Get repo root and folder name from config

2. **Create base directory**
   - Ensure `<base>/<repo-name>` exists

3. **Check for existing directory**
   - Get target path: `<base>/<repo-name>/<branch-name>`
   - If directory exists and is non-empty:
     - Error with message unless `-f` flag
     - With `-f`: remove existing directory first

4. **Fetch from remote**
   - Run `git fetch origin` (ignore errors if no remote)
   - Check if branch exists on remote

5. **Create worktree**
   - If branch exists locally: `git worktree add <path> <branch>`
   - If branch exists on remote only: `git worktree add <path> <branch>` (git will track it)
   - If branch doesn't exist: `git worktree add -b <branch> <path>`

6. **Print success**
   - Output: `Worktree created at: <path>`

### Error Handling

- Clear error messages for common failures
- Exit code 1 on fatal errors

### Update `src/index.ts`

- Route `add` command to the add command handler
- Pass all relevant options

## Verification

1. All new tests pass
2. Creates worktree at correct path
3. Creates new branch when needed
4. Uses existing branch when it exists
5. `-f` overwrites existing directory
6. Errors appropriately without `-f` when directory exists
7. `pnpm test` shows all tests passing
8. `pnpm run typecheck` passes
9. `pnpm run lint:fix` passes

---

@claude: I have implemented the `add` command for creating new worktrees.

Here is a summary of the work I have done:
- Created `src/commands/add.ts` with the `addCommand` function that handles worktree creation
- Implemented all required functionality:
  - Validates that we're in a git repository
  - Creates the base directory structure (`<base>/<repo-name>`)
  - Checks for existing directories and errors unless `-f` flag is provided
  - With `-f`, removes existing directory before creating worktree
  - Fetches from remote (ignoring errors if no remote exists)
  - Creates worktree with new branch if branch doesn't exist, or uses existing branch
  - Prints success message with the worktree path
- Updated `src/index.ts` to route the `add` command to the new handler
- Fixed TypeScript exactOptionalPropertyTypes issue with the `setup` property

Verification:
- [x] All 28 tests pass (including 5 new add command tests)
- [x] `pnpm run typecheck` passes
- [x] `pnpm run lint:fix` passes
