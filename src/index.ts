#!/usr/bin/env node

import { parseArgs, showHelp, showVersion } from './cli';
import { addCommand, interactiveAddCommand } from './commands/add';
import { configCommand } from './commands/config';
import { dirnameCommand } from './commands/dirname';
import { initCommand } from './commands/init';
import { lastCommand } from './commands/last';
import { listCommand } from './commands/list';
import { interactiveRemoveCommand, removeCommand } from './commands/remove';
import { renameCommand } from './commands/rename';
import { setupCommand } from './commands/setup';
import { whereCommand } from './commands/where';
import { loadCustomConfig, readLocalConfig } from './config';

/**
 * Main entry point
 */
async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));

	// Handle help flag - show subcommand-specific help if applicable
	if (args.help) {
		showHelp(args.command !== 'help' ? args.command : undefined);
		process.exit(0);
	}

	// Handle version flag - only valid at base level (no subcommand)
	if (args.version) {
		if (args.command !== 'help') {
			console.error(`Unknown option: --version`);
			console.error(`Run "cool-branch ${args.command} --help" for usage information.`);
			process.exit(1);
		}
		showVersion();
		process.exit(0);
	}

	// Check for unknown commands (first positional arg that's not a known command)
	const rawArgs = process.argv.slice(2);
	const validCommands = [
		'version',
		'list',
		'add',
		'rm',
		'rename',
		'mv',
		'where',
		'last',
		'dirname',
		'config',
		'init',
		'setup',
	];
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
		'--config',
		'--remote',
		'--local',
		'--unset',
		'--edit',
		'--path',
	];

	for (let i = 0; i < rawArgs.length; i++) {
		const arg = rawArgs[i] as string;
		// Skip flags and their values
		if (flags.includes(arg)) {
			if (
				arg === '--base' ||
				arg === '--setup' ||
				arg === '--copy-config' ||
				arg === '--config' ||
				arg === '--remote'
			) {
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

	// Load custom config if --config flag was specified
	let customConfig: ReturnType<typeof loadCustomConfig> | undefined;
	if (args.config) {
		customConfig = loadCustomConfig(args.config);
		if (customConfig.error) {
			console.error(`Error: ${customConfig.error}`);
			process.exit(1);
		}
	}

	// Read local config from .cool-branch/config.json (only if no --config flag)
	const localConfig = customConfig ? customConfig.config : readLocalConfig();

	// Determine effective base: CLI flag > custom config > local config > default
	const effectiveBase = args.baseExplicit ? args.base : (localConfig.base ?? args.base);

	// Get local dirname (from custom config or local config)
	const localDirname = localConfig.dirname;

	// Determine effective remote: CLI flag > config > default 'origin'
	const effectiveRemote = args.remote ?? localConfig.remote ?? 'origin';

	// Dispatch to command handlers
	switch (args.command) {
		case 'help':
			showHelp();
			break;
		case 'version':
			showVersion();
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
					remote: effectiveRemote,
					setup: args.setup,
					noSetup: args.noSetup,
					copyConfig: args.copyConfig,
				});
			} else {
				addCommand({
					base: effectiveBase,
					localDirname,
					branchName: args.positional,
					remote: effectiveRemote,
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
		case 'rename':
		case 'mv':
			renameCommand({
				base: effectiveBase,
				localDirname,
				arg1: args.positional,
				arg2: args.positional2,
			});
			break;
		case 'where':
			if (!args.positional) {
				console.error('Error: Branch name is required');
				console.error('Run "cool-branch where --help" for usage information.');
				process.exit(1);
			}
			whereCommand({
				base: effectiveBase,
				localDirname,
				branchName: args.positional,
			});
			break;
		case 'last':
			lastCommand({
				base: effectiveBase,
				localDirname,
			});
			break;
		case 'dirname':
			// Show deprecation warning
			console.log(
				'Warning: The "dirname" command is deprecated. Use "cool-branch config dirname" instead.',
			);
			dirnameCommand({
				base: effectiveBase,
				folderName: args.positional,
			});
			break;
		case 'config':
			configCommand({
				base: effectiveBase,
				key: args.positional,
				value: args.positional2,
				local: args.local,
				unset: args.unset,
			});
			break;
		case 'init':
			initCommand({
				local: args.local,
				force: args.force,
				edit: args.edit,
			});
			break;
		case 'setup':
			setupCommand({
				local: args.local,
				edit: args.edit,
				pathOnly: args.pathOnly,
			});
			break;
	}
}

main().catch((error) => {
	console.error('Error:', error instanceof Error ? error.message : String(error));
	process.exit(1);
});
