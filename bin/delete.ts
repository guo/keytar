#!/usr/bin/env bun

import { createSecretsManager } from '../src/index';
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

async function main() {
  const args = process.argv.slice(2);
  let serviceName: string;
  let saltKey: string | undefined;
  let secretNames: string[];

  // If no arguments provided, use interactive mode
  if (args.length === 0) {
    console.log('=== Delete Secrets from Keytar ===\n');

    serviceName = await prompt('Enter service name: ');
    if (!serviceName) {
      console.error('Error: Service name is required');
      process.exit(1);
    }

    saltKey = await prompt('Enter salt key name (default: salt-key): ');
    if (!saltKey) {
      saltKey = 'salt-key';
    }

    const secretNameInput = await prompt('Enter secret names to delete (comma-separated): ');
    if (!secretNameInput) {
      console.error('Error: At least one secret name is required');
      process.exit(1);
    }
    secretNames = secretNameInput.split(',').map(v => v.trim()).filter(v => v);

    // Confirmation prompt
    console.log('\nSecrets to delete:');
    secretNames.forEach(name => console.log(`  - ${name}`));
    const confirm = await prompt('\nAre you sure you want to delete these secrets? (y/n): ');
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('Deletion cancelled.');
      process.exit(0);
    }
  } else {
    // Command-line mode
    if (args.length < 2) {
      console.error('Usage: bun run bin/delete.ts <SERVICE_NAME> [SALT_KEY] <SECRET_NAME_1> [SECRET_NAME_2] ...');
      console.error('');
      console.error('Examples:');
      console.error('  bun run bin/delete.ts my-app DB_PASSWORD');
      console.error('  bun run bin/delete.ts my-app salt-key DB_PASSWORD API_KEY');
      process.exit(1);
    }

    serviceName = args[0];

    // Check if second argument looks like a salt key or secret name
    // If it's all uppercase with underscores, treat it as secret name
    if (args.length >= 3 && !/^[A-Z_]+$/.test(args[1])) {
      saltKey = args[1];
      secretNames = args.slice(2);
    } else {
      saltKey = undefined;
      secretNames = args.slice(1);
    }
  }

  const manager = createSecretsManager(serviceName, saltKey);
  const wasInteractive = args.length === 0;

  let hasError = false;
  for (const secretName of secretNames) {
    try {
      const deleted = await manager.deleteSecretFromKeytar(secretName);
      if (deleted) {
        console.log(`✓ Deleted secret '${secretName}'`);
      } else {
        console.error(`✗ Failed to delete secret '${secretName}' (not found or already deleted)`);
        hasError = true;
      }
    } catch (err: any) {
      console.error(`✗ Error deleting secret '${secretName}': ${err.message || err}`);
      hasError = true;
    }
  }

  if (hasError) {
    console.error('\nSome secrets failed to delete.');
    process.exit(1);
  } else {
    console.log('\nAll secrets deleted successfully.');

    // Show command-line version if interactive mode was used
    if (wasInteractive) {
      console.log('\n--- Command-line version for next time ---');
      let cmd = `bun run bin/delete.ts ${serviceName}`;
      if (saltKey) {
        cmd += ` ${saltKey}`;
      }
      cmd += ` ${secretNames.join(' ')}`;
      console.log(cmd);
    }

    process.exit(0);
  }
}

main();
