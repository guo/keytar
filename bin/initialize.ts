#!/usr/bin/env bun

import { createSecretsManager } from '../src/index';

async function main() {
  const args = process.argv.slice(2);
  const serviceName = args[0];
  const providedSalt = args[1];

  if (!serviceName) {
    console.error('Usage: bun run bin/initialize.ts <SERVICE_NAME> [SALT_VALUE]');
    console.error('');
    console.error('Examples:');
    console.error('  bun run bin/initialize.ts my-app              # Generate random salt');
    console.error('  bun run bin/initialize.ts my-app custom-salt  # Use specific salt');
    process.exit(1);
  }

  const manager = createSecretsManager(serviceName);

  try {
    const salt = await manager.initializeSalt(providedSalt);

    if (providedSalt && salt !== providedSalt) {
      console.log(`[Secrets] Existing salt detected, keeping current value: ${salt}`);
    } else if (providedSalt) {
      console.log(`[Secrets] Salt set to provided value: ${salt}`);
    } else {
      console.log(`[Secrets] Salt ready: ${salt}`);
    }

    process.exit(0);
  } catch (err: any) {
    console.error(`[Secrets] Failed to initialize salt: ${err.message || err}`);
    process.exit(1);
  }
}

main();
