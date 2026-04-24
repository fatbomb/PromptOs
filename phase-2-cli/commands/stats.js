/**
 * stats command — Phase 2, Task 2.1
 *
 * Fetches and displays the user's month-to-date PromptOS statistics.
 */

import chalk from 'chalk';
import { ensureAuth } from '../utils/ensure-auth.js';

const API = process.env.PROMPTOS_API_BASE_URL || 'http://localhost:8000';

export async function statsCommand() {
  const token = await ensureAuth();

  const summary = await fetch(`${API}/tokens/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());

  if (!summary || summary.detail) {
    console.log(chalk.red(`Error fetching stats: ${summary?.detail || 'Unknown error'}`));
    if (summary?.detail?.includes('Invalid token')) {
      console.log(chalk.yellow('Your session might have expired. Try logging in again.'));
    }
    return;
  }

  console.log(chalk.bold.cyan('\n📈 PromptOS — Month-to-Date Stats\n'));
  console.log(`  Sessions this month : ${chalk.white(summary.sessions_this_month ?? 0)}`);
  console.log(`  Turns saved         : ${chalk.green(summary.turns_saved ?? 0)}`);
  console.log(`  Time recovered      : ${chalk.green((summary.time_recovered_min ?? 0) + ' min')}`);
  console.log(`  Cost saved          : ${chalk.green('$' + (summary.cost_saved_usd ?? 0).toFixed(2))}\n`);
}
