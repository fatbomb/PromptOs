/**
 * stats command — Phase 2, Task 2.1
 *
 * Fetches and displays the user's month-to-date PromptOS statistics.
 */

import chalk from 'chalk';
import { getToken } from '../utils/auth.js';

const API = process.env.PROMPTOS_API_BASE_URL || 'http://localhost:8000';

export async function statsCommand() {
  const token = await getToken();
  if (!token) {
    console.log(chalk.red('Not logged in. Run: promptos login'));
    process.exit(1);
  }

  const summary = await fetch(`${API}/tokens/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());

  console.log(chalk.bold.cyan('\n📈 PromptOS — Month-to-Date Stats\n'));
  console.log(`  Sessions this month : ${chalk.white(summary.sessions_this_month)}`);
  console.log(`  Turns saved         : ${chalk.green(summary.turns_saved)}`);
  console.log(`  Time recovered      : ${chalk.green(summary.time_recovered_min + ' min')}`);
  console.log(`  Cost saved          : ${chalk.green('$' + summary.cost_saved_usd.toFixed(2))}\n`);
}
