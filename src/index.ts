const DEFAULT_SERVICE_NAME = "keytar-secrets";

/**
 * Secrets manager for handling secure credential storage
 */
export class SecretsManager {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Get a secret:
   * 1. Check environment variables first (e.g., DB_PASSWORD)
   * 2. If not found, try reading from keytar (macOS Keychain)
   * 3. If not found or keytar fails, log warning and return empty string
   */
  async getSecret(name: string): Promise<string> {
    // 1. Priority: Environment variables (Recommended for production)
    const fromEnv = process.env[name];
    if (fromEnv && fromEnv.trim() !== "") {
      return fromEnv;
    }

    // 2. Try Keytar
    try {
      const keytar = await import("keytar");
      const value = await keytar.getPassword(this.serviceName, name);
      if (value) {
        return value;
      }
    } catch (err: any) {
      // Keytar not installed or failed to load
      console.warn(`[Secrets] Keytar not available or failed to load for '${name}': ${err.message || err}`);
      return "";
    }

    // 3. Not found in Env or Keytar
    console.warn(`[Secrets] Warning: Secret '${name}' not found in environment variables or system keychain.`);
    return "";
  }

  /**
   * Set a secret in the local keychain (Development only)
   */
  async setSecretToKeytar(name: string, value: string): Promise<void> {
    let keytar: typeof import("keytar");
    try {
      keytar = await import("keytar");
    } catch (err) {
      throw new Error(`keytar not available. Cannot set secret.\nOriginal error: ${err}`);
    }
    await keytar.setPassword(this.serviceName, name, value);
  }

  /**
   * Delete a secret from the local keychain (Development only)
   */
  async deleteSecretFromKeytar(name: string): Promise<boolean> {
    let keytar: typeof import("keytar");
    try {
      keytar = await import("keytar");
    } catch (err) {
      throw new Error(`keytar not available. Cannot delete secret.\nOriginal error: ${err}`);
    }
    return await keytar.deletePassword(this.serviceName, name);
  }

  /**
   * Move a secret from environment variables to the local keychain.
   * If the environment variable exists, it is saved to the keychain.
   * Returns true if successful, false if the env var was missing or keytar failed.
   */
  async saveEnvToKeytar(name: string): Promise<boolean> {
    const value = process.env[name];
    if (!value || value.trim() === "") {
      console.warn(`[Secrets] Environment variable '${name}' is missing or empty. Cannot move to keychain.`);
      return false;
    }

    try {
      await this.setSecretToKeytar(name, value);
      console.log(`[Secrets] Successfully moved '${name}' from environment to keychain.`);
      return true;
    } catch (err: any) {
      console.error(`[Secrets] Failed to move '${name}' to keychain: ${err.message || err}`);
      return false;
    }
  }

}

// Default instance for backwards compatibility
const defaultManager = new SecretsManager(DEFAULT_SERVICE_NAME);

/**
 * Create a secrets manager with a custom service name
 */
export function createSecretsManager(serviceName: string): SecretsManager {
  return new SecretsManager(serviceName);
}

// Export default functions for convenience
export const getSecret = (name: string) => defaultManager.getSecret(name);
export const setSecretToKeytar = (name: string, value: string) => defaultManager.setSecretToKeytar(name, value);
export const deleteSecretFromKeytar = (name: string) => defaultManager.deleteSecretFromKeytar(name);
export const saveEnvToKeytar = (name: string) => defaultManager.saveEnvToKeytar(name);

// ============================================================================
// CLI Utilities
// ============================================================================

import * as readline from 'readline';

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ============================================================================
// CLI Commands
// ============================================================================

async function cliGetSecrets() {
  console.log('\n=== Get Secrets from Keytar ===\n');

  const envServiceName = process.env.KEYTAR_SERVICE_NAME;
  let serviceName = await prompt(`Enter service name${envServiceName ? ` (default: ${envServiceName})` : ''}: `);
  if (!serviceName) {
    serviceName = envServiceName || '';
  }
  if (!serviceName) {
    console.error('Error: Service name is required');
    return;
  }

  const secretNameInput = await prompt('Enter secret names to retrieve (comma-separated): ');
  if (!secretNameInput) {
    console.error('Error: At least one secret name is required');
    return;
  }
  const secretNames = secretNameInput.split(',').map(v => v.trim()).filter(v => v);

  const manager = createSecretsManager(serviceName);

  console.log('');
  for (const secretName of secretNames) {
    try {
      const secretValue = await manager.getSecret(secretName);
      if (secretValue) {
        console.log(`${secretName}: ${secretValue}`);
      } else {
        console.error(`✗ Secret '${secretName}' not found`);
      }
    } catch (err: any) {
      console.error(`✗ Error retrieving secret '${secretName}': ${err.message || err}`);
    }
  }
}

async function cliSetSecrets() {
  console.log('\n=== Set Secrets in Keytar ===\n');

  const envServiceName = process.env.KEYTAR_SERVICE_NAME;
  let serviceName = await prompt(`Enter service name${envServiceName ? ` (default: ${envServiceName})` : ''}: `);
  if (!serviceName) {
    serviceName = envServiceName || '';
  }
  if (!serviceName) {
    console.error('Error: Service name is required');
    return;
  }

  const manager = createSecretsManager(serviceName);
  const secrets: Array<{ name: string; value: string }> = [];

  let addMore = true;
  while (addMore) {
    const secretName = await prompt('\nEnter secret name: ');
    if (!secretName) {
      console.error('Error: Secret name is required');
      continue;
    }

    const secretValue = await prompt('Enter secret value: ');
    if (!secretValue) {
      console.error('Error: Secret value is required');
      continue;
    }

    secrets.push({ name: secretName, value: secretValue });

    const more = await prompt('\nAdd another secret? (y/n): ');
    addMore = more.toLowerCase() === 'y' || more.toLowerCase() === 'yes';
  }

  if (secrets.length === 0) {
    console.error('Error: At least one secret is required');
    return;
  }

  console.log('');
  for (const secret of secrets) {
    try {
      await manager.setSecretToKeytar(secret.name, secret.value);
      console.log(`✓ Successfully saved '${secret.name}'`);
    } catch (err: any) {
      console.error(`✗ Failed to save '${secret.name}': ${err.message || err}`);
    }
  }
}

async function cliDeleteSecrets() {
  console.log('\n=== Delete Secrets from Keytar ===\n');

  const envServiceName = process.env.KEYTAR_SERVICE_NAME;
  let serviceName = await prompt(`Enter service name${envServiceName ? ` (default: ${envServiceName})` : ''}: `);
  if (!serviceName) {
    serviceName = envServiceName || '';
  }
  if (!serviceName) {
    console.error('Error: Service name is required');
    return;
  }

  const secretNameInput = await prompt('Enter secret names to delete (comma-separated): ');
  if (!secretNameInput) {
    console.error('Error: At least one secret name is required');
    return;
  }
  const secretNames = secretNameInput.split(',').map(v => v.trim()).filter(v => v);

  console.log('\nSecrets to delete:');
  secretNames.forEach(name => console.log(`  - ${name}`));
  const confirm = await prompt('\nAre you sure you want to delete these secrets? (y/n): ');
  if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
    console.log('Deletion cancelled.');
    return;
  }

  const manager = createSecretsManager(serviceName);

  for (const secretName of secretNames) {
    try {
      const deleted = await manager.deleteSecretFromKeytar(secretName);
      if (deleted) {
        console.log(`✓ Deleted secret '${secretName}'`);
      } else {
        console.error(`✗ Failed to delete secret '${secretName}' (not found or already deleted)`);
      }
    } catch (err: any) {
      console.error(`✗ Error deleting secret '${secretName}': ${err.message || err}`);
    }
  }
}

async function cliConvertEnv() {
  console.log('\n=== Convert Environment Variables to Keytar ===\n');

  const envServiceName = process.env.KEYTAR_SERVICE_NAME;
  let serviceName = await prompt(`Enter service name${envServiceName ? ` (default: ${envServiceName})` : ''}: `);
  if (!serviceName) {
    serviceName = envServiceName || '';
  }
  if (!serviceName) {
    console.error('Error: Service name is required');
    return;
  }

  const envVarInput = await prompt('Enter environment variable names (comma-separated): ');
  if (!envVarInput) {
    console.error('Error: At least one environment variable name is required');
    return;
  }
  const envVars = envVarInput.split(',').map(v => v.trim()).filter(v => v);

  const manager = createSecretsManager(serviceName);

  console.log('');
  for (const envName of envVars) {
    console.log(`Processing '${envName}'...`);
    await manager.saveEnvToKeytar(envName);
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function runCLI() {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║   Keytar Secrets Manager CLI          ║');
  console.log('╚═══════════════════════════════════════╝\n');

  console.log('What would you like to do?\n');
  console.log('1. Get secrets');
  console.log('2. Set secrets');
  console.log('3. Delete secrets');
  console.log('4. Convert environment variables to secrets');
  console.log('5. Exit\n');

  const choice = await prompt('Enter your choice (1-5): ');

  switch (choice) {
    case '1':
      await cliGetSecrets();
      break;
    case '2':
      await cliSetSecrets();
      break;
    case '3':
      await cliDeleteSecrets();
      break;
    case '4':
      await cliConvertEnv();
      break;
    case '5':
      console.log('Goodbye!');
      process.exit(0);
    default:
      console.error('Invalid choice. Please enter 1-5.');
  }

  console.log('\n');
  const again = await prompt('Would you like to perform another operation? (y/n): ');
  if (again.toLowerCase() === 'y' || again.toLowerCase() === 'yes') {
    await runCLI();
  } else {
    console.log('Goodbye!');
  }
}

// Run CLI if executed directly
if (import.meta.main) {
  runCLI().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
