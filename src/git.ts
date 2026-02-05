// Git utility functions for interacting with git repositories
// Uses only Node.js built-ins (child_process)

import { spawnSync } from 'node:child_process';

/**
 * Result from running a git command
 */
export interface GitResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

/**
 * Options for running git commands
 */
export interface RunGitOptions {
	cwd?: string | undefined;
	/** If true, print stdout/stderr to console */
	verbose?: boolean | undefined;
}

/**
 * Run a git command and return the result
 * @param args Arguments to pass to git
 * @param options Options including cwd and verbose flag
 * @returns Object with stdout, stderr, and exitCode
 */
export function runGit(args: string[], options?: string | RunGitOptions): GitResult {
	// Support legacy string cwd parameter
	const opts: RunGitOptions = typeof options === 'string' ? { cwd: options } : (options ?? {});

	const result = spawnSync('git', args, {
		cwd: opts.cwd,
		encoding: 'utf-8',
		stdio: ['pipe', 'pipe', 'pipe'],
	});

	const stdout = result.stdout?.trim() ?? '';
	const stderr = result.stderr?.trim() ?? '';

	if (opts.verbose) {
		if (stdout) {
			console.log(stdout);
		}
		if (stderr) {
			console.error(stderr);
		}
	}

	return {
		stdout,
		stderr,
		exitCode: result.status ?? 1,
	};
}

/**
 * Get the root directory of the current git repository
 * @param cwd Working directory (optional)
 * @returns The repository root path, or null if not in a git repo
 */
export function getRepoRoot(cwd?: string): string | null {
	const result = runGit(['rev-parse', '--show-toplevel'], cwd);
	if (result.exitCode !== 0) {
		return null;
	}
	return result.stdout;
}

/**
 * Get the path to the main worktree (not a linked worktree)
 * @param cwd Working directory (optional)
 * @returns The main worktree path, or null if not in a git repo
 */
export function getMainWorktreePath(cwd?: string): string | null {
	// List all worktrees and find the main one
	const worktrees = listWorktrees(cwd);
	const mainWorktree = worktrees.find((w) => w.isMain);
	return mainWorktree ? mainWorktree.path : null;
}

/**
 * Get the URL of the origin remote
 * @param cwd Working directory (optional)
 * @returns The origin URL, or null if no origin configured
 */
export function getOriginUrl(cwd?: string): string | null {
	const result = runGit(['remote', 'get-url', 'origin'], cwd);
	if (result.exitCode !== 0) {
		return null;
	}
	return result.stdout;
}

/**
 * List all local branches
 * @param cwd Working directory (optional)
 * @returns Array of branch names
 */
export function listBranches(cwd?: string): string[] {
	const result = runGit(['branch', '--list', '--format=%(refname:short)'], cwd);
	if (result.exitCode !== 0) {
		return [];
	}
	return result.stdout.split('\n').filter((b) => b.length > 0);
}

/**
 * Worktree information
 */
export interface WorktreeInfo {
	path: string;
	branch: string;
	isMain: boolean;
}

/**
 * List all worktrees in the repository
 * @param cwd Working directory (optional)
 * @returns Array of worktree information
 */
export function listWorktrees(cwd?: string): WorktreeInfo[] {
	const result = runGit(['worktree', 'list', '--porcelain'], cwd);
	if (result.exitCode !== 0) {
		return [];
	}

	const worktrees: WorktreeInfo[] = [];
	const lines = result.stdout.split('\n');

	let currentWorktree: Partial<WorktreeInfo> = {};
	let isFirst = true;

	for (const line of lines) {
		if (line.startsWith('worktree ')) {
			// Start of a new worktree entry
			if (currentWorktree.path) {
				// Save the previous worktree
				worktrees.push({
					path: currentWorktree.path,
					branch: currentWorktree.branch ?? '',
					isMain: currentWorktree.isMain ?? false,
				});
			}
			currentWorktree = {
				path: line.substring('worktree '.length),
				isMain: isFirst,
			};
			isFirst = false;
		} else if (line.startsWith('branch ')) {
			// Branch reference (refs/heads/branch-name)
			const ref = line.substring('branch '.length);
			currentWorktree.branch = ref.replace('refs/heads/', '');
		} else if (line === 'bare') {
			// Bare worktree (main repo when using bare repo)
			currentWorktree.branch = '';
		}
	}

	// Don't forget the last worktree
	if (currentWorktree.path) {
		worktrees.push({
			path: currentWorktree.path,
			branch: currentWorktree.branch ?? '',
			isMain: currentWorktree.isMain ?? false,
		});
	}

	return worktrees;
}

/**
 * Get the current branch name
 * @param cwd Working directory (optional)
 * @returns The current branch name, or null if not on a branch
 */
export function getCurrentBranch(cwd?: string): string | null {
	const result = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
	if (result.exitCode !== 0) {
		return null;
	}
	// Returns 'HEAD' if in detached HEAD state
	if (result.stdout === 'HEAD') {
		return null;
	}
	return result.stdout;
}

/**
 * Check if a local branch exists
 * @param branchName The branch name to check
 * @param cwd Working directory (optional)
 * @returns True if the branch exists
 */
export function branchExists(branchName: string, cwd?: string): boolean {
	const result = runGit(['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`], cwd);
	return result.exitCode === 0;
}

/**
 * Check if a remote branch exists on origin
 * @param branchName The branch name to check
 * @param cwd Working directory (optional)
 * @returns True if the remote branch exists
 */
export function remoteBranchExists(branchName: string, cwd?: string): boolean {
	// Try to fetch first (ignore errors - remote might not exist)
	runGit(['fetch', 'origin'], cwd);

	// Check if the remote branch exists
	const result = runGit(
		['show-ref', '--verify', '--quiet', `refs/remotes/origin/${branchName}`],
		cwd,
	);
	return result.exitCode === 0;
}

/**
 * Add a new worktree
 * @param worktreePath Path where the worktree will be created
 * @param branchName Branch name for the worktree
 * @param createBranch If true, create a new branch (-b flag)
 * @param cwd Working directory (optional)
 * @throws Error if the operation fails
 */
export function addWorktree(
	worktreePath: string,
	branchName: string,
	createBranch: boolean,
	cwd?: string,
): void {
	const args = ['worktree', 'add'];
	if (createBranch) {
		args.push('-b', branchName, worktreePath);
	} else {
		args.push(worktreePath, branchName);
	}

	const result = runGit(args, { cwd, verbose: true });
	if (result.exitCode !== 0) {
		throw new Error(`Failed to add worktree: ${result.stderr || result.stdout}`);
	}
}

/**
 * Remove a worktree
 * @param worktreePath Path of the worktree to remove
 * @param force If true, force removal even if worktree is dirty
 * @param cwd Working directory (optional)
 * @throws Error if the operation fails
 */
export function removeWorktree(worktreePath: string, force: boolean, cwd?: string): void {
	const args = ['worktree', 'remove', worktreePath];
	if (force) {
		args.push('--force');
	}

	const result = runGit(args, { cwd, verbose: true });
	if (result.exitCode !== 0) {
		throw new Error(`Failed to remove worktree: ${result.stderr || result.stdout}`);
	}
}

/**
 * Delete a local branch
 * @param branchName The branch to delete
 * @param cwd Working directory (optional)
 * @throws Error if the operation fails
 */
export function deleteBranch(branchName: string, cwd?: string): void {
	const result = runGit(['branch', '-D', branchName], cwd);
	if (result.exitCode !== 0) {
		throw new Error(`Failed to delete branch: ${result.stderr || result.stdout}`);
	}
}

/**
 * Rename a local branch
 * @param oldName Current branch name
 * @param newName New branch name
 * @param cwd Working directory (optional)
 * @throws Error if the operation fails
 */
export function renameBranch(oldName: string, newName: string, cwd?: string): void {
	const result = runGit(['branch', '-m', oldName, newName], cwd);
	if (result.exitCode !== 0) {
		throw new Error(`Failed to rename branch: ${result.stderr || result.stdout}`);
	}
}

/**
 * Move a worktree to a new location
 * @param oldPath Current worktree path
 * @param newPath New worktree path
 * @param cwd Working directory (optional)
 * @throws Error if the operation fails
 */
export function moveWorktree(oldPath: string, newPath: string, cwd?: string): void {
	const result = runGit(['worktree', 'move', oldPath, newPath], cwd);
	if (result.exitCode !== 0) {
		throw new Error(`Failed to move worktree: ${result.stderr || result.stdout}`);
	}
}

/**
 * Generate an auto-incremented branch name
 * @param baseName Current branch name (e.g., "feature" or "feature-1")
 * @param existingBranches List of existing branch names
 * @returns New incremented name (e.g., "feature-1" or "feature-2")
 */
export function generateIncrementedName(baseName: string, existingBranches: string[]): string {
	// Check if the name already ends with a number (e.g., "feature-1")
	const match = baseName.match(/^(.+)-(\d+)$/);

	let base: string;
	let startNum: number;

	if (match) {
		// Already has a number suffix
		base = match[1] as string;
		startNum = parseInt(match[2] as string, 10) + 1;
	} else {
		// No number suffix yet
		base = baseName;
		startNum = 1;
	}

	// Find the next available number
	let newName = `${base}-${startNum}`;
	while (existingBranches.includes(newName)) {
		startNum++;
		newName = `${base}-${startNum}`;
	}

	return newName;
}
