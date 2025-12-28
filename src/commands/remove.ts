// Remove command - removes a worktree and its branch

import * as fs from 'node:fs';

import { getWorktreePath } from '../config.js';
import { deleteBranch, getRepoRoot, removeWorktree } from '../git.js';

/**
 * Options for the remove command
 */
export interface RemoveOptions {
	base: string;
	branchName: string;
	force: boolean;
}

/**
 * Remove a worktree and its associated branch
 * @param options Command options
 */
export function removeCommand(options: RemoveOptions): void {
	// Validate context - ensure we're in a git repository
	const repoRoot = getRepoRoot();
	if (repoRoot === null) {
		console.error('Error: Not in a git repository');
		process.exit(1);
	}

	// Get the expected worktree path
	const worktreePath = getWorktreePath(options.base, options.branchName);

	// Check if worktree exists
	if (!fs.existsSync(worktreePath)) {
		console.error(`Error: Worktree does not exist at: ${worktreePath}`);
		process.exit(1);
	}

	// Remove the worktree
	try {
		removeWorktree(worktreePath, options.force);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);

		// If not using force, provide helpful error message
		if (!options.force && message.includes('contains modified or untracked files')) {
			console.error(`Error: Worktree has uncommitted changes.`);
			console.error('Use -f to force removal.');
			process.exit(1);
		}

		console.error(`Error: Failed to remove worktree: ${message}`);
		process.exit(1);
	}

	// Delete the branch
	try {
		deleteBranch(options.branchName);
	} catch (error) {
		// Branch deletion might fail if it's the current branch elsewhere
		// This is not fatal - worktree was already removed
		const message = error instanceof Error ? error.message : String(error);
		console.warn(`Warning: Could not delete branch '${options.branchName}': ${message}`);
	}

	console.log(`Worktree and branch '${options.branchName}' removed`);
}
