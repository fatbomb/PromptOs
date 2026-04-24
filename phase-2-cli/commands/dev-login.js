import chalk from 'chalk';
import { saveToken } from '../utils/auth.js';

export async function devLoginCommand(token) {
  if (!token) {
    console.error(chalk.red('Error: Please provide a token.'));
    process.exit(1);
  }
  
  try {
    await saveToken(token);
    console.log(chalk.green('✅ Development token successfully saved to keychain.'));
    console.log(chalk.dim('You can now use `promptos ask` and other commands.'));
  } catch (err) {
    console.error(chalk.red('Failed to save token:'), err);
  }
}
