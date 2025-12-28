// Dirname command - view and set folder name mapping for a repository

import * as path from 'node:path';

import { getRepoFolderName, getRepoIdentifier, readConfig, setRepoFolderName } from '../config.js';
import { getRepoRoot } from '../git.js';

/**
 * Options for the dirname command
 */
export interface DirnameOptions {
	base: string;
	folderName: string | undefined; // undefined = read mode, string = write mode
}

/**
 * Validate folder name is safe for use as a directory name
 * @param name Folder name to validate
 * @returns True if valid
 */
function isValidFolderName(name: string): boolean {
	// Reject empty names
	if (!name || name.length === 0) {
		return false;
	}

	// Reject path separators
	if (name.includes('/') || name.includes('\\')) {
		return false;
	}

	// Reject special characters that are problematic on various filesystems
	// Check for characters <, >, :, ", |, ?, * and control characters (0x00-0x1F)
	const invalidChars = ['<', '>', ':', '"', '|', '?', '*'];
	if (invalidChars.some((char) => name.includes(char))) {
		return false;
	}

	// Check for control characters (0x00-0x1F)
	for (let i = 0; i < name.length; i++) {
		const code = name.charCodeAt(i);
		if (code <= 0x1f) {
			return false;
		}
	}

	// Reject reserved names on Windows
	const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
	if (reservedNames.test(name)) {
		return false;
	}

	// Reject names that start or end with space or period
	if (name.startsWith(' ') || name.endsWith(' ') || name.startsWith('.') || name.endsWith('.')) {
		return false;
	}

	return true;
}

/**
 * Get the default folder name for the current repository
 * @param cwd Working directory (optional)
 * @returns Default folder name (basename of repo root)
 */
function getDefaultFolderName(cwd?: string): string {
	const repoRoot = getRepoRoot(cwd);
	if (!repoRoot) {
		throw new Error('Not in a git repository');
	}
	return path.basename(repoRoot);
}

/**
 * Check if a custom mapping exists for the current repository
 * @param base Base directory for worktrees
 * @param cwd Working directory (optional)
 * @returns True if a custom mapping exists
 */
function hasCustomMapping(base: string, cwd?: string): boolean {
	const repoId = getRepoIdentifier(cwd);
	const config = readConfig(base);
	return repoId in config;
}

/**
 * View or set the folder name mapping for the current repository
 * @param options Command options
 */
export function dirnameCommand(options: DirnameOptions): void {
	// Validate context - ensure we're in a git repository
	const repoRoot = getRepoRoot();
	if (repoRoot === null) {
		console.error('Error: Not in a git repository');
		process.exit(1);
	}

	if (options.folderName !== undefined) {
		// Write mode - set the folder name mapping

		// Validate folder name
		if (!isValidFolderName(options.folderName)) {
			console.error(`Error: Invalid folder name: ${options.folderName}`);
			console.error('Folder name must not contain path separators or special characters.');
			process.exit(1);
		}

		// Check if there's an existing mapping (warn user)
		if (hasCustomMapping(options.base)) {
			const currentName = getRepoFolderName(options.base);
			console.log(
				`Warning: Changing folder name from '${currentName}' to '${options.folderName}'`,
			);
			console.log('Existing worktrees will not be moved.');
		}

		// Set the mapping
		setRepoFolderName(options.base, options.folderName);

		// Print confirmation
		console.log(`Folder name set to: ${options.folderName}`);
		console.log(
			`Worktrees will be created at: ${path.join(options.base, options.folderName)}/`,
		);
	} else {
		// Read mode - show the current folder name
		const folderName = getRepoFolderName(options.base);
		const defaultName = getDefaultFolderName();

		if (hasCustomMapping(options.base)) {
			// Custom mapping exists
			console.log(`Folder name: ${folderName}`);
			console.log(`Worktrees at: ${path.join(options.base, folderName)}/`);
		} else {
			// Using default
			console.log(`No custom mapping. Using default: ${defaultName}`);
			console.log(`Worktrees at: ${path.join(options.base, defaultName)}/`);
		}
	}
}
