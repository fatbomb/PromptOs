import chalk from 'chalk';
import { getToken } from './utils/auth.js';

const API = process.env.PROMPTOS_API_BASE_URL || 'http://localhost:8000';

async function runTests() {
  console.log(chalk.bold.cyan('🧪 Running PromptOS CLI Diagnostics...\n'));

  // Test 1: Env Vars
  console.log(chalk.yellow('1. Checking Environment Variables...'));
  if (process.env.PROMPTOS_API_BASE_URL) {
    console.log(chalk.green('   ✓ PROMPTOS_API_BASE_URL is set'));
  } else {
    console.log(chalk.dim('   ℹ PROMPTOS_API_BASE_URL not set in ENV, defaulting to http://localhost:8000'));
  }

  // Test 2: Backend Health
  console.log(chalk.yellow('\n2. Pinging Backend Server...'));
  try {
    const res = await fetch(`${API}/health`);
    if (res.ok) {
      console.log(chalk.green(`   ✓ Backend is reachable at ${API}`));
    } else {
      console.log(chalk.red(`   ❌ Backend responded with status ${res.status}`));
    }
  } catch (err) {
    console.log(chalk.red(`   ❌ Cannot reach backend at ${API}. Is it running?`));
    console.log(chalk.dim(`      Run: cd ../phase-1-backend && python server_local.py`));
  }

  // Test 3: Authentication
  console.log(chalk.yellow('\n3. Checking CLI Authentication...'));
  try {
    const token = await getToken();
    if (token) {
      console.log(chalk.green('   ✓ Local development token found in keychain'));
    } else {
      console.log(chalk.red('   ❌ No token found. You need to log in.'));
      console.log(chalk.dim('      Generate a token: python ../phase-1-backend/generate_test_token.py'));
      console.log(chalk.dim('      Inject it: node index.js dev-login <TOKEN>'));
    }
  } catch (err) {
    console.log(chalk.red('   ❌ Failed to access secure keychain:'), err.message);
  }

  console.log(chalk.bold.cyan('\n✨ Diagnostics Complete!'));
}

runTests();
