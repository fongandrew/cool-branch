// Configuration file management for cool-branch
// Manages repo-to-folder mappings stored in <base>/cool-branch.json
// Also supports per-repo config in .cool-branch/config.json

import * as fs from 'node:fs';
import * as path from 'node:path';

import { getOriginUrl, getRepoRoot } from './git';

/**
 * Local config file structure for .cool-branch/config.json
 */
export interface LocalConfig {
	base?: string;
	dirname?: string;
}

/**
 * Parse a config file and extract known fields
 * @param configPath Path to the config file
 * @returns Partial LocalConfig with extracted fields, or empty object if invalid
 */
function parseLocalConfigFile(configPath: string): LocalConfig {
	if (!fs.existsSync(configPath)) {
		return {};
	}

	try {
		const content = fs.readFileSync(configPath, 'utf-8');
		const parsed = JSON.parse(content);
		// Validate and extract only known fields
		const result: LocalConfig = {};
		if (typeof parsed.base === 'string') {
			result.base = parsed.base;
		}
		if (typeof parsed.dirname === 'string') {
			result.dirname = parsed.dirname;
		}
		return result;
	} catch {
		// Invalid JSON or read error - return empty config
		return {};
	}
}

/**
 * Read the local config from .cool-branch/ directory in the repo root
 * Reads both config.json and config.local.json, with local values taking precedence
 * @param cwd Working directory (optional)
 * @returns Local config object, or empty object if not found or invalid
 */
export function readLocalConfig(cwd?: string): LocalConfig {
	const repoRoot = getRepoRoot(cwd);
	if (!repoRoot) {
		return {};
	}

	const coolBranchDir = path.join(repoRoot, '.cool-branch');

	// Read both config files
	const baseConfig = parseLocalConfigFile(path.join(coolBranchDir, 'config.json'));
	const localConfig = parseLocalConfigFile(path.join(coolBranchDir, 'config.local.json'));

	// Merge: local config overrides base config
	return {
		...baseConfig,
		...localConfig,
	};
}

/**
 * Get the path to the config file
 * @param base Base directory for worktrees
 * @returns Path to cool-branch.json
 */
export function getConfigPath(base: string): string {
	return path.join(base, 'cool-branch.json');
}

/**
 * Read the config file
 * @param base Base directory for worktrees
 * @returns Config object mapping repo identifiers to folder names
 * @throws Error if file exists but cannot be parsed
 */
export function readConfig(base: string): Record<string, string> {
	const configPath = getConfigPath(base);

	if (!fs.existsSync(configPath)) {
		return {};
	}

	try {
		const content = fs.readFileSync(configPath, 'utf-8');
		return JSON.parse(content) as Record<string, string>;
	} catch (error) {
		if (error instanceof SyntaxError) {
			throw new Error(`Failed to parse config file at ${configPath}: ${error.message}`);
		}
		throw error;
	}
}

/**
 * Write the config file
 * @param base Base directory for worktrees
 * @param config Config object to write
 */
export function writeConfig(base: string, config: Record<string, string>): void {
	// Create base directory if it doesn't exist
	if (!fs.existsSync(base)) {
		fs.mkdirSync(base, { recursive: true });
	}

	const configPath = getConfigPath(base);
	const content = JSON.stringify(config, null, 2);
	fs.writeFileSync(configPath, content, 'utf-8');
}

/**
 * Get a unique identifier for the current repository
 * Uses origin URL if available, otherwise uses the absolute repo path
 * @param cwd Working directory (optional)
 * @returns Repository identifier string
 * @throws Error if not in a git repository
 */
export function getRepoIdentifier(cwd?: string): string {
	// Try to get origin URL first
	const originUrl = getOriginUrl(cwd);
	if (originUrl) {
		return originUrl;
	}

	// Fall back to absolute repo path
	const repoRoot = getRepoRoot(cwd);
	if (!repoRoot) {
		throw new Error('Not in a git repository');
	}

	return repoRoot;
}

/**
 * Get the folder name for the current repository
 * Looks up the mapping in config, or derives from repo basename and saves it
 * @param base Base directory for worktrees
 * @param cwd Working directory (optional)
 * @param options Optional settings
 * @param options.localDirname If provided, use this dirname (from local config) without saving to global config
 * @returns Folder name to use for this repo's worktrees
 */
export function getRepoFolderName(
	base: string,
	cwd?: string,
	options?: { localDirname?: string },
): string {
	// If local dirname is provided, use it directly without saving to global config
	if (options?.localDirname) {
		return options.localDirname;
	}

	const repoId = getRepoIdentifier(cwd);
	const config = readConfig(base);

	// If mapping exists, return it
	if (config[repoId]) {
		return config[repoId] as string;
	}

	// Otherwise, derive from repo root basename and save it
	const repoRoot = getRepoRoot(cwd);
	if (!repoRoot) {
		throw new Error('Not in a git repository');
	}

	const folderName = path.basename(repoRoot);
	config[repoId] = folderName;
	writeConfig(base, config);

	return folderName;
}

/**
 * Set the folder name mapping for the current repository
 * @param base Base directory for worktrees
 * @param folderName Folder name to use for this repo
 * @param cwd Working directory (optional)
 */
export function setRepoFolderName(base: string, folderName: string, cwd?: string): void {
	const repoId = getRepoIdentifier(cwd);
	const config = readConfig(base);

	config[repoId] = folderName;
	writeConfig(base, config);
}

/**
 * Get the base path for worktrees of the current repository
 * @param base Base directory for worktrees
 * @param cwd Working directory (optional)
 * @param options Optional settings
 * @param options.localDirname If provided, use this dirname (from local config) without saving to global config
 * @returns Path to <base>/<repo-folder-name>
 */
export function getWorktreeBasePath(
	base: string,
	cwd?: string,
	options?: { localDirname?: string },
): string {
	const folderName = getRepoFolderName(base, cwd, options);
	const worktreeBase = path.join(base, folderName);

	// Create directory if it doesn't exist
	if (!fs.existsSync(worktreeBase)) {
		fs.mkdirSync(worktreeBase, { recursive: true });
	}

	return worktreeBase;
}

/**
 * Get the full path for a specific worktree
 * @param base Base directory for worktrees
 * @param branchName Branch name for the worktree
 * @param cwd Working directory (optional)
 * @param options Optional settings
 * @param options.localDirname If provided, use this dirname (from local config) without saving to global config
 * @returns Path to <base>/<repo-folder-name>/<branch-name>
 */
export function getWorktreePath(
	base: string,
	branchName: string,
	cwd?: string,
	options?: { localDirname?: string },
): string {
	const folderName = getRepoFolderName(base, cwd, options);
	return path.join(base, folderName, branchName);
}

/**
 * Expand ~ to home directory in a path
 * @param inputPath Path that may contain ~
 * @returns Path with ~ expanded to home directory
 */
export function expandPath(inputPath: string): string {
	if (inputPath.startsWith('~')) {
		const home = process.env['HOME'] ?? '';
		return path.join(home, inputPath.slice(1));
	}
	return inputPath;
}
