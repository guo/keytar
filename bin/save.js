#!/usr/bin/env node

const { createSecretsManager } = require('../dist/index');

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: keytar-save <SERVICE_NAME> <ENV_VAR_NAME_1> [ENV_VAR_NAME_2] ...');
    console.error('');
    console.error('Example:');
    console.error('  keytar-save my-app DB_PASSWORD API_KEY');
    process.exit(1);
  }

  const serviceName = args[0];
  const envVars = args.slice(1);
  const manager = createSecretsManager(serviceName);

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
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
