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
import { claudeCommand } from './commands/claude.js';

program
  .name('promptos')
  .description('Prompt refinement layer for AI coding assistants')
  .version('1.0.0');

program
  .command('ask <prompt>')
  .description('Refine a prompt through the PromptOS conversation flow')
  .option('--skip', 'Skip PromptOS and call claude directly (shows skip penalty)')
  .action(askCommand);

program
  .command('claude <prompt>')
  .description('Refine prompt then automatically send to Claude Code')
  .action(claudeCommand);

program
  .command('login')
  .description('Authenticate via Google OAuth')
  .action(loginCommand);

program
  .command('stats')
  .description('Show your month-to-date PromptOS usage statistics')
  .action(statsCommand);

program.parse();
