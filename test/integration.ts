// Integration tests for cool-branch CLI

import assert from 'node:assert';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

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
} from '../src/git';
import { assertExitCode, assertFileExists, initGitRepo, runCLI, runTests, test } from './helpers';

// ============================================================================
// CLI Tests
// ============================================================================

test('--help shows usage information', () => {
	const result = runCLI(['--help']);
	assertExitCode(result, 0);
	assert(result.stdout.includes('cool-branch'));
	assert(result.stdout.includes('add'));
	assert(result.stdout.includes('rm'));
});

test('--version shows version', () => {
	const result = runCLI(['--version']);
	assertExitCode(result, 0);
	assert(/\d+\.\d+\.\d+/.test(result.stdout));
});

test('-h is alias for --help', () => {
	const result = runCLI(['-h']);
	assertExitCode(result, 0);
	assert(result.stdout.includes('cool-branch'));
});

test('unknown command shows error', () => {
	const result = runCLI(['unknown-command']);
	assertExitCode(result, 1);
});

// ============================================================================
// Git Utilities Tests
// ============================================================================

test('git utilities: getRepoRoot returns repo path', ({ dir }) => {
	initGitRepo(dir);
	const root = getRepoRoot(dir);
	assert(root !== null, 'getRepoRoot should return a path');
	assert(
		root === dir || root.includes(path.basename(dir)),
		'getRepoRoot should return the repo path',
	);
});

test('git utilities: getRepoRoot returns null for non-git directory', ({ dir }) => {
	const root = getRepoRoot(dir);
	assert(root === null, 'getRepoRoot should return null for non-git directory');
});

test('git utilities: getOriginUrl returns null when no origin', ({ dir }) => {
	initGitRepo(dir);
	const url = getOriginUrl(dir);
	assert(url === null, 'getOriginUrl should return null when no origin configured');
});

test('git utilities: listBranches returns branches', ({ dir }) => {
	initGitRepo(dir);
	const branches = listBranches(dir);
	assert(Array.isArray(branches), 'listBranches should return an array');
	assert(branches.length > 0, 'listBranches should return at least one branch');
});

test('git utilities: listBranches includes newly created branches', ({ dir }) => {
	initGitRepo(dir);
	execSync('git branch test-branch', { cwd: dir });
	const branches = listBranches(dir);
	assert(branches.includes('test-branch'), 'listBranches should include test-branch');
});

test('git utilities: getCurrentBranch returns current branch name', ({ dir }) => {
	initGitRepo(dir);
	const branch = getCurrentBranch(dir);
	assert(branch !== null, 'getCurrentBranch should return a branch name');
	assert(
		typeof branch === 'string' && branch.length > 0,
		'getCurrentBranch should return a non-empty string',
	);
});

test('git utilities: branchExists returns true for existing branch', ({ dir }) => {
	initGitRepo(dir);
	execSync('git branch test-exists', { cwd: dir });
	const exists = branchExists('test-exists', dir);
	assert(exists === true, 'branchExists should return true for existing branch');
});

test('git utilities: branchExists returns false for non-existing branch', ({ dir }) => {
	initGitRepo(dir);
	const exists = branchExists('non-existent-branch', dir);
	assert(exists === false, 'branchExists should return false for non-existing branch');
});

test('git utilities: listWorktrees returns worktree info', ({ dir }) => {
	initGitRepo(dir);
	const worktrees = listWorktrees(dir);
	assert(Array.isArray(worktrees), 'listWorktrees should return an array');
	assert(worktrees.length >= 1, 'listWorktrees should return at least the main worktree');
	const main = worktrees.find((w) => w.isMain);
	assert(main !== undefined, 'listWorktrees should have a main worktree');
	assert(typeof main.path === 'string', 'worktree should have a path');
});

test('git utilities: addWorktree and removeWorktree work', ({ dir }) => {
	initGitRepo(dir);
	const worktreePath = path.join(dir, 'my-worktree');
	addWorktree(worktreePath, 'feature-branch', true, dir);
	assert(fs.existsSync(worktreePath), 'Worktree directory should exist after addWorktree');

	const worktrees = listWorktrees(dir);
	const added = worktrees.find((w) => w.path === worktreePath);
	assert(added !== undefined, 'Added worktree should appear in listWorktrees');

	removeWorktree(worktreePath, false, dir);
	assert(
		!fs.existsSync(worktreePath),
		'Worktree directory should be removed after removeWorktree',
	);
});

test('git utilities: deleteBranch removes a branch', ({ dir }) => {
	initGitRepo(dir);
	execSync('git branch to-delete', { cwd: dir });
	assert(branchExists('to-delete', dir), 'Branch should exist before deletion');
	deleteBranch('to-delete', dir);
	assert(!branchExists('to-delete', dir), 'Branch should not exist after deletion');
});

// ============================================================================
// Config Management Tests
// ============================================================================

test('config: creates cool-branch.json when setting dirname', ({ dir, base }) => {
	initGitRepo(dir);
	const result = runCLI(['dirname', 'custom-name', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assertFileExists(path.join(base, 'cool-branch.json'));
});

test('config: reads existing mapping', ({ dir, base }) => {
	initGitRepo(dir);
	runCLI(['dirname', 'my-name', '--base', base], { cwd: dir });
	const result = runCLI(['dirname', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assert(result.stdout.includes('my-name'));
});

test('config: uses default basename when no mapping', ({ dir, base }) => {
	initGitRepo(dir);
	const result = runCLI(['dirname', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
});

// ============================================================================
// Dirname Command Tests
// ============================================================================

test('dirname: returns default basename when no mapping', ({ dir, base }) => {
	initGitRepo(dir);
	const result = runCLI(['dirname', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assert(result.stdout.includes('default') || result.stdout.includes(path.basename(dir)));
});

test('dirname: stores custom mapping', ({ dir, base }) => {
	initGitRepo(dir);
	const result = runCLI(['dirname', 'my-custom-name', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assert(result.stdout.includes('my-custom-name'));
	const config = JSON.parse(fs.readFileSync(path.join(base, 'cool-branch.json'), 'utf-8'));
	assert(Object.values(config).includes('my-custom-name'));
});

test('dirname: retrieves stored mapping', ({ dir, base }) => {
	initGitRepo(dir);
	runCLI(['dirname', 'stored-name', '--base', base], { cwd: dir });
	const result = runCLI(['dirname', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assert(result.stdout.includes('stored-name'));
});

test('dirname: add command uses custom dirname', ({ dir, base }) => {
	initGitRepo(dir);
	runCLI(['dirname', 'custom-folder', '--base', base], { cwd: dir });
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, 'custom-folder', 'feature-x'));
});

// ============================================================================
// List Command Tests
// ============================================================================

test('list: shows branches in a git repo', ({ dir, base }) => {
	initGitRepo(dir);
	const result = runCLI(['--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assert(result.stdout.includes('main') || result.stdout.includes('master'));
});

test('list: marks current branch with asterisk', ({ dir, base }) => {
	initGitRepo(dir);
	const result = runCLI(['--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assert(result.stdout.includes('*'));
});

test('list: shows worktree paths for branches with worktrees', ({ dir, base }) => {
	initGitRepo(dir);
	const worktreePath = path.join(base, 'feature-branch');
	addWorktree(worktreePath, 'feature-branch', true, dir);
	const result = runCLI(['--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assert(result.stdout.includes('feature-branch'));
	assert(result.stdout.includes(base));
});

test('list: shows (no worktree) for branches without worktrees', ({ dir, base }) => {
	initGitRepo(dir);
	execSync('git branch no-worktree-branch', { cwd: dir });
	const result = runCLI(['--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assert(result.stdout.includes('no worktree'));
});

test('list: errors when not in a git repo', ({ dir, base }) => {
	const result = runCLI(['--base', base], { cwd: dir });
	assertExitCode(result, 1);
});

// ============================================================================
// Add Command Tests
// ============================================================================

test('add: creates worktree at correct path', ({ dir, base }) => {
	initGitRepo(dir);
	const result = runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	const repoName = path.basename(dir);
	assertFileExists(path.join(base, repoName, 'feature-x'));
});

test('add: creates new branch when it does not exist', ({ dir, base }) => {
	initGitRepo(dir);
	runCLI(['add', 'new-branch', '--base', base], { cwd: dir });
	const branches = execSync('git branch', { cwd: dir }).toString();
	assert(branches.includes('new-branch'));
});

test('add: uses existing branch when it exists', ({ dir, base }) => {
	initGitRepo(dir);
	execSync('git branch existing-branch', { cwd: dir });
	const result = runCLI(['add', 'existing-branch', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
});

test('add: errors without -f when directory exists', ({ dir, base }) => {
	initGitRepo(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	execSync('git worktree remove ' + path.join(base, path.basename(dir), 'feature-x'), {
		cwd: dir,
	});
	fs.mkdirSync(path.join(base, path.basename(dir), 'feature-x'), { recursive: true });
	fs.writeFileSync(path.join(base, path.basename(dir), 'feature-x', 'file.txt'), 'content');
	const result = runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertExitCode(result, 1);
});

test('add: -f overwrites existing directory', ({ dir, base }) => {
	initGitRepo(dir);
	const repoName = path.basename(dir);
	fs.mkdirSync(path.join(base, repoName, 'feature-x'), { recursive: true });
	fs.writeFileSync(path.join(base, repoName, 'feature-x', 'file.txt'), 'content');
	const result = runCLI(['add', 'feature-x', '-f', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
});

// ============================================================================
// Remove Command Tests
// ============================================================================

test('rm: removes worktree directory', ({ dir, base }) => {
	initGitRepo(dir);
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, repoName, 'feature-x'));
	const result = runCLI(['rm', 'feature-x', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assert(!fs.existsSync(path.join(base, repoName, 'feature-x')));
});

test('rm: deletes the branch', ({ dir, base }) => {
	initGitRepo(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	let branches = execSync('git branch', { cwd: dir }).toString();
	assert(branches.includes('feature-x'));
	runCLI(['rm', 'feature-x', '--base', base], { cwd: dir });
	branches = execSync('git branch', { cwd: dir }).toString();
	assert(!branches.includes('feature-x'));
});

test('rm: -f removes even with uncommitted changes', ({ dir, base }) => {
	initGitRepo(dir);
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	const worktreePath = path.join(base, repoName, 'feature-x');
	fs.writeFileSync(path.join(worktreePath, 'uncommitted.txt'), 'changes');
	const resultNoForce = runCLI(['rm', 'feature-x', '--base', base], { cwd: dir });
	assertExitCode(resultNoForce, 1);
	const resultForce = runCLI(['rm', 'feature-x', '-f', '--base', base], { cwd: dir });
	assertExitCode(resultForce, 0);
});

test('rm: errors when worktree does not exist', ({ dir, base }) => {
	initGitRepo(dir);
	const result = runCLI(['rm', 'nonexistent-branch', '--base', base], { cwd: dir });
	assertExitCode(result, 1);
});

// ============================================================================
// Post-Setup Script Tests
// ============================================================================

test('add: runs .cool-branch-setup when it exists', ({ dir, base }) => {
	initGitRepo(dir);
	fs.writeFileSync(
		path.join(dir, '.cool-branch-setup'),
		`#!/bin/bash
echo "setup ran" > "$1/setup-marker.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add .cool-branch-setup && git commit -m "Add setup script"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, repoName, 'feature-x', 'setup-marker.txt'));
});

test('add: respects --no-setup flag', ({ dir, base }) => {
	initGitRepo(dir);
	fs.writeFileSync(
		path.join(dir, '.cool-branch-setup'),
		`#!/bin/bash
echo "setup ran" > "$1/setup-marker.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add .cool-branch-setup && git commit -m "Add setup script"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--no-setup', '--base', base], { cwd: dir });
	assert(!fs.existsSync(path.join(base, repoName, 'feature-x', 'setup-marker.txt')));
});

test('add: uses custom script with --setup', ({ dir, base }) => {
	initGitRepo(dir);
	fs.writeFileSync(
		path.join(dir, 'custom-setup.sh'),
		`#!/bin/bash
echo "custom setup" > "$1/custom-marker.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add custom-setup.sh && git commit -m "Add custom script"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--setup', 'custom-setup.sh', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, repoName, 'feature-x', 'custom-marker.txt'));
});

test('add: continues if setup script fails', ({ dir, base }) => {
	initGitRepo(dir);
	fs.writeFileSync(
		path.join(dir, '.cool-branch-setup'),
		`#!/bin/bash
exit 1
`,
		{ mode: 0o755 },
	);
	execSync('git add .cool-branch-setup && git commit -m "Add failing script"', { cwd: dir });
	const repoName = path.basename(dir);
	const result = runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assertFileExists(path.join(base, repoName, 'feature-x'));
	assert(result.stdout.includes('Warning') || result.stderr.includes('Warning'));
});

test('add: warns if --setup script does not exist', ({ dir, base }) => {
	initGitRepo(dir);
	const result = runCLI(['add', 'feature-x', '--setup', 'nonexistent.sh', '--base', base], {
		cwd: dir,
	});
	assertExitCode(result, 0);
	assert(result.stdout.includes('Warning') || result.stderr.includes('Warning'));
});

// ============================================================================
// Interactive Mode Tests
// ============================================================================

test('add: still works with branch name after interactive support added', ({ dir, base }) => {
	initGitRepo(dir);
	const result = runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
});

test('rm: still works with branch name after interactive support added', ({ dir, base }) => {
	initGitRepo(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	const result = runCLI(['rm', 'feature-x', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
});

// Run all tests
runTests();
