/**
 * stats command — Phase 2, Task 2.1
 *
 * Fetches and displays the user's month-to-date PromptOS statistics.
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import { deleteToken } from '../utils/auth.js';
import {
  printCompactBanner,
  printError,
  printWarning,
  createSpinner,
  colors,
} from '../utils/ui.js';
import { ensureAuth } from '../utils/ensure-auth.js';

const API = process.env.PROMPTOS_API_BASE_URL || 'https://prompt-os-dusky.vercel.app';

export async function statsCommand() {
  const token = await ensureAuth();

  printCompactBanner('stats');

  const spinner = createSpinner('Fetching your stats…').start();

  let summary;
  try {
    summary = await fetch(`${API}/tokens/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
  } catch (err) {
    spinner.fail('Connection failed');
    printError(`Could not connect to PromptOS API (${API}). Is the backend running?`);
    return;
  }

  spinner.stop();

  if (!summary || summary.detail) {
    printError(`Failed to load stats: ${summary?.detail || 'Unknown error'}`);
    if (summary?.detail?.includes('Invalid token')) {
      await deleteToken();
      printWarning('Your session expired. You have been logged out. Try `promptos login` again.');
    }
    return;
  }

  // ─── Build stat table ────────────────────────────────────────────
  const table = new Table({
    style: { head: [], border: ['grey'], 'padding-left': 2, 'padding-right': 2 },
    colWidths: [28, 24],
    chars: {
      'top':    '─', 'top-mid': '┬', 'top-left': '╭', 'top-right': '╮',
      'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '╰', 'bottom-right': '╯',
      'left': '│', 'right': '│', 'mid': '─', 'mid-mid': '┼',
      'left-mid': '├', 'right-mid': '┤', 'middle': '│',
    },
  });

  const sessions   = summary.sessions_this_month ?? 0;
  const turnsSaved = summary.turns_saved          ?? 0;
  const timeMin    = (summary.time_recovered_min  ?? 0).toFixed(1);
  const costSaved  = (summary.cost_saved_usd      ?? 0).toFixed(2);
  const dep        = summary.avg_dependency_score ?? summary.prev_dependency_score ?? '—';

  table.push(
    [{ colSpan: 2, content: chalk.hex(colors.secondary).bold('  Month-to-Date Summary'), hAlign: 'left' }],
    [chalk.hex(colors.muted)('🗓  Sessions this month'),  chalk.hex(colors.white).bold(String(sessions))],
    [chalk.hex(colors.muted)('💬 Turns saved'),           chalk.hex(colors.accent).bold(String(turnsSaved))],
    [chalk.hex(colors.muted)('⏱  Time recovered'),        chalk.hex(colors.accent).bold(`${timeMin} min`)],
    [chalk.hex(colors.muted)('💰 Cost saved'),             chalk.hex(colors.accent).bold(`$${costSaved}`)],
    [chalk.hex(colors.muted)('🧠 Avg AI dependency'),      chalk.hex(dep > 60 ? colors.warning : colors.accent).bold(`${dep}/100`)],
  );

  console.log('\n' + table.toString().split('\n').map(l => '  ' + l).join('\n') + '\n');
}
