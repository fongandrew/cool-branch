@user: Implement CLI argument parsing with help and version commands.

## TDD Approach

**Write tests first**, then implement to make them pass.

### Tests to Write First

Add to `test/integration.ts`:

```typescript
test('--help shows usage information', async () => {
  const result = runCLI(['--help']);
  assertExitCode(result, 0);
  assert(result.stdout.includes('cool-branch'));
  assert(result.stdout.includes('add'));
  assert(result.stdout.includes('rm'));
});

test('--version shows version', async () => {
  const result = runCLI(['--version']);
  assertExitCode(result, 0);
  assert(/\d+\.\d+\.\d+/.test(result.stdout)); // semver pattern
});

test('-h is alias for --help', async () => {
  const result = runCLI(['-h']);
  assertExitCode(result, 0);
  assert(result.stdout.includes('cool-branch'));
});

test('unknown command shows error', async () => {
  const result = runCLI(['unknown-command']);
  assertExitCode(result, 1);
});
```

## Requirements

Build the argument parsing infrastructure using only Node.js built-ins (no commander, yargs, etc.).

### CLI Interface to Support

```
cool-branch                  # List worktrees and branches
cool-branch add [-f] [--setup <script>] [--no-setup] [<branch-name>]
cool-branch rm [-f] [<branch-name>]
cool-branch dirname [<folder-name>]

Options:
  --base <path>     Base directory for worktrees (default: ~/.worktrees)
  -f, --force       Force operation
  --setup <script>  Path to post-setup script (add only)
  --no-setup        Skip running the post-setup script (add only)
  -h, --help        Show help
  -v, --version     Show version
```

### Implementation

1. **Create `src/cli.ts`** with:
   - `parseArgs(argv: string[])` function that returns structured options
   - Support for commands: (none), `add`, `rm`, `dirname`
   - Support for flags: `-f`/`--force`, `--no-setup`, `-h`/`--help`, `-v`/`--version`
   - Support for options with values: `--base <path>`, `--setup <script>`
   - Positional argument handling for branch-name/folder-name

2. **Help output** (`-h` or `--help`):
   - Show usage, available commands, and options
   - Exit with code 0

3. **Version output** (`-v` or `--version`):
   - Read version from package.json
   - Exit with code 0

4. **Update `src/index.ts`**:
   - Parse arguments and dispatch to appropriate command handlers
   - For now, stub command handlers that just print what was parsed

## Verification

1. All new tests pass
2. `pnpm test` shows all tests passing
3. `pnpm run typecheck` passes
4. `pnpm run lint:fix` passes
