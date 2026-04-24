/**
 * Sidebar Webview Provider — Phase 5, Task 5.1 & 5.3
 */

import * as vscode from 'vscode';
import { WorkspaceContext } from './contextExtractor';
import { ApiClient } from './utils/api';

export class PromptosSidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _api: ApiClient;

  constructor(private readonly _context: vscode.ExtensionContext) {
    this._api = this._buildClient();

    // Rebuild client if user changes the API URL in settings
    _context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('promptos.apiUrl')) {
          this._api = this._buildClient();
        }
      })
    );
  }

  private _buildClient(): ApiClient {
    const apiUrl = vscode.workspace
      .getConfiguration('promptos')
      .get<string>('apiUrl', 'http://localhost:8000');
    return new ApiClient(apiUrl, this._context.secrets);
  }

  private get _apiBase(): string {
    return vscode.workspace
      .getConfiguration('promptos')
      .get<string>('apiUrl', 'http://localhost:8000');
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri],
    };
    webviewView.webview.html = this._getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      try {
        await this._handleMessage(msg, webviewView.webview);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        webviewView.webview.postMessage({ type: 'error', message });
        vscode.window.showErrorMessage(`PromptOS: ${message}`);
      }
    });
  }

  private async _handleMessage(msg: { type: string; [key: string]: unknown }, webview: vscode.Webview) {
    switch (msg.type) {
      case 'startSession': {
        const result = await this._api.startSession(msg.rawPrompt as string, msg.workspaceContext as object) as { session_id: string };
        webview.postMessage({ type: 'sessionStarted', sessionId: result.session_id });
        break;
      }
      case 'sendMessage': {
        const result = await this._api.sendMessage(msg.sessionId as string, msg.userMessage as string);
        webview.postMessage({ type: 'messageResponse', ...(result as object) });
        break;
      }
      case 'completeSession': {
        await this._api.completeSession(msg.sessionId as string);
        const summary = await this._api.getTokenSummary();
        webview.postMessage({ type: 'sessionComplete', summary });
        break;
      }
      case 'sendToTerminal': {
        let terminal = vscode.window.activeTerminal;
        if (!terminal) {
          terminal = vscode.window.createTerminal('PromptOS');
        }
        terminal.show();
        terminal.sendText(msg.assembledPrompt as string);
        break;
      }
      case 'login': {
        const state = Math.random().toString(36).substring(7);
        const base = new URL(this._apiBase);
        base.port = '3000';
        base.pathname = '/login';
        base.searchParams.set('state', state);

        vscode.env.openExternal(vscode.Uri.parse(base.toString()));

        // Start polling for token (Task 5.1 Auth handoff)
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          if (attempts > 30) {
            clearInterval(poll);
            return;
          }

          try {
            const res = await fetch(`${this._apiBase}/auth/cli-token?state=${state}`);
            if (res.ok) {
              const { token } = (await res.json()) as { token: string };
              await this._api.storeToken(token);
              webview.postMessage({ type: 'loginSuccess' });
              vscode.window.showInformationMessage('PromptOS: Logged in successfully!');
              clearInterval(poll);
            }
          } catch (err) {
            // Keep polling
          }
        }, 2000);
        break;
      }
    }
  }

  startSession(workspaceContext: WorkspaceContext) {
    this._view?.webview.postMessage({ type: 'autoStartSession', workspaceContext });
  }

  private _getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, 'out', 'webview.js')
    );
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';" />
  <title>PromptOS</title>
  <style>
    body { margin: 0; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); font-family: var(--vscode-font-family); }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
