// Constants and utilities for cool-branch directory paths

import * as path from 'node:path';

/**
 * The name of the cool-branch configuration directory
 */
export const COOL_BRANCH_DIR = '.cool-branch';

/**
 * Get the path to the .cool-branch directory for a given repo root
 * @param repoRoot Path to the repository root
 * @returns Absolute path to the .cool-branch directory
 */
export function getCoolBranchDir(repoRoot: string): string {
	return path.join(repoRoot, COOL_BRANCH_DIR);
}

/**
 * Get the path to the config.json file in the .cool-branch directory
 * @param repoRoot Path to the repository root
 * @returns Absolute path to .cool-branch/config.json
 */
export function getCoolBranchConfigPath(repoRoot: string): string {
	return path.join(repoRoot, COOL_BRANCH_DIR, 'config.json');
}

/**
 * Get the path to the config.local.json file in the .cool-branch directory
 * @param repoRoot Path to the repository root
 * @returns Absolute path to .cool-branch/config.local.json
 */
export function getCoolBranchLocalConfigPath(repoRoot: string): string {
	return path.join(repoRoot, COOL_BRANCH_DIR, 'config.local.json');
}
