@user: Implement interactive mode for `add` and `rm` commands when no branch name is provided.

## TDD Approach

Interactive mode is harder to test automatically. Focus on:
1. Unit testing the prompt utility functions
2. Manual testing of the interactive flows
3. Testing that non-interactive mode still works

### Tests to Write/Update

```typescript
// Ensure non-interactive mode still works after adding interactive support
test('add: still works with branch name after interactive support added', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    const result = runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
    assertExitCode(result, 0);
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});

test('rm: still works with branch name after interactive support added', async () => {
  const dir = createTempDir();
  const base = createTempDir();
  try {
    initGitRepo(dir);
    runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
    const result = runCLI(['rm', 'feature-x', '--base', base], { cwd: dir });
    assertExitCode(result, 0);
  } finally {
    cleanupTempDir(dir);
    cleanupTempDir(base);
  }
});
```

## Requirements

Add interactive prompts when branch name is omitted from `add` and `rm` commands.

### Interactive Add

When `cool-branch add` is run without a branch name:

1. **List branches with numbers:**
```
Select existing branch or enter new name:
1) feature-a [worktree]
2) feature-b
3) main [worktree]
>
```

2. **Handle input:**
   - Number: select that existing branch
   - Text: use as new branch name

3. **Check for existing worktree:**
   - If selected/entered branch already has a worktree
   - Prompt: `Worktree exists at <path>. Overwrite? [y/N]`
   - Default is No; only proceed if user enters `y` or `Y`

4. **Proceed with creation** (same as non-interactive add)

### Interactive Remove

When `cool-branch rm` is run without a branch name:

1. **List worktree branches with numbers:**
```
Select branch(es) to remove:
1) feature-a
2) feature-b
3) bugfix-c
>
```

2. **Handle input:**
   - Accept space or comma-separated numbers: `1 3` or `1,3`
   - Validate all numbers are in range

3. **For each selected branch:**
   - Attempt removal
   - On error: prompt `Remove '<branch>' with --force? [y/N]`
   - If yes, retry with force

### Create `src/prompt.ts`

Utility functions for interactive prompts:

1. **`promptLine(message: string): Promise<string>`**
   - Use `readline` module from Node.js
   - Display message and read a line of input

2. **`promptConfirm(message: string, defaultNo?: boolean): Promise<boolean>`**
   - Prompt with `[y/N]` or `[Y/n]` based on default
   - Return boolean

3. **`promptSelect(message: string, options: string[]): Promise<number | string>`**
   - Display numbered options
   - Return index if number selected, or raw text if not a number

### Update Add and Remove Commands

- Detect when branch name is not provided
- Call interactive prompt functions
- Proceed with the appropriate action

## Verification

1. Non-interactive tests still pass
2. Manual testing of interactive flows:
   - `cool-branch add` shows branch list
   - Entering a number selects that branch
   - Entering text creates a new branch
   - `cool-branch rm` shows worktree list
   - Multiple selection works
3. `pnpm test` shows all tests passing
4. `pnpm run typecheck` passes
5. `pnpm run lint:fix` passes

---

@claude: I have implemented interactive mode for the `add` and `rm` commands when no branch name is provided.

Here is a summary of the work I have done:
- Created `src/prompt.ts` with interactive prompt utilities:
  - `promptLine(message)` - Read a line of input
  - `promptConfirm(message, defaultNo)` - Yes/no confirmation with configurable default
  - `promptSelect(message, options)` - Display numbered options and return index or raw text
  - `promptMultiSelect(message, options)` - Multi-selection with space/comma-separated numbers
  - `parseMultiSelect(input, maxIndex)` - Parse multi-selection input
  - `isInteractive()` - Check if stdin is a TTY
- Updated `src/commands/add.ts`:
  - Added `interactiveAddCommand()` that lists branches with worktree indicators, prompts for selection, and handles existing worktree confirmation
- Updated `src/commands/remove.ts`:
  - Added `interactiveRemoveCommand()` that lists managed worktrees, supports multi-selection, and offers force-remove on failure
- Updated `src/index.ts`:
  - Made `main()` async
  - Calls interactive commands when no positional argument (branch name) is provided
- Added TDD tests to `test/integration.ts` to verify non-interactive mode still works
- All verification passed:
  - `pnpm test`: 38 passed, 0 failed
  - `pnpm run lint:fix`: passed
  - `pnpm run typecheck`: passed
