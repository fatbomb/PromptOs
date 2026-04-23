/**
 * Sidebar Webview Provider — Phase 5, Task 5.1 & 5.3
 *
 * Registers the React webview in the PromptOS sidebar.
 * Handles message passing between the webview and the extension host.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { WorkspaceContext } from './contextExtractor';
import { ApiClient } from './utils/api';

const API_BASE = vscode.workspace.getConfiguration('promptos').get('apiUrl', 'http://localhost:8000');

export class PromptosSidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _api: ApiClient;

  constructor(private readonly _context: vscode.ExtensionContext) {
    this._api = new ApiClient(API_BASE, _context.secrets);
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri],
    };

    webviewView.webview.html = this._getHtml(webviewView.webview);

    // Handle messages from React webview
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case 'startSession': {
          const result = await this._api.startSession(msg.rawPrompt, msg.workspaceContext);
          webviewView.webview.postMessage({ type: 'sessionStarted', sessionId: result.session_id });
          break;
        }
        case 'sendMessage': {
          const result = await this._api.sendMessage(msg.sessionId, msg.userMessage);
          webviewView.webview.postMessage({ type: 'messageResponse', ...result });
          break;
        }
        case 'completeSession': {
          await this._api.completeSession(msg.sessionId);
          const summary = await this._api.getTokenSummary();
          webviewView.webview.postMessage({ type: 'sessionComplete', summary });
          break;
        }
        case 'sendToTerminal': {
          // Task 5.3 — paste assembled prompt into terminal
          await vscode.commands.executeCommand('workbench.action.terminal.sendSequence', {
            text: msg.assembledPrompt + '\n',
          });
          break;
        }
        case 'login': {
          // Open dashboard login in browser
          vscode.env.openExternal(vscode.Uri.parse(`${API_BASE.replace('8000', '3000')}/auth/login`));
          break;
        }
      }
    });
  }

  startSession(workspaceContext: WorkspaceContext) {
    this._view?.webview.postMessage({ type: 'autoStartSession', workspaceContext });
  }

  private _getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, 'out', 'webview.js')
    );
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PromptOS</title>
  <style>
    body { margin: 0; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); font-family: var(--vscode-font-family); }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
