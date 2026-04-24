#!/usr/bin/env node
/**
 * PromptOS CLI — Entry Point
 * Phase 2, Task 2.1
 *
 * Usage:
 *   promptos ask "[prompt]"    → full conversational refinement flow
 *   promptos claude "[prompt]" → refinement then pipe to claude
 *   promptos login             → open browser for Google OAuth
 *   promptos stats             → show month-to-date usage stats
 *   promptos ask --skip        → bypass PromptOS, call claude directly
 */

import { program } from 'commander';
import { askCommand } from './commands/ask.js';
import { loginCommand } from './commands/login.js';
import { statsCommand } from './commands/stats.js';
import { runCommand } from './commands/run.js';
import { devLoginCommand } from './commands/dev-login.js';

program
  .name('promptos')
  .description('Prompt refinement layer for AI coding assistants')
  .version('1.0.0')
  .showHelpAfterError('(Run "promptos --help" to see a list of all available commands)')
  .showSuggestionAfterError();

program
  .command('ask <prompt>')
  .description('Refine a prompt through the PromptOS conversation flow')
  .option('--skip', 'Skip refinement and send 0-shot prompt directly (shows skip penalty)')
  .option('--basic', 'Basic mode: max 3 questions')
  .action(askCommand);

program
  .command('run <tool> <prompt>')
  .description('Refine prompt then automatically send to a specific CLI tool (e.g. claude, gemini)')
  .option('--skip', 'Skip refinement and send 0-shot prompt directly')
  .option('--basic', 'Basic mode: max 3 questions')
  .action(runCommand);

// Also alias for specifically 'claude' or 'gemini' if user prefers direct calling
program
  .command('claude <prompt>')
  .description('Alias for: promptos run claude')
  .option('--skip', 'Skip refinement and send 0-shot prompt directly')
  .option('--basic', 'Basic mode: max 3 questions')
  .action((prompt, options) => runCommand('claude', prompt, options));

program
  .command('gemini <prompt>')
  .description('Alias for: promptos run gemini')
  .option('--skip', 'Skip refinement and send 0-shot prompt directly')
  .option('--basic', 'Basic mode: max 3 questions')
  .action((prompt, options) => runCommand('gemini', prompt, options));

program
  .command('login')
  .description('Authenticate via Google OAuth')
  .action(loginCommand);

program
  .command('stats')
  .description('Show your month-to-date PromptOS usage statistics')
  .action(statsCommand);

program
  .command('dev-login <token>')
  .description('Inject a development JWT directly into the keychain')
  .action(devLoginCommand);

program.parse();
