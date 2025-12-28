# Network Unavailable (ENOTFOUND registry.npmjs.org)

## Symptom
`pnpm install` fails with:
```
ENOTFOUND registry.npmjs.org
```

## Cause
Network connectivity to npm registry is unavailable.

## Resolution
If you've modified `package.json` and the lockfile is out of sync:
1. Move the issue to `issues/stuck/` with a clear explanation
2. Wait for network to become available
3. Run `pnpm install` to update the lockfile

If the lockfile is already in sync:
- Try `pnpm install --offline` to use cached packages
- Try `CI=true pnpm install --offline` in CI environments
