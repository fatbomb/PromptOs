-- PromptOS — Seed Data for Demo
-- Phase 3 — Pre-hackathon prep
--
-- Run AFTER 001_initial_schema.sql.
-- Replace <YOUR_USER_UUID> with a real user UUID from auth.users.
--
-- Purpose: populate 2 weeks of fake session data so the Skill Decay chart
-- and Knowledge Map have history to display during the demo.

-- USER_ID: 47e886ff-1710-43ac-8b61-78b99e952f5d

-- WEEK 1 (last week) — 5 sessions, higher dependency scores
INSERT INTO sessions (user_id, raw_prompt, raw_token_count, assembled_prompt, assembled_token_count,
    category, thinking_depth_score, dependency_score, token_efficiency_score,
    estimated_turns_saved, concept_tags, source, created_at)
VALUES
  ('47e886ff-1710-43ac-8b61-78b99e952f5d', 'fix jwt auth', 3, 'Full context assembled JWT prompt...', 120,
    'bug_fix', 60, 75, 70, 2, ARRAY['JWT', 'auth'], 'cli', now() - interval '8 days'),
  ('47e886ff-1710-43ac-8b61-78b99e952f5d', 'redis caching issue', 3, 'Full context assembled Redis prompt...', 130,
    'bug_fix', 40, 80, 65, 3, ARRAY['Redis', 'caching', 'TTL'], 'cli', now() - interval '7 days'),
  ('47e886ff-1710-43ac-8b61-78b99e952f5d', 'react hooks refactor', 3, 'Full context hooks prompt...', 115,
    'refactor', 80, 70, 80, 1, ARRAY['React hooks', 'state management'], 'vscode', now() - interval '6 days'),
  ('47e886ff-1710-43ac-8b61-78b99e952f5d', 'postgres indexing slow query', 4, 'Assembled prompt for postgres indexing...', 140,
    'bug_fix', 60, 65, 75, 2, ARRAY['PostgreSQL', 'indexing', 'query optimization'], 'cli', now() - interval '5 days'),
  ('47e886ff-1710-43ac-8b61-78b99e952f5d', 'deploy pipeline failing', 3, 'Assembled CI/CD debug prompt...', 125,
    'bug_fix', 40, 72, 70, 3, ARRAY['CI/CD', 'Docker'], 'cli', now() - interval '4 days');

-- WEEK 2 (this week) — 5 sessions, lower dependency scores (improving)
INSERT INTO sessions (user_id, raw_prompt, raw_token_count, assembled_prompt, assembled_token_count,
    category, thinking_depth_score, dependency_score, token_efficiency_score,
    estimated_turns_saved, concept_tags, source, created_at)
VALUES
  ('47e886ff-1710-43ac-8b61-78b99e952f5d', 'fix refresh token expiry', 4, 'Full context refresh token prompt...', 135,
    'bug_fix', 80, 55, 85, 1, ARRAY['JWT', 'token rotation', 'Redis'], 'cli', now() - interval '3 days'),
  ('47e886ff-1710-43ac-8b61-78b99e952f5d', 'add rate limiting middleware', 4, 'Full context rate limiting prompt...', 128,
    'feature', 80, 50, 80, 1, ARRAY['middleware', 'rate limiting'], 'vscode', now() - interval '2 days'),
  ('47e886ff-1710-43ac-8b61-78b99e952f5d', 'react query stale data', 3, 'Assembled stale data prompt...', 118,
    'bug_fix', 60, 48, 78, 2, ARRAY['React hooks', 'React Query', 'caching'], 'browser_extension', now() - interval '1 day'),
  ('47e886ff-1710-43ac-8b61-78b99e952f5d', 'fix dockerfile build error', 3, 'Full docker debug prompt...', 122,
    'bug_fix', 100, 42, 90, 0, ARRAY['Docker', 'CI/CD'], 'cli', now() - interval '12 hours'),
  ('47e886ff-1710-43ac-8b61-78b99e952f5d', 'postgres rls policy bug', 4, 'Assembled RLS debug prompt...', 145,
    'bug_fix', 80, 38, 88, 1, ARRAY['PostgreSQL', 'RLS', 'auth'], 'vscode', now() - interval '2 hours');

-- Skill decay rows (summarised)
INSERT INTO skill_decay (user_id, week_start, total_sessions, avg_dependency_score, avg_thinking_depth, refusals_triggered, self_solve_rate)
VALUES
  ('47e886ff-1710-43ac-8b61-78b99e952f5d', date_trunc('week', now() - interval '7 days')::date, 5, 72.4, 56.0, 0, 0.0),
  ('47e886ff-1710-43ac-8b61-78b99e952f5d', date_trunc('week', now())::date, 5, 46.6, 80.0, 1, 0.2);

-- Concept map
INSERT INTO concept_map (user_id, concept, encounter_count, avg_score, color_band, last_seen_at)
VALUES
  ('47e886ff-1710-43ac-8b61-78b99e952f5d', 'JWT', 3, 56, 'amber', now() - interval '2 hours'),
  ('47e886ff-1710-43ac-8b61-78b99e952f5d', 'Redis', 2, 77, 'green', now() - interval '2 days'),
  ('47e886ff-1710-43ac-8b61-78b99e952f5d', 'React hooks', 2, 49, 'amber', now() - interval '1 day'),
  ('47e886ff-1710-43ac-8b61-78b99e952f5d', 'PostgreSQL', 2, 38, 'red', now() - interval '2 hours'),
  ('47e886ff-1710-43ac-8b61-78b99e952f5d', 'Docker', 2, 42, 'amber', now() - interval '12 hours'),
  ('47e886ff-1710-43ac-8b61-78b99e952f5d', 'CI/CD', 2, 72, 'green', now() - interval '12 hours');

-- Token savings analytics
INSERT INTO token_savings (user_id, week_start, total_raw_tokens, total_assembled_tokens, estimated_turns_saved, estimated_wait_time_saved_min, estimated_cost_saved_usd)
VALUES
  ('47e886ff-1710-43ac-8b61-78b99e952f5d', date_trunc('week', now() - interval '7 days')::date, 540, 1250, 11, 45.0, 3.20),
  ('47e886ff-1710-43ac-8b61-78b99e952f5d', date_trunc('week', now())::date, 640, 1580, 5, 22.5, 4.40);
