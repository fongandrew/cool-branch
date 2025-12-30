// CLI argument parsing for cool-branch

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Available commands
 */
export type Command = 'help' | 'list' | 'add' | 'rm' | 'dirname' | 'config' | 'init';

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
		help: false,
		version: false,
	};

	const args = [...argv];
	const validCommands = ['list', 'add', 'rm', 'dirname', 'config', 'init'];

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
 * Get version from package.json
 */
export function getVersion(): string {
	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	// Handle both src/ during dev and dist/ when built
	const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
	return packageJson.version;
}

/**
 * Display help message
 */
export function showHelp(): void {
	console.log(`cool-branch - A CLI for managing git worktrees

Usage:
  cool-branch                  Show this help
  cool-branch list             List worktrees and branches
  cool-branch add [options] [<branch-name>]
                               Add a new worktree
  cool-branch rm [options] [<branch-name>]
                               Remove a worktree
  cool-branch init [options]   Initialize .cool-branch directory
  cool-branch dirname [<folder-name>]
                               Get or set dirname (deprecated, use config)
  cool-branch config           List all config values
  cool-branch config <key>     Get a config value
  cool-branch config <key> <value>
                               Set a config value
  cool-branch config --unset <key>
                               Remove a config key
  cool-branch config --local <key> <value>
                               Set a config value in config.local.json

Options:
  --base <path>     Base directory for worktrees (default: ~/.worktrees)
  --config <path>   Path to config file or directory containing config.json
  -f, --force       Force operation
  --setup <script>  Path to post-setup script (add only)
  --no-setup        Skip running the post-setup script (add only)
  --copy-config <mode>
                    Copy .cool-branch directory to new worktree (add only)
                    Modes: all, none, local (default: local)
  --local           (config) Use config.local.json instead of config.json
  --unset           (config) Remove a key from config
  -h, --help        Show help
  -v, --version     Show version
`);
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
	return ['list', 'add', 'rm', 'dirname', 'config', 'init'].includes(cmd);
}
