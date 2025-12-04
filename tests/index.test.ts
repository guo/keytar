import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { createSecretsManager } from '../src/index';

const serviceName = 'test-service-' + Math.random().toString(36).substring(7);
const manager = createSecretsManager(serviceName);

const testKey = 'TEST_SECRET_KEY_12345';
const testValue = 'secret_value_abcde';

describe("Keytar Secrets Manager", () => {
  beforeAll(async () => {
    // Clean up any existing test keys
    try {
      await manager.deleteSecretFromKeytar(testKey);
      await manager.deleteSecretFromKeytar('ENV_MOVE_TEST_KEY');
    } catch (e) {
      // Ignore if not found
    }
  });

  afterAll(async () => {
    // Clean up test secrets
    try {
      await manager.deleteSecretFromKeytar(testKey);
      await manager.deleteSecretFromKeytar('ENV_MOVE_TEST_KEY');
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  test("should set a secret to keychain", async () => {
    await manager.setSecretToKeytar(testKey, testValue);
    // If no error is thrown, test passes
    expect(true).toBe(true);
  });

  test("should get a secret from keychain", async () => {
    // First ensure the secret exists
    await manager.setSecretToKeytar(testKey, testValue);

    const retrievedValue = await manager.getSecret(testKey);
    expect(retrievedValue).toBe(testValue);
  });

  test("should prioritize environment variables over keychain", async () => {
    // Set secret in keychain
    await manager.setSecretToKeytar(testKey, testValue);

    // Set environment variable with different value
    const envValue = 'env_value_override';
    process.env[testKey] = envValue;

    const retrievedValue = await manager.getSecret(testKey);
    expect(retrievedValue).toBe(envValue);

    // Clean up env var
    delete process.env[testKey];
  });

  test("should delete a secret from keychain", async () => {
    // First ensure the secret exists
    await manager.setSecretToKeytar(testKey, testValue);

    const deleted = await manager.deleteSecretFromKeytar(testKey);
    expect(deleted).toBe(true);
  });

  test("should return empty string for deleted secret", async () => {
    // Ensure secret is deleted
    await manager.deleteSecretFromKeytar(testKey);

    const retrievedValue = await manager.getSecret(testKey);
    expect(retrievedValue).toBe('');
  });

  test("should return empty string for non-existent secret", async () => {
    const nonExistent = await manager.getSecret('NON_EXISTENT_KEY_XYZ');
    expect(nonExistent).toBe('');
  });

  test("should move environment variable to keychain with saveEnvToKeytar", async () => {
    const envMoveKey = 'ENV_MOVE_TEST_KEY';
    const envMoveValue = 'moved_from_env_value';

    // Set env var
    process.env[envMoveKey] = envMoveValue;

    // Move to keychain
    const moveSuccess = await manager.saveEnvToKeytar(envMoveKey);
    expect(moveSuccess).toBe(true);

    // Clean up env var
    delete process.env[envMoveKey];
  });

  test("should retrieve moved secret from keychain after env var is removed", async () => {
    const envMoveKey = 'ENV_MOVE_TEST_KEY';
    const envMoveValue = 'moved_from_env_value';

    // Ensure env var is set and moved
    process.env[envMoveKey] = envMoveValue;
    await manager.saveEnvToKeytar(envMoveKey);

    // Remove env var
    delete process.env[envMoveKey];

    // Retrieve from keychain
    const movedValue = await manager.getSecret(envMoveKey);
    expect(movedValue).toBe(envMoveValue);
  });
});
