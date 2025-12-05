/**
 * Secrets manager for handling secure credential storage
 */
export class SecretsManager {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  private async getKeytar() {
    try {
      return await import("keytar");
    } catch (err) {
      throw new Error(`keytar not available. Please install it to use keychain features.`);
    }
  }

  /**
   * Get a secret:
   * 1. Check environment variables first (e.g., DB_PASSWORD)
   * 2. If not found, try reading from keytar (macOS Keychain)
   * 3. If not found, return null
   */
  async getSecret(name: string): Promise<string | null> {
    // 1. Priority: Environment variables (Recommended for production)
    const fromEnv = process.env[name];
    if (fromEnv && fromEnv.trim() !== "") {
      return fromEnv;
    }

    // 2. Try Keytar
    try {
      const keytar = await this.getKeytar();
      const value = await keytar.getPassword(this.serviceName, name);
      if (value) {
        return value;
      }
    } catch (err: any) {
      console.error(`[Secrets] Failed to get '${name}': ${err.message}`);
      return null;
    }

    // 3. Not found in Env or Keytar
    return null;
  }

  /**
   * Set a secret in the local keychain (Development only)
   */
  async setSecret(name: string, value: string): Promise<void> {
    const keytar = await this.getKeytar();
    await keytar.setPassword(this.serviceName, name, value);
  }

  /**
   * Delete a secret from the local keychain (Development only)
   */
  async deleteSecret(name: string): Promise<boolean> {
    const keytar = await this.getKeytar();
    return await keytar.deletePassword(this.serviceName, name);
  }

  /**
   * Move a secret from environment variables to the local keychain.
   * If the environment variable exists, it is saved to the keychain.
   */
  async moveEnvToKeytar(name: string): Promise<void> {
    const value = process.env[name];
    if (!value || value.trim() === "") {
      throw new Error(`Environment variable '${name}' is missing or empty`);
    }

    await this.setSecret(name, value);
  }
}

// ============================================================================
// Global Singleton Instance
// ============================================================================

/**
 * Default secrets manager instance using KEYTAR_SERVICE_NAME from environment
 * KEYTAR_SERVICE_NAME must be set in environment variables
 */
if (!process.env.KEYTAR_SERVICE_NAME) {
  throw new Error("KEYTAR_SERVICE_NAME environment variable is required");
}

const defaultSecretsManager = new SecretsManager(
  process.env.KEYTAR_SERVICE_NAME
);

/**
 * Get a secret from environment variables or keychain
 * @param name - Secret name
 * @returns Secret value or null if not found
 */
export async function getSecret(name: string): Promise<string | null> {
  return defaultSecretsManager.getSecret(name);
}

/**
 * Set a secret in the local keychain (Development only)
 * @param name - Secret name
 * @param value - Secret value
 */
export async function setSecret(name: string, value: string): Promise<void> {
  return defaultSecretsManager.setSecret(name, value);
}

/**
 * Delete a secret from the local keychain (Development only)
 * @param name - Secret name
 * @returns True if deleted, false otherwise
 */
export async function deleteSecret(name: string): Promise<boolean> {
  return defaultSecretsManager.deleteSecret(name);
}

/**
 * Move a secret from environment variables to the local keychain
 * @param name - Environment variable name
 */
export async function moveEnvToKeytar(name: string): Promise<void> {
  return defaultSecretsManager.moveEnvToKeytar(name);
}

/**
 * Export the default singleton instance for advanced use cases
 */
export { defaultSecretsManager };

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

  const manager = new SecretsManager(serviceName);

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

  const manager = new SecretsManager(serviceName);
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
      await manager.setSecret(secret.name, secret.value);
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

  const manager = new SecretsManager(serviceName);

  for (const secretName of secretNames) {
    try {
      const deleted = await manager.deleteSecret(secretName);
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

  const manager = new SecretsManager(serviceName);

  console.log('');
  for (const envName of envVars) {
    console.log(`Processing '${envName}'...`);
    await manager.moveEnvToKeytar(envName);
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
