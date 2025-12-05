# Keytar Secrets - Single File Solution

A single-file secrets manager for macOS Keychain with interactive CLI.

## Design Philosophy

**Single file, zero dependencies** - Just copy one file to your project and you're done.

For each project:
- Copy `src/index.ts` to `src/utils/secrets.ts` (or any location you prefer)
- Change `DEFAULT_SERVICE_NAME` constant to a unique, hard-to-guess random string
- Run `bun i keytar` manually if it is not already installed

That's it! The file contains both the library API and an interactive CLI.

## Core Implementation

See `src/index.ts` - A single file (~350 lines) that includes:
- ✅ Library API for programmatic use
- ✅ Interactive CLI for manual operations
- ✅ Environment variables take priority
- ✅ Keytar (system Keychain) as fallback
- ✅ TypeScript support

## Security Model

Security is enforced through two mechanisms:

1. **Hard-to-guess service name**: Change `DEFAULT_SERVICE_NAME` to a random, difficult-to-guess string
2. **macOS Keychain password protection**: For sensitive keys, remove the "always allow" permission for your program in Keychain Access. This will require password input each time the secret is accessed.

## Configuration

The CLI supports configuration via `.env` files:

```bash
# Optional: Create a .env file in your project directory
KEYTAR_SERVICE_NAME=my-unique-random-service-name-abc123xyz
```

If you set `KEYTAR_SERVICE_NAME` in `.env`, the CLI will use it as the default service name. 

## Usage

### Interactive CLI Mode

Run the file directly to launch the interactive menu:

```bash
bun run src/index.ts
```

You'll see a menu:
```
╔═══════════════════════════════════════╗
║   Keytar Secrets Manager CLI          ║
╚═══════════════════════════════════════╝

What would you like to do?

1. Get secrets
2. Set secrets
3. Delete secrets
4. Convert environment variables to secrets
5. Exit
```

The CLI will prompt you for:
- Service name (defaults to `KEYTAR_SERVICE_NAME` from `.env`)
- Secret names and values
- Confirmation for destructive operations

### Programmatic API

Import and use the library in your code:

```typescript
import { SecretsManager, getSecret, setSecret, deleteSecret, moveEnvToKeytar } from './src/index.ts';

// Option 1: Create a manager instance with your service name
const secrets = new SecretsManager('my-app-xyz123');

// Get a secret (checks env vars first, then keychain)
const apiKey = await secrets.getSecret('API_KEY');

// Set a secret in keychain
await secrets.setSecret('API_KEY', 'secret-value');

// Delete a secret from keychain
await secrets.deleteSecret('API_KEY');

// Convert environment variable to keychain
await secrets.moveEnvToKeytar('DATABASE_URL');

// Option 2: Use default singleton functions (requires KEYTAR_SERVICE_NAME env var)
// Set KEYTAR_SERVICE_NAME in your .env file
const apiKey = await getSecret('API_KEY');
await setSecret('API_KEY', 'secret-value');
await deleteSecret('API_KEY');
await moveEnvToKeytar('DATABASE_URL');
```

### Run Tests

```bash
bun test
```

The test suite includes 8 tests:
- ✅ Set a secret to keychain
- ✅ Get a secret from keychain
- ✅ Environment variable precedence over keychain
- ✅ Delete a secret from keychain
- ✅ Return null for deleted secret
- ✅ Return null for non-existent secret
- ✅ Move environment variable to keychain (moveEnvToKeytar)
- ✅ Retrieve moved secret from keychain

## Using in New Projects

1. Copy `src/index.ts` to your project (e.g., `src/utils/secrets.ts`)
2. Set `KEYTAR_SERVICE_NAME` environment variable to a unique, hard-to-guess random string:
   ```bash
   # In your .env file
   KEYTAR_SERVICE_NAME=my-unique-random-service-name-abc123xyz
   ```
3. Import and use in your code:
   ```typescript
   import { SecretsManager } from './src/utils/secrets.ts';
   const secrets = new SecretsManager('my-service');
   // OR use the singleton functions after setting KEYTAR_SERVICE_NAME env var
   import { getSecret, setSecret } from './src/utils/secrets.ts';
   ```
4. Or run as CLI:
   ```bash
   bun run src/utils/secrets.ts
   ```

That's it! One file, all functionality included.

## Features

- **Single File Solution**: Copy one file, get both API and CLI
- **Interactive CLI**: Menu-driven interface for managing secrets
- **Environment Variable Priority**: Use environment variables in production
- **Keychain Storage**: Use system keychain for local development
- **Service Isolation**: Secrets from different projects don't conflict (using unique service names)
- **Zero npm Dependencies**: No packages needed except keytar itself
- **TypeScript Native**: Full type safety included

## How It Works

1. **Priority System**:
   - First checks environment variables (recommended for production)
   - Then checks system keychain (recommended for local development)
   - Returns null if not found

2. **Service-based Isolation**:
   - Each project uses a unique service name
   - Service names should be hard-to-guess random strings
   - Prevents conflicts between different projects' secrets
   - For maximum security, configure macOS Keychain to require password for sensitive secrets

3. **Dual Mode**:
   - **Library Mode**: Import and use programmatically in your code
   - **CLI Mode**: Run directly with `bun run` for interactive management

## License

MIT
