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
import { getToken } from '../utils/auth.js';
import { printReceipt } from '../utils/receipt.js';

const API = process.env.PROMPTOS_API_BASE_URL || 'http://localhost:8000';

export async function askCommand(rawPrompt, options) {
  const token = await getToken();
  if (!token) {
    console.log(chalk.red('Not logged in. Run: promptos login'));
    process.exit(1);
  }

  // Handle --skip flag (Task 2.4)
  if (options.skip) {
    console.log(chalk.yellow('\n⚠  Skip mode. Calling claude directly.\n'));
    console.log(
      chalk.dim('Your last 5 skipped sessions averaged 5.2 turns. Your PromptOS sessions average 1.4. That\'s your choice to make.\n')
    );
    // TODO: spawn claude directly with rawPrompt
    return;
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
    body: JSON.stringify({ raw_prompt: rawPrompt }),
  }).then((r) => r.json());
  spinner.stop();

  const { session_id } = startRes;
  let turn = 1;
  let done = false;
  let assembled = null;
  let scores = null;

  // Step 2: Question loop
  while (!done) {
    const msgRes = await fetch(`${API}/session/message`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ session_id, user_message: '_start_' }),
    }).then((r) => r.json());

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
    console.log(chalk.cyan(`\nQuestion ${turn} of ~4:`));
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
}

function _printScoreBar(scores) {
  if (!scores) return;
  const bar = (val) => '█'.repeat(Math.floor(val / 10)) + '░'.repeat(10 - Math.floor(val / 10));
  console.log(chalk.bold('\n📊 Session Scores:'));
  console.log(chalk.green(`  Token Efficiency  ${bar(scores.token_efficiency_score)} ${scores.token_efficiency_score}/100`));
  console.log(chalk.blue(`  Thinking Depth    ${bar(scores.thinking_depth_score)} ${scores.thinking_depth_score}/100`));
  console.log(chalk.yellow(`  Dependency        ${bar(scores.dependency_score)} ${scores.dependency_score}/100`));
}
