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
  let serviceName = args[0];
  let saltKey = args[1];
  let providedSalt = args[2];

  // Read from environment variables (from .env in current working directory)
  const envServiceName = process.env.KEYTAR_SERVICE_NAME;
  const envSaltKey = process.env.KEYTAR_SALT_KEY;

  // If no arguments provided, use interactive mode
  if (!serviceName) {
    console.log('=== Keytar Secrets Initialization ===\n');

    serviceName = await prompt(`Enter service name${envServiceName ? ` (default: ${envServiceName})` : ''}: `);
    if (!serviceName) {
      serviceName = envServiceName || '';
      if (!serviceName) {
        console.error('Error: Service name is required');
        process.exit(1);
      }
    }

    saltKey = await prompt(`Enter salt key name${envSaltKey ? ` (default: ${envSaltKey})` : ' (default: salt-key)'}: `);
    if (!saltKey) {
      saltKey = envSaltKey || 'salt-key';
    }

    providedSalt = await prompt('Enter salt value (leave empty to auto-generate): ');
    if (!providedSalt) {
      providedSalt = undefined;
    }
  } else {
    // Use .env values as fallbacks if no arguments provided
    if (!serviceName) {
      serviceName = envServiceName || '';
    }
    if (!saltKey) {
      saltKey = envSaltKey || 'salt-key';
    }

    if (!serviceName) {
      console.error('Error: Service name is required (provide as argument or set KEYTAR_SERVICE_NAME in .env)');
      process.exit(1);
    }
  }

  const manager = createSecretsManager(serviceName, saltKey);
  const wasInteractive = args.length === 0;

  try {
    const salt = await manager.initializeSalt(providedSalt);

    if (providedSalt && salt !== providedSalt) {
      console.log(`[Secrets] Existing salt detected, keeping current value: ${salt}`);
    } else if (providedSalt) {
      console.log(`[Secrets] Salt set to provided value: ${salt}`);
    } else {
      console.log(`[Secrets] Salt ready: ${salt}`);
    }

    // Show command-line version if interactive mode was used
    if (wasInteractive) {
      console.log('\n--- Command-line version for next time ---');
      let cmd = `bun run bin/initialize.ts ${serviceName}`;
      if (saltKey) {
        cmd += ` ${saltKey}`;
      }
      if (providedSalt) {
        cmd += ` ${salt}`;
      }
      console.log(cmd);
    }

    process.exit(0);
  } catch (err: any) {
    console.error(`[Secrets] Failed to initialize salt: ${err.message || err}`);
    process.exit(1);
  }
}

main();
