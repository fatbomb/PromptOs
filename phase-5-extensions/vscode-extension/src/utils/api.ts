/**
 * Backend API Client — Phase 5, Task 5.1
 *
 * Wraps all PromptOS API calls for the VS Code extension.
 * JWT is stored in vscode.SecretStorage (OS-keychain backed).
 * Auth is required — backend enforces JWT validation.
 *
 * Also writes sessions directly to Supabase so the dashboard updates
 * immediately without depending on the backend's store_session_db.
 */

import * as vscode from 'vscode';

const SUPABASE_URL     = 'https://khxmezrvzhytrxpkitsi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoeG1lenJ2emh5dHJ4cGtpdHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTg3OTgsImV4cCI6MjA5MjUzNDc5OH0.YK-Hd2kYT8bO0qqf1p_kq6804BdSMmmLURqcqeUpsPU';

export interface SessionPayload {
  rawPrompt: string;
  assembledPrompt: string;
  conversationHistory: Array<{ role: string; content: string }>;
  scores: {
    token_efficiency_score: number;
    thinking_depth_score: number;
    dependency_score: number;
    estimated_turns_saved: number;
    ai_self_awareness_score?: number;
  };
  wasRefused?: boolean;
}

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

  /** Decode JWT sub claim to get user_id */
  async getUserId(): Promise<string | null> {
    const token = await this.getToken();
    if (!token) { return null; }
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      return payload.sub ?? null;
    } catch {
      return null;
    }
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
    if (res.status === 401) { throw new Error('UNAUTHORIZED'); }
    return res.json();
  }

  async sendMessage(sessionId: string, userMessage: string) {
    const res = await fetch(`${this.baseUrl}/session/message`, {
      method: 'POST',
      headers: await this._headers(),
      body: JSON.stringify({ session_id: sessionId, user_message: userMessage }),
    });
    if (res.status === 401) { throw new Error('UNAUTHORIZED'); }
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

  /**
   * Write session directly to Supabase so the dashboard updates immediately.
   * Uses the user's JWT for RLS — user_id is extracted from the token sub claim.
   */
  async writeSessionToSupabase(payload: SessionPayload): Promise<void> {
    const token   = await this.getToken();
    const userId  = await this.getUserId();
    if (!token || !userId) { return; }

    const row = {
      user_id:                userId,
      raw_prompt:             payload.rawPrompt,
      assembled_prompt:       payload.assembledPrompt,
      conversation_history:   payload.conversationHistory,
      token_efficiency_score: payload.scores.token_efficiency_score ?? 0,
      thinking_depth_score:   payload.scores.thinking_depth_score   ?? 0,
      dependency_score:       payload.scores.dependency_score        ?? 0,
      estimated_turns_saved:  payload.scores.estimated_turns_saved   ?? 0,
      was_refused:            payload.wasRefused ?? false,
      source:                 'vscode',
    };

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':         SUPABASE_ANON_KEY,
          'Authorization':  `Bearer ${token}`,
          'Prefer':         'return=minimal',
        },
        body: JSON.stringify(row),
      });
    } catch (e) {
      console.error('[PromptOS] Failed to write session to Supabase:', e);
    }
  }

  /**
   * Update weekly aggregates directly in Supabase (skill_decay + token_savings).
   */
  async updateWeeklyAggregates(scores: SessionPayload['scores']): Promise<void> {
    const token  = await this.getToken();
    const userId = await this.getUserId();
    if (!token || !userId) { return; }

    // Get Monday of current week
    const now    = new Date();
    const day    = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const weekStart = monday.toISOString().split('T')[0];

    const supabaseHeaders = {
      'Content-Type':  'application/json',
      'apikey':         SUPABASE_ANON_KEY,
      'Authorization':  `Bearer ${token}`,
      'Prefer':         'return=minimal',
    };

    try {
      // Upsert skill_decay
      await fetch(`${SUPABASE_URL}/rest/v1/skill_decay`, {
        method: 'POST',
        headers: { ...supabaseHeaders, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          user_id:              userId,
          week_start:           weekStart,
          total_sessions:       1,
          avg_dependency_score: scores.dependency_score   ?? 0,
          avg_thinking_depth:   scores.thinking_depth_score ?? 0,
        }),
      });

      // Upsert token_savings
      const turnsSaved = scores.estimated_turns_saved ?? 0;
      await fetch(`${SUPABASE_URL}/rest/v1/token_savings`, {
        method: 'POST',
        headers: { ...supabaseHeaders, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          user_id:                      userId,
          week_start:                   weekStart,
          estimated_turns_saved:        turnsSaved,
          estimated_wait_time_saved_min: turnsSaved * 0.67,
          estimated_cost_saved_usd:     turnsSaved * 0.02,
        }),
      });
    } catch (e) {
      console.error('[PromptOS] Failed to update weekly aggregates:', e);
    }
  }
}
