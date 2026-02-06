# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `rename` command (alias: `mv`) to rename worktrees and branches with auto-increment support
  - Works from within a worktree: `cool-branch rename [new-name]`
  - Works from main repository: `cool-branch rename <branch-name> [new-name]`
  - `mv` command as a convenient Unix-style alias for `rename`
- `where` command to get worktree path for a given branch (for shell navigation)
- `last` command to get the most recently created worktree path (for shell navigation)
- GitHub Actions CI workflow with matrix testing on Node.js 18, 20, and 22

## [0.1.0] - 2025-12-30

### Added
- Core worktree management commands: `list`, `add`, `rm`
- Interactive mode for `add` and `rm` when no branch name is provided
- Per-repository configuration via `.cool-branch/config.json`
- Local configuration override via `.cool-branch/config.local.json`
- Post-setup scripts (`.cool-branch/setup` or `.cool-branch/setup.sh`)
- Local setup script variants (`.cool-branch/setup.local` or `.cool-branch/setup.local.sh`)
- `init` command to create `.cool-branch` directory with config template
- `setup` command to view and manage setup scripts with `--edit` flag
- `config` command to get, set, list, and unset configuration values
- Configurable remote name via `--remote` flag or `remote` config key
- `--copy-config` flag to control copying `.cool-branch` directory to new worktrees
- `--config` flag to use a custom config file or directory
- Subcommand-specific help (`cool-branch <command> --help`)
- `version` subcommand and `--version` flag
