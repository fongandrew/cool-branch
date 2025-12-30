// CLI argument parsing for cool-branch

import * as path from 'node:path';

declare const __VERSION__: string;

/**
 * Available commands
 */
export type Command =
	| 'help'
	| 'version'
	| 'list'
	| 'add'
	| 'rm'
	| 'dirname'
	| 'config'
	| 'init'
	| 'setup';

/**
 * Copy config modes for .cool-branch directory
 */
export type CopyConfigMode = 'all' | 'none' | 'local';

/**
 * Parsed CLI options
 */
export interface ParsedArgs {
	command: Command;
	positional: string | undefined;
	positional2: string | undefined; // second positional for config <key> <value>
	base: string;
	baseExplicit: boolean; // true if --base was explicitly provided
	force: boolean;
	setup: string | undefined;
	noSetup: boolean;
	copyConfig: CopyConfigMode | undefined; // undefined means use config file or default
	config: string | undefined; // path to custom config file or directory
	local: boolean; // for config --local
	unset: boolean; // for config --unset
	edit: boolean; // for setup --edit and init --edit
	pathOnly: boolean; // for setup --path
	help: boolean;
	version: boolean;
}

/**
 * Default base directory for worktrees
 */
const DEFAULT_BASE = path.join(process.env['HOME'] ?? '~', '.worktrees');

/**
 * Parse command line arguments
 * @param argv Command line arguments (process.argv.slice(2))
 * @returns Parsed arguments object
 */
export function parseArgs(argv: string[]): ParsedArgs {
	const result: ParsedArgs = {
		command: 'help',
		positional: undefined,
		positional2: undefined,
		base: DEFAULT_BASE,
		baseExplicit: false,
		force: false,
		setup: undefined,
		noSetup: false,
		copyConfig: undefined,
		config: undefined,
		local: false,
		unset: false,
		edit: false,
		pathOnly: false,
		help: false,
		version: false,
	};

	const args = [...argv];
	const validCommands = ['version', 'list', 'add', 'rm', 'dirname', 'config', 'init', 'setup'];

	for (let i = 0; i < args.length; i++) {
		const arg = args[i] as string;

		// Handle flags
		if (arg === '-h' || arg === '--help') {
			result.help = true;
		} else if (arg === '-v' || arg === '--version') {
			result.version = true;
		} else if (arg === '-f' || arg === '--force') {
			result.force = true;
		} else if (arg === '--no-setup') {
			result.noSetup = true;
		} else if (arg === '--base') {
			i++;
			if (i < args.length) {
				result.base = args[i] as string;
				result.baseExplicit = true;
			}
		} else if (arg === '--setup') {
			i++;
			if (i < args.length) {
				result.setup = args[i] as string;
			}
		} else if (arg === '--copy-config') {
			i++;
			if (i < args.length) {
				const value = args[i] as string;
				if (value === 'all' || value === 'none' || value === 'local') {
					result.copyConfig = value;
				}
			}
		} else if (arg === '--config') {
			i++;
			if (i < args.length) {
				result.config = args[i] as string;
			}
		} else if (arg === '--local') {
			result.local = true;
		} else if (arg === '--unset') {
			result.unset = true;
		} else if (arg === '--edit') {
			result.edit = true;
		} else if (arg === '--path') {
			result.pathOnly = true;
		} else if (arg.startsWith('-')) {
			// Unknown flag - ignore for now
		} else if (validCommands.includes(arg) && result.command === 'help') {
			// First non-flag argument that's a valid command
			result.command = arg as Command;
		} else if (result.positional === undefined) {
			// Positional argument (branch-name or folder-name)
			result.positional = arg;
		} else if (result.positional2 === undefined) {
			// Second positional argument (for config <key> <value>)
			result.positional2 = arg;
		}
	}

	return result;
}

/**
 * Get version (injected at build time)
 */
export function getVersion(): string {
	return __VERSION__;
}

/**
 * Display help message for a specific command or general help
 */
export function showHelp(command?: Command): void {
	switch (command) {
		case 'list':
			console.log(`cool-branch list - List worktrees and branches

Usage:
  cool-branch list [options]

Options:
  --base <path>     Base directory for worktrees (default: ~/.worktrees)
  --config <path>   Path to config file or directory containing config.json
  -h, --help        Show this help
`);
			break;

		case 'add':
			console.log(`cool-branch add - Add a new worktree

Usage:
  cool-branch add [options] [<branch-name>]

If no branch name is provided, runs in interactive mode.

Options:
  --base <path>     Base directory for worktrees (default: ~/.worktrees)
  --config <path>   Path to config file or directory containing config.json
  -f, --force       Force creation even if branch exists
  --setup <script>  Path to post-setup script to run after creation
  --no-setup        Skip running the post-setup script
  --copy-config <mode>
                    Copy .cool-branch directory to new worktree
                    Modes: all, none, local (default: local)
  -h, --help        Show this help
`);
			break;

		case 'rm':
			console.log(`cool-branch rm - Remove a worktree

Usage:
  cool-branch rm [options] [<branch-name>]

If no branch name is provided, runs in interactive mode.

Options:
  --base <path>     Base directory for worktrees (default: ~/.worktrees)
  --config <path>   Path to config file or directory containing config.json
  -f, --force       Force removal even if worktree has changes
  -h, --help        Show this help
`);
			break;

		case 'init':
			console.log(`cool-branch init - Initialize .cool-branch directory

Usage:
  cool-branch init [options]

Creates a .cool-branch directory with config.json in the current directory.

Options:
  --local           Create config.local.json instead of config.json
  -f, --force       Overwrite existing config file
  --edit            Open the config file in your editor after creation
  -h, --help        Show this help
`);
			break;

		case 'setup':
			console.log(`cool-branch setup - View or manage setup scripts

Usage:
  cool-branch setup [options]

Options:
  --local           Target setup.local.sh instead of setup.sh
  --edit            Open the setup script in your editor
  --path            Print only the path to the setup script
  -h, --help        Show this help
`);
			break;

		case 'config':
			console.log(`cool-branch config - View or modify configuration

Usage:
  cool-branch config [options]           List all config values
  cool-branch config <key>               Get a config value
  cool-branch config <key> <value>       Set a config value
  cool-branch config --unset <key>       Remove a config key

Options:
  --base <path>     Base directory for worktrees (default: ~/.worktrees)
  --local           Target config.local.json instead of config.json
  --unset           Remove a key from config
  -h, --help        Show this help

Config Keys:
  dirname           Directory name pattern for worktrees
  base              Default base directory for worktrees
  setup             Path to post-setup script
`);
			break;

		case 'dirname':
			console.log(`cool-branch dirname - Get or set dirname (DEPRECATED)

Usage:
  cool-branch dirname [<folder-name>]

This command is deprecated. Use "cool-branch config dirname" instead.

Options:
  --base <path>     Base directory for worktrees (default: ~/.worktrees)
  -h, --help        Show this help
`);
			break;

		default:
			console.log(`cool-branch - A CLI for managing git worktrees

Usage:
  cool-branch <command> [options]

Commands:
  list              List worktrees and branches
  add               Add a new worktree
  rm                Remove a worktree
  init              Initialize .cool-branch directory
  setup             View or manage setup scripts
  config            View or modify configuration
  version           Show version

Run "cool-branch <command> --help" for more information on a specific command.

Global Options:
  --base <path>     Base directory for worktrees (default: ~/.worktrees)
  --config <path>   Path to config file or directory containing config.json
  -h, --help        Show help
`);
			break;
	}
}

/**
 * Display version
 */
export function showVersion(): void {
	console.log(getVersion());
}

/**
 * Check if a command is valid
 */
export function isValidCommand(cmd: string): boolean {
	return ['version', 'list', 'add', 'rm', 'dirname', 'config', 'init', 'setup'].includes(cmd);
}
