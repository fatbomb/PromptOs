/**
 * PromptOS Interactive Shell
 *
 * Launched when the user runs `promptos` with no arguments.
 * Keeps a REPL loop alive — each iteration is one full prompt-refinement session.
 * Press Ctrl+C to exit cleanly.
 *
 * Shell Commands (typed at the PromptOS › prompt):
 *   /help           — show available commands
 *   /login          — authenticate
 *   /logout         — log out
 *   /stats          — show usage stats
 *   /tool claude    — set target tool (claude | gemini | none)
 *   /mode skip      — set mode (skip | mid | default)
 *   /clear          — clear the terminal
 *   /exit           — exit the shell (or Ctrl+C)
 *   <anything else> — treated as a raw prompt to refine
 */

import readline from 'readline';
import chalk from 'chalk';
import gradient from 'gradient-string';
import figures from 'figures';
import inquirer from 'inquirer';
import { spawn } from 'child_process';
import { printBanner, printPanel, printSuccess, printError, printInfo, printDim, colors } from '../utils/ui.js';
import { askCommand } from './ask.js';
import { loginCommand } from './login.js';
import { logoutCommand } from './logout.js';
import { statsCommand } from './stats.js';
import { ensureAuth } from '../utils/ensure-auth.js';

// ─────────────────────────────────────────────
// Shell state
// ─────────────────────────────────────────────
const shellState = {
  tool: null,   // null | 'claude' | 'gemini' | ...
  mode: 'default', // 'default' | 'mid' | 'skip'
};

// ─────────────────────────────────────────────
// Prompt string
// ─────────────────────────────────────────────
function getPromptString() {
  const toolPart = shellState.tool
    ? chalk.hex(colors.secondary)(` [${shellState.tool}]`)
    : '';
  const modePart = shellState.mode !== 'default'
    ? chalk.hex(colors.warning)(` [${shellState.mode}]`)
    : '';
  return gradient(['#7C3AED', '#06B6D4'])('PromptOS') + toolPart + modePart + chalk.hex(colors.muted)(' › ');
}

// ─────────────────────────────────────────────
// Help text
// ─────────────────────────────────────────────
function printShellHelp() {
  const lines = [
    `${chalk.hex(colors.secondary).bold('/tool <name>')}   — set target tool  ${chalk.hex(colors.muted)('e.g. /tool claude  /tool gemini  /tool none')}`,
    `${chalk.hex(colors.secondary).bold('/mode <name>')}   — set mode          ${chalk.hex(colors.muted)('default | mid | skip')}`,
    `${chalk.hex(colors.secondary).bold('/stats')}         — show usage stats`,
    `${chalk.hex(colors.secondary).bold('/login')}         — authenticate with Google`,
    `${chalk.hex(colors.secondary).bold('/logout')}        — log out`,
    `${chalk.hex(colors.secondary).bold('/clear')}         — clear the terminal`,
    `${chalk.hex(colors.secondary).bold('/exit')}          — exit the shell`,
    ``,
    `${chalk.hex(colors.accent)(figures.pointer)} Anything else is sent as a prompt to refine.`,
  ].join('\n  ');

  printPanel('Shell Commands', lines, { borderColor: colors.primary });
}

// ─────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────
function printStatusBar() {
  const tool = shellState.tool
    ? chalk.hex(colors.secondary)(shellState.tool)
    : chalk.hex(colors.muted)('none');
  const mode = shellState.mode !== 'default'
    ? chalk.hex(colors.warning)(shellState.mode)
    : chalk.hex(colors.accent)('default');

  console.log(
    chalk.hex(colors.muted)('  ─────────────────────────────────────────────') +
    `\n  Tool: ${tool}   Mode: ${mode}   ${chalk.hex(colors.muted)('Type /help for commands')}\n`
  );
}

// ─────────────────────────────────────────────
// Main shell entry
// ─────────────────────────────────────────────
export async function shellCommand() {
  printBanner('Interactive Shell — Ctrl+C to exit');
  
  // Check auth status on startup
  await ensureAuth();

  printShellHelp();
  printStatusBar();

  const rl = readline.createInterface({
    input:  process.stdin,
    output: process.stdout,
    terminal: true,
    prompt: '',
  });

  // Re-usable prompt function (readline handles the line but we display custom prompt)
  const askLine = () => new Promise((resolve) => {
    process.stdout.write(getPromptString());
    rl.once('line', resolve);
  });

  // Handle Ctrl+C gracefully
  rl.on('SIGINT', () => {
    console.log('\n\n' + chalk.hex(colors.muted)('  Goodbye! Session ended.') + '\n');
    process.exit(0);
  });

  // ── REPL loop ───────────────────────────────────────────────────
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let line;
    try {
      process.stdin.resume(); // Ensure stdin is active after inquirer commands
      line = await askLine();
    } catch {
      break; // stdin closed
    }

    const input = (line || '').trim();
    if (!input) continue;

    // ── Shell commands ─────────────────────────────────────────────
    if (input.startsWith('/')) {
      const [cmd, ...args] = input.slice(1).split(/\s+/);

      switch (cmd.toLowerCase()) {
        case 'exit':
        case 'quit':
          console.log('\n' + chalk.hex(colors.muted)('  Goodbye! Session ended.') + '\n');
          process.exit(0);
          break;

        case 'help':
          printShellHelp();
          break;

        case 'clear':
          process.stdout.write('\x1Bc');
          printBanner('Interactive Shell — Ctrl+C to exit');
          printStatusBar();
          break;

        case 'login':
          await loginCommand();
          break;

        case 'logout':
          await logoutCommand();
          break;

        case 'stats':
          await statsCommand();
          break;

        case 'tool': {
          const t = args[0]?.toLowerCase();
          if (!t || t === 'none') {
            shellState.tool = null;
            printSuccess('Target tool cleared — prompts will be generic.');
          } else if (['claude', 'gemini', 'chatgpt', 'copilot'].includes(t)) {
            shellState.tool = t;
            printSuccess(`Target tool set to ${chalk.hex(colors.secondary).bold(t)}.`);
          } else {
            printError(`Unknown tool "${t}". Supported: claude, gemini, none.`);
          }
          break;
        }

        case 'mode': {
          const m = args[0]?.toLowerCase();
          if (['default', 'mid', 'skip'].includes(m)) {
            shellState.mode = m;
            printSuccess(`Mode set to ${chalk.hex(colors.warning).bold(m)}.`);
          } else {
            printError(`Unknown mode "${m}". Supported: default, mid, skip.`);
          }
          break;
        }

        default:
          printError(`Unknown command /${cmd}. Type /help to see available commands.`);
      }

      console.log('');
      continue;
    }

    // ── Prompt refinement ──────────────────────────────────────────
    console.log('');
    const assembledPrompt = await askCommand(input, {
      skip: shellState.mode === 'skip',
      mid:  shellState.mode === 'mid',
    }, shellState.tool);

    if (assembledPrompt) {
      console.log('');
      const { runTool } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'runTool',
          message: shellState.tool
            ? chalk.hex(colors.secondary)(`Send to ${shellState.tool} now?`)
            : chalk.hex(colors.secondary)(`Send to a CLI model now?`),
          default: false,
        },
      ]);

      if (runTool) {
        let target = shellState.tool;
        if (!target) {
          const { selectedTool } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedTool',
              message: chalk.hex(colors.secondary)('Which tool?'),
              choices: ['claude', 'gemini', 'chatgpt', 'copilot', 'none'],
            },
          ]);
          if (selectedTool !== 'none') target = selectedTool;
        }

        if (target) {
          await new Promise((resolve) => {
            console.log(chalk.bold.cyan(`\n🚀 Sending assembled prompt to ${target}...\n`));
            const child = spawn(target, [assembledPrompt], {
              stdio: 'inherit',
              shell: false,
            });

            child.on('error', (err) => {
              console.error(chalk.red(`Failed to start ${target}:`), err.message);
              console.log(chalk.dim(`Is \`${target}\` installed? Please make sure it is installed and available in your PATH.`));
            });

            child.on('close', (code) => {
              if (code !== 0) {
                console.log(chalk.yellow(`\n${target} exited with code ${code}`));
              }
              resolve();
            });
          });
        }
      }
    }

    console.log('');
    printStatusBar();
  }
}
