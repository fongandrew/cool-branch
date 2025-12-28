// Interactive prompt utilities for cool-branch
// Uses only Node.js built-ins (readline)

import * as readline from 'node:readline';

/**
 * Prompt for a single line of input
 * @param message The prompt message to display
 * @returns The user's input
 */
export async function promptLine(message: string): Promise<string> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		rl.question(message, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

/**
 * Prompt for confirmation (yes/no)
 * @param message The prompt message to display
 * @param defaultNo If true, default is No [y/N]; otherwise default is Yes [Y/n]
 * @returns True if user confirmed, false otherwise
 */
export async function promptConfirm(message: string, defaultNo = true): Promise<boolean> {
	const suffix = defaultNo ? ' [y/N] ' : ' [Y/n] ';
	const answer = await promptLine(message + suffix);

	if (answer === '') {
		return !defaultNo;
	}

	return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

/**
 * Result from promptSelect - either the index of selected option or raw text input
 */
export type SelectResult = { type: 'index'; value: number } | { type: 'text'; value: string };

/**
 * Display numbered options and prompt for selection
 * @param message The prompt message to display
 * @param options Array of option strings to display
 * @returns The selected index (0-based) or raw text if not a number
 */
export async function promptSelect(message: string, options: string[]): Promise<SelectResult> {
	console.log(message);
	options.forEach((option, index) => {
		console.log(`${index + 1}) ${option}`);
	});

	const answer = await promptLine('> ');

	// Try to parse as a number
	const num = parseInt(answer, 10);
	if (!isNaN(num) && num >= 1 && num <= options.length) {
		return { type: 'index', value: num - 1 };
	}

	// Return raw text
	return { type: 'text', value: answer };
}

/**
 * Parse a multi-selection input (space or comma separated numbers)
 * @param input The user's input string
 * @param maxIndex The maximum valid index (1-based)
 * @returns Array of valid indices (0-based) or null if any input is invalid
 */
export function parseMultiSelect(input: string, maxIndex: number): number[] | null {
	// Split by comma or space
	const parts = input.split(/[,\s]+/).filter((p) => p.length > 0);

	if (parts.length === 0) {
		return null;
	}

	const indices: number[] = [];
	for (const part of parts) {
		const num = parseInt(part, 10);
		if (isNaN(num) || num < 1 || num > maxIndex) {
			return null;
		}
		indices.push(num - 1);
	}

	// Remove duplicates and sort
	return [...new Set(indices)].sort((a, b) => a - b);
}

/**
 * Display numbered options and prompt for multi-selection
 * @param message The prompt message to display
 * @param options Array of option strings to display
 * @returns Array of selected indices (0-based) or null if invalid selection
 */
export async function promptMultiSelect(
	message: string,
	options: string[],
): Promise<number[] | null> {
	console.log(message);
	options.forEach((option, index) => {
		console.log(`${index + 1}) ${option}`);
	});

	const answer = await promptLine('> ');
	return parseMultiSelect(answer, options.length);
}

/**
 * Check if stdin is a TTY (interactive terminal)
 * @returns True if running in an interactive terminal
 */
export function isInteractive(): boolean {
	return process.stdin.isTTY === true;
}
