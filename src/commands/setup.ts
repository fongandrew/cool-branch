// Setup command - view and manage setup scripts

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { COOL_BRANCH_DIR } from '../constants';
import { getRepoRoot } from '../git';

/**
 * Setup script template
 */
const SETUP_TEMPLATE = `#!/bin/bash
# cool-branch setup script
# This script runs after creating a new worktree.
# The worktree path is passed as the first argument: $1

WORKTREE_PATH="$1"

# Example: Install dependencies
# cd "$WORKTREE_PATH" && npm install

# Example: Copy local environment files
# cp .env.example "$WORKTREE_PATH/.env"

echo "Setup complete for $WORKTREE_PATH"
`;

/**
 * Options for the setup command
 */
export interface SetupOptions {
	local: boolean;
	edit: boolean;
	pathOnly: boolean;
}

/**
 * Get the editor to use for opening files
 * @returns Editor command
 */
function getEditor(): string {
	// Check VISUAL first, then EDITOR, then fall back to platform default
	const editor = process.env['VISUAL'] || process.env['EDITOR'];
	if (editor) {
		return editor;
	}
	// Fall back to platform default
	return process.platform === 'win32' ? 'notepad' : 'vi';
}

/**
 * Find a local setup script in the .cool-branch directory
 * Looks for files named "setup.local" with or without extension
 * @param coolBranchDir Path to .cool-branch directory
 * @returns Path to the script if found, null otherwise
 */
function findLocalSetupScript(coolBranchDir: string): string | null {
	try {
		const entries = fs.readdirSync(coolBranchDir);
		for (const entry of entries) {
			// Match setup.local or setup.local.* (with any extension)
			if (entry === 'setup.local' || entry.startsWith('setup.local.')) {
				return path.join(coolBranchDir, entry);
			}
		}
	} catch {
		// Directory doesn't exist or can't be read
	}
	return null;
}

/**
 * Find a regular (non-local) setup script in the .cool-branch directory
 * @param coolBranchDir Path to .cool-branch directory
 * @returns Path to the script if found, null otherwise
 */
function findRegularSetupScript(coolBranchDir: string): string | null {
	try {
		const entries = fs.readdirSync(coolBranchDir);
		for (const entry of entries) {
			// Match setup or setup.* (with any extension), but NOT setup.local*
			if (
				(entry === 'setup' || (entry.startsWith('setup.') && entry !== 'setup.')) &&
				!entry.startsWith('setup.local')
			) {
				return path.join(coolBranchDir, entry);
			}
		}
	} catch {
		// Directory doesn't exist or can't be read
	}
	return null;
}

/**
 * Find a setup script following priority rules
 * Priority: local > regular
 * @param coolBranchDir Path to .cool-branch directory
 * @returns Path to the script if found, null otherwise
 */
function findSetupScript(coolBranchDir: string): string | null {
	// First try to find a local setup script
	const localScript = findLocalSetupScript(coolBranchDir);
	if (localScript) {
		return localScript;
	}

	// Fall back to regular setup script
	return findRegularSetupScript(coolBranchDir);
}

/**
 * Setup command handler
 * @param options Command options
 */
export function setupCommand(options: SetupOptions): void {
	// Validate context - ensure we're in a git repository
	const repoRoot = getRepoRoot();
	if (repoRoot === null) {
		console.error('Error: Not in a git repository');
		process.exit(1);
	}

	const coolBranchDir = path.join(repoRoot, COOL_BRANCH_DIR);

	// Handle --edit mode
	if (options.edit) {
		handleEditMode(coolBranchDir, options.local);
		return;
	}

	// Determine which script(s) to look for
	let scriptPath: string | null;

	if (options.local) {
		// --local flag: only look for local setup scripts
		scriptPath = findLocalSetupScript(coolBranchDir);

		if (options.pathOnly) {
			if (scriptPath) {
				console.log(scriptPath);
			} else {
				process.exit(1);
			}
			return;
		}

		if (scriptPath) {
			console.log(`Local setup script: ${scriptPath}`);
		} else {
			console.log('No local setup script found.');
		}
	} else {
		// Default: show which script would run (following priority)
		scriptPath = findSetupScript(coolBranchDir);

		if (options.pathOnly) {
			if (scriptPath) {
				console.log(scriptPath);
			} else {
				process.exit(1);
			}
			return;
		}

		if (scriptPath) {
			const isLocal = path.basename(scriptPath).startsWith('setup.local');
			const typeLabel = isLocal ? ' (local)' : '';
			console.log(`Setup script${typeLabel}: ${scriptPath}`);

			// If there's also a regular script that's being shadowed, mention it
			if (isLocal) {
				const regularScript = findRegularSetupScript(coolBranchDir);
				if (regularScript) {
					console.log(`  Shadowing: ${regularScript}`);
				}
			}
		} else {
			console.log('No setup script found.');
			console.log(`Create one with: cool-branch setup --edit`);
		}
	}
}

/**
 * Check if we're running in an interactive terminal
 * @returns true if stdin is a TTY
 */
function isInteractive(): boolean {
	return Boolean(process.stdin.isTTY);
}

/**
 * Handle --edit mode: create/open setup script in editor
 * @param coolBranchDir Path to .cool-branch directory
 * @param local Whether to target local setup script
 */
function handleEditMode(coolBranchDir: string, local: boolean): void {
	const filename = local ? 'setup.local' : 'setup';
	const scriptPath = path.join(coolBranchDir, filename);

	// Check if script already exists (with any extension)
	let existingScript: string | null = null;
	if (local) {
		existingScript = findLocalSetupScript(coolBranchDir);
	} else {
		existingScript = findRegularSetupScript(coolBranchDir);
	}

	let targetPath: string;

	if (existingScript) {
		// Use existing script
		targetPath = existingScript;
	} else {
		// Create new script
		// Ensure .cool-branch directory exists
		if (!fs.existsSync(coolBranchDir)) {
			fs.mkdirSync(coolBranchDir, { recursive: true });
		}

		// Write template with executable permissions
		fs.writeFileSync(scriptPath, SETUP_TEMPLATE, { mode: 0o755 });
		console.log(`Created: ${scriptPath}`);
		targetPath = scriptPath;
	}

	// Open in editor
	const editor = getEditor();

	// Use inherit for interactive terminals, pipe otherwise (for testing)
	const stdio = isInteractive() ? 'inherit' : 'pipe';

	const result = spawnSync(editor, [targetPath], {
		stdio,
		shell: true,
	});

	if (result.error) {
		console.error(`Error: Could not open editor: ${result.error.message}`);
		process.exit(1);
	}
}
