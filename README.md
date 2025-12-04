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

## Configuration

All utility scripts now support configuration via `.env` files. Create a `.env` file in your project directory:

```bash
# Copy the example file
cp .env.example .env

# Edit with your values
KEYTAR_SERVICE_NAME=my-app
KEYTAR_SALT_KEY=salt-key
```

### Cross-Repository Usage

**Important**: When you run the keytar scripts from another repository, they will automatically use the `.env` file from the directory where you execute them.

For example, if you're in the `rocket-mining` repository and run:
```bash
bun run ../keytar/bin/save-env.ts API_KEY SECRET_KEY
```

The script will read `KEYTAR_SERVICE_NAME` and `KEYTAR_SALT_KEY` from `rocket-mining/.env`, not from `keytar/.env`.

This allows you to:
- Keep secrets configuration in each project's own `.env` file
- Use the same keytar scripts across multiple projects
- Avoid hardcoding service names and salt keys in scripts

Please always use `bun` for running the scripts and bun to run the code, because keytar is stored and isolated between processes. 

## Utility Scripts

Common management scripts in the `bin/` directory (TypeScript):

### 1. Initialize Salt
```bash
# With .env configuration (recommended)
bun run bin/initialize.ts

# Or with explicit arguments
bun run bin/initialize.ts <SERVICE_NAME> [SALT_KEY] [SALT_VALUE]
```

### 2. Save Environment Variables to Keychain
```bash
# With .env configuration (recommended)
bun run bin/save-env.ts <ENV_VAR_1> [ENV_VAR_2] ...

# Or with explicit service name
bun run bin/save-env.ts <SERVICE_NAME> <ENV_VAR_1> [ENV_VAR_2] ...

# Or with explicit service name and salt key
bun run bin/save-env.ts <SERVICE_NAME> <SALT_KEY> <ENV_VAR_1> [ENV_VAR_2] ...
```

### 3. Set Secret Directly
```bash
# With .env configuration (recommended)
bun run bin/set-secret.ts <SECRET_NAME> <SECRET_VALUE> [SECRET_NAME_2] [SECRET_VALUE_2] ...

# Or with explicit service name
bun run bin/set-secret.ts <SERVICE_NAME> <SECRET_NAME> <SECRET_VALUE>
```

### 4. Delete Secret
```bash
# With .env configuration (recommended)
bun run bin/delete.ts <KEY_NAME>

# Or with explicit service name
bun run bin/delete.ts <SERVICE_NAME> <KEY_NAME>
```

### 5. Run Tests
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
