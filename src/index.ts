#!/usr/bin/env node

import { parseArgs, showHelp, showVersion } from './cli';
import { addCommand, interactiveAddCommand } from './commands/add';
import { dirnameCommand } from './commands/dirname';
import { listCommand } from './commands/list';
import { interactiveRemoveCommand, removeCommand } from './commands/remove';

/**
 * Main entry point
 */
async function main(): Promise<void> {
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
	const validCommands = ['list', 'add', 'rm', 'dirname'];
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
		if (!validCommands.includes(arg) && args.command === 'help') {
			// This looks like an unknown command
			console.error(`Unknown command: ${arg}`);
			console.error('Run "cool-branch --help" for usage information.');
			process.exit(1);
		}
		break;
	}

	// Dispatch to command handlers
	switch (args.command) {
		case 'help':
			showHelp();
			break;
		case 'list':
			listCommand({ base: args.base });
			break;
		case 'add':
			if (!args.positional) {
				// Interactive mode
				await interactiveAddCommand({
					base: args.base,
					setup: args.setup,
					noSetup: args.noSetup,
				});
			} else {
				addCommand({
					base: args.base,
					branchName: args.positional,
					force: args.force,
					setup: args.setup,
					noSetup: args.noSetup,
				});
			}
			break;
		case 'rm':
			if (!args.positional) {
				// Interactive mode
				await interactiveRemoveCommand({
					base: args.base,
				});
			} else {
				removeCommand({
					base: args.base,
					branchName: args.positional,
					force: args.force,
				});
			}
			break;
		case 'dirname':
			dirnameCommand({
				base: args.base,
				folderName: args.positional,
			});
			break;
	}
}

main().catch((error) => {
	console.error('Error:', error instanceof Error ? error.message : String(error));
	process.exit(1);
});
