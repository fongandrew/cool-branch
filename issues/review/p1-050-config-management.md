@user: Implement configuration file management for repo-to-folder mappings.

## TDD Approach

**Write tests first**, then implement to make them pass.

### Tests to Write First

Add to `test/integration.ts`:

```typescript
test('config: creates cool-branch.json when setting dirname', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    const result = runCLI(['dirname', 'custom-name', '--base', base], { cwd: dir });
    assertExitCode(result, 0);
    assertFileExists(path.join(base, 'cool-branch.json'));
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});

test('config: reads existing mapping', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    // Set a mapping
    runCLI(['dirname', 'my-name', '--base', base], { cwd: dir });
    // Read it back
    const result = runCLI(['dirname', '--base', base], { cwd: dir });
    assertExitCode(result, 0);
    assert(result.stdout.includes('my-name'));
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});

test('config: uses default basename when no mapping', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    const result = runCLI(['dirname', '--base', base], { cwd: dir });
    assertExitCode(result, 0);
    // Should mention using default
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});
```

## Requirements

Create a module to manage the `cool-branch.json` config file that maps repository identifiers to folder names.

### Config File Format

Located at `<base>/cool-branch.json`:

```json
{
  "git@github.com:user/repo.git": "repo",
  "/Users/dev/local-project": "local-project-custom"
}
```

### Create `src/config.ts`

1. **`getConfigPath(base: string): string`**
   - Return `<base>/cool-branch.json`

2. **`readConfig(base: string): Record<string, string>`**
   - Read and parse the config file
   - Return empty object if file doesn't exist
   - Throw on parse errors with helpful message

3. **`writeConfig(base: string, config: Record<string, string>): void`**
   - Write config to file with pretty formatting (2-space indent)
   - Create base directory if it doesn't exist

4. **`getRepoIdentifier(): string`**
   - Get origin URL if available, otherwise absolute repo path
   - This uniquely identifies a repository

5. **`getRepoFolderName(base: string): string`**
   - Look up the repo identifier in config
   - If found, return the mapped folder name
   - If not found, return the basename of the repo root
   - Cache/register the mapping for future use

6. **`setRepoFolderName(base: string, folderName: string): void`**
   - Update the mapping in config for current repo
   - Write to config file

7. **`getWorktreeBasePath(base: string): string`**
   - Return `<base>/<repo-folder-name>`
   - Create directory if it doesn't exist

8. **`getWorktreePath(base: string, branchName: string): string`**
   - Return `<base>/<repo-folder-name>/<branch-name>`

### Default Base Directory

- Default to `~/.worktrees` (expand `~` to home directory)
- Allow override via `--base` option

## Verification

1. All new tests pass
2. Config file is created/read correctly
3. Handles missing config file gracefully
4. Proper path expansion for `~`
5. `pnpm test` shows all tests passing
6. `pnpm run typecheck` passes
7. `pnpm run lint:fix` passes

---

@claude: I have implemented the configuration file management for repo-to-folder mappings.

Here is a summary of the work I have done:

- Added 3 TDD tests to `test/integration.ts` for config management (creates config file, reads existing mapping, uses default basename)
- Created `src/config.ts` with all required functions:
  - `getConfigPath(base)` - returns path to `<base>/cool-branch.json`
  - `readConfig(base)` - reads and parses config, returns empty object if missing, throws on parse errors
  - `writeConfig(base, config)` - writes config with 2-space indent, creates base directory if needed
  - `getRepoIdentifier(cwd?)` - returns origin URL or absolute repo path as unique identifier
  - `getRepoFolderName(base, cwd?)` - looks up mapping or returns repo basename
  - `setRepoFolderName(base, folderName, cwd?)` - updates config with new mapping
  - `getWorktreeBasePath(base, cwd?)` - returns `<base>/<repo-folder-name>`, creates directory if needed
  - `getWorktreePath(base, branchName, cwd?)` - returns full worktree path
  - `expandPath(inputPath)` - expands `~` to home directory
- Updated `src/index.ts` to use config module for the `dirname` command:
  - `dirname <name>` sets the folder name mapping
  - `dirname` (no args) displays the current folder name

Verification results:
- All 3 new config tests pass
- `pnpm run lint:fix` passes
- `pnpm run typecheck` passes
- Note: 1 pre-existing test (`git utilities: addWorktree and removeWorktree work`) fails - this is unrelated to config management and existed before this work
