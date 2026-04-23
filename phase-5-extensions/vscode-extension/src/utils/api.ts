/**
 * Backend API Client — Phase 5, Task 5.1
 *
 * Wraps all PromptOS API calls for the VS Code extension.
 * JWT is stored in vscode.SecretStorage (OS-keychain backed).
 */

import * as vscode from 'vscode';

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly secrets: vscode.SecretStorage,
  ) {}

  private async _headers(): Promise<Record<string, string>> {
    const token = await this.secrets.get('promptos.jwt');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  private async _post(path: string, body: object): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: await this._headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
    return res.json();
  }

  private async _get(path: string): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}${path}`, { headers: await this._headers() });
    if (!res.ok) throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
    return res.json();
  }

  async startSession(rawPrompt: string, workspaceContext?: object) {
    return this._post('/session/start', {
      raw_prompt: rawPrompt,
      workspace_context: workspaceContext ?? {},
    });
  }

  async sendMessage(sessionId: string, userMessage: string) {
    return this._post('/session/message', { session_id: sessionId, user_message: userMessage });
  }

  async completeSession(sessionId: string) {
    return this._post('/session/complete', { session_id: sessionId });
  }

  async getTokenSummary() {
    return this._get('/tokens/summary');
  }

  async storeToken(token: string) {
    await this.secrets.store('promptos.jwt', token);
  }
}
