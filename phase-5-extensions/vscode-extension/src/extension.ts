/**
 * VS Code Extension — Activation
 * Phase 5, Task 5.1
 *
 * - Registers the PromptOS sidebar webview panel
 * - Handles JWT storage in vscode.SecretStorage
 * - Routes messages between webview and backend API
 */

import * as vscode from 'vscode';
import { extractWorkspaceContext } from './contextExtractor';
import { PromptosSidebarProvider } from './sidebarProvider';

export function activate(context: vscode.ExtensionContext) {
  // Register the sidebar webview provider (Task 5.1)
  const provider = new PromptosSidebarProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('promptos.sidebar', provider)
  );

  // Command: start a session from the command palette
  context.subscriptions.push(
    vscode.commands.registerCommand('promptos.startSession', async () => {
      // Extract workspace context (Task 5.2) and pass to sidebar
      const wsContext = await extractWorkspaceContext();
      provider.startSession(wsContext);
    })
  );

  vscode.window.showInformationMessage('PromptOS is ready.');
}

export function deactivate() {}
