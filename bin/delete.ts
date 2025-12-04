#!/usr/bin/env bun

import { createSecretsManager } from '../src/index';

async function main() {
  const args = process.argv.slice(2);
  const serviceName = args[0];
  const keyName = args[1];

  if (!serviceName || !keyName) {
    console.error('Usage: bun run bin/delete.ts <SERVICE_NAME> <KEY_NAME>');
    console.error('');
    console.error('Example:');
    console.error('  bun run bin/delete.ts my-app DB_PASSWORD');
    process.exit(1);
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
  } catch (err: any) {
    console.error(`[Secrets] Error deleting secret: ${err.message || err}`);
    process.exit(1);
  }
}

main();
