// List command - shows all branches with their worktree status

import * as os from 'node:os';

import { getCurrentBranch, getRepoRoot, listBranches, listWorktrees } from '../git';

/**
 * Options for the list command
 */
export interface ListOptions {
	base: string;
}

/**
 * Replace home directory with ~ in paths for readability
 */
function shortenPath(fullPath: string): string {
	const home = os.homedir();
	if (fullPath.startsWith(home)) {
		return '~' + fullPath.substring(home.length);
	}
	return fullPath;
}

/**
 * List all branches and their worktree status
 * @param options Command options
 */
export function listCommand(_options: ListOptions): void {
	// Verify we're in a git repo
	const repoRoot = getRepoRoot();
	if (repoRoot === null) {
		console.error('Error: Not in a git repository');
		process.exit(1);
	}

	// Get all branches
	const branches = listBranches();
	if (branches.length === 0) {
		console.log('No branches found.');
		return;
	}

	// Get all worktrees
	const worktrees = listWorktrees();

	// Get current branch
	const currentBranch = getCurrentBranch();

	// Create a map of branch -> worktree info
	const branchToWorktree = new Map<string, { path: string; isMain: boolean }>();
	for (const wt of worktrees) {
		if (wt.branch) {
			branchToWorktree.set(wt.branch, { path: wt.path, isMain: wt.isMain });
		}
	}

	// Sort branches alphabetically
	const sortedBranches = [...branches].sort((a, b) => a.localeCompare(b));

	// Calculate column widths for alignment
	const maxBranchLen = Math.max(...sortedBranches.map((b) => b.length));

	// Print header
	console.log('Branches:');

	// Print each branch
	for (const branch of sortedBranches) {
		const isCurrent = branch === currentBranch;
		const marker = isCurrent ? '*' : ' ';

		// Pad branch name for alignment
		const paddedBranch = branch.padEnd(maxBranchLen);

		const wtInfo = branchToWorktree.get(branch);
		let status: string;

		if (wtInfo) {
			const shortenedPath = shortenPath(wtInfo.path);
			if (wtInfo.isMain) {
				status = `${shortenedPath} (main worktree)`;
			} else {
				status = shortenedPath;
			}
		} else {
			status = '(no worktree)';
		}

		console.log(`${marker} ${paddedBranch}    ${status}`);
	}
}
