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

  // Read from environment variables (from .env in current working directory)
  const envServiceName = process.env.KEYTAR_SERVICE_NAME;
  const envSaltKey = process.env.KEYTAR_SALT_KEY;

  // If no arguments provided, use interactive mode
  if (args.length === 0) {
    console.log('=== Save Environment Variables to Keytar ===\n');

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

    const envVarInput = await prompt('Enter environment variable names (comma-separated): ');
    if (!envVarInput) {
      console.error('Error: At least one environment variable name is required');
      process.exit(1);
    }
    envVars = envVarInput.split(',').map(v => v.trim()).filter(v => v);
  } else {
    // Command-line mode
    // Allow env vars from .env to be used as defaults
    if (args.length === 0 && (!envServiceName || !envSaltKey)) {
      console.error('Usage: bun run bin/save.ts [SERVICE_NAME] [SALT_KEY] <ENV_VAR_NAME_1> [ENV_VAR_NAME_2] ...');
      console.error('');
      console.error('Note: SERVICE_NAME and SALT_KEY can be set via KEYTAR_SERVICE_NAME and KEYTAR_SALT_KEY in .env');
      console.error('');
      console.error('Examples:');
      console.error('  bun run bin/save.ts my-app DB_PASSWORD API_KEY');
      console.error('  bun run bin/save.ts my-app salt-key DB_PASSWORD API_KEY');
      console.error('  bun run bin/save.ts DB_PASSWORD API_KEY  # Uses .env values');
      process.exit(1);
    }

    // Try to parse arguments with .env fallbacks
    if (args.length >= 1) {
      // Check if first arg looks like env var name (all caps with underscores)
      const firstArgIsEnvVar = /^[A-Z][A-Z0-9_]*$/.test(args[0]);

      if (firstArgIsEnvVar && envServiceName) {
        // First arg is an env var, use .env service name
        serviceName = envServiceName;

        // Check if second arg is salt key or env var
        if (args.length >= 2 && !/^[A-Z][A-Z0-9_]*$/.test(args[1])) {
          saltKey = args[1];
          envVars = args.slice(2).length > 0 ? [args[0], ...args.slice(2)] : [args[0]];
        } else {
          saltKey = envSaltKey;
          envVars = args;
        }
      } else {
        // First arg is service name
        serviceName = args[0];

        // Check if second argument looks like a salt key or env var
        if (args.length >= 3 && !/^[A-Z][A-Z0-9_]*$/.test(args[1])) {
          saltKey = args[1];
          envVars = args.slice(2);
        } else {
          saltKey = envSaltKey;
          envVars = args.slice(1);
        }
      }
    } else {
      serviceName = envServiceName || '';
      saltKey = envSaltKey;
      envVars = [];
    }

    if (!serviceName) {
      console.error('Error: Service name is required (provide as argument or set KEYTAR_SERVICE_NAME in .env)');
      process.exit(1);
    }

    if (envVars.length === 0) {
      console.error('Error: At least one environment variable name is required');
      process.exit(1);
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
