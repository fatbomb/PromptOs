import { spawn } from 'child_process';
import chalk from 'chalk';
import { askCommand } from './ask.js';

export async function runCommand(toolName, rawPrompt, options) {
  console.log(chalk.cyan(`\n🔁 Running PromptOS refinement before sending to ${toolName}...\n`));

  // Run the ask flow; after completion the assembled prompt is returned.
  const assembledPrompt = await askCommand(rawPrompt, options, toolName);

  if (!assembledPrompt) {
    console.log(chalk.red('\n❌ No assembled prompt returned. Aborting.'));
    return;
  }

  console.log(chalk.bold.cyan(`\n🚀 Sending assembled prompt to ${toolName}...\n`));

  const child = spawn(toolName, [assembledPrompt], {
    stdio: 'inherit',
    shell: true,
  });

  child.on('error', (err) => {
    console.error(chalk.red(`Failed to start ${toolName}:`), err.message);
    console.log(chalk.dim(`Is \`${toolName}\` installed? Please make sure it is installed and available in your PATH.`));
  });

  child.on('close', (code) => {
    if (code !== 0) {
      console.log(chalk.yellow(`\n${toolName} exited with code ${code}`));
    }
  });
}
