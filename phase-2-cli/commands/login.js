/**
 * login command — Phase 2, Task 2.1
 *
 * Opens browser to Google OAuth via Supabase.
 * Polls the backend every 2s (up to 300s) to pick up the CLI JWT token.
 * Saves JWT to the OS keychain via keytar.
 */

import open from 'open';
import chalk from 'chalk';
import crypto from 'crypto';
import { saveToken, getToken, deleteToken } from '../utils/auth.js';
import {
  printCompactBanner,
  printPanel,
  printSuccess,
  printError,
  printDim,
  createSpinner,
  colors,
} from '../utils/ui.js';

const API = process.env.PROMPTOS_API_BASE_URL || 'https://prompt-os-dusky.vercel.app';
const DASHBOARD_URL = process.env.PROMPTOS_DASHBOARD_URL || 'https://prompt-os-dashboard.vercel.app';

export async function loginCommand() {
  printCompactBanner('login');

  // Check if user is already logged in
  const existingToken = await getToken();
  if (existingToken) {
    printSuccess('🔑 Existing token found:', existingToken);
    const verifySpinner = createSpinner('Checking existing session…').start();
    try {
      const verifyRes = await fetch(`${API}/auth/verify`, {
        headers: { Authorization: `Bearer ${existingToken}` }
      });
      verifySpinner.stop();
      if (verifyRes.ok) {
        printSuccess('You are already logged in to PromptOS!');
        printDim('Run `promptos stats` to see your usage stats.');
        return;
      } else {
        // Token is invalid, clean it up and proceed to login
        await deleteToken();
      }
    } catch (e) {
      verifySpinner.stop();
      // If backend is unreachable, we'll just ignore and proceed to try login (which will fail later)
      // or we can abort. Let's proceed to login so the user gets the standard error if backend is down.
    }
  }

  const state = crypto.randomBytes(16).toString('hex');
  const loginUrl = `${DASHBOARD_URL}/login?state=${state}`;

  printPanel(
    '🔑 Google Authentication',
    `Opening your browser to complete sign-in.\n` +
    chalk.hex(colors.muted)(`  URL: ${loginUrl}`),
    { borderColor: colors.secondary }
  );

  await open(loginUrl);

  const spinner = createSpinner('Waiting for authentication (up to 300s)…').start();

  for (let i = 0; i < 150; i++) {
    await _sleep(2000);
    try {
      const res = await fetch(`${API}/auth/cli-token?state=${state}`);
      if (res.ok) {
        const { token } = await res.json();
        await saveToken(token);
        spinner.succeed(chalk.hex(colors.accent)('Logged in successfully!'));
        printDim('Run `promptos stats` to see your usage stats.');
        console.log('');
        return;
      }
    } catch {
      // Token not ready yet — keep polling
    }
  }

  spinner.fail(chalk.hex(colors.danger)('Login timed out.'));
  printError('Authentication window expired. Please run `promptos login` again.');
}

function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
