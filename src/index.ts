import crypto from "crypto";

const DEFAULT_SERVICE_NAME = "keytar-secrets";
const SALT_KEY = "salt-tcy354";

/**
 * Configuration for a secrets manager instance
 */
export interface SecretsConfig {
  serviceName: string;
  saltKey?: string;
}

/**
 * Secrets manager for handling secure credential storage
 */
export class SecretsManager {
  private serviceName: string;
  private saltKey: string;

  constructor(config: SecretsConfig) {
    this.serviceName = config.serviceName;
    this.saltKey = config.saltKey || SALT_KEY;
  }

  /**
   * Helper to determine the service name to use with Keytar.
   * If the secret name is "salt", we use the base serviceName.
   * Otherwise, we try to read the "salt" from the base serviceName and append it.
   */
  private async getServiceWithSalt(keytar: any, secretName: string): Promise<string> {
    if (secretName === "salt") {
      return this.serviceName;
    }
    const salt = await keytar.getPassword(this.serviceName, this.saltKey);

    if (!salt) {
      throw new Error(`[Secrets] Salt not found for service '${this.serviceName}'.`);
    }
    return `${this.serviceName}-${salt}`;
  }

  /**
   * Get a secret:
   * 1. Check environment variables first (e.g., DB_PASSWORD)
   * 2. If not found, try reading from keytar (macOS Keychain)
   *    - Reads 'salt' first to determine the correct service scope
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
      const service = await this.getServiceWithSalt(keytar, name);
      const value = await keytar.getPassword(service, name);
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
    const service = await this.getServiceWithSalt(keytar, name);
    await keytar.setPassword(service, name, value);
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
    const service = await this.getServiceWithSalt(keytar, name);
    return await keytar.deletePassword(service, name);
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

  /**
   * Initialize the salt used for keytar service names.
   * - If a salt already exists in keytar, it returns the existing salt.
   * - If no salt exists and newSalt is provided, it uses that value.
   * - If no salt exists and newSalt is not provided, it generates a random 8-character alphanumeric string.
   * WARNING: Changing the salt will make previously stored secrets inaccessible unless migrated.
   */
  async initializeSalt(newSalt?: string): Promise<string> {
    let keytar: typeof import("keytar");
    try {
      keytar = await import("keytar");
    } catch (err) {
      throw new Error(`keytar not available. Cannot initialize salt.\nOriginal error: ${err}`);
    }

    // read salt from keytar first
    const salt = await keytar.getPassword(this.serviceName, this.saltKey);
    if (salt) {
      console.log(`[Secrets] Salt already exists for service '${this.serviceName}': ${salt}`);
      return salt;
    }

    // no existing salt, generate a new one if not provided
    if (!newSalt) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const length = 8;
      const bytes = crypto.randomBytes(length);
      newSalt = '';
      for (let i = 0; i < length; i++) {
        newSalt += chars[bytes[i] % chars.length];
      }
    }

    // store the salt
    await keytar.setPassword(this.serviceName, this.saltKey, newSalt);
    console.log(`[Secrets] Salt initialized/updated for service '${this.serviceName}': ${newSalt}`);
    return newSalt;
  }
}

// Default instance for backwards compatibility
const defaultManager = new SecretsManager({ serviceName: DEFAULT_SERVICE_NAME });

/**
 * Create a secrets manager with a custom service name
 */
export function createSecretsManager(serviceName: string, saltKey?: string): SecretsManager {
  return new SecretsManager({ serviceName, saltKey });
}

// Export default functions for convenience
export const getSecret = (name: string) => defaultManager.getSecret(name);
export const setSecretToKeytar = (name: string, value: string) => defaultManager.setSecretToKeytar(name, value);
export const deleteSecretFromKeytar = (name: string) => defaultManager.deleteSecretFromKeytar(name);
export const saveEnvToKeytar = (name: string) => defaultManager.saveEnvToKeytar(name);
export const initializeSalt = (newSalt?: string) => defaultManager.initializeSalt(newSalt);
