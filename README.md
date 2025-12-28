# cool-branch

A CLI tool for managing git worktrees with ease.

Git worktrees allow you to check out multiple branches simultaneously in different directories. This tool wraps `git worktree` commands and adds developer-friendly automation like running post-setup scripts after creation.

## Installation

```bash
npm install -g cool-branch
# or run directly with npx
npx cool-branch
```

## Usage

```bash
cool-branch                  # List worktrees and branches
cool-branch add [branch]     # Create a worktree
cool-branch rm [branch]      # Remove a worktree
cool-branch dirname [name]   # View/set repo folder name
```

### Options

```
--base <path>     Base directory for worktrees (default: ~/.worktrees)
-f, --force       Force operation
--setup <script>  Path to post-setup script (add only)
--no-setup        Skip running the post-setup script (add only)
-h, --help        Show help
-v, --version     Show version
```

## Examples

### List branches and worktrees

```bash
$ cool-branch
Branches:
  feature-a    ~/.worktrees/my-project/feature-a
  feature-b    (no worktree)
* main         /Users/dev/my-project (main worktree)
```

### Create a worktree

```bash
# Create worktree for existing or new branch
$ cool-branch add feature-x
Worktree created at: ~/.worktrees/my-project/feature-x
```

### Remove a worktree

```bash
$ cool-branch rm feature-x
Worktree and branch 'feature-x' removed

# Force remove with uncommitted changes
$ cool-branch rm -f feature-x
```

### Set custom folder name

```bash
$ cool-branch dirname my-custom-name
Folder name set to: my-custom-name
Worktrees will be created at: ~/.worktrees/my-custom-name/
```

## Post-Setup Scripts

Add a `.cool-branch-setup` file to your repo root to run commands after worktree creation:

```bash
#!/bin/bash
set -e
pnpm install
pnpm run build
```

The script receives the worktree path as `$1` and runs with the worktree as the working directory.

Skip with `--no-setup` or use a custom script with `--setup <path>`.

## Directory Structure

Worktrees are organized as: `~/.worktrees/<repo-name>/<branch-name>`

The repo name is derived from the git origin URL or repo path. Use `cool-branch dirname` to customize the folder name for a repository.

## License

MIT
