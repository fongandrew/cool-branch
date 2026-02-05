// Where command - get worktree path for a branch

import { getRepoRoot, listWorktrees } from '../git';

/**
 * Options for the where command
 */
export interface WhereOptions {
	base: string;
	localDirname?: string | undefined;
	branchName: string;
}

/**
 * Get the worktree path for a given branch
 * @param options Command options
 */
export function whereCommand(options: WhereOptions): void {
	// Validate context - ensure we're in a git repository
	const repoRoot = getRepoRoot();
	if (repoRoot === null) {
		console.error('Error: Not in a git repository');
		process.exit(1);
	}

	// Get all worktrees
	const worktrees = listWorktrees();

	// Find the worktree for the specified branch
	const worktree = worktrees.find((w) => w.branch === options.branchName);

	if (!worktree) {
		console.error(`Error: Branch '${options.branchName}' does not exist or has no worktree`);
		process.exit(1);
	}

	// Check if this is the main worktree (not a linked worktree)
	if (worktree.isMain) {
		console.error(
			`Error: Branch '${options.branchName}' is the main repository, not a worktree`,
		);
		process.exit(1);
	}

	// Output only the path (for clean command substitution)
	console.log(worktree.path);
}
