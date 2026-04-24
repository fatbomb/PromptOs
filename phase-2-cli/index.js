#!/usr/bin/env node
/**
 * PromptOS CLI — Entry Point
 * Phase 2, Task 2.1
 */

import { program } from 'commander';
import { askCommand } from './commands/ask.js';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
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
  .command('ask [prompt...]')
  .description('Refine a prompt through the PromptOS conversation flow')
  .option('--skip', 'Skip refinement and send 0-shot prompt directly (shows skip penalty)')
  .option('--basic', 'Basic mode: max 3 questions')
  .action((promptArr, options) => askCommand(promptArr.join(' '), options));

program
  .command('run <tool> [prompt...]')
  .description('Refine prompt then automatically send to a specific CLI tool (e.g. claude, gemini)')
  .option('--skip', 'Skip refinement and send 0-shot prompt directly')
  .option('--basic', 'Basic mode: max 3 questions')
  .action((tool, promptArr, options) => runCommand(tool, promptArr.join(' '), options));

program
  .command('claude [prompt...]')
  .description('Alias for: promptos run claude')
  .option('--skip', 'Skip refinement and send 0-shot prompt directly')
  .option('--basic', 'Basic mode: max 3 questions')
  .action((promptArr, options) => runCommand('claude', promptArr.join(' '), options));

program
  .command('gemini [prompt...]')
  .description('Alias for: promptos run gemini')
  .option('--skip', 'Skip refinement and send 0-shot prompt directly')
  .option('--basic', 'Basic mode: max 3 questions')
  .action((promptArr, options) => runCommand('gemini', promptArr.join(' '), options));

program
  .command('login')
  .description('Authenticate via Google OAuth')
  .action(loginCommand);

program
  .command('logout')
  .description('Clear your session and log out')
  .action(logoutCommand);

program
  .command('stats')
  .description('Show your month-to-date PromptOS usage statistics')
  .action(statsCommand);

program
  .command('dev-login <token>')
  .description('Inject a development JWT directly into the keychain')
  .action(devLoginCommand);

program.parse();
