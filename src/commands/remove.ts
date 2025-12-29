// Remove command - removes a worktree and its branch

import * as fs from 'node:fs';

import { getWorktreeBasePath, getWorktreePath } from '../config';
import {
	deleteBranch,
	getCurrentBranch,
	getRepoRoot,
	listBranches,
	listWorktrees,
	removeWorktree,
} from '../git';
import { isInteractive, promptConfirm, promptMultiSelect } from '../prompt';

/**
 * Options for the remove command
 */
export interface RemoveOptions {
	base: string;
	localDirname?: string | undefined;
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

	// Prepare config options for path functions
	const configOpts = options.localDirname ? { localDirname: options.localDirname } : undefined;

	// Get the expected worktree path
	const worktreePath = getWorktreePath(options.base, options.branchName, undefined, configOpts);

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
	localDirname?: string | undefined;
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

	// Prepare config options for path functions
	const configOpts = options.localDirname ? { localDirname: options.localDirname } : undefined;

	// Get all branches and worktrees
	const branches = listBranches();
	const worktrees = listWorktrees();
	const currentBranch = getCurrentBranch();

	// Get the worktree base path for this repo
	const worktreeBase = getWorktreeBasePath(options.base, undefined, configOpts);

	// Build a map of branch -> worktree path (for managed worktrees only)
	const branchWorktreeMap = new Map<string, string>();
	for (const w of worktrees) {
		if (!w.isMain && w.path.startsWith(worktreeBase) && w.branch) {
			branchWorktreeMap.set(w.branch, w.path);
		}
	}

	// Filter out current branch (can't delete it)
	const availableBranches = branches.filter((b) => b !== currentBranch);

	if (availableBranches.length === 0) {
		console.log('No branches to remove.');
		process.exit(0);
	}

	// Build display list with worktree indicators
	const displayOptions = availableBranches.map((branch) => {
		if (branchWorktreeMap.has(branch)) {
			return `${branch} [worktree]`;
		}
		return branch;
	});

	// Prompt for multi-selection
	const indices = await promptMultiSelect('Select branch(es) to remove:', displayOptions);

	if (indices === null || indices.length === 0) {
		console.error('Error: Invalid selection');
		process.exit(1);
	}

	// Process each selected branch
	for (const index of indices) {
		const branchName = availableBranches[index];
		if (!branchName) continue;

		const worktreePath = branchWorktreeMap.get(branchName);

		console.log(`\nRemoving ${branchName}...`);

		// If branch has a worktree, remove it first
		if (worktreePath) {
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
		}

		// Delete the branch
		try {
			deleteBranch(branchName);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.warn(`Warning: Could not delete branch '${branchName}': ${message}`);
			continue;
		}

		if (worktreePath) {
			console.log(`Worktree and branch '${branchName}' removed`);
		} else {
			console.log(`Branch '${branchName}' removed`);
		}
	}
}
