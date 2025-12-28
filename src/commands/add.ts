// Add command - creates a new worktree for a branch

import * as fs from 'node:fs';
import * as path from 'node:path';

import { getWorktreeBasePath, getWorktreePath } from '../config.js';
import {
	addWorktree,
	branchExists,
	getRepoRoot,
	listBranches,
	listWorktrees,
	runGit,
} from '../git.js';
import { isInteractive, promptConfirm, promptSelect, type SelectResult } from '../prompt.js';

/**
 * Options for the add command
 */
export interface AddOptions {
	base: string;
	branchName: string;
	force: boolean;
	setup: string | undefined;
	noSetup: boolean;
}

/**
 * Recursively remove a directory and all its contents
 */
function removeDirectoryRecursive(dirPath: string): void {
	if (!fs.existsSync(dirPath)) {
		return;
	}

	const entries = fs.readdirSync(dirPath, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name);
		if (entry.isDirectory()) {
			removeDirectoryRecursive(fullPath);
		} else {
			fs.unlinkSync(fullPath);
		}
	}
	fs.rmdirSync(dirPath);
}

/**
 * Check if directory exists and is non-empty
 */
function isNonEmptyDirectory(dirPath: string): boolean {
	if (!fs.existsSync(dirPath)) {
		return false;
	}

	const stat = fs.statSync(dirPath);
	if (!stat.isDirectory()) {
		return false;
	}

	const entries = fs.readdirSync(dirPath);
	return entries.length > 0;
}

/**
 * Add a new worktree for the specified branch
 * @param options Command options
 */
export function addCommand(options: AddOptions): void {
	// Validate context - ensure we're in a git repository
	const repoRoot = getRepoRoot();
	if (repoRoot === null) {
		console.error('Error: Not in a git repository');
		process.exit(1);
	}

	// Get the base path for worktrees of this repo (creates it if needed)
	getWorktreeBasePath(options.base);

	// Get target path for the worktree
	const targetPath = getWorktreePath(options.base, options.branchName);

	// Check for existing directory
	if (isNonEmptyDirectory(targetPath)) {
		if (!options.force) {
			console.error(`Error: Directory already exists and is non-empty: ${targetPath}`);
			console.error('Use -f to force overwrite.');
			process.exit(1);
		}
		// Force mode: remove existing directory
		removeDirectoryRecursive(targetPath);
	}

	// Fetch from remote (ignore errors if no remote exists)
	runGit(['fetch', 'origin']);

	// Check if branch exists locally
	const localExists = branchExists(options.branchName);

	// Check if branch exists on remote
	const remoteResult = runGit([
		'show-ref',
		'--verify',
		'--quiet',
		`refs/remotes/origin/${options.branchName}`,
	]);
	const remoteExists = remoteResult.exitCode === 0;

	// Create worktree with appropriate options
	try {
		if (localExists) {
			// Branch exists locally - use it directly
			addWorktree(targetPath, options.branchName, false);
		} else if (remoteExists) {
			// Branch exists on remote - git will automatically track it
			addWorktree(targetPath, options.branchName, false);
		} else {
			// Branch doesn't exist - create a new one
			addWorktree(targetPath, options.branchName, true);
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`Error: Failed to create worktree: ${message}`);
		process.exit(1);
	}

	console.log(`Worktree created at: ${targetPath}`);
}

/**
 * Options for interactive add
 */
export interface InteractiveAddOptions {
	base: string;
	setup: string | undefined;
	noSetup: boolean;
}

/**
 * Interactive add - prompt user to select or enter a branch name
 * @param options Command options
 */
export async function interactiveAddCommand(options: InteractiveAddOptions): Promise<void> {
	// Validate context - ensure we're in a git repository
	const repoRoot = getRepoRoot();
	if (repoRoot === null) {
		console.error('Error: Not in a git repository');
		process.exit(1);
	}

	// Ensure we're in an interactive terminal
	if (!isInteractive()) {
		console.error('Error: Branch name is required in non-interactive mode');
		console.error('Usage: cool-branch add <branch-name>');
		process.exit(1);
	}

	// Get all branches and worktrees
	const branches = listBranches();
	const worktrees = listWorktrees();

	// Build display list with worktree indicators
	const worktreeBranches = new Set(worktrees.map((w) => w.branch));
	const displayOptions = branches.map((branch) => {
		if (worktreeBranches.has(branch)) {
			return `${branch} [worktree]`;
		}
		return branch;
	});

	// Prompt for selection
	const result: SelectResult = await promptSelect(
		'Select existing branch or enter new name:',
		displayOptions,
	);

	let branchName: string;
	let force = false;

	if (result.type === 'index') {
		// User selected an existing branch by number
		branchName = branches[result.value] as string;

		// Check if it already has a worktree
		if (worktreeBranches.has(branchName)) {
			const worktreePath = getWorktreePath(options.base, branchName);
			const confirmed = await promptConfirm(
				`Worktree exists at ${worktreePath}. Overwrite?`,
				true,
			);
			if (!confirmed) {
				console.log('Aborted.');
				process.exit(0);
			}
			force = true;
		}
	} else {
		// User entered text - use as new branch name
		branchName = result.value;
		if (!branchName) {
			console.error('Error: Branch name cannot be empty');
			process.exit(1);
		}

		// Check if this branch already has a worktree
		if (worktreeBranches.has(branchName)) {
			const worktreePath = getWorktreePath(options.base, branchName);
			const confirmed = await promptConfirm(
				`Worktree exists at ${worktreePath}. Overwrite?`,
				true,
			);
			if (!confirmed) {
				console.log('Aborted.');
				process.exit(0);
			}
			force = true;
		}
	}

	// Proceed with add command
	addCommand({
		base: options.base,
		branchName,
		force,
		setup: options.setup,
		noSetup: options.noSetup,
	});
}
