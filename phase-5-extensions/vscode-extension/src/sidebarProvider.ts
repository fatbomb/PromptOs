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
  // Track session data for direct Supabase write
  private _sessionData: Map<string, {
    rawPrompt: string;
    assembledPrompt?: string;
    conversationHistory: Array<{ role: string; content: string }>;
    scores?: Record<string, number>;
    wasRefused?: boolean;
  }> = new Map();

  constructor(private readonly _context: vscode.ExtensionContext) {
    this._apiBase = vscode.workspace
      .getConfiguration('promptos')
      .get<string>('apiUrl', 'https://prompt-os-dusky.vercel.app');
    this._dashboardBase = vscode.workspace
      .getConfiguration('promptos')
      .get<string>('dashboardUrl', 'https://prompt-os-dashboard.vercel.app');
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
            const result = await this._api.startSession(msg.rawPrompt, msg.workspaceContext, msg.mode);
            // Track session data for direct Supabase write
            this._sessionData.set(result.session_id, {
              rawPrompt: msg.rawPrompt,
              conversationHistory: [],
            });
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
            // Track conversation history
            const sd = this._sessionData.get(msg.sessionId);
            if (sd) {
              sd.conversationHistory.push({ role: 'user', content: msg.userMessage });
              if (result.done && !result.should_refuse) {
                sd.assembledPrompt = result.assembled_prompt as string;
                sd.scores = result.scores as Record<string, number>;
              }
              if (result.done && result.should_refuse) {
                sd.wasRefused = true;
              }
              if (!result.done && result.question) {
                sd.conversationHistory.push({ role: 'assistant', content: result.question as string });
              }
            }
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
          // 1. Tell backend to complete (triggers its own Supabase write + concept extraction)
          await this._api.completeSession(msg.sessionId);

          // 2. Also write directly to Supabase so dashboard updates immediately
          const sd = this._sessionData.get(msg.sessionId);
          if (sd?.assembledPrompt && sd.scores) {
            await this._api.writeSessionToSupabase({
              rawPrompt:           sd.rawPrompt,
              assembledPrompt:     sd.assembledPrompt,
              conversationHistory: sd.conversationHistory,
              scores: {
                token_efficiency_score: sd.scores.token_efficiency_score ?? 0,
                thinking_depth_score:   sd.scores.thinking_depth_score   ?? 0,
                dependency_score:       sd.scores.dependency_score        ?? 0,
                estimated_turns_saved:  sd.scores.estimated_turns_saved   ?? 0,
                ai_self_awareness_score: sd.scores.ai_self_awareness_score,
              },
              wasRefused: sd.wasRefused ?? false,
            });
            await this._api.updateWeeklyAggregates({
              token_efficiency_score: sd.scores.token_efficiency_score ?? 0,
              thinking_depth_score:   sd.scores.thinking_depth_score   ?? 0,
              dependency_score:       sd.scores.dependency_score        ?? 0,
              estimated_turns_saved:  sd.scores.estimated_turns_saved   ?? 0,
            });
          }
          this._sessionData.delete(msg.sessionId);

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
             connect-src https://prompt-os-dusky.vercel.app https://prompt-os-dashboard.vercel.app https://khxmezrvzhytrxpkitsi.supabase.co;
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
