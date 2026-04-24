/**
 * Sidebar Webview Provider — Phase 5, Task 5.1 & 5.3
 *
 * Registers the React webview in the PromptOS sidebar.
 * Handles message passing between the webview and the extension host.
 * Enforces login — sends auth state to webview on load.
 */

import * as vscode from 'vscode';
import { WorkspaceContext } from './contextExtractor';
import { ApiClient } from './utils/api';

export class PromptosSidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _api: ApiClient;
  private _apiBase: string;
  private _dashboardBase: string;

  constructor(private readonly _context: vscode.ExtensionContext) {
    this._apiBase = vscode.workspace
      .getConfiguration('promptos')
      .get<string>('apiUrl', 'http://localhost:8000');
    this._dashboardBase = this._apiBase.replace('8000', '3000');
    this._api = new ApiClient(this._apiBase, _context.secrets);
  }

  async resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri],
    };

    webviewView.webview.html = this._getHtml(webviewView.webview);

    // Send initial auth state once webview is ready
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {

        // ── Webview ready — send auth state ──────────────────────────────
        case 'ready': {
          const loggedIn = await this._api.isLoggedIn();
          webviewView.webview.postMessage({ type: 'authState', loggedIn });
          break;
        }

        // ── Login — open browser + poll for JWT ──────────────────────────
        case 'login': {
          // Use vscode's built-in randomness via a simple timestamp+random combo
          const state = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
          const loginUrl = `${this._dashboardBase}/login?state=${state}`;
          await vscode.env.openExternal(vscode.Uri.parse(loginUrl));

          // Poll every 2s for up to 60s
          webviewView.webview.postMessage({ type: 'loginPolling' });
          let found = false;
          for (let i = 0; i < 30; i++) {
            await _sleep(2000);
            try {
              const token = await this._api.pollForCliToken(state);
              if (token) {
                await this._api.storeToken(token);
                found = true;
                webviewView.webview.postMessage({ type: 'authState', loggedIn: true });
                break;
              }
            } catch { /* keep polling */ }
          }
          if (!found) {
            webviewView.webview.postMessage({ type: 'loginTimeout' });
          }
          break;
        }

        // ── Logout ────────────────────────────────────────────────────────
        case 'logout': {
          await this._api.clearToken();
          webviewView.webview.postMessage({ type: 'authState', loggedIn: false });
          break;
        }

        // ── Session flow ──────────────────────────────────────────────────
        case 'startSession': {
          try {
            const result = await this._api.startSession(msg.rawPrompt, msg.workspaceContext);
            webviewView.webview.postMessage({ type: 'sessionStarted', sessionId: result.session_id });
          } catch (e: unknown) {
            if ((e as Error).message === 'UNAUTHORIZED') {
              await this._api.clearToken();
              webviewView.webview.postMessage({ type: 'authState', loggedIn: false });
            } else {
              webviewView.webview.postMessage({ type: 'sessionError', error: String(e) });
            }
          }
          break;
        }

        case 'sendMessage': {
          try {
            const result = await this._api.sendMessage(msg.sessionId, msg.userMessage);
            webviewView.webview.postMessage({ type: 'messageResponse', ...result });
          } catch (e: unknown) {
            if ((e as Error).message === 'UNAUTHORIZED') {
              await this._api.clearToken();
              webviewView.webview.postMessage({ type: 'authState', loggedIn: false });
            } else {
              webviewView.webview.postMessage({ type: 'sessionError', error: String(e) });
            }
          }
          break;
        }

        case 'completeSession': {
          await this._api.completeSession(msg.sessionId);
          const summary = await this._api.getTokenSummary();
          webviewView.webview.postMessage({ type: 'sessionComplete', summary });
          break;
        }

        case 'sendToTerminal': {
          await vscode.commands.executeCommand('workbench.action.terminal.sendSequence', {
            text: msg.assembledPrompt + '\n',
          });
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
    const nonce = this._getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             script-src 'nonce-${nonce}';
             style-src 'unsafe-inline';
             connect-src http://localhost:8000 http://localhost:3000;
             img-src data:;" />
  <title>PromptOS</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); font-family: var(--vscode-font-family); }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}

function _sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
