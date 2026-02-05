// Last command - get most recently created worktree path

import * as fs from 'node:fs';

import { getRepoRoot, listWorktrees } from '../git';

/**
 * Options for the last command
 */
export interface LastOptions {
	base: string;
	localDirname?: string | undefined;
}

/**
 * Get the path of the most recently created worktree
 * @param _options Command options (unused but required for consistency)
 */
export function lastCommand(_options: LastOptions): void {
	// Validate context - ensure we're in a git repository
	const repoRoot = getRepoRoot();
	if (repoRoot === null) {
		console.error('Error: Not in a git repository');
		process.exit(1);
	}

	// Get all worktrees
	const worktrees = listWorktrees();

	// Filter out the main worktree
	const linkedWorktrees = worktrees.filter((w) => !w.isMain);

	if (linkedWorktrees.length === 0) {
		console.error('Error: No worktrees exist');
		process.exit(1);
	}

	// Sort by creation time (using directory modification time as proxy)
	// Most recent first
	const sortedWorktrees = linkedWorktrees.sort((a, b) => {
		try {
			const aStats = fs.statSync(a.path);
			const bStats = fs.statSync(b.path);
			return bStats.birthtimeMs - aStats.birthtimeMs;
		} catch {
			return 0;
		}
	});

	// Output only the path (for clean command substitution)
	console.log(sortedWorktrees[0]?.path);
}
