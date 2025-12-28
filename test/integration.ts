// Integration tests for cool-branch CLI

import { runCLI } from './helpers.js';

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

test('CLI runs without error', () => {
	const result = runCLI(['--help']);
	// For now, just verify it doesn't crash
	// This test will be updated once --help is implemented
	// The CLI runs and returns some output (even if it's just the default message)
	if (result.exitCode !== 0 && result.stderr) {
		throw new Error(`CLI crashed with: ${result.stderr}`);
	}
});

// Run all tests
run();
