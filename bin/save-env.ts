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
  let envVars: string[];

  // If no arguments provided, use interactive mode
  if (args.length === 0) {
    console.log('=== Save Environment Variables to Keytar ===\n');

    serviceName = await prompt('Enter service name: ');
    if (!serviceName) {
      console.error('Error: Service name is required');
      process.exit(1);
    }

    saltKey = await prompt('Enter salt key name (default: salt-key): ');
    if (!saltKey) {
      saltKey = 'salt-key';
    }

    const envVarInput = await prompt('Enter environment variable names (comma-separated): ');
    if (!envVarInput) {
      console.error('Error: At least one environment variable name is required');
      process.exit(1);
    }
    envVars = envVarInput.split(',').map(v => v.trim()).filter(v => v);
  } else {
    // Command-line mode
    if (args.length < 2) {
      console.error('Usage: bun run bin/save.ts <SERVICE_NAME> [SALT_KEY] <ENV_VAR_NAME_1> [ENV_VAR_NAME_2] ...');
      console.error('');
      console.error('Examples:');
      console.error('  bun run bin/save.ts my-app DB_PASSWORD API_KEY');
      console.error('  bun run bin/save.ts my-app salt-key DB_PASSWORD API_KEY');
      process.exit(1);
    }

    serviceName = args[0];

    // Check if second argument looks like a salt key or env var
    // If it contains uppercase letters or underscores, treat it as env var
    if (args.length >= 3 && !/^[A-Z_]+$/.test(args[1])) {
      saltKey = args[1];
      envVars = args.slice(2);
    } else {
      saltKey = undefined;
      envVars = args.slice(1);
    }
  }

  const manager = createSecretsManager(serviceName, saltKey);
  const wasInteractive = args.length === 0;

  let hasError = false;
  for (const envName of envVars) {
    console.log(`Processing '${envName}'...`);
    const success = await manager.saveEnvToKeytar(envName);
    if (!success) {
      hasError = true;
    }
  }

  if (hasError) {
    console.error('\nSome secrets failed to save.');
    process.exit(1);
  } else {
    console.log('\nAll requested secrets saved successfully.');

    // Show command-line version if interactive mode was used
    if (wasInteractive) {
      console.log('\n--- Command-line version for next time ---');
      let cmd = `bun run bin/save-env.ts ${serviceName}`;
      if (saltKey) {
        cmd += ` ${saltKey}`;
      }
      cmd += ` ${envVars.join(' ')}`;
      console.log(cmd);
    }

    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
