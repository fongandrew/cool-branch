// Add command - creates a new worktree for a branch

import * as fs from 'node:fs';
import * as path from 'node:path';

import { getWorktreeBasePath, getWorktreePath } from '../config.js';
import { addWorktree, branchExists, getRepoRoot, runGit } from '../git.js';

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
