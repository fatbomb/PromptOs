/**
 * Workspace Context Extractor — Phase 5, Task 5.2
 *
 * Automatically extracts context from the VS Code workspace so the AI can
 * skip questions it can auto-answer (e.g. "which file?").
 *
 * Extracts:
 *   - Active file path
 *   - Selected text / highlighted error
 *   - Last N lines of terminal output (Shell Integration API, VS Code 1.77+)
 *   - Git staged diff
 */

import * as vscode from 'vscode';

export interface WorkspaceContext {
  file_path?: string;
  selected_text?: string;
  terminal_output?: string;
  git_diff?: string;
}

export async function extractWorkspaceContext(): Promise<WorkspaceContext> {
  const ctx: WorkspaceContext = {};

  // 1. Active file path
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    ctx.file_path = editor.document.uri.fsPath;

    // 2. Selected text or error message
    const selection = editor.selection;
    if (!selection.isEmpty) {
      ctx.selected_text = editor.document.getText(selection);
    }
  }

  // 3. Terminal output via Shell Integration API (VS Code 1.77+)
  // TODO: read from the active terminal's shell integration buffer
  // const terminal = vscode.window.activeTerminal;
  // if (terminal?.shellIntegration) {
  //   ctx.terminal_output = await readLastTerminalLines(terminal, 20);
  // }

  // 4. Git staged diff
  try {
    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    const api = gitExtension?.getAPI(1);
    const repo = api?.repositories?.[0];
    if (repo) {
      const diff = await repo.diff(true); // true = staged
      ctx.git_diff = diff?.substring(0, 2000); // truncate for prompt safety
    }
  } catch {
    // Git extension not available — silently skip
  }

  return ctx;
}
