#!/usr/bin/env bun
/**
 * Simple test script to verify environment variable access
 * Run from another repo: bun run ../keytar/bin/access-env.ts
 */

console.log("=== Environment Access Test ===\n");

console.log("KEYTAR_SERVICE_NAME:", process.env.KEYTAR_SERVICE_NAME);
