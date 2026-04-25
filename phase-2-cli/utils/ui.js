/**
 * PromptOS CLI — Central UI Design System
 *
 * All visual primitives. Import from here instead of using chalk/ora directly.
 */

import chalk from 'chalk';
import gradient from 'gradient-string';
import boxen from 'boxen';
import figures from 'figures';
import ora from 'ora';
import Table from 'cli-table3';
import stripAnsi from 'strip-ansi';

// ─────────────────────────────────────────────
// Colour palette
// ─────────────────────────────────────────────
export const colors = {
  primary:   '#7C3AED', // violet
  secondary: '#06B6D4', // cyan
  accent:    '#10B981', // emerald
  warning:   '#F59E0B', // amber
  danger:    '#EF4444', // red
  muted:     '#6B7280', // grey
  white:     '#F9FAFB',
};

// ─────────────────────────────────────────────
// Logo / Banner
// ─────────────────────────────────────────────
const logoGradient = gradient(['#7C3AED', '#06B6D4', '#10B981']);

export function printBanner(subtitle = '') {
  const logo = [
    '  ██████╗ ██████╗  ██████╗ ███╗   ███╗██████╗ ████████╗ ██████╗ ███████╗',
    '  ██╔══██╗██╔══██╗██╔═══██╗████╗ ████║██╔══██╗╚══██╔══╝██╔═══██╗██╔════╝',
    '  ██████╔╝██████╔╝██║   ██║██╔████╔██║██████╔╝   ██║   ██║   ██║███████╗',
    '  ██╔═══╝ ██╔══██╗██║   ██║██║╚██╔╝██║██╔═══╝    ██║   ██║   ██║╚════██║',
    '  ██║     ██║  ██║╚██████╔╝██║ ╚═╝ ██║██║        ██║   ╚██████╔╝███████║',
    '  ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝        ╚═╝    ╚═════╝ ╚══════╝',
  ];

  console.log('');
  logo.forEach(line => console.log(logoGradient(line)));

  const tagline = subtitle
    ? chalk.hex(colors.muted)(`  ${figures.pointer} ${subtitle}`)
    : chalk.hex(colors.muted)(`  ${figures.pointer} Prompt refinement layer for AI coding assistants`);

  console.log(tagline);
  console.log(chalk.hex(colors.muted)('  ' + '─'.repeat(68)));
  console.log('');
}

export function printCompactBanner(label = '') {
  const tag  = logoGradient(' PromptOS ');
  const ver  = chalk.hex(colors.muted)('v1.0.0');
  const lbl  = label ? chalk.hex(colors.secondary)(` › ${label}`) : '';
  console.log(`\n  ${tag} ${ver}${lbl}\n`);
}

// ─────────────────────────────────────────────
// Generic messages
// ─────────────────────────────────────────────
export function printSuccess(msg) {
  console.log(chalk.hex(colors.accent)(`\n  ${figures.tick}  ${msg}\n`));
}

export function printError(msg) {
  console.log(chalk.hex(colors.danger)(`\n  ${figures.cross}  ${msg}\n`));
}

export function printWarning(msg) {
  console.log(chalk.hex(colors.warning)(`\n  ${figures.warning}  ${msg}\n`));
}

export function printInfo(msg) {
  console.log(chalk.hex(colors.secondary)(`  ${figures.info}  ${msg}`));
}

export function printDim(msg) {
  console.log(chalk.hex(colors.muted)(`  ${msg}`));
}

export function printDivider(width = 68) {
  console.log(chalk.hex(colors.muted)('  ' + '─'.repeat(width)));
}

// ─────────────────────────────────────────────
// Spinner
// ─────────────────────────────────────────────
export function createSpinner(text) {
  return ora({
    text: chalk.hex(colors.secondary)(text),
    spinner: 'dots',
    color: 'cyan',
  });
}

// ─────────────────────────────────────────────
// Panels (boxen-based)
// ─────────────────────────────────────────────
export function printPanel(title, content, opts = {}) {
  const borderColor = opts.borderColor || colors.primary;
  const titleStr = title
    ? gradient(['#7C3AED', '#06B6D4'])(` ${title} `)
    : undefined;

  const box = boxen(chalk.hex(colors.white)(content), {
    padding:     { top: 0, bottom: 0, left: 1, right: 1 },
    margin:      { top: 0, bottom: 0, left: 2, right: 2 },
    borderStyle: 'round',
    borderColor: borderColor,
    title:       titleStr,
    titleAlignment: 'left',
    ...opts.boxen,
  });

  console.log(box);
}

export function printAssembledPrompt(prompt, tool = null) {
  const toolLabel = tool
    ? chalk.hex(colors.secondary)(` optimised for ${tool}`)
    : '';
  const titleStr = gradient(['#10B981', '#06B6D4'])(' ✦ Assembled Prompt') + toolLabel;

  const box = boxen(chalk.hex(colors.white)(prompt), {
    padding:     { top: 1, bottom: 1, left: 2, right: 2 },
    margin:      { top: 0, bottom: 0, left: 2, right: 2 },
    borderStyle: 'round',
    borderColor: colors.accent,
    title:       titleStr,
    titleAlignment: 'left',
  });

  console.log('\n' + box + '\n');
}

// ─────────────────────────────────────────────
// Question display with step indicator
// ─────────────────────────────────────────────
export function printQuestion(turn, maxTurns, question, mode = 'default') {
  // Step dots:  ● ● ○ ○ ○
  const dots = Array.from({ length: maxTurns }, (_, i) =>
    i < turn
      ? chalk.hex(colors.primary)(figures.bullet)
      : chalk.hex(colors.muted)(figures.circle)
  ).join(' ');

  const modeTag = mode === 'mid'
    ? chalk.hex(colors.warning)(' [mid]')
    : mode === 'skip'
    ? chalk.hex(colors.danger)(' [skip]')
    : '';

  const header = `  ${chalk.hex(colors.muted)('Question')} ${chalk.hex(colors.secondary).bold(turn)} ${chalk.hex(colors.muted)(`of ~${maxTurns}`)}${modeTag}   ${dots}`;

  const box = boxen(chalk.hex(colors.white)(question), {
    padding:     { top: 0, bottom: 0, left: 1, right: 1 },
    margin:      { top: 0, bottom: 0, left: 2, right: 2 },
    borderStyle: 'round',
    borderColor: colors.primary,
    title:       header,
    titleAlignment: 'left',
  });

  console.log('\n' + box);
}

// ─────────────────────────────────────────────
// Score bars
// ─────────────────────────────────────────────
const scoreGradient = gradient(['#EF4444', '#F59E0B', '#10B981']);

function scoreBar(val) {
  const filled = Math.round((val / 100) * 20);
  const empty  = 20 - filled;
  const bar    = '█'.repeat(filled) + chalk.hex(colors.muted)('░'.repeat(empty));
  return scoreGradient(bar);
}

function scoreLabel(val) {
  if (val >= 75) return chalk.hex(colors.accent).bold(String(val));
  if (val >= 40) return chalk.hex(colors.warning).bold(String(val));
  return chalk.hex(colors.danger).bold(String(val));
}

export function printScoreBars(scores) {
  if (!scores) return;

  const rows = [
    ['Token Efficiency', scores.token_efficiency_score ?? 0],
    ['Thinking Depth',   scores.thinking_depth_score   ?? 0],
    ['AI Dependency',    scores.dependency_score        ?? 0],
  ];

  const table = new Table({
    head: [
      chalk.hex(colors.muted)('Metric'),
      chalk.hex(colors.muted)('Score'),
      chalk.hex(colors.muted)('Bar'),
    ],
    style: { head: [], border: ['grey'], 'padding-left': 2, 'padding-right': 2 },
    chars: {
      'top':    '─', 'top-mid': '┬', 'top-left': '╭', 'top-right': '╮',
      'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '╰', 'bottom-right': '╯',
      'left': '│', 'right': '│', 'mid': '─', 'mid-mid': '┼',
      'left-mid': '├', 'right-mid': '┤', 'middle': '│',
    },
  });

  rows.forEach(([label, val]) => {
    table.push([
      chalk.hex(colors.white)(label),
      scoreLabel(val) + chalk.hex(colors.muted)('/100'),
      scoreBar(val),
    ]);
  });

  console.log('\n' + table.toString().split('\n').map(l => '  ' + l).join('\n') + '\n');
}

// ─────────────────────────────────────────────
// Quality Comparison
// ─────────────────────────────────────────────
export function printQualityComparison(rawScore, assembledScore, delta) {
  if (rawScore == null || assembledScore == null) return;

  const deltaStr = delta > 0 
    ? chalk.hex(colors.accent)(`(+${delta} ✦)`) 
    : delta < 0 
    ? chalk.hex(colors.danger)(`(${delta} ✦)`) 
    : chalk.hex(colors.muted)(`(0 ✦)`);

  const table = new Table({
    head: [
      gradient(['#7C3AED', '#06B6D4'])(' Prompt Quality'),
      chalk.hex(colors.muted)('Score'),
      chalk.hex(colors.muted)('Bar'),
    ],
    style: { head: [], border: ['grey'], 'padding-left': 2, 'padding-right': 2 },
    chars: {
      'top':    '─', 'top-mid': '┬', 'top-left': '╭', 'top-right': '╮',
      'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '╰', 'bottom-right': '╯',
      'left': '│', 'right': '│', 'mid': '─', 'mid-mid': '┼',
      'left-mid': '├', 'right-mid': '┤', 'middle': '│',
    },
  });

  table.push([
    chalk.hex(colors.muted)('Raw prompt score'),
    scoreLabel(rawScore) + chalk.hex(colors.muted)('/100'),
    scoreBar(rawScore),
  ]);

  table.push([
    chalk.hex(colors.white).bold('Refined score'),
    scoreLabel(assembledScore) + chalk.hex(colors.muted)('/100  ') + deltaStr,
    scoreBar(assembledScore),
  ]);

  console.log('\n' + table.toString().split('\n').map(l => '  ' + l).join('\n') + '\n');
}

// ─────────────────────────────────────────────
// Mode announcement
// ─────────────────────────────────────────────
export function printModeAnnouncement(mode, targetTool = null) {
  const tool = targetTool ? chalk.hex(colors.secondary).bold(targetTool) : 'your target tool';

  if (mode === 'skip') {
    printPanel(
      '⚡ Skip Mode',
      `Generating an optimised prompt for ${tool} without asking questions.\n` +
      chalk.hex(colors.muted)('  Tip: use --mid for just 1–3 quick questions and sharper results.'),
      { borderColor: colors.warning }
    );
  } else if (mode === 'mid') {
    printPanel(
      '⚡ Mid Mode',
      `At most 3 quick questions, then an optimised prompt for ${tool}.`,
      { borderColor: colors.secondary }
    );
  }
}

// ─────────────────────────────────────────────
// Receipt (session summary)
// ─────────────────────────────────────────────
export function printReceipt({ rawPrompt, scores, summary, mode, targetTool }) {
  const turnsWithout      = Math.max(1, 6 - Math.floor((scores?.thinking_depth_score ?? 0) / 20));
  const turnsWithPromptOS = mode === 'skip' ? 0 : mode === 'mid' ? 2 : 1;
  const timeWithout       = (turnsWithout * 40 / 60).toFixed(1);
  const timeWith          = (Math.max(turnsWithPromptOS, 1) * 40 / 60).toFixed(1);
  const timeRecovered     = Math.max(0, (turnsWithout - Math.max(turnsWithPromptOS, 1)) * 40 / 60).toFixed(1);

  const depCurrent = scores?.dependency_score ?? 0;
  const depPrev    = summary?.prev_dependency_score ?? depCurrent;
  const depTrend   = depCurrent < depPrev
    ? chalk.hex(colors.accent)('↓ improving')
    : depCurrent > depPrev
    ? chalk.hex(colors.warning)('↑ watch out')
    : chalk.hex(colors.muted)('→ steady');

  const truncated  = rawPrompt.length > 40 ? rawPrompt.slice(0, 37) + '…' : rawPrompt;
  const toolStr    = targetTool ? chalk.hex(colors.secondary)(targetTool) : chalk.hex(colors.muted)('general');
  const modeStr    = mode === 'skip'
    ? chalk.hex(colors.warning)('skip')
    : mode === 'mid'
    ? chalk.hex(colors.secondary)('mid')
    : chalk.hex(colors.accent)('full');

  const table = new Table({
    style: { head: [], border: ['grey'], 'padding-left': 1, 'padding-right': 1 },
    colWidths: [24, 32],
    chars: {
      'top':    '─', 'top-mid': '┬', 'top-left': '╭', 'top-right': '╮',
      'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '╰', 'bottom-right': '╯',
      'left': '│', 'right': '│', 'mid': '─', 'mid-mid': '┼',
      'left-mid': '├', 'right-mid': '┤', 'middle': '│',
    },
  });

  table.push(
    [{ colSpan: 2, content: gradient(['#7C3AED','#06B6D4','#10B981'])('  SESSION RECEIPT'), hAlign: 'center' }],
    [chalk.hex(colors.muted)('Prompt'), chalk.hex(colors.white)(`"${truncated}"`)],
    [chalk.hex(colors.muted)('Mode'), modeStr],
    [chalk.hex(colors.muted)('Target Tool'), toolStr],
    [chalk.hex(colors.muted)(''), ''],
    [chalk.hex(colors.muted)('Without PromptOS'), chalk.hex(colors.white)(`~${turnsWithout} turns  ·  ${timeWithout} min`)],
    [chalk.hex(colors.muted)('With PromptOS'),    chalk.hex(colors.white)(`${Math.max(turnsWithPromptOS,1)} turn   ·  ${timeWith} min`)],
    [chalk.hex(colors.accent)('Time Recovered'),  chalk.hex(colors.accent).bold(`✦ ${timeRecovered} minutes`)],
    [chalk.hex(colors.muted)(''), ''],
    [chalk.hex(colors.muted)('AI Dependency'),    `${depCurrent}/100  ${depTrend}`],
  );

  if (summary) {
    const sessions = summary.sessions_this_month ?? 0;
    const mins     = (summary.time_recovered_min ?? 0).toFixed(0);
    table.push(
      [chalk.hex(colors.muted)('This Month'), chalk.hex(colors.white)(`${sessions} sessions  ·  ${mins}m recovered`)],
    );
  }

  console.log('\n' + table.toString().split('\n').map(l => '  ' + l).join('\n') + '\n');
}
