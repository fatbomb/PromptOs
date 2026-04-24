import inquirer from 'inquirer';
import chalk from 'chalk';
import { getToken } from './auth.js';
import { loginCommand } from '../commands/login.js';
import { printPanel, printError, colors } from './ui.js';

/**
 * Ensures the user is logged in.
 * If not, prompts to login with a styled panel.
 * Returns the token if logged in, otherwise exits.
 */
export async function ensureAuth() {
  let token = await getToken();

  if (!token) {
    printPanel(
      '🔐 Authentication Required',
      'You are not logged in to PromptOS.\n' +
      chalk.hex(colors.muted)('  Run `promptos login` to authenticate with Google.'),
      { borderColor: colors.warning }
    );

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.hex(colors.secondary)('Would you like to log in now?'),
        default: true,
        prefix: '  ',
      },
    ]);

    if (confirm) {
      await loginCommand();
      token = await getToken();
      if (!token) {
        printError('Login failed or was cancelled. Aborting.');
        process.exit(1);
      }
    } else {
      printError('Authentication required. Aborting.');
      process.exit(1);
    }
  }

  return token;
}
