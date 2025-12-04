# Keytar Secrets - Utility Scripts & Examples

A utility scripts and examples repository for managing keytar-based secret storage.

## Design Philosophy

**No npm package dependencies** - The code is simple enough to copy directly into your projects.

For each project:
- Copy `src/index.ts` to `src/utils/secrets/index.ts`
- Change `SERVICE_NAME` to your project name
- Change `SALT_KEY` to a random key. (this is used to store the real salt)
- Copy utility scripts from `bin/` as needed

## Core Implementation

See `src/index.ts` - includes complete implementation:
- ✅ Environment variables take priority
- ✅ Keytar (system Keychain) as fallback
- ✅ Salt-based service isolation
- ✅ TypeScript support

## Utility Scripts

Common management scripts in the `bin/` directory (TypeScript):

### 1. Initialize Salt
```bash
bun run bin/initialize.ts <SERVICE_NAME> [SALT_VALUE]
```

### 2. Save Environment Variables to Keychain
```bash
bun run bin/save.ts <SERVICE_NAME> <ENV_VAR_1> [ENV_VAR_2] ...
```

### 3. Delete Secret
```bash
bun run bin/delete.ts <SERVICE_NAME> <KEY_NAME>
```

### 4. Run Tests
```bash
bun run bin/test.ts
```

## Using in New Projects

1. Copy `src/index.ts` to your project
2. Change the `SERVICE_NAME` constant
3. (Optional) Copy needed utility scripts

Example:
```typescript
// your-project/src/utils/secrets/index.ts
import crypto from "crypto";

const SERVICE_NAME = "your-project-name"; // Change this
const SALT_KEY = "change-me";

// ... copy rest of the code ...
```

## Features

- **Environment Variable Priority**: Use environment variables in production
- **Keychain Storage**: Use system keychain for local development
- **Salt Isolation**: Secrets from different projects don't conflict
- **Zero Dependencies**: No packages needed except keytar itself

## How It Works

1. **Priority System**:
   - First checks environment variables (recommended for production)
   - Then checks system keychain (recommended for local development)
   - Returns empty string if not found

2. **Salt-based Isolation**:
   - Each service uses a unique salt
   - Stored in keychain
   - Prevents conflicts between different projects' secrets

## License

MIT
