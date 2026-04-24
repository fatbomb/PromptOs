/**
 * ask command — Phase 2, Task 2.2
 *
 * Full conversational refinement flow in the terminal:
 *   1. POST /session/start
 *   2. Loop: show question → read input → POST /session/message
 *   3. On done: show assembled prompt + score bar
 *   4. POST /session/complete → print Cost Receipt
 */

import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { ensureAuth } from '../utils/ensure-auth.js';
import { printReceipt } from '../utils/receipt.js';

const API = process.env.PROMPTOS_API_BASE_URL || 'http://localhost:8000';

export async function askCommand(rawPrompt, options, targetTool = null) {
  const token = await ensureAuth();

  let mode = 'default';
  if (options.skip) mode = 'skip';
  else if (options.mid) mode = 'mid';

  if (mode === 'skip') {
    const toolLabel = targetTool ? chalk.bold(targetTool) : 'your target tool';
    console.log(chalk.yellow(`\n⚡ Skip mode — PromptOS will auto-format a prompt optimised for ${toolLabel} without asking questions.\n`));
    console.log(
      chalk.dim('Tip: use --mid to answer just 1-3 quick questions for a sharper result.\n')
    );
  } else if (mode === 'mid') {
    const toolLabel = targetTool ? chalk.bold(targetTool) : 'your target tool';
    console.log(chalk.cyan(`\n⚡ Mid mode — PromptOS will ask at most 3 questions and auto-format for ${toolLabel}.\n`));
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Step 1: Start session
  const spinner = ora('Starting session...').start();
  const startRes = await fetch(`${API}/session/start`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ raw_prompt: rawPrompt, mode, target_tool: targetTool }),
  }).then((r) => r.json());
  spinner.stop();

  const { session_id } = startRes;
  let turn = 1;
  let done = false;
  let assembled = null;
  let scores = null;

  // Step 2: Question loop
  while (!done) {
    const response = await fetch(`${API}/session/message`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ session_id, user_message: turn === 1 ? '_start_' : '_continue_' }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      console.log(chalk.red(`\n❌ Error from PromptOS: ${err.detail || response.statusText}`));
      return;
    }

    const msgRes = await response.json();

    if (msgRes.done) {
      done = true;
      assembled = msgRes.assembled_prompt;
      scores = msgRes.scores;

      if (msgRes.should_refuse) {
        console.log(chalk.bold.yellow('\n🚫 ' + msgRes.message || 'You already know the answer. Try implementing it.'));
        return;
      }
      break;
    }

    // Show question
    const maxTurns = mode === 'mid' ? 3 : 6;
    console.log(chalk.cyan(`\nQuestion ${turn} of ~${maxTurns}:`));
    const { answer } = await inquirer.prompt([
      {
        type: 'input',
        name: 'answer',
        message: chalk.white(msgRes.question),
      },
    ]);

    // Post answer
    await fetch(`${API}/session/message`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ session_id, user_message: answer }),
    }).then((r) => r.json());

    turn++;
  }

  // Step 3: Show assembled prompt + score bar
  if (assembled) {
    console.log(chalk.bold.green('\n✅ Assembled Prompt:\n'));
    console.log(chalk.white(assembled));
    _printScoreBar(scores);
  }

  // Step 4: Complete session + print receipt
  const completeRes = await fetch(`${API}/session/complete`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ session_id }),
  }).then((r) => r.json());

  const summary = await fetch(`${API}/tokens/summary`, { headers }).then((r) => r.json());
  printReceipt({ rawPrompt, scores, summary });

  return assembled;
}

function _printScoreBar(scores) {
  if (!scores) return;
  const bar = (val) => '█'.repeat(Math.floor(val / 10)) + '░'.repeat(10 - Math.floor(val / 10));
  console.log(chalk.bold('\n📊 Session Scores:'));
  console.log(chalk.green(`  Token Efficiency  ${bar(scores.token_efficiency_score)} ${scores.token_efficiency_score}/100`));
  console.log(chalk.blue(`  Thinking Depth    ${bar(scores.thinking_depth_score)} ${scores.thinking_depth_score}/100`));
  console.log(chalk.yellow(`  Dependency        ${bar(scores.dependency_score)} ${scores.dependency_score}/100`));
}
