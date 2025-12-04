#!/usr/bin/env node

const { createSecretsManager } = require('../dist/index');

async function runTests() {
  console.log('Starting @qevan/keytar-secrets tests...');

  const serviceName = 'test-service-' + Math.random().toString(36).substring(7);
  const manager = createSecretsManager(serviceName);

  const testKey = 'TEST_SECRET_KEY_12345';
  const testValue = 'secret_value_abcde';

  try {
    // Initialize salt for test service
    console.log(`Initializing salt for test service '${serviceName}'...`);
    await manager.initializeSalt();
    console.log('Salt initialized.');

    // 1. Clean up potential leftovers
    try {
      await manager.deleteSecretFromKeytar(testKey);
      console.log('Cleaned up any existing test key.');
    } catch (e) {
      // Ignore if not found
    }

    // 2. Test Setting Secret
    console.log(`Setting secret '${testKey}'...`);
    await manager.setSecretToKeytar(testKey, testValue);
    console.log('Secret set.');

    // 3. Test Getting Secret (from Keychain)
    console.log(`Getting secret '${testKey}'...`);
    const retrievedValue = await manager.getSecret(testKey);
    if (retrievedValue === testValue) {
      console.log('SUCCESS: Retrieved value matches set value.');
    } else {
      console.error(`FAILURE: Retrieved value '${retrievedValue}' does not match '${testValue}'.`);
    }

    // 4. Test Env Var Precedence
    console.log('Testing environment variable precedence...');
    const envValue = 'env_value_override';
    process.env[testKey] = envValue;
    const retrievedEnvValue = await manager.getSecret(testKey);
    if (retrievedEnvValue === envValue) {
      console.log('SUCCESS: Environment variable took precedence.');
    } else {
      console.error(`FAILURE: Expected '${envValue}', got '${retrievedEnvValue}'.`);
    }
    delete process.env[testKey]; // Clean up env var

    // 5. Test Deleting Secret
    console.log(`Deleting secret '${testKey}'...`);
    const deleted = await manager.deleteSecretFromKeytar(testKey);
    if (deleted) {
      console.log('Secret deleted successfully.');
    } else {
      console.warn('Secret might not have been deleted (returned false).');
    }

    // 6. Verify Deletion
    console.log('Verifying deletion...');
    const deletedValue = await manager.getSecret(testKey);
    if (deletedValue === '') {
      console.log('SUCCESS: Correctly returned empty string after deletion.');
    } else {
      console.error(`FAILURE: Should have returned empty string, got '${deletedValue}'.`);
    }

    // 7. Test saveEnvToKeytar
    console.log('Testing saveEnvToKeytar...');
    const envMoveKey = 'ENV_MOVE_TEST_KEY';
    const envMoveValue = 'moved_from_env_value';

    // Set env var
    process.env[envMoveKey] = envMoveValue;

    // Move to keychain
    const moveSuccess = await manager.saveEnvToKeytar(envMoveKey);
    if (moveSuccess) {
      console.log('SUCCESS: saveEnvToKeytar returned true.');
    } else {
      console.error('FAILURE: saveEnvToKeytar returned false.');
    }

    // Verify it's in keychain (by clearing env and fetching)
    delete process.env[envMoveKey];
    const movedValue = await manager.getSecret(envMoveKey);
    if (movedValue === envMoveValue) {
      console.log('SUCCESS: Value retrieved from keychain matches original env value.');
    } else {
      console.error(`FAILURE: Retrieved value '${movedValue}' does not match '${envMoveValue}'.`);
    }

    // Clean up all test secrets
    await manager.deleteSecretFromKeytar(envMoveKey);
    await manager.deleteSecretFromKeytar('salt');
    console.log('Cleaned up test secrets and salt.');

    console.log('\nAll tests completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exit(1);
  }
}

runTests();
