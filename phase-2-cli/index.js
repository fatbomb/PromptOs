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
import { shellCommand } from './commands/shell.js';

program
  .name('promptos')
  .description('Prompt refinement layer for AI coding assistants')
  .version('1.0.0')
  .option('-s, --skip', 'Skip all questions — PromptOS auto-formats the prompt for your target tool')
  .option('-m, --mid', 'Quick mode: at most 3 clarifying questions, then auto-format')
  .showHelpAfterError('(Run "promptos --help" to see a list of all available commands)')
  .showSuggestionAfterError();

// ── Default action: launch interactive shell when no subcommand is given ──
program.action(() => {
  shellCommand();
});

program
  .command('ask [prompt...]')
  .description('Refine a prompt through the PromptOS conversation flow')
  .action((promptArr, options, command) => 
    askCommand(promptArr.join(' '), command.optsWithGlobals())
  );

program
  .command('run <tool> [prompt...]')
  .description('Refine prompt then automatically send to a specific CLI tool (e.g. claude, gemini)')
  .action((tool, promptArr, options, command) => 
    runCommand(tool, promptArr.join(' '), command.optsWithGlobals())
  );

program
  .command('claude [prompt...]')
  .description('Alias for: promptos run claude')
  .action((promptArr, options, command) => 
    runCommand('claude', promptArr.join(' '), command.optsWithGlobals())
  );

program
  .command('gemini [prompt...]')
  .description('Alias for: promptos run gemini')
  .action((promptArr, options, command) => 
    runCommand('gemini', promptArr.join(' '), command.optsWithGlobals())
  );

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
