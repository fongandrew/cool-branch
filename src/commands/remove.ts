// Remove command - removes a worktree and its branch

import * as fs from 'node:fs';

import { getWorktreeBasePath, getWorktreePath } from '../config.js';
import { deleteBranch, getRepoRoot, listWorktrees, removeWorktree } from '../git.js';
import { isInteractive, promptConfirm, promptMultiSelect } from '../prompt.js';

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

/**
 * Options for interactive remove
 */
export interface InteractiveRemoveOptions {
	base: string;
}

/**
 * Interactive remove - prompt user to select branches to remove
 * @param options Command options
 */
export async function interactiveRemoveCommand(options: InteractiveRemoveOptions): Promise<void> {
	// Validate context - ensure we're in a git repository
	const repoRoot = getRepoRoot();
	if (repoRoot === null) {
		console.error('Error: Not in a git repository');
		process.exit(1);
	}

	// Ensure we're in an interactive terminal
	if (!isInteractive()) {
		console.error('Error: Branch name is required in non-interactive mode');
		console.error('Usage: cool-branch rm <branch-name>');
		process.exit(1);
	}

	// Get worktrees for this repo
	const worktrees = listWorktrees();

	// Get the worktree base path for this repo to filter worktrees
	const worktreeBase = getWorktreeBasePath(options.base);

	// Filter to only worktrees in our managed base path (excluding main worktree)
	const managedWorktrees = worktrees.filter(
		(w) => !w.isMain && w.path.startsWith(worktreeBase) && w.branch,
	);

	if (managedWorktrees.length === 0) {
		console.log('No worktrees to remove.');
		process.exit(0);
	}

	// Build display list
	const displayOptions = managedWorktrees.map((w) => w.branch);

	// Prompt for multi-selection
	const indices = await promptMultiSelect('Select branch(es) to remove:', displayOptions);

	if (indices === null || indices.length === 0) {
		console.error('Error: Invalid selection');
		process.exit(1);
	}

	// Process each selected worktree
	for (const index of indices) {
		const worktree = managedWorktrees[index];
		if (!worktree) continue;

		const branchName = worktree.branch;
		const worktreePath = worktree.path;

		console.log(`\nRemoving ${branchName}...`);

		// Try to remove the worktree
		try {
			removeWorktree(worktreePath, false);
		} catch (_error) {
			// If it fails, offer to force remove
			const confirmed = await promptConfirm(`Remove '${branchName}' with --force?`, true);
			if (confirmed) {
				try {
					removeWorktree(worktreePath, true);
				} catch (forceError) {
					const forceMessage =
						forceError instanceof Error ? forceError.message : String(forceError);
					console.error(`Error: Failed to force remove worktree: ${forceMessage}`);
					continue;
				}
			} else {
				console.log(`Skipping ${branchName}`);
				continue;
			}
		}

		// Delete the branch
		try {
			deleteBranch(branchName);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.warn(`Warning: Could not delete branch '${branchName}': ${message}`);
		}

		console.log(`Worktree and branch '${branchName}' removed`);
	}
}
