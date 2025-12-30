// Init command - initialize .cool-branch directory with config template

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { COOL_BRANCH_DIR } from '../constants';
import { getRepoRoot } from '../git';

/**
 * Config template for init command
 */
const CONFIG_TEMPLATE = {
	dirname: '',
	base: '',
	copyConfig: 'local',
};

/**
 * Options for the init command
 */
export interface InitOptions {
	local: boolean;
	force: boolean;
	edit: boolean;
}

/**
 * Get the editor to use for opening config files
 * @returns Editor command or null if none found
 */
function getEditor(): string | null {
	// Check VISUAL first, then EDITOR, then fall back to platform default
	const editor = process.env['VISUAL'] || process.env['EDITOR'];
	if (editor) {
		return editor;
	}
	// Fall back to platform default
	return process.platform === 'win32' ? 'notepad' : 'vi';
}

/**
 * Init command handler
 * @param options Command options
 */
export function initCommand(options: InitOptions): void {
	// Validate context - ensure we're in a git repository
	const repoRoot = getRepoRoot();
	if (repoRoot === null) {
		console.error('Error: Not in a git repository');
		process.exit(1);
	}

	const coolBranchDir = path.join(repoRoot, COOL_BRANCH_DIR);
	const filename = options.local ? 'config.local.json' : 'config.json';
	const configPath = path.join(coolBranchDir, filename);

	// Check if config file already exists (without --force)
	if (fs.existsSync(configPath) && !options.force) {
		console.log(`Config file already exists: ${configPath}`);
		return;
	}

	// Create .cool-branch directory if it doesn't exist
	if (!fs.existsSync(coolBranchDir)) {
		fs.mkdirSync(coolBranchDir, { recursive: true });
	}

	// Write the config template
	fs.writeFileSync(configPath, JSON.stringify(CONFIG_TEMPLATE, null, 2), 'utf-8');
	console.log(`Created: ${configPath}`);

	// Open in editor if --edit flag is set
	if (options.edit) {
		const editor = getEditor();
		if (!editor) {
			console.error('Error: No editor found. Set $VISUAL or $EDITOR environment variable.');
			process.exit(1);
		}

		// Open the file in the editor
		const result = spawnSync(editor, [configPath], {
			stdio: 'inherit',
			shell: true,
		});

		if (result.error) {
			console.error(`Error: Could not open editor: ${result.error.message}`);
			process.exit(1);
		}
	}
}
