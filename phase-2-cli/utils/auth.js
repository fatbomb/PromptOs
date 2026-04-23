/**
 * Auth Utility — Phase 2, Task 2.1
 *
 * Saves and retrieves the JWT token from the OS keychain via keytar.
 * Token is stored under service "promptos-cli", account "jwt".
 */

import keytar from 'keytar';

const SERVICE = 'promptos-cli';
const ACCOUNT = 'jwt';

export async function saveToken(token) {
  await keytar.setPassword(SERVICE, ACCOUNT, token);
}

export async function getToken() {
  return keytar.getPassword(SERVICE, ACCOUNT);
}

export async function deleteToken() {
  await keytar.deletePassword(SERVICE, ACCOUNT);
}
