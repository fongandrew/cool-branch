// Add command - creates a new worktree for a branch

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { getWorktreeBasePath, getWorktreePath } from '../config';
import {
	addWorktree,
	branchExists,
	getRepoRoot,
	listBranches,
	listWorktrees,
	removeWorktree,
	runGit,
} from '../git';
import { isInteractive, promptConfirm, promptSelect, type SelectResult } from '../prompt';

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
 * Result of running a setup script
 */
interface RunScriptResult {
	success: boolean;
	stdout: string;
	stderr: string;
}

/**
 * Run a setup script in the worktree directory
 * @param scriptPath Absolute path to the script
 * @param worktreePath Path to the worktree directory
 * @returns Result of script execution
 */
function runSetupScript(scriptPath: string, worktreePath: string): RunScriptResult {
	try {
		const result = execSync(`"${scriptPath}" "${worktreePath}"`, {
			cwd: worktreePath,
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'pipe'],
		});
		return {
			success: true,
			stdout: result,
			stderr: '',
		};
	} catch (error) {
		const execError = error as { stdout?: string; stderr?: string };
		return {
			success: false,
			stdout: execError.stdout ?? '',
			stderr: execError.stderr ?? '',
		};
	}
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
		// Force mode: properly remove the existing worktree (directory + git registration)
		try {
			removeWorktree(targetPath, true);
		} catch {
			// If removeWorktree fails (e.g., directory already partially removed),
			// clean up stale registrations and remove any remaining directory
			runGit(['worktree', 'prune']);
			removeDirectoryRecursive(targetPath);
		}
	}

	// Clean up any stale worktree registrations before adding
	runGit(['worktree', 'prune']);

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

	// Run setup script if applicable
	if (!options.noSetup) {
		let scriptPath: string | null = null;
		let isExplicitScript = false;

		if (options.setup) {
			// Custom script specified via --setup
			scriptPath = path.resolve(repoRoot, options.setup);
			isExplicitScript = true;
		} else {
			// Look for default .cool-branch-setup in repo root
			const defaultScript = path.join(repoRoot, '.cool-branch-setup');
			if (fs.existsSync(defaultScript)) {
				scriptPath = defaultScript;
			}
		}

		if (scriptPath) {
			if (!fs.existsSync(scriptPath)) {
				// Script specified via --setup but doesn't exist
				if (isExplicitScript) {
					console.log(`Warning: Setup script not found: ${scriptPath}`);
				}
				// For default script, skip silently (already checked above)
			} else {
				console.log('Running setup script...');
				const result = runSetupScript(scriptPath, targetPath);
				if (result.success) {
					console.log('Setup complete.');
				} else {
					console.log('Warning: Setup script failed. Continuing anyway.');
				}
			}
		}
	}
}

/**
 * Options for interactive add
 */
export interface InteractiveAddOptions {
	base: string;
	setup: string | undefined;
	noSetup: boolean;
}

/**
 * Interactive add - prompt user to select or enter a branch name
 * @param options Command options
 */
export async function interactiveAddCommand(options: InteractiveAddOptions): Promise<void> {
	// Validate context - ensure we're in a git repository
	const repoRoot = getRepoRoot();
	if (repoRoot === null) {
		console.error('Error: Not in a git repository');
		process.exit(1);
	}

	// Ensure we're in an interactive terminal
	if (!isInteractive()) {
		console.error('Error: Branch name is required in non-interactive mode');
		console.error('Usage: cool-branch add <branch-name>');
		process.exit(1);
	}

	// Get all branches and worktrees
	const branches = listBranches();
	const worktrees = listWorktrees();

	// Build display list with worktree indicators
	const worktreeBranches = new Set(worktrees.map((w) => w.branch));
	const displayOptions = branches.map((branch) => {
		if (worktreeBranches.has(branch)) {
			return `${branch} [worktree]`;
		}
		return branch;
	});

	// Prompt for selection
	const result: SelectResult = await promptSelect(
		'Select existing branch or enter new name:',
		displayOptions,
	);

	let branchName: string;
	let force = false;

	if (result.type === 'index') {
		// User selected an existing branch by number
		branchName = branches[result.value] as string;

		// Check if it already has a worktree
		if (worktreeBranches.has(branchName)) {
			const worktreePath = getWorktreePath(options.base, branchName);
			const confirmed = await promptConfirm(
				`Worktree exists at ${worktreePath}. Overwrite?`,
				true,
			);
			if (!confirmed) {
				console.log('Aborted.');
				process.exit(0);
			}
			force = true;
		}
	} else {
		// User entered text - use as new branch name
		branchName = result.value;
		if (!branchName) {
			console.error('Error: Branch name cannot be empty');
			process.exit(1);
		}

		// Check if this branch already has a worktree
		if (worktreeBranches.has(branchName)) {
			const worktreePath = getWorktreePath(options.base, branchName);
			const confirmed = await promptConfirm(
				`Worktree exists at ${worktreePath}. Overwrite?`,
				true,
			);
			if (!confirmed) {
				console.log('Aborted.');
				process.exit(0);
			}
			force = true;
		}
	}

	// Proceed with add command
	addCommand({
		base: options.base,
		branchName,
		force,
		setup: options.setup,
		noSetup: options.noSetup,
	});
}
