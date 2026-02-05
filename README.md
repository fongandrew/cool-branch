# cool-branch

A CLI tool for managing git worktrees with ease.

Git worktrees allow you to check out multiple branches simultaneously in different directories. This tool wraps `git worktree` commands and adds developer-friendly automation like running post-setup scripts after creation.

## Installation

```bash
npm install -g cool-branch
# or run directly with npx
npx cool-branch
```

## Quick Start

```bash
cool-branch list             # List worktrees and branches
cool-branch add feature-x    # Create a worktree for a branch
cool-branch rm feature-x     # Remove a worktree and its branch
```

Run commands without arguments for interactive mode:

```bash
cool-branch add              # Select from existing branches or enter a new name
cool-branch rm               # Select a worktree to remove
```

## Commands

| Command | Description |
|---------|-------------|
| `list` | List all branches and their worktree status |
| `add [branch]` | Create a new worktree (interactive if no branch given) |
| `rm [branch]` | Remove a worktree and delete the branch (interactive if no branch given) |
| `rename [old] [new]` | Rename a worktree and branch (works from main or worktree) |
| `where <branch>` | Get worktree path for a branch (for shell navigation) |
| `last` | Get most recent worktree path (for shell navigation) |
| `init` | Initialize `.cool-branch` directory with config template |
| `setup` | View or manage setup scripts |
| `config` | View or modify configuration |
| `version` | Show version |

Run `cool-branch <command> --help` for detailed help on any command.

## Configuration

Configuration is stored in `.cool-branch/config.json` in your repository root. Initialize it with:

```bash
cool-branch init
```

This creates a config file with sensible defaults. Edit configuration with:

```bash
cool-branch config                     # List all config values
cool-branch config <key>               # Get a value
cool-branch config <key> <value>       # Set a value
cool-branch config --unset <key>       # Remove a key
```

### Config Keys

| Key | Description | Default |
|-----|-------------|---------|
| `dirname` | Directory name for this repo's worktrees | Repository name |
| `base` | Base directory for all worktrees | `~/.worktrees` |
| `remote` | Remote name to fetch from | `origin` |
| `copyConfig` | Copy mode for `.cool-branch` directory | `local` |

### Local Overrides

Create `.cool-branch/config.local.json` for machine-specific settings that shouldn't be committed:

```bash
cool-branch init --local
cool-branch config --local base /custom/path
```

Local config values override the base config.

## Setup Scripts

Setup scripts run automatically after creating a worktree. They execute from inside the new worktree directory and receive the original repository path as `$1`.

### Creating a Setup Script

```bash
cool-branch setup --edit
```

This creates `.cool-branch/setup` (or opens an existing one) in your editor.

Example setup script:

```bash
#!/bin/bash
ORIGINAL_DIR="$1"

# Install dependencies
npm install

# Copy environment file from original repo
cp "$ORIGINAL_DIR/.env" .env

echo "Setup complete for $(pwd)"
```

### Local Setup Scripts

Create `.cool-branch/setup.local` for machine-specific setup that shouldn't be committed:

```bash
cool-branch setup --local --edit
```

Local setup scripts take precedence over regular setup scripts.

### Controlling Setup Behavior

```bash
cool-branch add feature-x --no-setup          # Skip setup script
cool-branch add feature-x --setup ./custom.sh # Use custom script
```

## Directory Structure

Worktrees are organized as: `<base>/<repo-name>/<branch-name>`

Default: `~/.worktrees/<repo-name>/<branch-name>`

The repo name is derived from the git remote URL or repository path. Customize it with:

```bash
cool-branch config dirname my-custom-name
```

## Options

### Global Options

| Option | Description |
|--------|-------------|
| `--base <path>` | Base directory for worktrees (default: `~/.worktrees`) |
| `--config <path>` | Path to custom config file or directory |
| `-h, --help` | Show help |

### Add Options

| Option | Description |
|--------|-------------|
| `--remote <name>` | Remote name to fetch from (default: `origin`) |
| `-f, --force` | Force creation even if directory exists |
| `--setup <script>` | Path to custom setup script |
| `--no-setup` | Skip running the setup script |
| `--copy-config <mode>` | Copy `.cool-branch` directory: `all`, `none`, `local` (default: `local`) |

### Remove Options

| Option | Description |
|--------|-------------|
| `-f, --force` | Force removal even with uncommitted changes |

## Examples

### List branches and worktrees

```bash
$ cool-branch list
Branches:
  feature-a    ~/.worktrees/my-project/feature-a
  feature-b    (no worktree)
* main         /Users/dev/my-project (main worktree)
```

### Create a worktree with custom remote

```bash
$ cool-branch add feature-x --remote upstream
```

### Use a shared config across projects

```bash
$ cool-branch add feature-x --config ~/my-shared-config.json
```

### Navigate to a worktree using `where`

```bash
$ cd $(cool-branch where feature-x)
```

### Navigate to the most recent worktree using `last`

```bash
$ cool-branch add feature-new
# ... work in main repo ...
$ cd $(cool-branch last)  # Jump to feature-new
```

### Rename a worktree from main or from within

```bash
# From within a worktree
$ cd ~/.worktrees/my-project/feature-x
$ cool-branch rename feature-y         # Rename to feature-y
$ cool-branch rename                   # Auto-increment to feature-x-1

# From main repository
$ cool-branch rename feature-x new-x   # Rename feature-x to new-x
$ cool-branch rename feature-x         # Auto-increment feature-x
```

## License

MIT
