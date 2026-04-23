-- PromptOS — Seed Data for Demo
-- Phase 3 — Pre-hackathon prep
--
-- Run AFTER 001_initial_schema.sql.
-- Replace <YOUR_USER_UUID> with a real user UUID from auth.users.
--
-- Purpose: populate 2 weeks of fake session data so the Skill Decay chart
-- and Knowledge Map have history to display during the demo.

-- ⚠ Replace this with your actual test user UUID before running:
DO $$ BEGIN
  RAISE NOTICE 'Replace <YOUR_USER_UUID> in this file before running!';
END $$;

/*
-- WEEK 1 (last week) — 5 sessions, higher dependency scores
INSERT INTO sessions (user_id, raw_prompt, raw_token_count, assembled_prompt, assembled_token_count,
    category, thinking_depth_score, dependency_score, token_efficiency_score,
    estimated_turns_saved, concept_tags, source, created_at)
VALUES
  ('<YOUR_USER_UUID>', 'fix jwt auth', 3, 'Full context assembled JWT prompt...', 120,
    'bug_fix', 60, 75, 70, 2, ARRAY['JWT', 'auth'], 'cli', now() - interval '8 days'),
  ('<YOUR_USER_UUID>', 'redis caching issue', 3, 'Full context assembled Redis prompt...', 130,
    'bug_fix', 40, 80, 65, 3, ARRAY['Redis', 'caching', 'TTL'], 'cli', now() - interval '7 days'),
  ('<YOUR_USER_UUID>', 'react hooks refactor', 3, 'Full context hooks prompt...', 115,
    'refactor', 80, 70, 80, 1, ARRAY['React hooks', 'state management'], 'vscode', now() - interval '6 days'),
  ('<YOUR_USER_UUID>', 'postgres indexing slow query', 4, 'Assembled prompt for postgres indexing...', 140,
    'bug_fix', 60, 65, 75, 2, ARRAY['PostgreSQL', 'indexing', 'query optimization'], 'cli', now() - interval '5 days'),
  ('<YOUR_USER_UUID>', 'deploy pipeline failing', 3, 'Assembled CI/CD debug prompt...', 125,
    'bug_fix', 40, 72, 70, 3, ARRAY['CI/CD', 'Docker'], 'cli', now() - interval '4 days');

-- WEEK 2 (this week) — 5 sessions, lower dependency scores (improving)
INSERT INTO sessions (user_id, raw_prompt, raw_token_count, assembled_prompt, assembled_token_count,
    category, thinking_depth_score, dependency_score, token_efficiency_score,
    estimated_turns_saved, concept_tags, source, created_at)
VALUES
  ('<YOUR_USER_UUID>', 'fix refresh token expiry', 4, 'Full context refresh token prompt...', 135,
    'bug_fix', 80, 55, 85, 1, ARRAY['JWT', 'token rotation', 'Redis'], 'cli', now() - interval '3 days'),
  ('<YOUR_USER_UUID>', 'add rate limiting middleware', 4, 'Full context rate limiting prompt...', 128,
    'feature', 80, 50, 80, 1, ARRAY['middleware', 'rate limiting'], 'vscode', now() - interval '2 days'),
  ('<YOUR_USER_UUID>', 'react query stale data', 3, 'Assembled stale data prompt...', 118,
    'bug_fix', 60, 48, 78, 2, ARRAY['React hooks', 'React Query', 'caching'], 'browser_extension', now() - interval '1 day'),
  ('<YOUR_USER_UUID>', 'fix dockerfile build error', 3, 'Full docker debug prompt...', 122,
    'bug_fix', 100, 42, 90, 0, ARRAY['Docker', 'CI/CD'], 'cli', now() - interval '12 hours'),
  ('<YOUR_USER_UUID>', 'postgres rls policy bug', 4, 'Assembled RLS debug prompt...', 145,
    'bug_fix', 80, 38, 88, 1, ARRAY['PostgreSQL', 'RLS', 'auth'], 'vscode', now() - interval '2 hours');

-- Skill decay rows (summarised)
INSERT INTO skill_decay (user_id, week_start, total_sessions, avg_dependency_score, avg_thinking_depth, refusals_triggered, self_solve_rate)
VALUES
  ('<YOUR_USER_UUID>', date_trunc('week', now() - interval '7 days')::date, 5, 72.4, 56.0, 0, 0.0),
  ('<YOUR_USER_UUID>', date_trunc('week', now())::date, 5, 46.6, 80.0, 1, 0.2);

-- Concept map
INSERT INTO concept_map (user_id, concept, encounter_count, avg_score, color_band, last_seen_at)
VALUES
  ('<YOUR_USER_UUID>', 'JWT', 3, 56, 'amber', now() - interval '2 hours'),
  ('<YOUR_USER_UUID>', 'Redis', 2, 77, 'green', now() - interval '2 days'),
  ('<YOUR_USER_UUID>', 'React hooks', 2, 49, 'amber', now() - interval '1 day'),
  ('<YOUR_USER_UUID>', 'PostgreSQL', 2, 38, 'red', now() - interval '2 hours'),
  ('<YOUR_USER_UUID>', 'Docker', 2, 42, 'amber', now() - interval '12 hours'),
  ('<YOUR_USER_UUID>', 'CI/CD', 2, 72, 'green', now() - interval '12 hours');
*/
