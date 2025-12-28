// Integration tests for cool-branch CLI

import assert from 'node:assert';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ============================================================================
// Git Utilities Tests
// ============================================================================
import {
	addWorktree,
	branchExists,
	deleteBranch,
	getCurrentBranch,
	getOriginUrl,
	getRepoRoot,
	listBranches,
	listWorktrees,
	removeWorktree,
} from '../src/git.js';
import {
	assertExitCode,
	assertFileExists,
	cleanupTempDir,
	createTempDir,
	initGitRepo,
	runCLI,
} from './helpers.js';

// Test registry
interface TestCase {
	name: string;
	fn: () => Promise<void> | void;
}

const tests: TestCase[] = [];

/**
 * Register a test
 * @param name Test name
 * @param fn Test function
 */
export function test(name: string, fn: () => Promise<void> | void): void {
	tests.push({ name, fn });
}

/**
 * Run all registered tests
 */
async function run(): Promise<void> {
	let passed = 0;
	let failed = 0;

	for (const testCase of tests) {
		process.stdout.write(`Running: ${testCase.name}... `);
		try {
			await testCase.fn();
			console.log('PASS');
			passed++;
		} catch (error) {
			console.log('FAIL');
			if (error instanceof Error) {
				console.log(`  Error: ${error.message}`);
			} else {
				console.log(`  Error: ${String(error)}`);
			}
			failed++;
		}
	}

	console.log();
	console.log(`Results: ${passed} passed, ${failed} failed`);

	process.exit(failed > 0 ? 1 : 0);
}

// ============================================================================
// Tests
// ============================================================================

test('--help shows usage information', async () => {
	const result = runCLI(['--help']);
	assertExitCode(result, 0);
	assert(result.stdout.includes('cool-branch'));
	assert(result.stdout.includes('add'));
	assert(result.stdout.includes('rm'));
});

test('--version shows version', async () => {
	const result = runCLI(['--version']);
	assertExitCode(result, 0);
	assert(/\d+\.\d+\.\d+/.test(result.stdout)); // semver pattern
});

test('-h is alias for --help', async () => {
	const result = runCLI(['-h']);
	assertExitCode(result, 0);
	assert(result.stdout.includes('cool-branch'));
});

test('unknown command shows error', async () => {
	const result = runCLI(['unknown-command']);
	assertExitCode(result, 1);
});

test('git utilities: getRepoRoot returns repo path', async () => {
	const dir = createTempDir();
	try {
		initGitRepo(dir);
		const root = getRepoRoot(dir);
		assert(root !== null, 'getRepoRoot should return a path');
		assert(
			root === dir || root.includes(path.basename(dir)),
			'getRepoRoot should return the repo path',
		);
	} finally {
		cleanupTempDir(dir);
	}
});

test('git utilities: getRepoRoot returns null for non-git directory', async () => {
	const dir = createTempDir();
	try {
		const root = getRepoRoot(dir);
		assert(root === null, 'getRepoRoot should return null for non-git directory');
	} finally {
		cleanupTempDir(dir);
	}
});

test('git utilities: getOriginUrl returns null when no origin', async () => {
	const dir = createTempDir();
	try {
		initGitRepo(dir);
		const url = getOriginUrl(dir);
		assert(url === null, 'getOriginUrl should return null when no origin configured');
	} finally {
		cleanupTempDir(dir);
	}
});

test('git utilities: listBranches returns branches', async () => {
	const dir = createTempDir();
	try {
		initGitRepo(dir);
		const branches = listBranches(dir);
		assert(Array.isArray(branches), 'listBranches should return an array');
		// Should have at least the main branch (could be main, master, or another default)
		assert(branches.length > 0, 'listBranches should return at least one branch');
	} finally {
		cleanupTempDir(dir);
	}
});

test('git utilities: listBranches includes newly created branches', async () => {
	const dir = createTempDir();
	try {
		initGitRepo(dir);
		// Create a new branch
		execSync('git branch test-branch', { cwd: dir });
		const branches = listBranches(dir);
		assert(branches.includes('test-branch'), 'listBranches should include test-branch');
	} finally {
		cleanupTempDir(dir);
	}
});

test('git utilities: getCurrentBranch returns current branch name', async () => {
	const dir = createTempDir();
	try {
		initGitRepo(dir);
		const branch = getCurrentBranch(dir);
		assert(branch !== null, 'getCurrentBranch should return a branch name');
		assert(
			typeof branch === 'string' && branch.length > 0,
			'getCurrentBranch should return a non-empty string',
		);
	} finally {
		cleanupTempDir(dir);
	}
});

test('git utilities: branchExists returns true for existing branch', async () => {
	const dir = createTempDir();
	try {
		initGitRepo(dir);
		execSync('git branch test-exists', { cwd: dir });
		const exists = branchExists('test-exists', dir);
		assert(exists === true, 'branchExists should return true for existing branch');
	} finally {
		cleanupTempDir(dir);
	}
});

test('git utilities: branchExists returns false for non-existing branch', async () => {
	const dir = createTempDir();
	try {
		initGitRepo(dir);
		const exists = branchExists('non-existent-branch', dir);
		assert(exists === false, 'branchExists should return false for non-existing branch');
	} finally {
		cleanupTempDir(dir);
	}
});

test('git utilities: listWorktrees returns worktree info', async () => {
	const dir = createTempDir();
	try {
		initGitRepo(dir);
		const worktrees = listWorktrees(dir);
		assert(Array.isArray(worktrees), 'listWorktrees should return an array');
		assert(worktrees.length >= 1, 'listWorktrees should return at least the main worktree');
		const main = worktrees.find((w) => w.isMain);
		assert(main !== undefined, 'listWorktrees should have a main worktree');
		assert(typeof main.path === 'string', 'worktree should have a path');
	} finally {
		cleanupTempDir(dir);
	}
});

test('git utilities: addWorktree and removeWorktree work', async () => {
	const dir = createTempDir();
	const worktreePath = path.join(dir, 'my-worktree');
	try {
		initGitRepo(dir);
		// Add worktree with new branch
		addWorktree(worktreePath, 'feature-branch', true, dir);
		assert(fs.existsSync(worktreePath), 'Worktree directory should exist after addWorktree');

		// Verify worktree is listed
		const worktrees = listWorktrees(dir);
		const added = worktrees.find((w) => w.path === worktreePath);
		assert(added !== undefined, 'Added worktree should appear in listWorktrees');

		// Remove worktree
		removeWorktree(worktreePath, false, dir);
		assert(
			!fs.existsSync(worktreePath),
			'Worktree directory should be removed after removeWorktree',
		);
	} finally {
		cleanupTempDir(dir);
	}
});

test('git utilities: deleteBranch removes a branch', async () => {
	const dir = createTempDir();
	try {
		initGitRepo(dir);
		execSync('git branch to-delete', { cwd: dir });
		assert(branchExists('to-delete', dir), 'Branch should exist before deletion');
		deleteBranch('to-delete', dir);
		assert(!branchExists('to-delete', dir), 'Branch should not exist after deletion');
	} finally {
		cleanupTempDir(dir);
	}
});

// ============================================================================
// Config Management Tests
// ============================================================================

test('config: creates cool-branch.json when setting dirname', async () => {
	const dir = createTempDir();
	const base = createTempDir();
	try {
		initGitRepo(dir);
		const result = runCLI(['dirname', 'custom-name', '--base', base], { cwd: dir });
		assertExitCode(result, 0);
		assertFileExists(path.join(base, 'cool-branch.json'));
	} finally {
		cleanupTempDir(dir);
		cleanupTempDir(base);
	}
});

test('config: reads existing mapping', async () => {
	const dir = createTempDir();
	const base = createTempDir();
	try {
		initGitRepo(dir);
		// Set a mapping
		runCLI(['dirname', 'my-name', '--base', base], { cwd: dir });
		// Read it back
		const result = runCLI(['dirname', '--base', base], { cwd: dir });
		assertExitCode(result, 0);
		assert(result.stdout.includes('my-name'));
	} finally {
		cleanupTempDir(dir);
		cleanupTempDir(base);
	}
});

test('config: uses default basename when no mapping', async () => {
	const dir = createTempDir();
	const base = createTempDir();
	try {
		initGitRepo(dir);
		const result = runCLI(['dirname', '--base', base], { cwd: dir });
		assertExitCode(result, 0);
		// Should mention using default
	} finally {
		cleanupTempDir(dir);
		cleanupTempDir(base);
	}
});

// ============================================================================
// Dirname Command Tests (from TDD issue)
// ============================================================================

test('dirname: returns default basename when no mapping', async () => {
	const dir = createTempDir();
	const base = createTempDir();
	try {
		initGitRepo(dir);
		const result = runCLI(['dirname', '--base', base], { cwd: dir });
		assertExitCode(result, 0);
		assert(result.stdout.includes('default') || result.stdout.includes(path.basename(dir)));
	} finally {
		cleanupTempDir(dir);
		cleanupTempDir(base);
	}
});

test('dirname: stores custom mapping', async () => {
	const dir = createTempDir();
	const base = createTempDir();
	try {
		initGitRepo(dir);
		const result = runCLI(['dirname', 'my-custom-name', '--base', base], { cwd: dir });
		assertExitCode(result, 0);
		assert(result.stdout.includes('my-custom-name'));
		// Verify it's in the config file
		const config = JSON.parse(fs.readFileSync(path.join(base, 'cool-branch.json'), 'utf-8'));
		assert(Object.values(config).includes('my-custom-name'));
	} finally {
		cleanupTempDir(dir);
		cleanupTempDir(base);
	}
});

test('dirname: retrieves stored mapping', async () => {
	const dir = createTempDir();
	const base = createTempDir();
	try {
		initGitRepo(dir);
		// Set mapping
		runCLI(['dirname', 'stored-name', '--base', base], { cwd: dir });
		// Retrieve it
		const result = runCLI(['dirname', '--base', base], { cwd: dir });
		assertExitCode(result, 0);
		assert(result.stdout.includes('stored-name'));
	} finally {
		cleanupTempDir(dir);
		cleanupTempDir(base);
	}
});

test('dirname: add command uses custom dirname', async () => {
	const dir = createTempDir();
	const base = createTempDir();
	try {
		initGitRepo(dir);
		// Set custom dirname
		runCLI(['dirname', 'custom-folder', '--base', base], { cwd: dir });
		// Create a worktree
		runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
		// Verify it used the custom folder name
		assertFileExists(path.join(base, 'custom-folder', 'feature-x'));
	} finally {
		cleanupTempDir(dir);
		cleanupTempDir(base);
	}
});

// ============================================================================
// List Command Tests
// ============================================================================

test('list: shows branches in a git repo', async () => {
	const dir = createTempDir();
	const base = createTempDir();
	try {
		initGitRepo(dir);
		const result = runCLI(['--base', base], { cwd: dir });
		assertExitCode(result, 0);
		assert(result.stdout.includes('main') || result.stdout.includes('master'));
	} finally {
		cleanupTempDir(dir);
		cleanupTempDir(base);
	}
});

test('list: marks current branch with asterisk', async () => {
	const dir = createTempDir();
	const base = createTempDir();
	try {
		initGitRepo(dir);
		const result = runCLI(['--base', base], { cwd: dir });
		assertExitCode(result, 0);
		assert(result.stdout.includes('*'));
	} finally {
		cleanupTempDir(dir);
		cleanupTempDir(base);
	}
});

test('list: shows worktree paths for branches with worktrees', async () => {
	const dir = createTempDir();
	const base = createTempDir();
	try {
		initGitRepo(dir);
		// Create a worktree using git directly (add command not yet implemented)
		const worktreePath = path.join(base, 'feature-branch');
		addWorktree(worktreePath, 'feature-branch', true, dir);
		// List should show it
		const result = runCLI(['--base', base], { cwd: dir });
		assertExitCode(result, 0);
		assert(result.stdout.includes('feature-branch'));
		assert(result.stdout.includes(base)); // path should be shown
	} finally {
		cleanupTempDir(dir);
		cleanupTempDir(base);
	}
});

test('list: shows (no worktree) for branches without worktrees', async () => {
	const dir = createTempDir();
	const base = createTempDir();
	try {
		initGitRepo(dir);
		// Create a branch without a worktree
		execSync('git branch no-worktree-branch', { cwd: dir });
		const result = runCLI(['--base', base], { cwd: dir });
		assertExitCode(result, 0);
		assert(result.stdout.includes('no worktree'));
	} finally {
		cleanupTempDir(dir);
		cleanupTempDir(base);
	}
});

test('list: errors when not in a git repo', async () => {
	const dir = createTempDir(); // Not a git repo
	const base = createTempDir();
	try {
		const result = runCLI(['--base', base], { cwd: dir });
		assertExitCode(result, 1);
	} finally {
		cleanupTempDir(dir);
		cleanupTempDir(base);
	}
});

// ============================================================================
// Add Command Tests
// ============================================================================

test('add: creates worktree at correct path', async () => {
	const dir = createTempDir();
	const base = createTempDir();
	try {
		initGitRepo(dir);
		const result = runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
		assertExitCode(result, 0);
		// Verify worktree directory exists
		const repoName = path.basename(dir);
		assertFileExists(path.join(base, repoName, 'feature-x'));
	} finally {
		cleanupTempDir(dir);
		cleanupTempDir(base);
	}
});

test('add: creates new branch when it does not exist', async () => {
	const dir = createTempDir();
	const base = createTempDir();
	try {
		initGitRepo(dir);
		runCLI(['add', 'new-branch', '--base', base], { cwd: dir });
		// Verify branch was created
		const branches = execSync('git branch', { cwd: dir }).toString();
		assert(branches.includes('new-branch'));
	} finally {
		cleanupTempDir(dir);
		cleanupTempDir(base);
	}
});

test('add: uses existing branch when it exists', async () => {
	const dir = createTempDir();
	const base = createTempDir();
	try {
		initGitRepo(dir);
		execSync('git branch existing-branch', { cwd: dir });
		const result = runCLI(['add', 'existing-branch', '--base', base], { cwd: dir });
		assertExitCode(result, 0);
	} finally {
		cleanupTempDir(dir);
		cleanupTempDir(base);
	}
});

test('add: errors without -f when directory exists', async () => {
	const dir = createTempDir();
	const base = createTempDir();
	try {
		initGitRepo(dir);
		// Create worktree first time
		runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
		// Remove the worktree but leave directory (simulate conflict)
		execSync('git worktree remove ' + path.join(base, path.basename(dir), 'feature-x'), {
			cwd: dir,
		});
		fs.mkdirSync(path.join(base, path.basename(dir), 'feature-x'), { recursive: true });
		fs.writeFileSync(path.join(base, path.basename(dir), 'feature-x', 'file.txt'), 'content');
		// Try to add again without -f
		const result = runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
		assertExitCode(result, 1);
	} finally {
		cleanupTempDir(dir);
		cleanupTempDir(base);
	}
});

test('add: -f overwrites existing directory', async () => {
	const dir = createTempDir();
	const base = createTempDir();
	try {
		initGitRepo(dir);
		// Create conflicting directory
		const repoName = path.basename(dir);
		fs.mkdirSync(path.join(base, repoName, 'feature-x'), { recursive: true });
		fs.writeFileSync(path.join(base, repoName, 'feature-x', 'file.txt'), 'content');
		// Add with -f
		const result = runCLI(['add', 'feature-x', '-f', '--base', base], { cwd: dir });
		assertExitCode(result, 0);
	} finally {
		cleanupTempDir(dir);
		cleanupTempDir(base);
	}
});

// ============================================================================
// Remove Command Tests
// ============================================================================

test('rm: removes worktree directory', async () => {
	const dir = createTempDir();
	const base = createTempDir();
	try {
		initGitRepo(dir);
		const repoName = path.basename(dir);
		// Create a worktree
		runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
		assertFileExists(path.join(base, repoName, 'feature-x'));
		// Remove it
		const result = runCLI(['rm', 'feature-x', '--base', base], { cwd: dir });
		assertExitCode(result, 0);
		// Directory should be gone
		assert(!fs.existsSync(path.join(base, repoName, 'feature-x')));
	} finally {
		cleanupTempDir(dir);
		cleanupTempDir(base);
	}
});

test('rm: deletes the branch', async () => {
	const dir = createTempDir();
	const base = createTempDir();
	try {
		initGitRepo(dir);
		// Create a worktree
		runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
		// Verify branch exists
		let branches = execSync('git branch', { cwd: dir }).toString();
		assert(branches.includes('feature-x'));
		// Remove it
		runCLI(['rm', 'feature-x', '--base', base], { cwd: dir });
		// Branch should be gone
		branches = execSync('git branch', { cwd: dir }).toString();
		assert(!branches.includes('feature-x'));
	} finally {
		cleanupTempDir(dir);
		cleanupTempDir(base);
	}
});

test('rm: -f removes even with uncommitted changes', async () => {
	const dir = createTempDir();
	const base = createTempDir();
	try {
		initGitRepo(dir);
		const repoName = path.basename(dir);
		// Create a worktree
		runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
		// Make uncommitted changes in the worktree
		const worktreePath = path.join(base, repoName, 'feature-x');
		fs.writeFileSync(path.join(worktreePath, 'uncommitted.txt'), 'changes');
		// Try to remove without -f (should fail)
		const resultNoForce = runCLI(['rm', 'feature-x', '--base', base], { cwd: dir });
		assertExitCode(resultNoForce, 1);
		// With -f should succeed
		const resultForce = runCLI(['rm', 'feature-x', '-f', '--base', base], { cwd: dir });
		assertExitCode(resultForce, 0);
	} finally {
		cleanupTempDir(dir);
		cleanupTempDir(base);
	}
});

test('rm: errors when worktree does not exist', async () => {
	const dir = createTempDir();
	const base = createTempDir();
	try {
		initGitRepo(dir);
		const result = runCLI(['rm', 'nonexistent-branch', '--base', base], { cwd: dir });
		assertExitCode(result, 1);
	} finally {
		cleanupTempDir(dir);
		cleanupTempDir(base);
	}
});

// Run all tests
run();
