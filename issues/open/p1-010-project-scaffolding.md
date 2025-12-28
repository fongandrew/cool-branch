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
