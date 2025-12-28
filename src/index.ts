#!/usr/bin/env node

import { parseArgs, showHelp, showVersion } from './cli.js';

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
			console.log('Listing worktrees...');
			console.log(`  Base: ${args.base}`);
			break;
		case 'add':
			console.log('Adding worktree...');
			console.log(`  Branch: ${args.positional ?? '(will prompt)'}`);
			console.log(`  Base: ${args.base}`);
			console.log(`  Force: ${args.force}`);
			console.log(`  Setup: ${args.setup ?? 'default'}`);
			console.log(`  No Setup: ${args.noSetup}`);
			break;
		case 'rm':
			console.log('Removing worktree...');
			console.log(`  Branch: ${args.positional ?? '(will prompt)'}`);
			console.log(`  Force: ${args.force}`);
			break;
		case 'dirname':
			console.log('Getting dirname...');
			console.log(`  Folder: ${args.positional ?? '(will prompt)'}`);
			break;
	}
}

main();
