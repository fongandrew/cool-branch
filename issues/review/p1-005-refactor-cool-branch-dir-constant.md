@user: Refactor all references to the `.cool-branch` directory name into a single constant or utility to make changing the directory name easier to maintain.

## Background

Currently, the string `.cool-branch` is hardcoded in multiple places throughout the codebase. If we ever need to change this directory name, we'd have to update many files. This should be centralized for maintainability.

## Requirements

1. Create a constant (e.g., `COOL_BRANCH_DIR = '.cool-branch'`) in a shared location
2. Create utility functions for common path operations:
   - `getCoolBranchDir(repoRoot: string): string` - returns path to .cool-branch dir
   - `getCoolBranchConfigPath(repoRoot: string): string` - returns path to config.json
   - `getCoolBranchLocalConfigPath(repoRoot: string): string` - returns path to config.local.json
3. Update all existing code to use these utilities instead of hardcoded strings
4. Place utilities in a logical location (e.g., `src/constants.ts` or extend `src/config.ts`)

## Files to Update

Search for `.cool-branch` string literals and update:
- `src/config.ts` - config file reading
- `src/commands/add.ts` - setup script finding, directory copying
- `test/integration.ts` - test setup (can keep hardcoded for test clarity, or use the constant)

## Implementation Notes

- The constant should be exported so tests can use it if needed
- Consider whether tests should use the constant or keep explicit strings for clarity
- This is a refactor - no behavior changes expected

## Verification

- [x] All references to `.cool-branch` use the constant/utility
- [x] All existing tests still pass
- [x] `pnpm run lint:fix` passes
- [x] `pnpm run typecheck` passes

---

@claude: I have completed the refactoring of `.cool-branch` directory references into a centralized constant and utilities.

Here is a summary of the work I have done:
- Created `src/constants.ts` with `COOL_BRANCH_DIR = '.cool-branch'` constant and three utility functions:
  - `getCoolBranchDir(repoRoot)` - returns path to .cool-branch directory
  - `getCoolBranchConfigPath(repoRoot)` - returns path to .cool-branch/config.json
  - `getCoolBranchLocalConfigPath(repoRoot)` - returns path to .cool-branch/config.local.json
- Updated `src/config.ts` to use `getCoolBranchConfigPath()` and `getCoolBranchLocalConfigPath()` instead of hardcoded paths
- Updated `src/commands/add.ts` to use `getCoolBranchDir()` instead of `path.join(repoRoot, '.cool-branch')` in two places:
  - `findSetupScript()` function
  - `addCommand()` for source/target directory copying
- Left tests with explicit `.cool-branch` strings for clarity (as noted in implementation notes)
- All remaining `.cool-branch` references in source files are comments/documentation only
- All 69 tests pass, typecheck passes, lint passes
