// Integration tests for cool-branch CLI

import assert from 'node:assert';

import { assertExitCode, runCLI } from './helpers.js';

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

// Run all tests
run();
