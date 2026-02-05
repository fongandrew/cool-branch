// Rename command - renames the current worktree and branch

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
	newName?: string | undefined; // Optional new name, auto-increment if not provided
}

/**
 * Rename the current worktree and its associated branch
 * @param options Command options
 */
export function renameCommand(options: RenameOptions): void {
	// Validate context - ensure we're in a git repository
	const repoRoot = getRepoRoot();
	if (repoRoot === null) {
		console.error('Error: Not in a git repository');
		process.exit(1);
	}

	// Get the current branch
	const currentBranch = getCurrentBranch();
	if (currentBranch === null) {
		console.error('Error: Not currently on a branch');
		process.exit(1);
	}

	// Get all worktrees to find the current one
	const worktrees = listWorktrees();
	const cwd = process.cwd();

	// Find the current worktree
	const currentWorktree = worktrees.find((w) => w.path === cwd);

	// Check if we're in the main repository (not a separate worktree)
	if (!currentWorktree || currentWorktree.isMain) {
		console.error('Error: Cannot rename the main repository worktree');
		console.error(
			'This command only works from within a separate worktree created with "cool-branch add"',
		);
		process.exit(1);
	}

	// Prepare config options for path functions
	const configOpts = options.localDirname ? { localDirname: options.localDirname } : undefined;

	// Determine the new branch name
	let newBranchName: string;
	if (options.newName) {
		newBranchName = options.newName;
	} else {
		// Auto-increment the current branch name
		const existingBranches = listBranches();
		newBranchName = generateIncrementedName(currentBranch, existingBranches);
	}

	// Check if the target branch already exists
	const existingBranches = listBranches();
	if (existingBranches.includes(newBranchName)) {
		console.error(`Error: Branch '${newBranchName}' already exists`);
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
	const oldPath = currentWorktree.path;
	const parentPath = path.dirname(oldPath);

	// Ensure we're renaming within the managed worktree base
	if (!oldPath.startsWith(worktreeBase)) {
		console.error('Error: Current worktree is not in the managed worktree directory');
		console.error(`Current worktree path: ${oldPath}`);
		console.error(`Expected worktrees to be under: ${worktreeBase}`);
		process.exit(1);
	}

	const newPath = path.join(parentPath, newBranchName);

	// Rename the branch first
	try {
		renameBranch(currentBranch, newBranchName);
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
			renameBranch(newBranchName, currentBranch);
			console.error('Branch rename has been reverted.');
		} catch (_revertError) {
			console.error(
				'Warning: Could not revert branch rename. Branch state may be inconsistent.',
			);
		}
		process.exit(1);
	}

	console.log(`Renamed '${currentBranch}' → '${newBranchName}'`);
	console.log(`Worktree moved to: ${newPath}`);
	console.log('');
	console.log('Note: You are still in the old directory. To continue working:');
	console.log(`  cd ${newPath}`);
}
