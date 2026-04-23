/**
 * Backend API Client — Phase 5, Task 5.1
 *
 * Wraps all PromptOS API calls for the VS Code extension.
 * JWT is stored in vscode.SecretStorage (OS-keychain backed).
 *
 * Auth is optional — when the backend runs with AUTH_REQUIRED=false (default)
 * no token is needed. The Authorization header is sent only when a token exists.
 */

import * as vscode from 'vscode';

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly secrets: vscode.SecretStorage,
  ) {}

  private async _headers(): Promise<HeadersInit> {
    const token = await this.secrets.get('promptos.jwt');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async startSession(rawPrompt: string, workspaceContext?: object) {
    const res = await fetch(`${this.baseUrl}/session/start`, {
      method: 'POST',
      headers: await this._headers(),
      body: JSON.stringify({ raw_prompt: rawPrompt, workspace_context: workspaceContext ?? {} }),
    });
    return res.json();
  }

  async sendMessage(sessionId: string, userMessage: string) {
    const res = await fetch(`${this.baseUrl}/session/message`, {
      method: 'POST',
      headers: await this._headers(),
      body: JSON.stringify({ session_id: sessionId, user_message: userMessage }),
    });
    return res.json();
  }

  async completeSession(sessionId: string) {
    const res = await fetch(`${this.baseUrl}/session/complete`, {
      method: 'POST',
      headers: await this._headers(),
      body: JSON.stringify({ session_id: sessionId }),
    });
    return res.json();
  }

  async getTokenSummary() {
    const res = await fetch(`${this.baseUrl}/tokens/summary`, {
      headers: await this._headers(),
    });
    return res.json();
  }

  async storeToken(token: string) {
    await this.secrets.store('promptos.jwt', token);
  }
}
