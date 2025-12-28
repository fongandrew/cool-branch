@user: Set up the initial project scaffolding for the cool-branch CLI tool.

## Requirements

Create the basic project structure with:

1. **package.json** with:
   - Name: `cool-branch`
   - Binary entry point: `cool-branch` -> `dist/index.js`
   - Scripts: `build`, `dev`, `test`, `lint`, `lint:fix`, `typecheck`
   - DevDependencies: `typescript`, `tsup`, `@types/node`, `tsx` (for running tests)
   - Zero runtime dependencies
   - Engine requirement: Node.js >= 18

2. **tsconfig.json** with:
   - Target: ES2022
   - Module: NodeNext
   - Strict mode enabled
   - Output to `dist/`

3. **src/index.ts** with:
   - Shebang line for Node.js execution
   - Basic entry point that prints "cool-branch CLI" for now

4. **Build configuration** (tsup.config.ts or in package.json):
   - Entry: `src/index.ts`
   - Output: `dist/index.js`
   - Format: ESM
   - Clean before build

5. **.gitignore** updates if needed for:
   - `node_modules/`
   - `dist/`

6. **Test script placeholder**:
   - `"test": "tsx test/integration.ts"` in package.json
   - Create empty `test/integration.ts` that just exits 0

## Verification

- `pnpm install` succeeds
- `pnpm run build` produces `dist/index.js`
- `node dist/index.js` runs without error
- `pnpm run typecheck` passes
- `pnpm run lint:fix` passes
- `pnpm test` exits with code 0
---

@claude: I have created the initial project scaffolding for the cool-branch CLI tool. However, I cannot complete verification because network connectivity is unavailable.

Here is a summary of the work I have done:
- Created `src/index.ts` with Node.js shebang and basic "cool-branch CLI" output
- Created `test/integration.ts` as a placeholder test file that exits with code 0
- Updated `package.json` with:
  - Binary entry point: `cool-branch` -> `dist/index.js`
  - Scripts: `build`, `dev`, `test`, `lint`, `lint:fix`, `typecheck`
  - Added `tsx` as a dev dependency (for running tests)
  - Added `type: "module"` for ESM support
  - Added `engines: { "node": ">=18" }`
- Updated `tsconfig.json` with:
  - Module: NodeNext (instead of ESNext)
  - ModuleResolution: NodeNext (instead of bundler)
  - OutDir: ./dist (instead of ./out)
  - Include: test/**/* (instead of tests/**/*)
- Created `tsup.config.ts` with ESM format and clean build configuration
- Updated `.gitignore` to include `dist/`

**BLOCKED**: Network connectivity is unavailable (ENOTFOUND registry.npmjs.org), so I cannot run `pnpm install` to update the lockfile with the new `tsx` dependency and verify the setup.

**To complete verification**, run:
1. `pnpm install` (once network is available)
2. `pnpm run build`
3. `node dist/index.js`
4. `pnpm run typecheck`
5. `pnpm run lint:fix`
6. `pnpm test`
