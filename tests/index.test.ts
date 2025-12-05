// Set required environment variable for singleton before any imports
process.env.KEYTAR_SERVICE_NAME = 'test-service-singleton';

import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { SecretsManager } from '../src/index';

const serviceName = 'test-service-' + Math.random().toString(36).substring(7);
const manager = new SecretsManager(serviceName);

const testKey = 'TEST_SECRET_KEY_12345';
const testValue = 'secret_value_abcde';

describe("Keytar Secrets Manager", () => {
  beforeAll(async () => {
    // Clean up any existing test keys
    try {
      await manager.deleteSecret(testKey);
      await manager.deleteSecret('ENV_MOVE_TEST_KEY');
    } catch (e) {
      // Ignore if not found
    }
  });

  afterAll(async () => {
    // Clean up test secrets
    try {
      await manager.deleteSecret(testKey);
      await manager.deleteSecret('ENV_MOVE_TEST_KEY');
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  test("should set a secret to keychain", async () => {
    await manager.setSecret(testKey, testValue);
    // If no error is thrown, test passes
    expect(true).toBe(true);
  });

  test("should get a secret from keychain", async () => {
    // First ensure the secret exists
    await manager.setSecret(testKey, testValue);

    const retrievedValue = await manager.getSecret(testKey);
    expect(retrievedValue).toBe(testValue);
  });

  test("should prioritize environment variables over keychain", async () => {
    // Set secret in keychain
    await manager.setSecret(testKey, testValue);

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
    await manager.setSecret(testKey, testValue);

    const deleted = await manager.deleteSecret(testKey);
    expect(deleted).toBe(true);
  });

  test("should return null for deleted secret", async () => {
    // Ensure secret is deleted
    await manager.deleteSecret(testKey);

    const retrievedValue = await manager.getSecret(testKey);
    expect(retrievedValue).toBe(null);
  });

  test("should return null for non-existent secret", async () => {
    const nonExistent = await manager.getSecret('NON_EXISTENT_KEY_XYZ');
    expect(nonExistent).toBe(null);
  });

  test("should move environment variable to keychain with moveEnvToKeytar", async () => {
    const envMoveKey = 'ENV_MOVE_TEST_KEY';
    const envMoveValue = 'moved_from_env_value';

    // Set env var
    process.env[envMoveKey] = envMoveValue;

    // Move to keychain
    await manager.moveEnvToKeytar(envMoveKey);

    // Clean up env var
    delete process.env[envMoveKey];
  });

  test("should retrieve moved secret from keychain after env var is removed", async () => {
    const envMoveKey = 'ENV_MOVE_TEST_KEY';
    const envMoveValue = 'moved_from_env_value';

    // Ensure env var is set and moved
    process.env[envMoveKey] = envMoveValue;
    await manager.moveEnvToKeytar(envMoveKey);

    // Remove env var
    delete process.env[envMoveKey];

    // Retrieve from keychain
    const movedValue = await manager.getSecret(envMoveKey);
    expect(movedValue).toBe(envMoveValue);
  });
});
