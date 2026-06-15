#!/usr/bin/env node
/**
 * Generate a PBKDF2 password hash for a client's login, to paste into the
 * CLIENTS KV registry during onboarding.
 *
 * Usage:  node leverage-cms/tools/hash-password.mjs "the-client-password"
 */
import { hashPassword } from "../worker/src/crypto.mjs";

const pw = process.argv[2];
if (!pw) {
  console.error('Usage: node leverage-cms/tools/hash-password.mjs "<password>"');
  process.exit(1);
}
const hash = await hashPassword(pw);
console.log(hash);
