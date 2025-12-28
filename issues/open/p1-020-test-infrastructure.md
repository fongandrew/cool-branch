@user: Set up the test infrastructure for TDD development.

## Overview

Create the test harness and helpers that all subsequent issues will use to verify their implementations. This enables TDD: write failing tests first, then implement to make them pass.

## Requirements

### Create `test/integration.ts`

Main test runner with:

1. **Test registration and execution:**
   ```typescript
   function test(name: string, fn: () => Promise<void> | void): void
   function run(): Promise<void>  // Execute all registered tests
   ```

2. **Output format:**
   ```
   Running: test name here... PASS
   Running: another test... FAIL
     Error: expected X but got Y

   Results: 5 passed, 1 failed
   ```

3. **Exit codes:**
   - 0 if all tests pass
   - 1 if any test fails

### Create `test/helpers.ts`

Test utilities:

1. **`createTempDir(): string`**
   - Create a unique temp directory
   - Return the path

2. **`cleanupTempDir(dir: string): void`**
   - Recursively remove a temp directory

3. **`initGitRepo(dir: string, options?: { bare?: boolean }): void`**
   - Initialize a git repo with an initial commit
   - Configure user.name and user.email for commits

4. **`runCLI(args: string[], options?: { cwd?: string }): { stdout: string; stderr: string; exitCode: number }`**
   - Run the built CLI with given arguments
   - Always include `--base <temp-dir>` in tests to avoid touching ~/.worktrees
   - Capture all output

5. **`assertFileExists(path: string): void`**
   - Throw if file doesn't exist

6. **`assertFileContains(path: string, content: string): void`**
   - Throw if file doesn't contain the string

7. **`assertExitCode(result: { exitCode: number }, expected: number): void`**
   - Throw if exit code doesn't match

### Create initial smoke test

Add one simple test that verifies the infrastructure works:

```typescript
test('CLI runs without error', async () => {
  const result = runCLI(['--help']);
  // For now, just verify it doesn't crash
  // This test will be updated once --help is implemented
});
```

### Update package.json

Ensure test script runs the test file:
```json
"test": "tsx test/integration.ts"
```

## TDD Workflow

After this issue, each subsequent issue should:
1. **First**: Write failing tests for the feature
2. **Then**: Implement until tests pass
3. **Finally**: Run full test suite to check for regressions

## Verification

- `pnpm test` runs and shows test output
- Test passes (or is skipped appropriately)
- Helper functions work correctly
- Temp directories are created and cleaned up
- `pnpm run typecheck` passes
- `pnpm run lint:fix` passes

---

@claude: I have implemented the test infrastructure for TDD development.

Here is a summary of the work I have done:
- Created `test/helpers.ts` with all required test utilities:
  - `createTempDir()` - creates unique temp directories
  - `cleanupTempDir()` - recursively removes temp directories
  - `initGitRepo()` - initializes git repos with initial commit and user config, supports bare repos
  - `runCLI()` - runs the built CLI and captures stdout/stderr/exitCode
  - `assertFileExists()` - throws if file doesn't exist
  - `assertFileContains()` - throws if file doesn't contain expected string
  - `assertExitCode()` - throws if exit code doesn't match expected
- Rewrote `test/integration.ts` with proper test framework:
  - `test(name, fn)` - registers tests
  - `run()` - executes all registered tests with proper output format
  - Exit code 0 on success, 1 on failure
  - Output format matches specification: `Running: test name... PASS/FAIL`
- Added initial smoke test that verifies CLI runs without crashing
- `package.json` already had correct test script configured

**BLOCKED:** Unable to run verification steps (`pnpm test`, `pnpm run typecheck`, `pnpm run lint:fix`) because network is unavailable and dependencies are not installed. Error: `ENOTFOUND registry.npmjs.org`. Per the FAQ in `faq/network-offline.md`, moving to stuck.

**To complete verification when network is restored:**
1. Run `pnpm install` to install dependencies
2. Run `pnpm run build` to build the CLI
3. Run `pnpm test` to verify tests work
4. Run `pnpm run typecheck` to verify types
5. Run `pnpm run lint:fix` to verify linting

---

@user: Dependencies have been installed. Continue.