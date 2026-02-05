// Rename command - renames a worktree and branch

import * as path from 'node:path';

import { getWorktreeBasePath } from '../config';
import {
	generateIncrementedName,
	getCurrentBranch,
	getMainWorktreePath,
	getRepoRoot,
	listBranches,
	listWorktrees,
	moveWorktree,
	renameBranch,
} from '../git';

/**
 * Options for the rename command
 */
export interface RenameOptions {
	base: string;
	localDirname?: string | undefined;
	arg1?: string | undefined; // Context-dependent: new name (from worktree) or old name (from main)
	arg2?: string | undefined; // New name when running from main
}

/**
 * Rename a worktree and its associated branch
 * Two modes:
 * - From worktree: arg1 is new name (optional, auto-increment if not provided)
 * - From main repo: arg1 is old branch name (required), arg2 is new name (optional)
 * @param options Command options
 */
export function renameCommand(options: RenameOptions): void {
	// Validate context - ensure we're in a git repository
	const repoRoot = getRepoRoot();
	if (repoRoot === null) {
		console.error('Error: Not in a git repository');
		process.exit(1);
	}

	// Detect if we're in main or a worktree
	const worktrees = listWorktrees();
	const cwd = process.cwd();
	const currentWorktree = worktrees.find((w) => w.path === cwd);
	const isInMain = !currentWorktree || currentWorktree.isMain;

	let targetBranchName: string;
	let targetWorktreePath: string;
	let newBranchName: string | undefined;

	if (isInMain) {
		// Mode 1: Running from main repo
		// arg1 = old branch name (required), arg2 = new name (optional)
		if (!options.arg1) {
			console.error('Error: Branch name is required when running from main repository');
			console.error('Usage: cool-branch rename <branch-name> [new-name]');
			process.exit(1);
		}

		targetBranchName = options.arg1;
		newBranchName = options.arg2;

		// Find the worktree for this branch
		const targetWorktree = worktrees.find((w) => w.branch === targetBranchName);

		if (!targetWorktree) {
			console.error(`Error: Branch '${targetBranchName}' does not exist or has no worktree`);
			process.exit(1);
		}

		if (targetWorktree.isMain) {
			console.error('Error: Cannot rename the main repository worktree');
			process.exit(1);
		}

		targetWorktreePath = targetWorktree.path;
	} else {
		// Mode 2: Running from within a worktree
		// arg1 = new name (optional, auto-increment if not provided)
		const currentBranch = getCurrentBranch();
		if (currentBranch === null) {
			console.error('Error: Not currently on a branch');
			process.exit(1);
		}

		targetBranchName = currentBranch;
		newBranchName = options.arg1; // First arg is the new name
		targetWorktreePath = currentWorktree.path;
	}

	// Prepare config options for path functions
	const configOpts = options.localDirname ? { localDirname: options.localDirname } : undefined;

	// Determine the final new branch name
	let finalNewBranchName: string;
	if (newBranchName) {
		finalNewBranchName = newBranchName;
	} else {
		// Auto-increment the target branch name
		const existingBranches = listBranches();
		finalNewBranchName = generateIncrementedName(targetBranchName, existingBranches);
	}

	// Check if the target branch already exists
	const existingBranches = listBranches();
	if (existingBranches.includes(finalNewBranchName)) {
		console.error(`Error: Branch '${finalNewBranchName}' already exists`);
		process.exit(1);
	}

	// Get the base path for worktrees
	// Use main worktree path as the cwd to ensure correct folder name resolution
	const mainWorktreePath = getMainWorktreePath();
	if (!mainWorktreePath) {
		console.error('Error: Could not determine main worktree path');
		process.exit(1);
	}
	const worktreeBase = getWorktreeBasePath(options.base, mainWorktreePath, configOpts);

	// Calculate the new worktree path
	const oldPath = targetWorktreePath;
	const parentPath = path.dirname(oldPath);

	// Ensure we're renaming within the managed worktree base
	if (!oldPath.startsWith(worktreeBase)) {
		console.error('Error: Worktree is not in the managed worktree directory');
		console.error(`Worktree path: ${oldPath}`);
		console.error(`Expected worktrees to be under: ${worktreeBase}`);
		process.exit(1);
	}

	const newPath = path.join(parentPath, finalNewBranchName);

	// Rename the branch first
	try {
		renameBranch(targetBranchName, finalNewBranchName);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`Error: Failed to rename branch: ${message}`);
		process.exit(1);
	}

	// Move the worktree directory
	// Note: git worktree move must be run from the main worktree
	try {
		moveWorktree(oldPath, newPath, mainWorktreePath);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`Error: Failed to move worktree: ${message}`);
		// Try to revert the branch rename
		try {
			renameBranch(finalNewBranchName, targetBranchName);
			console.error('Branch rename has been reverted.');
		} catch (_revertError) {
			console.error(
				'Warning: Could not revert branch rename. Branch state may be inconsistent.',
			);
		}
		process.exit(1);
	}

	console.log(`Renamed '${targetBranchName}' → '${finalNewBranchName}'`);
	console.log(`Worktree moved to: ${newPath}`);

	// Only show the "cd" note if we're in the worktree (not from main)
	if (!isInMain) {
		console.log('');
		console.log('Note: You are still in the old directory. To continue working:');
		console.log(`  cd ${newPath}`);
	}
}
