/**
 * logout command — Phase 2, Task 2.1
 *
 * Clears the PromptOS JWT token from the OS keychain.
 */

import { deleteToken } from '../utils/auth.js';
import {
  printCompactBanner,
  printSuccess,
  printError,
  createSpinner,
} from '../utils/ui.js';

export async function logoutCommand() {
  printCompactBanner('logout');

  const spinner = createSpinner('Clearing session token…').start();

  try {
    await deleteToken();
    spinner.stop();
    printSuccess('Logged out. Your token has been cleared from the keychain.');
  } catch (err) {
    spinner.fail('Failed to clear token.');
    printError(err.message);
  }
}
