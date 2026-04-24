/**
 * Backend API Client — Phase 5, Task 5.1
 *
 * Wraps all PromptOS API calls for the VS Code extension.
 * JWT is stored in vscode.SecretStorage (OS-keychain backed).
 * Auth is required — backend enforces JWT validation.
 */

import * as vscode from 'vscode';

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly secrets: vscode.SecretStorage,
  ) {}

  async getToken(): Promise<string | null> {
    return await this.secrets.get('promptos.jwt') ?? null;
  }

  async storeToken(token: string): Promise<void> {
    await this.secrets.store('promptos.jwt', token);
  }

  async clearToken(): Promise<void> {
    await this.secrets.delete('promptos.jwt');
  }

  private async _headers(): Promise<Record<string, string>> {
    const token = await this.getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /** Returns true if a JWT is stored */
  async isLoggedIn(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  async startSession(rawPrompt: string, workspaceContext?: object) {
    const res = await fetch(`${this.baseUrl}/session/start`, {
      method: 'POST',
      headers: await this._headers(),
      body: JSON.stringify({
        raw_prompt: rawPrompt,
        workspace_context: workspaceContext ?? {},
        source: 'vscode',
      }),
    });
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    return res.json();
  }

  async sendMessage(sessionId: string, userMessage: string) {
    const res = await fetch(`${this.baseUrl}/session/message`, {
      method: 'POST',
      headers: await this._headers(),
      body: JSON.stringify({ session_id: sessionId, user_message: userMessage }),
    });
    if (res.status === 401) throw new Error('UNAUTHORIZED');
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

  /** Poll /auth/cli-token?state=xxx to pick up JWT after OAuth */
  async pollForCliToken(state: string): Promise<string | null> {
    const res = await fetch(`${this.baseUrl}/auth/cli-token?state=${state}`);
    if (res.ok) {
      const data = await res.json();
      return data.token ?? null;
    }
    return null;
  }
}
