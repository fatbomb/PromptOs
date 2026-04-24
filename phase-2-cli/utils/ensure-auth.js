import inquirer from 'inquirer';
import chalk from 'chalk';
import { getToken } from './auth.js';
import { loginCommand } from '../commands/login.js';

/**
 * Ensures the user is logged in. 
 * If not, prompts to login.
 * Returns the token if logged in, otherwise exits or returns null.
 */
export async function ensureAuth() {
  let token = await getToken();
  
  if (!token) {
    console.log(chalk.yellow('\n🔐 You are not logged in to PromptOS.'));
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Would you like to log in now?',
        default: true
      }
    ]);
    
    if (confirm) {
      await loginCommand();
      token = await getToken();
      if (!token) {
        console.log(chalk.red('Login failed or was cancelled. Aborting.'));
        process.exit(1);
      }
    } else {
      console.log(chalk.red('Authentication required for this command. Aborting.'));
      process.exit(1);
    }
  }
  
  return token;
}
