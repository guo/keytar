#!/usr/bin/env bun

import keytar from 'keytar';

async function main() {
  const args = process.argv.slice(2);
  const serviceName = args[0];
  const saltKey = args[1] || 'to-be-generated';

  if (!serviceName) {
    console.error('Usage: bun run bin/read-salt.ts <SERVICE_NAME> [SALT_KEY]');
    console.error('');
    console.error('Examples:');
    console.error('  bun run bin/read-salt.ts my-app');
    console.error('  bun run bin/read-salt.ts my-app custom-salt-key');
    process.exit(1);
  }

  try {
    const salt = await keytar.getPassword(serviceName, saltKey);

    if (salt) {
      console.log(`[Secrets] Salt for service '${serviceName}': ${salt}`);
      process.exit(0);
    } else {
      console.log(`[Secrets] No salt found for service '${serviceName}'`);
      console.log(`[Secrets] Run 'bun run bin/initialize.ts ${serviceName}' to initialize a salt`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`[Secrets] Failed to read salt: ${err.message || err}`);
    process.exit(1);
  }
}

main();
