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

async function promptSecret(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    // Hide input for secret values
    const stdin = process.stdin;
    (stdin as any).setRawMode?.(true);

    rl.question(question, (answer) => {
      (stdin as any).setRawMode?.(false);
      console.log(); // New line after hidden input
      rl.close();
      resolve(answer.trim());
    });

    // Simple hidden input handler
    if ((stdin as any).setRawMode) {
      rl.on('line', () => {});
    }
  });
}

async function main() {
  const args = process.argv.slice(2);
  let serviceName: string;
  let saltKey: string | undefined;
  let secrets: Array<{ name: string; value: string }> = [];

  // If no arguments provided, use interactive mode
  if (args.length === 0) {
    console.log('=== Save Secrets Directly to Keytar ===\n');

    serviceName = await prompt('Enter service name: ');
    if (!serviceName) {
      console.error('Error: Service name is required');
      process.exit(1);
    }

    saltKey = await prompt('Enter salt key name (default: salt-key): ');
    if (!saltKey) {
      saltKey = 'salt-key';
    }

    // Allow multiple secrets
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
      process.exit(1);
    }
  } else {
    // Command-line mode
    if (args.length < 3) {
      console.error('Usage: bun run bin/set-secret.ts <SERVICE_NAME> [SALT_KEY] <SECRET_NAME> <SECRET_VALUE> [SECRET_NAME_2] [SECRET_VALUE_2] ...');
      console.error('');
      console.error('Examples:');
      console.error('  bun run bin/set-secret.ts my-app DB_PASSWORD mypassword123');
      console.error('  bun run bin/set-secret.ts my-app salt-key DB_PASSWORD mypassword123 API_KEY abc123');
      process.exit(1);
    }

    serviceName = args[0];

    // Check if second argument looks like a salt key or secret name
    // If we have odd number of remaining args after first arg, second arg is likely salt key
    const remainingArgs = args.slice(1);
    if (remainingArgs.length >= 3 && remainingArgs.length % 2 === 1) {
      // Odd number of remaining args, second arg is salt key
      saltKey = args[1];

      // Parse secret name-value pairs
      for (let i = 2; i < args.length; i += 2) {
        if (i + 1 < args.length) {
          secrets.push({ name: args[i], value: args[i + 1] });
        }
      }
    } else {
      // Even number of remaining args, no salt key provided
      saltKey = undefined;

      // Parse secret name-value pairs
      for (let i = 1; i < args.length; i += 2) {
        if (i + 1 < args.length) {
          secrets.push({ name: args[i], value: args[i + 1] });
        }
      }
    }

    if (secrets.length === 0) {
      console.error('Error: At least one secret name-value pair is required');
      process.exit(1);
    }
  }

  const manager = createSecretsManager(serviceName, saltKey);
  const wasInteractive = args.length === 0;

  let hasError = false;
  for (const secret of secrets) {
    console.log(`Saving secret '${secret.name}'...`);
    try {
      await manager.setSecretToKeytar(secret.name, secret.value);
      console.log(`✓ Successfully saved '${secret.name}'`);
    } catch (err: any) {
      console.error(`✗ Failed to save '${secret.name}': ${err.message || err}`);
      hasError = true;
    }
  }

  if (hasError) {
    console.error('\nSome secrets failed to save.');
    process.exit(1);
  } else {
    console.log('\nAll secrets saved successfully.');

    // Show command-line version if interactive mode was used
    if (wasInteractive) {
      console.log('\n--- Command-line version for next time ---');
      let cmd = `bun run bin/set-secret.ts ${serviceName}`;
      if (saltKey) {
        cmd += ` ${saltKey}`;
      }
      for (const secret of secrets) {
        cmd += ` ${secret.name} ${secret.value}`;
      }
      console.log(cmd);
    }

    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
