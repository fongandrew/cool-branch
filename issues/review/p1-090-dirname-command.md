@user: Implement the `dirname` command for managing repository folder name mappings.

## TDD Approach

**Write tests first**, then implement to make them pass.

### Tests to Write First

Add to `test/integration.ts`:

```typescript
test('dirname: returns default basename when no mapping', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    const result = runCLI(['dirname', '--base', base], { cwd: dir });
    assertExitCode(result, 0);
    assert(result.stdout.includes('default') || result.stdout.includes(path.basename(dir)));
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});

test('dirname: stores custom mapping', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    const result = runCLI(['dirname', 'my-custom-name', '--base', base], { cwd: dir });
    assertExitCode(result, 0);
    assert(result.stdout.includes('my-custom-name'));
    // Verify it's in the config file
    const config = JSON.parse(fs.readFileSync(path.join(base, 'cool-branch.json'), 'utf-8'));
    assert(Object.values(config).includes('my-custom-name'));
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});

test('dirname: retrieves stored mapping', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    // Set mapping
    runCLI(['dirname', 'stored-name', '--base', base], { cwd: dir });
    // Retrieve it
    const result = runCLI(['dirname', '--base', base], { cwd: dir });
    assertExitCode(result, 0);
    assert(result.stdout.includes('stored-name'));
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});

test('dirname: add command uses custom dirname', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    // Set custom dirname
    runCLI(['dirname', 'custom-folder', '--base', base], { cwd: dir });
    // Create a worktree
    runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
    // Verify it used the custom folder name
    assertFileExists(path.join(base, 'custom-folder', 'feature-x'));
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});
```

## Requirements

Implement `cool-branch dirname [<folder-name>]` for viewing and setting the folder name used for a repository.

### Create `src/commands/dirname.ts`

1. **`dirnameCommand(options: DirnameOptions): void`**

```typescript
interface DirnameOptions {
  base: string;
  folderName?: string;  // undefined = read mode, string = write mode
}
```

### Behavior

**Read mode (no argument):**
1. Get the repo identifier (origin URL or absolute path)
2. Look up the mapping in `cool-branch.json`
3. If mapping exists:
   - Print: `Folder name: <folder-name>`
   - Print: `Worktrees at: <base>/<folder-name>/`
4. If no mapping:
   - Print: `No custom mapping. Using default: <basename>`
   - Print: `Worktrees at: <base>/<basename>/`

**Write mode (with argument):**
1. Get the repo identifier
2. Update the mapping in `cool-branch.json`
3. Print: `Folder name set to: <folder-name>`
4. Print: `Worktrees will be created at: <base>/<folder-name>/`

### Validation

- Folder name should be a valid directory name (no path separators, no special chars)
- Warn if changing from an existing mapping (existing worktrees won't be moved)

### Update `src/index.ts`

- Route `dirname` command to the dirname command handler
- Pass the folder-name positional argument if provided

## Verification

1. All new tests pass
2. Returns default (basename) when no mapping exists
3. Stores and retrieves custom mappings correctly
4. Updates `cool-branch.json` file appropriately
5. `pnpm test` shows all tests passing
6. `pnpm run typecheck` passes
7. `pnpm run lint:fix` passes

---

@claude: I have implemented the `dirname` command for managing repository folder name mappings.

Here is a summary of the work I have done:
- Created `src/commands/dirname.ts` with `dirnameCommand()` function implementing:
  - Read mode: Shows current folder name mapping or default basename
  - Write mode: Sets custom folder name mapping in `cool-branch.json`
  - Folder name validation (rejects path separators, special chars, control chars, Windows reserved names)
  - Warning when changing an existing mapping
- Updated `src/index.ts` to route the `dirname` command to the new command handler
- Added 4 new tests from the TDD approach to `test/integration.ts`:
  - `dirname: returns default basename when no mapping`
  - `dirname: stores custom mapping`
  - `dirname: retrieves stored mapping`
  - `dirname: add command uses custom dirname`

Verification:
- [x] All 36 tests pass (`pnpm test`)
- [x] `pnpm run lint:fix` passes
- [x] `pnpm run typecheck` passes

Output examples:
- Read mode (no mapping): `No custom mapping. Using default: <basename>` + `Worktrees at: <base>/<basename>/`
- Write mode: `Folder name set to: <folder-name>` + `Worktrees will be created at: <base>/<folder-name>/`
- Read mode (with mapping): `Folder name: <folder-name>` + `Worktrees at: <base>/<folder-name>/`
