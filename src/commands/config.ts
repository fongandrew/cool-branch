// Config command - get and set config values in .cool-branch/config.json

import * as fs from 'node:fs';
import * as path from 'node:path';

import { COOL_BRANCH_DIR } from '../constants';
import { getRepoRoot } from '../git';

/**
 * Supported config keys
 */
export type ConfigKey = 'dirname' | 'base' | 'copyConfig';

/**
 * Valid copyConfig values
 */
const VALID_COPY_CONFIG_VALUES = ['all', 'none', 'local'];

/**
 * Options for the config command
 */
export interface ConfigOptions {
	base: string;
	key: string | undefined;
	value: string | undefined;
	local: boolean;
	unset: boolean;
}

/**
 * Get the path to the config file
 * @param repoRoot Repository root path
 * @param local Whether to use the local config file
 * @returns Path to the config file
 */
function getConfigFilePath(repoRoot: string, local: boolean): string {
	const filename = local ? 'config.local.json' : 'config.json';
	return path.join(repoRoot, COOL_BRANCH_DIR, filename);
}

/**
 * Read a config file
 * @param configPath Path to the config file
 * @returns Config object
 */
function readConfigFile(configPath: string): Record<string, unknown> {
	if (!fs.existsSync(configPath)) {
		return {};
	}
	try {
		const content = fs.readFileSync(configPath, 'utf-8');
		return JSON.parse(content);
	} catch {
		return {};
	}
}

/**
 * Write a config file
 * @param configPath Path to the config file
 * @param config Config object to write
 */
function writeConfigFile(configPath: string, config: Record<string, unknown>): void {
	// Create .cool-branch directory if it doesn't exist
	const dir = path.dirname(configPath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Validate a config value
 * @param key Config key
 * @param value Config value
 * @returns Error message if invalid, undefined if valid
 */
function validateConfigValue(key: string, value: string): string | undefined {
	if (key === 'copyConfig' && !VALID_COPY_CONFIG_VALUES.includes(value)) {
		return `Invalid value for copyConfig: "${value}". Must be one of: ${VALID_COPY_CONFIG_VALUES.join(', ')}`;
	}
	return undefined;
}

/**
 * Get the merged config (config.json + config.local.json, local overrides)
 * @param repoRoot Repository root path
 * @returns Merged config object
 */
function getMergedConfig(repoRoot: string): Record<string, unknown> {
	const baseConfig = readConfigFile(getConfigFilePath(repoRoot, false));
	const localConfig = readConfigFile(getConfigFilePath(repoRoot, true));
	return { ...baseConfig, ...localConfig };
}

/**
 * Config command handler
 * @param options Command options
 */
export function configCommand(options: ConfigOptions): void {
	// Validate context - ensure we're in a git repository
	const repoRoot = getRepoRoot();
	if (repoRoot === null) {
		console.error('Error: Not in a git repository');
		process.exit(1);
	}

	const configPath = getConfigFilePath(repoRoot, options.local);

	// --unset mode: remove a key
	if (options.unset) {
		if (!options.key) {
			console.error('Error: Key is required with --unset');
			process.exit(1);
		}
		const config = readConfigFile(configPath);
		if (options.key in config) {
			delete config[options.key];
			writeConfigFile(configPath, config);
			console.log(`Removed "${options.key}" from config`);
		} else {
			console.log(`Key "${options.key}" not found in config`);
		}
		return;
	}

	// No key: list all config
	if (options.key === undefined) {
		const mergedConfig = getMergedConfig(repoRoot);
		if (Object.keys(mergedConfig).length === 0) {
			console.log('No config values set.');
		} else {
			for (const [key, value] of Object.entries(mergedConfig)) {
				console.log(`${key}=${String(value)}`);
			}
		}
		return;
	}

	// Key but no value: get a specific key
	if (options.value === undefined) {
		const mergedConfig = getMergedConfig(repoRoot);
		const value = mergedConfig[options.key];
		if (value !== undefined) {
			console.log(String(value));
		} else {
			console.log(`Key "${options.key}" not found`);
		}
		return;
	}

	// Key and value: set a specific key
	const validationError = validateConfigValue(options.key, options.value);
	if (validationError) {
		console.error(`Error: ${validationError}`);
		process.exit(1);
	}

	const config = readConfigFile(configPath);
	config[options.key] = options.value;
	writeConfigFile(configPath, config);
	console.log(`Set ${options.key}=${options.value}`);
}
