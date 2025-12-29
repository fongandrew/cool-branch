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

test('bare command shows help', () => {
	const result = runCLI([]);
	assertExitCode(result, 0);
	assert(result.stdout.includes('cool-branch'));
	assert(result.stdout.includes('add'));
	assert(result.stdout.includes('rm'));
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
	const result = runCLI(['list', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assert(result.stdout.includes('main') || result.stdout.includes('master'));
});

test('list: marks current branch with asterisk', ({ dir, base }) => {
	initGitRepo(dir);
	const result = runCLI(['list', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assert(result.stdout.includes('*'));
});

test('list: shows worktree paths for branches with worktrees', ({ dir, base }) => {
	initGitRepo(dir);
	const worktreePath = path.join(base, 'feature-branch');
	addWorktree(worktreePath, 'feature-branch', true, dir);
	const result = runCLI(['list', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assert(result.stdout.includes('feature-branch'));
	assert(result.stdout.includes(base));
});

test('list: shows (no worktree) for branches without worktrees', ({ dir, base }) => {
	initGitRepo(dir);
	execSync('git branch no-worktree-branch', { cwd: dir });
	const result = runCLI(['list', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assert(result.stdout.includes('no worktree'));
});

test('list: errors when not in a git repo', ({ dir, base }) => {
	const result = runCLI(['list', '--base', base], { cwd: dir });
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

test('add: runs cool-branch.sh when it exists', ({ dir, base }) => {
	initGitRepo(dir);
	fs.writeFileSync(
		path.join(dir, 'cool-branch.sh'),
		`#!/bin/bash
echo "setup ran" > "$1/setup-marker.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add cool-branch.sh && git commit -m "Add setup script"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, repoName, 'feature-x', 'setup-marker.txt'));
});

test('add: streams setup script stdout to console', ({ dir, base }) => {
	initGitRepo(dir);
	fs.writeFileSync(
		path.join(dir, 'cool-branch.sh'),
		`#!/bin/bash
echo "Installing dependencies..."
echo "Build complete!"
`,
		{ mode: 0o755 },
	);
	execSync('git add cool-branch.sh && git commit -m "Add setup script"', { cwd: dir });
	const result = runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	assert(result.stdout.includes('Installing dependencies...'), 'Should show setup script stdout');
	assert(result.stdout.includes('Build complete!'), 'Should show setup script stdout');
});

test('add: shows git worktree output', ({ dir, base }) => {
	initGitRepo(dir);
	const result = runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	// Git worktree add outputs "Preparing worktree" message
	assert(
		result.stdout.includes('Preparing') || result.stderr.includes('Preparing'),
		'Should show git worktree output',
	);
});

test('add: runs cool-branch with any extension', ({ dir, base }) => {
	initGitRepo(dir);
	// Use .bash extension to verify any extension works
	fs.writeFileSync(
		path.join(dir, 'cool-branch.bash'),
		`#!/bin/bash
echo "setup ran" > "$1/setup-marker.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add cool-branch.bash && git commit -m "Add setup script"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, repoName, 'feature-x', 'setup-marker.txt'));
});

test('add: runs plain cool-branch file with no extension', ({ dir, base }) => {
	initGitRepo(dir);
	fs.writeFileSync(
		path.join(dir, 'cool-branch'),
		`#!/bin/bash
echo "setup ran" > "$1/setup-marker.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add cool-branch && git commit -m "Add setup script"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, repoName, 'feature-x', 'setup-marker.txt'));
});

test('add: respects --no-setup flag', ({ dir, base }) => {
	initGitRepo(dir);
	fs.writeFileSync(
		path.join(dir, 'cool-branch.sh'),
		`#!/bin/bash
echo "setup ran" > "$1/setup-marker.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add cool-branch.sh && git commit -m "Add setup script"', { cwd: dir });
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

test('add: exits with error if setup script fails', ({ dir, base }) => {
	initGitRepo(dir);
	fs.writeFileSync(
		path.join(dir, 'cool-branch.sh'),
		`#!/bin/bash
echo "This is the error message" >&2
exit 1
`,
		{ mode: 0o755 },
	);
	execSync('git add cool-branch.sh && git commit -m "Add failing script"', { cwd: dir });
	const repoName = path.basename(dir);
	const result = runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	// Should exit with error code
	assertExitCode(result, 1);
	// Worktree should still be created
	assertFileExists(path.join(base, repoName, 'feature-x'));
	// Should show the error output from the script
	assert(
		result.stdout.includes('This is the error message') ||
			result.stderr.includes('This is the error message'),
		'Should show error output from failed script',
	);
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
// Auto-populate Config Tests
// ============================================================================

test('list: auto-populates cool-branch.json with repo mapping', ({ dir, base }) => {
	initGitRepo(dir);
	// Config file should not exist yet
	assert(!fs.existsSync(path.join(base, 'cool-branch.json')));
	// Run list command
	runCLI(['list', '--base', base], { cwd: dir });
	// Config file should now exist with the mapping
	assertFileExists(path.join(base, 'cool-branch.json'));
	const config = JSON.parse(fs.readFileSync(path.join(base, 'cool-branch.json'), 'utf-8'));
	// Should have a mapping for this repo (using repo path as key since no origin)
	assert(Object.keys(config).length > 0, 'Config should have at least one mapping');
	assert(
		Object.values(config).includes(path.basename(dir)),
		'Config should map to repo basename',
	);
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

// ============================================================================
// .cool-branch/setup Script Tests
// ============================================================================

test('add: runs .cool-branch/setup when it exists', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup'),
		`#!/bin/bash
echo "new setup ran" > "$1/setup-marker.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add .cool-branch && git commit -m "Add setup script"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, repoName, 'feature-x', 'setup-marker.txt'));
});

test('add: runs .cool-branch/setup.sh when it exists', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup.sh'),
		`#!/bin/bash
echo "new setup ran" > "$1/setup-marker.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add .cool-branch && git commit -m "Add setup script"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, repoName, 'feature-x', 'setup-marker.txt'));
});

test('add: prefers .cool-branch/setup over legacy cool-branch.sh', ({ dir, base }) => {
	initGitRepo(dir);
	// Create legacy script
	fs.writeFileSync(
		path.join(dir, 'cool-branch.sh'),
		`#!/bin/bash
echo "legacy" > "$1/which-setup.txt"
`,
		{ mode: 0o755 },
	);
	// Create new script
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup'),
		`#!/bin/bash
echo "new" > "$1/which-setup.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add . && git commit -m "Add both scripts"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	const content = fs.readFileSync(
		path.join(base, repoName, 'feature-x', 'which-setup.txt'),
		'utf-8',
	);
	assert(content.includes('new'), 'Should run .cool-branch/setup over legacy');
});

test('add: falls back to legacy cool-branch.sh if no .cool-branch/setup', ({ dir, base }) => {
	initGitRepo(dir);
	fs.writeFileSync(
		path.join(dir, 'cool-branch.sh'),
		`#!/bin/bash
echo "legacy ran" > "$1/setup-marker.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add cool-branch.sh && git commit -m "Add legacy script"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, repoName, 'feature-x', 'setup-marker.txt'));
});

// ============================================================================
// .cool-branch/config.json Tests
// ============================================================================

test('add: uses base from .cool-branch/config.json', ({ dir, base }) => {
	initGitRepo(dir);
	const customBase = path.join(base, 'custom-base');
	fs.mkdirSync(path.join(dir, '.cool-branch'), { recursive: true });
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ base: customBase }),
	);
	execSync('git add .cool-branch && git commit -m "Add config"', { cwd: dir });
	runCLI(['add', 'feature-x'], { cwd: dir });
	const repoName = path.basename(dir);
	assertFileExists(path.join(customBase, repoName, 'feature-x'));
});

test('add: uses dirname from .cool-branch/config.json', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'), { recursive: true });
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ dirname: 'custom-dirname' }),
	);
	execSync('git add .cool-branch && git commit -m "Add config"', { cwd: dir });
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, 'custom-dirname', 'feature-x'));
});

test('add: CLI --base flag overrides .cool-branch/config.json base', ({ dir, base }) => {
	initGitRepo(dir);
	const configBase = path.join(base, 'config-base');
	const cliBase = path.join(base, 'cli-base');
	fs.mkdirSync(path.join(dir, '.cool-branch'), { recursive: true });
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ base: configBase }),
	);
	execSync('git add .cool-branch && git commit -m "Add config"', { cwd: dir });
	runCLI(['add', 'feature-x', '--base', cliBase], { cwd: dir });
	const repoName = path.basename(dir);
	assertFileExists(path.join(cliBase, repoName, 'feature-x'));
	assert(!fs.existsSync(path.join(configBase, repoName, 'feature-x')));
});

test('add: .cool-branch/config.json dirname overrides global config', ({ dir, base }) => {
	initGitRepo(dir);
	// Set global dirname first
	runCLI(['dirname', 'global-name', '--base', base], { cwd: dir });
	// Then set local config
	fs.mkdirSync(path.join(dir, '.cool-branch'), { recursive: true });
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ dirname: 'local-name' }),
	);
	execSync('git add .cool-branch && git commit -m "Add config"', { cwd: dir });
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, 'local-name', 'feature-x'));
	assert(!fs.existsSync(path.join(base, 'global-name', 'feature-x')));
});

test('config: works without .cool-branch/config.json', ({ dir, base }) => {
	initGitRepo(dir);
	// No .cool-branch directory
	const result = runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertExitCode(result, 0);
	const repoName = path.basename(dir);
	assertFileExists(path.join(base, repoName, 'feature-x'));
});

test('config: .cool-branch/config.json dirname does not update global config', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'), { recursive: true });
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ dirname: 'local-dirname' }),
	);
	execSync('git add .cool-branch && git commit -m "Add config"', { cwd: dir });
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	// Global config should NOT contain the local dirname
	// It may not exist at all (which is fine) or exist but not contain local-dirname
	const globalConfigPath = path.join(base, 'cool-branch.json');
	if (fs.existsSync(globalConfigPath)) {
		const globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, 'utf-8'));
		assert(
			!Object.values(globalConfig).includes('local-dirname'),
			'Global config should not be updated with local dirname',
		);
	}
	// If global config doesn't exist, that's also fine - it means local dirname didn't leak
});

// ============================================================================
// Local Variant Tests (.local. files)
// ============================================================================

// Setup local variant tests
test('add: runs setup.local instead of setup when both exist', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	// Regular setup
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup'),
		`#!/bin/bash
echo "regular" > "$1/which-setup.txt"
`,
		{ mode: 0o755 },
	);
	// Local setup
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup.local'),
		`#!/bin/bash
echo "local" > "$1/which-setup.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add .cool-branch/setup && git commit -m "Add setup"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	const content = fs.readFileSync(
		path.join(base, repoName, 'feature-x', 'which-setup.txt'),
		'utf-8',
	);
	assert(content.includes('local'), 'Should run local setup only');
});

test('add: runs setup.local.sh with extension', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup.local.sh'),
		`#!/bin/bash
echo "local ran" > "$1/setup-marker.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add .cool-branch && git commit -m "Add dir"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, repoName, 'feature-x', 'setup-marker.txt'));
});

test('add: falls back to regular setup when no local exists', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup'),
		`#!/bin/bash
echo "regular ran" > "$1/setup-marker.txt"
`,
		{ mode: 0o755 },
	);
	execSync('git add .cool-branch && git commit -m "Add setup"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, repoName, 'feature-x', 'setup-marker.txt'));
});

// Config local variant tests
test('add: config.local.json overrides config.json values', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ dirname: 'from-config' }),
	);
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.local.json'),
		JSON.stringify({ dirname: 'from-local' }),
	);
	execSync('git add .cool-branch/config.json && git commit -m "Add config"', { cwd: dir });
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, 'from-local', 'feature-x'));
});

test('add: config.local.json falls back to config.json for missing keys', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ dirname: 'from-config' }),
	);
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.local.json'),
		JSON.stringify({}), // Empty local config
	);
	execSync('git add .cool-branch/config.json && git commit -m "Add config"', { cwd: dir });
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, 'from-config', 'feature-x'));
});

test('add: uses only config.json when no local exists', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ dirname: 'from-config' }),
	);
	execSync('git add .cool-branch && git commit -m "Add config"', { cwd: dir });
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	assertFileExists(path.join(base, 'from-config', 'feature-x'));
});

// ============================================================================
// Copy Config Tests (.cool-branch directory copying)
// ============================================================================

test('add: copies local files by default', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup.local.sh'),
		'#!/bin/bash\necho "local"',
		{ mode: 0o755 },
	);
	fs.writeFileSync(path.join(dir, '.cool-branch', 'config.local.json'), '{}');
	fs.writeFileSync(path.join(dir, '.cool-branch', 'setup.sh'), '#!/bin/bash\necho "regular"', {
		mode: 0o755,
	});
	execSync('git add .cool-branch/setup.sh && git commit -m "Add setup"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	const worktreePath = path.join(base, repoName, 'feature-x');
	// Local files should be copied
	assertFileExists(path.join(worktreePath, '.cool-branch', 'setup.local.sh'));
	assertFileExists(path.join(worktreePath, '.cool-branch', 'config.local.json'));
	// Non-local file should NOT be copied (it comes from git)
});

test('add: --copy-config=all copies everything', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(path.join(dir, '.cool-branch', 'custom-file.txt'), 'custom content');
	fs.writeFileSync(path.join(dir, '.cool-branch', 'setup.local'), '#!/bin/bash\necho "local"', {
		mode: 0o755,
	});
	execSync('git add .cool-branch && git commit -m "Add cool-branch dir"', { cwd: dir });
	// Add an untracked file after commit
	fs.writeFileSync(path.join(dir, '.cool-branch', 'untracked.txt'), 'untracked');
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base, '--copy-config', 'all'], { cwd: dir });
	const worktreePath = path.join(base, repoName, 'feature-x');
	assertFileExists(path.join(worktreePath, '.cool-branch', 'untracked.txt'));
	assertFileExists(path.join(worktreePath, '.cool-branch', 'setup.local'));
});

test('add: --copy-config=none copies nothing', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	// Create a non-local file and commit it (to ensure .cool-branch exists in git)
	fs.writeFileSync(path.join(dir, '.cool-branch', 'setup.sh'), '#!/bin/bash\necho "regular"', {
		mode: 0o755,
	});
	execSync('git add .cool-branch && git commit -m "Add dir"', { cwd: dir });
	// Create a local file AFTER commit (not tracked by git)
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup.local.sh'),
		'#!/bin/bash\necho "local"',
		{ mode: 0o755 },
	);
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base, '--copy-config', 'none'], { cwd: dir });
	const worktreePath = path.join(base, repoName, 'feature-x');
	// Local files should NOT be copied when mode is 'none'
	assert(!fs.existsSync(path.join(worktreePath, '.cool-branch', 'setup.local.sh')));
});

test('add: copyConfig in config.json controls copy behavior', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ copyConfig: 'none' }),
	);
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup.local.sh'),
		'#!/bin/bash\necho "local"',
		{ mode: 0o755 },
	);
	execSync('git add .cool-branch/config.json && git commit -m "Add config"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base], { cwd: dir });
	const worktreePath = path.join(base, repoName, 'feature-x');
	assert(!fs.existsSync(path.join(worktreePath, '.cool-branch', 'setup.local.sh')));
});

test('add: --copy-config flag overrides config.json copyConfig', ({ dir, base }) => {
	initGitRepo(dir);
	fs.mkdirSync(path.join(dir, '.cool-branch'));
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'config.json'),
		JSON.stringify({ copyConfig: 'none' }),
	);
	fs.writeFileSync(
		path.join(dir, '.cool-branch', 'setup.local.sh'),
		'#!/bin/bash\necho "local"',
		{ mode: 0o755 },
	);
	execSync('git add .cool-branch/config.json && git commit -m "Add config"', { cwd: dir });
	const repoName = path.basename(dir);
	runCLI(['add', 'feature-x', '--base', base, '--copy-config', 'local'], { cwd: dir });
	const worktreePath = path.join(base, repoName, 'feature-x');
	assertFileExists(path.join(worktreePath, '.cool-branch', 'setup.local.sh'));
});

// Run all tests
runTests();
