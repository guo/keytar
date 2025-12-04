# @qevan/keytar-secrets

Secure secrets management using system keychain with environment variable fallback.

## Features

- **Environment Variable Priority**: Checks environment variables first for production deployment
- **Keychain Storage**: Falls back to system keychain (macOS Keychain, Windows Credential Vault, Linux Secret Service) for local development
- **Salt-based Service Isolation**: Uses a salt to create unique service scopes
- **TypeScript Support**: Fully typed for better developer experience

## Installation

```bash
npm install @qevan/keytar-secrets
# or
yarn add @qevan/keytar-secrets
# or
bun add @qevan/keytar-secrets
```

## Usage

### Initialize Salt (First Time Setup)

```bash
# Generate random salt
npx keytar-init

# Or provide your own salt
npx keytar-init my-custom-salt
```

### In Your Code

```typescript
import { getSecret, createSecretsManager } from '@qevan/keytar-secrets';

// Option 1: Use default service name
const secret = await getSecret('MY_SECRET_KEY');

// Option 2: Create a custom manager with your service name
const secrets = createSecretsManager('my-app-name');
await secrets.initialize(); // Initialize salt
const mySecret = await secrets.getSecret('MY_SECRET_KEY');
```

### CLI Tools

```bash
# Save environment variable to keychain
npx keytar-save MY_SECRET_KEY ANOTHER_KEY

# Delete secret from keychain
npx keytar-delete my-app-name MY_SECRET_KEY

# Run tests
npx keytar-test
```

## API

### `getSecret(name: string): Promise<string>`
Retrieves a secret by name, checking environment variables first, then keychain.

### `setSecretToKeytar(name: string, value: string): Promise<void>`
Stores a secret in the system keychain.

### `deleteSecretFromKeytar(name: string): Promise<boolean>`
Removes a secret from the system keychain.

### `saveEnvToKeytar(name: string): Promise<boolean>`
Moves an environment variable to the keychain.

### `initializeSalt(newSalt?: string): Promise<string>`
Initializes or retrieves the salt used for service isolation.

### `createSecretsManager(serviceName: string)`
Creates a secrets manager instance with a custom service name.

## How It Works

1. **Priority System**:
   - First checks environment variables (recommended for production)
   - Falls back to system keychain (recommended for local development)
   - Returns empty string if not found

2. **Salt-based Isolation**:
   - Each service uses a unique salt stored in the keychain
   - Prevents conflicts between different applications
   - Salt must be initialized once per service

## License

MIT
