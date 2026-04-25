/**
 * ask command — Phase 2, Task 2.2
 *
 * Full conversational refinement flow in the terminal:
 *   1. POST /session/start
 *   2. Loop: show question panel → read input → POST /session/message
 *   3. On done: show assembled prompt panel + score bars
 *   4. POST /session/complete → print Cost Receipt
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { deleteToken } from '../utils/auth.js';
import {
  printCompactBanner,
  printModeAnnouncement,
  printQuestion,
  printAssembledPrompt,
  printScoreBars,
  printQualityComparison,
  printReceipt,
  printError,
  printWarning,
  printDim,
  createSpinner,
  colors,
} from '../utils/ui.js';
import { ensureAuth } from '../utils/ensure-auth.js';

const API = process.env.PROMPTOS_API_BASE_URL || 'http://localhost:8000';

export async function askCommand(rawPrompt, options, targetTool = null) {
  const token = await ensureAuth();

  // Determine mode
  let mode = 'default';
  if (options.skip) mode = 'skip';
  else if (options.mid) mode = 'mid';

  // Show banner
  const toolLabel = targetTool ? ` → ${targetTool}` : '';
  printCompactBanner(`ask${toolLabel}  [${mode} mode]`);

  // Mode announcement
  printModeAnnouncement(mode, targetTool);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // ─── Step 1: Start session ───────────────────────────────────────
  const spinner = createSpinner('Starting session…').start();

  let startRes;
  try {
    startRes = await fetch(`${API}/session/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ raw_prompt: rawPrompt, mode, target_tool: targetTool }),
    }).then((r) => r.json());
    
    if (startRes.detail) {
      spinner.fail('Failed to start session');
      printError(`PromptOS error: ${startRes.detail}`);
      if (startRes.detail.includes('Invalid token')) {
        await deleteToken();
        printWarning('Your session expired. You have been logged out. Try `promptos login` again.');
      }
      return;
    }
    
    spinner.succeed(chalk.hex(colors.accent)('Session started'));
  } catch (err) {
    spinner.fail('Failed to reach PromptOS API');
    printError(`Could not connect to ${API}. Is the backend running?`);
    return;
  }

  const { session_id } = startRes;
  const maxTurns = mode === 'mid' ? 3 : 6;
  let turn = 1;
  let done = false;
  let assembled = null;
  let scores = null;

  // ─── Step 2: Question loop ───────────────────────────────────────
  while (!done) {
    const fetchSpinner = createSpinner('Thinking…').start();

    let response;
    try {
      response = await fetch(`${API}/session/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id,
          user_message: turn === 1 ? '_start_' : '_continue_',
        }),
      });
    } catch (err) {
      fetchSpinner.fail('Connection failed');
      printError('Could not reach PromptOS API. Did the backend go offline?');
      return;
    }

    fetchSpinner.stop();

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      printError(`PromptOS error: ${err.detail || response.statusText}`);
      if (err.detail && err.detail.includes('Invalid token')) {
        await deleteToken();
        printWarning('Your session expired. You have been logged out. Try `promptos login` again.');
      }
      return;
    }

    const msgRes = await response.json();

    if (msgRes.done) {
      done = true;
      assembled = msgRes.assembled_prompt;
      scores = msgRes.scores;

      if (msgRes.should_refuse) {
        printWarning(msgRes.message || 'You already know the answer. Try implementing it.');
        return;
      }
      break;
    }

    // Show the question in a framed panel
    printQuestion(turn, maxTurns, msgRes.question, mode);

    const { answer } = await inquirer.prompt([
      {
        type: 'input',
        name: 'answer',
        message: chalk.hex(colors.secondary)('>'),
        prefix: '  ',
      },
    ]);

    // Skip empty answers gracefully
    if (!answer.trim()) {
      printDim('  (skipped — continuing…)');
    }

    const postSpinner = createSpinner('Processing…').start();
    try {
      const postRes = await fetch(`${API}/session/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ session_id, user_message: answer || '_skip_' }),
      }).then((r) => r.json());
      postSpinner.stop();
      
      if (postRes.detail) {
        printError(`PromptOS error: ${postRes.detail}`);
        if (postRes.detail.includes('Invalid token')) {
          await deleteToken();
          printWarning('Your session expired. You have been logged out. Try `promptos login` again.');
        }
        return;
      }
    } catch (err) {
      postSpinner.fail('Connection failed');
      printError('Could not reach PromptOS API.');
      return;
    }

    turn++;
  }

  // ─── Step 3: Assembled prompt + scores ──────────────────────────
  if (assembled) {
    printAssembledPrompt(assembled, targetTool);
    printQualityComparison(
      scores?.raw_specificity_score,
      scores?.assembled_specificity_score,
      scores?.quality_delta
    );
    printScoreBars(scores);
  }

  const completeSpinner = createSpinner('Finalising session…').start();
  let summary = null;
  try {
    const compRes = await fetch(`${API}/session/complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ session_id }),
    }).then((r) => r.json());
    completeSpinner.stop();

    if (compRes.detail) {
      printError(`PromptOS error: ${compRes.detail}`);
      if (compRes.detail.includes('Invalid token')) {
        await deleteToken();
        printWarning('Your session expired. You have been logged out. Try `promptos login` again.');
      }
      return;
    }

    summary = await fetch(`${API}/tokens/summary`, { headers }).then((r) => r.json());
  } catch (err) {
    completeSpinner.stop();
    printError('Could not reach PromptOS API to complete session.');
  }

  printReceipt({ rawPrompt, scores, summary, mode, targetTool });

  return assembled;
}
