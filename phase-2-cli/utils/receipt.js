/**
 * Cost Receipt Printer — Phase 2, Task 2.3
 *
 * Prints the iconic terminal receipt after every session.
 * Must render within 200ms of session completion.
 *
 * Usage:
 *   import { printReceipt } from './utils/receipt.js';
 *   printReceipt({ rawPrompt, scores, summary });
 */

import chalk from 'chalk';

/**
 * @param {object} opts
 * @param {string}  opts.rawPrompt  - The original raw prompt the user typed
 * @param {object}  opts.scores     - Scores from the backend (thinking_depth_score, etc.)
 * @param {object}  opts.summary    - Month-to-date totals from /tokens/summary
 */
export function printReceipt({ rawPrompt, scores, summary }) {
  const turnsWithout   = Math.max(1, 6 - Math.floor((scores?.thinking_depth_score ?? 0) / 20));
  const turnsWithPromptOS = 1;
  const timeWithout    = (turnsWithout * 40 / 60).toFixed(1);
  const timeWith       = (turnsWithPromptOS * 40 / 60).toFixed(1);
  const timeRecovered  = (turnsWithout * 40 / 60 - turnsWithPromptOS * 40 / 60).toFixed(1);

  const depCurrent = scores?.dependency_score ?? 0;
  const depPrev    = summary?.prev_dependency_score ?? depCurrent;
  const depTrend   = depCurrent < depPrev ? '↓ improving' : depCurrent > depPrev ? '↑ check in' : '→ steady';

  const truncated = rawPrompt.length > 28 ? rawPrompt.slice(0, 25) + '...' : rawPrompt;
  const wordCount = rawPrompt.split(' ').length;

  const line = (content = '') => `║  ${content.padEnd(40)}║`;
  const top  = '╔══════════════════════════════════════════╗';
  const bot  = '╚══════════════════════════════════════════╝';
  const div  = '║                                          ║';

  console.log('\n' + chalk.bold.cyan(top));
  console.log(chalk.bold.cyan(line('SESSION RECEIPT — promptos')));
  console.log(chalk.bold.cyan(div));
  console.log(chalk.cyan(line(`You typed:  "${truncated}"`)));
  console.log(chalk.cyan(line(`Words:       ${wordCount}`)));
  console.log(chalk.cyan(div));
  console.log(chalk.cyan(line(`Without PromptOS:  ~${turnsWithout} turns, ${timeWithout} min`)));
  console.log(chalk.cyan(line(`With PromptOS:      ${turnsWithPromptOS} turn,  ${timeWith} min`)));
  console.log(chalk.green(line(`Time recovered:  ✓  ${timeRecovered} minutes`)));
  console.log(chalk.cyan(div));

  if (summary) {
    const sessions = summary.sessions_this_month ?? 0;
    const mins     = summary.time_recovered_min?.toFixed(0) ?? 0;
    console.log(chalk.cyan(line(`This month:  ${sessions} sessions · ${mins}m back`)));
  }

  console.log(chalk.cyan(line(`Dependency:  ${depPrev} → ${depCurrent}  (${depTrend})`)));
  console.log(chalk.bold.cyan(bot));
  console.log('');
}
