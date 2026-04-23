/**
 * claude command — Phase 2, Task 2.4
 *
 * Runs the full PromptOS refinement flow, then pipes the assembled
 * prompt directly to `claude` via child_process.spawn.
 *
 * Usage: promptos claude "fix my auth bug"
 */

import { spawn } from 'child_process';
import chalk from 'chalk';
import { askCommand } from './ask.js';

export async function claudeCommand(rawPrompt) {
  console.log(chalk.cyan('\n🔁 Running PromptOS refinement before sending to Claude...\n'));

  // Reuse the ask flow; after completion the assembled prompt is ready.
  // TODO: capture the assembled prompt returned by askCommand and pass to spawn.
  // For now, demonstrate the spawn pattern:
  await askCommand(rawPrompt, {});

  // After askCommand completes, the assembled prompt should be captured.
  // Replace assembledPrompt below with the actual captured value.
  const assembledPrompt = '-- assembled prompt will be captured here --';

  console.log(chalk.bold.cyan('\n🚀 Sending assembled prompt to Claude Code...\n'));

  const child = spawn('claude', [assembledPrompt], {
    stdio: 'inherit',
    shell: true,
  });

  child.on('error', (err) => {
    console.error(chalk.red('Failed to start claude:'), err.message);
    console.log(chalk.dim('Is `claude` installed? Run: npm install -g @anthropic-ai/claude-code'));
  });

  child.on('close', (code) => {
    if (code !== 0) {
      console.log(chalk.yellow(`\nclaude exited with code ${code}`));
    }
  });
}
