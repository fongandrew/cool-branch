# CLAUDE.md

## Project Overview

`cool-branch` is a cross-platform Node.js CLI tool that simplifies creating and managing git worktrees. It wraps `git worktree` commands and adds developer-friendly automation like running post-setup scripts after creation.

## Build & Run

```bash
pnpm install          # Install dependencies
pnpm run build        # Build to dist/
pnpm run dev          # Build in watch mode
pnpm run typecheck    # Type check
pnpm run lint         # Lint
pnpm run lint:fix     # Lint and fix
pnpm test             # Run integration tests
```

## Project Structure

```
cool-branch/
├── src/
│   ├── index.ts      # Entry point
│   ├── cli.ts        # Argument parsing
│   ├── git.ts        # Git utilities
│   ├── config.ts     # Config file management
│   ├── prompt.ts     # Interactive prompts
│   └── commands/
│       ├── list.ts   # Default list command
│       ├── add.ts    # Add worktree command
│       ├── remove.ts # Remove worktree command
│       └── dirname.ts # Dirname command
├── test/
│   └── integration.ts
├── issues/           # Task queue for automation
│   ├── open/         # Issues to process
│   ├── review/       # Completed issues
│   └── stuck/        # Issues needing help
└── dist/             # Built output
```

## Key Conventions

- Zero runtime dependencies - use only Node.js built-ins
- Build with tsup, target ESM
- All git operations go through `src/git.ts`
- Config stored at `<base>/cool-branch.json`
- Default worktree base: `~/.worktrees`

## TDD Workflow

**Follow test-driven development for all features:**

1. **Write tests first** - Before implementing a feature, add failing tests to `test/integration.ts`
2. **Run tests to confirm they fail** - `pnpm test` should show the new tests failing
3. **Implement the feature** - Write the minimum code to make tests pass
4. **Verify all tests pass** - `pnpm test` should show all tests passing
5. **Check for regressions** - Ensure existing tests still pass

### Test Utilities

Located in `test/helpers.ts`:
- `createTempDir()` / `cleanupTempDir()` - Temp directory management
- `initGitRepo()` - Initialize a git repo with initial commit
- `runCLI(args, options)` - Run the built CLI, returns stdout/stderr/exitCode
- `assertFileExists()` / `assertFileContains()` - File assertions
- `assertExitCode()` - Exit code assertion

### Running Tests

```bash
pnpm test              # Run all integration tests
pnpm run build && pnpm test  # Rebuild then test
```

Always pass `--base <temp-dir>` in tests to avoid touching `~/.worktrees`.

## Issue Processing

Issues in `issues/open/` follow the format `p{priority}-{order}-{description}.md`. Process them in order (lower numbers first). After completing work, move to `issues/review/`.

### Issue Structure

Each issue contains:
1. **TDD Approach** - Tests to write first (copy these into `test/integration.ts`)
2. **Requirements** - What to implement
3. **Verification** - Checklist including "All new tests pass"

### Verification Checklist

Before marking an issue complete:
- [ ] All new tests pass
- [ ] All existing tests still pass (no regressions)
- [ ] `pnpm run lint:fix` passes
- [ ] `pnpm run typecheck` passes
