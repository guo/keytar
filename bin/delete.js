#!/usr/bin/env node

const { createSecretsManager } = require('../dist/index');

async function main() {
  const args = process.argv.slice(2);
  const serviceName = args[0];
  const keyName = args[1];

  if (!serviceName || !keyName) {
    console.error('Usage: keytar-delete <SERVICE_NAME> <KEY_NAME>');
    console.error('');
    console.error('Example:');
    console.error('  keytar-delete my-app DB_PASSWORD');
    process.exit(1);
  }

  let keytar;
  try {
    keytar = await import('keytar');
  } catch (err) {
    console.error(`keytar not available. Cannot delete secret.\nOriginal error: ${err.message || err}`);
    process.exit(1);
    return;
  }

  const manager = createSecretsManager(serviceName);

  try {
    const deleted = await manager.deleteSecretFromKeytar(keyName);
    if (deleted) {
      console.log(`[Secrets] Deleted secret '${keyName}' from service '${serviceName}'.`);
      process.exit(0);
    } else {
      console.error(`[Secrets] Failed to delete secret '${keyName}' from service '${serviceName}'.`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`[Secrets] Error deleting secret: ${err.message || err}`);
    process.exit(1);
  }
}

main();
