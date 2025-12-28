// Test helpers for cool-branch CLI integration tests

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/**
 * Create a unique temp directory for testing
 * @returns The path to the created temp directory
 */
export function createTempDir(): string {
  const tempBase = os.tmpdir();
  const uniqueDir = `cool-branch-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const tempDir = path.join(tempBase, uniqueDir);
  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

/**
 * Recursively remove a temp directory
 * @param dir The directory to remove
 */
export function cleanupTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Initialize a git repo with an initial commit
 * @param dir The directory to initialize
 * @param options Optional settings (bare: create a bare repo)
 */
export function initGitRepo(dir: string, options?: { bare?: boolean }): void {
  const gitOpts = { cwd: dir, encoding: "utf-8" as const };

  if (options?.bare) {
    execSync("git init --bare", gitOpts);
  } else {
    execSync("git init", gitOpts);
    // Configure user for commits
    execSync('git config user.name "Test User"', gitOpts);
    execSync('git config user.email "test@example.com"', gitOpts);
    // Create initial commit
    const readmePath = path.join(dir, "README.md");
    fs.writeFileSync(readmePath, "# Test Repository\n");
    execSync("git add .", gitOpts);
    execSync('git commit -m "Initial commit"', gitOpts);
  }
}

/**
 * Result from running the CLI
 */
export interface CLIResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run the built CLI with given arguments
 * @param args Command line arguments
 * @param options Optional settings (cwd: working directory)
 * @returns Object with stdout, stderr, and exitCode
 */
export function runCLI(
  args: string[],
  options?: { cwd?: string },
): CLIResult {
  const cliPath = path.resolve(
    import.meta.dirname,
    "..",
    "dist",
    "index.js",
  );
  const command = `node "${cliPath}" ${args.join(" ")}`;

  try {
    const stdout = execSync(command, {
      cwd: options?.cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return {
      stdout,
      stderr: "",
      exitCode: 0,
    };
  } catch (error) {
    const execError = error as {
      stdout?: string;
      stderr?: string;
      status?: number;
    };
    return {
      stdout: execError.stdout ?? "",
      stderr: execError.stderr ?? "",
      exitCode: execError.status ?? 1,
    };
  }
}

/**
 * Assert that a file exists
 * @param filePath Path to the file
 * @throws Error if file doesn't exist
 */
export function assertFileExists(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Expected file to exist: ${filePath}`);
  }
}

/**
 * Assert that a file contains a specific string
 * @param filePath Path to the file
 * @param content String that should be in the file
 * @throws Error if file doesn't contain the string
 */
export function assertFileContains(filePath: string, content: string): void {
  assertFileExists(filePath);
  const fileContent = fs.readFileSync(filePath, "utf-8");
  if (!fileContent.includes(content)) {
    throw new Error(
      `Expected file ${filePath} to contain "${content}", but it contains: ${fileContent}`,
    );
  }
}

/**
 * Assert that a CLI result has the expected exit code
 * @param result The CLI result object
 * @param expected The expected exit code
 * @throws Error if exit code doesn't match
 */
export function assertExitCode(
  result: { exitCode: number },
  expected: number,
): void {
  if (result.exitCode !== expected) {
    throw new Error(
      `Expected exit code ${expected}, but got ${result.exitCode}`,
    );
  }
}
