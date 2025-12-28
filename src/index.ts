#!/usr/bin/env node

import { parseArgs, showHelp, showVersion } from './cli.js';
import { addCommand } from './commands/add.js';
import { listCommand } from './commands/list.js';
import { removeCommand } from './commands/remove.js';
import { getRepoFolderName, setRepoFolderName } from './config.js';

/**
 * Main entry point
 */
function main(): void {
	const args = parseArgs(process.argv.slice(2));

	// Handle help flag
	if (args.help) {
		showHelp();
		process.exit(0);
	}

	// Handle version flag
	if (args.version) {
		showVersion();
		process.exit(0);
	}

	// Check for unknown commands (first positional arg that's not a known command)
	const rawArgs = process.argv.slice(2);
	const validCommands = ['add', 'rm', 'dirname'];
	const flags = [
		'-h',
		'--help',
		'-v',
		'--version',
		'-f',
		'--force',
		'--no-setup',
		'--base',
		'--setup',
	];

	for (let i = 0; i < rawArgs.length; i++) {
		const arg = rawArgs[i] as string;
		// Skip flags and their values
		if (flags.includes(arg)) {
			if (arg === '--base' || arg === '--setup') {
				i++; // Skip the next argument (value)
			}
			continue;
		}
		// First non-flag argument
		if (!validCommands.includes(arg) && args.command === 'list') {
			// This looks like an unknown command
			console.error(`Unknown command: ${arg}`);
			console.error('Run "cool-branch --help" for usage information.');
			process.exit(1);
		}
		break;
	}

	// Dispatch to command handlers
	switch (args.command) {
		case 'list':
			listCommand({ base: args.base });
			break;
		case 'add':
			if (!args.positional) {
				// Interactive mode not yet implemented
				console.error('Error: Branch name is required');
				console.error('Usage: cool-branch add <branch-name>');
				process.exit(1);
			}
			addCommand({
				base: args.base,
				branchName: args.positional,
				force: args.force,
				setup: args.setup,
				noSetup: args.noSetup,
			});
			break;
		case 'rm':
			if (!args.positional) {
				// Interactive mode not yet implemented
				console.error('Error: Branch name is required');
				console.error('Usage: cool-branch rm <branch-name>');
				process.exit(1);
			}
			removeCommand({
				base: args.base,
				branchName: args.positional,
				force: args.force,
			});
			break;
		case 'dirname':
			if (args.positional) {
				// Set the folder name mapping
				setRepoFolderName(args.base, args.positional);
				console.log(`Set folder name to: ${args.positional}`);
			} else {
				// Get the current folder name
				const folderName = getRepoFolderName(args.base);
				console.log(folderName);
			}
			break;
	}
}

main();
