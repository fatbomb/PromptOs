/**
 * login command — Phase 2, Task 2.1
 *
 * Opens browser to Google OAuth via Supabase.
 * Polls the backend every 2s (up to 60s) to pick up the CLI JWT token.
 * Saves JWT to ~/.promptos/token via keytar.
 */

import open from 'open';
import ora from 'ora';
import chalk from 'chalk';
import crypto from 'crypto';
import { saveToken } from '../utils/auth.js';

const API = process.env.PROMPTOS_API_BASE_URL || 'http://localhost:8000';
const DASHBOARD_URL = process.env.PROMPTOS_DASHBOARD_URL || 'http://localhost:3000';

export async function loginCommand() {
  const state = crypto.randomBytes(16).toString('hex');
  const loginUrl = `${DASHBOARD_URL}/auth/login?state=${state}`;

  console.log(chalk.cyan('\n🔑 Opening browser for Google login...\n'));
  await open(loginUrl);

  const spinner = ora('Waiting for authentication (60s timeout)...').start();

  // Poll every 2 seconds for up to 60 seconds
  for (let i = 0; i < 30; i++) {
    await _sleep(2000);
    try {
      const res = await fetch(`${API}/auth/cli-token?state=${state}`);
      if (res.ok) {
        const { token } = await res.json();
        await saveToken(token);
        spinner.succeed(chalk.green('Logged in successfully! ✓'));
        console.log(chalk.dim('\nRun `promptos stats` to see your profile.\n'));
        return;
      }
    } catch {
      // Token not ready yet — keep polling
    }
  }

  spinner.fail(chalk.red('Login timed out. Please try again.'));
}

function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
