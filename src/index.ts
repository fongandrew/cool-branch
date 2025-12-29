#!/usr/bin/env node

import { parseArgs, showHelp, showVersion } from './cli';
import { addCommand, interactiveAddCommand } from './commands/add';
import { dirnameCommand } from './commands/dirname';
import { listCommand } from './commands/list';
import { interactiveRemoveCommand, removeCommand } from './commands/remove';
import { readLocalConfig } from './config';

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
		'--copy-config',
	];

	for (let i = 0; i < rawArgs.length; i++) {
		const arg = rawArgs[i] as string;
		// Skip flags and their values
		if (flags.includes(arg)) {
			if (arg === '--base' || arg === '--setup' || arg === '--copy-config') {
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

	// Read local config from .cool-branch/config.json
	const localConfig = readLocalConfig();

	// Determine effective base: CLI flag > local config > default
	const effectiveBase = args.baseExplicit ? args.base : (localConfig.base ?? args.base);

	// Get local dirname (only if not overridden by CLI --base)
	const localDirname = localConfig.dirname;

	// Dispatch to command handlers
	switch (args.command) {
		case 'help':
			showHelp();
			break;
		case 'list':
			listCommand({ base: effectiveBase, localDirname });
			break;
		case 'add':
			if (!args.positional) {
				// Interactive mode
				await interactiveAddCommand({
					base: effectiveBase,
					localDirname,
					setup: args.setup,
					noSetup: args.noSetup,
					copyConfig: args.copyConfig,
				});
			} else {
				addCommand({
					base: effectiveBase,
					localDirname,
					branchName: args.positional,
					force: args.force,
					setup: args.setup,
					noSetup: args.noSetup,
					copyConfig: args.copyConfig,
				});
			}
			break;
		case 'rm':
			if (!args.positional) {
				// Interactive mode
				await interactiveRemoveCommand({
					base: effectiveBase,
					localDirname,
				});
			} else {
				removeCommand({
					base: effectiveBase,
					localDirname,
					branchName: args.positional,
					force: args.force,
				});
			}
			break;
		case 'dirname':
			dirnameCommand({
				base: effectiveBase,
				folderName: args.positional,
			});
			break;
	}
}

main().catch((error) => {
	console.error('Error:', error instanceof Error ? error.message : String(error));
	process.exit(1);
});
