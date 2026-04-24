/**
 * logout command — Phase 2, Task 2.1
 *
 * Clears the PromptOS JWT token from the OS keychain.
 */

import chalk from 'chalk';
import ora from 'ora';
import { deleteToken } from '../utils/auth.js';

export async function logoutCommand() {
  const spinner = ora('Logging out...').start();
  
  try {
    await deleteToken();
    spinner.succeed(chalk.green('Logged out successfully. Token cleared from keychain.'));
  } catch (err) {
    spinner.fail(chalk.red('Failed to clear token.'));
    console.error(err);
  }
}
