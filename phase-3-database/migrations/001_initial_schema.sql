-- PromptOS — Initial Schema Migration
-- Phase 3, Task 3.1
--
-- Run this entire file in the Supabase SQL Editor in one transaction.
-- After running: enable Realtime on the `sessions` table in the Supabase dashboard.
--
-- RLS policy on every table: auth.uid() = user_id

-- ============================================================
-- 1. sessions (core — all session data)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    raw_prompt              TEXT NOT NULL,
    raw_token_count         INT NOT NULL DEFAULT 0,
    assembled_prompt        TEXT,
    assembled_token_count   INT NOT NULL DEFAULT 0,
    category                TEXT CHECK (category IN ('bug_fix', 'feature', 'refactor', 'architecture', 'explanation')),
    conversation_history    JSONB NOT NULL DEFAULT '[]',
    token_efficiency_score  INT NOT NULL DEFAULT 0 CHECK (token_efficiency_score BETWEEN 0 AND 100),
    thinking_depth_score    INT NOT NULL DEFAULT 0 CHECK (thinking_depth_score BETWEEN 0 AND 100),
    dependency_score        INT NOT NULL DEFAULT 0 CHECK (dependency_score BETWEEN 0 AND 100),
    estimated_turns_saved   INT NOT NULL DEFAULT 0,
    was_refused             BOOLEAN NOT NULL DEFAULT FALSE,
    concept_tags            TEXT[] NOT NULL DEFAULT '{}',
    source                  TEXT CHECK (source IN ('vscode', 'cli', 'browser_extension'))
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions: user can only access own rows"
    ON sessions FOR ALL USING (auth.uid() = user_id);


-- ============================================================
-- 2. concept_map (tracking per-user concept knowledge)
-- ============================================================
CREATE TABLE IF NOT EXISTS concept_map (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    concept         TEXT NOT NULL,
    encounter_count INT NOT NULL DEFAULT 1,
    avg_score       FLOAT NOT NULL DEFAULT 50.0,
    color_band      TEXT NOT NULL DEFAULT 'amber' CHECK (color_band IN ('green', 'amber', 'red')),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    quiz_score      INT CHECK (quiz_score BETWEEN 0 AND 100),
    UNIQUE (user_id, concept)
);

ALTER TABLE concept_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "concept_map: user can only access own rows"
    ON concept_map FOR ALL USING (auth.uid() = user_id);


-- ============================================================
-- 3. skill_decay (weekly progress snapshots)
-- ============================================================
CREATE TABLE IF NOT EXISTS skill_decay (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start              DATE NOT NULL,
    total_sessions          INT NOT NULL DEFAULT 0,
    avg_dependency_score    FLOAT NOT NULL DEFAULT 0.0,
    avg_thinking_depth      FLOAT NOT NULL DEFAULT 0.0,
    refusals_triggered      INT NOT NULL DEFAULT 0,
    self_solve_rate         FLOAT NOT NULL DEFAULT 0.0,
    UNIQUE (user_id, week_start)
);

ALTER TABLE skill_decay ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skill_decay: user can only access own rows"
    ON skill_decay FOR ALL USING (auth.uid() = user_id);


-- ============================================================
-- 4. token_savings (weekly cost analytics)
-- ============================================================
CREATE TABLE IF NOT EXISTS token_savings (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start                  DATE NOT NULL,
    total_raw_tokens            INT NOT NULL DEFAULT 0,
    total_assembled_tokens      INT NOT NULL DEFAULT 0,
    estimated_turns_saved       INT NOT NULL DEFAULT 0,
    estimated_wait_time_saved_min FLOAT NOT NULL DEFAULT 0.0,
    estimated_cost_saved_usd    FLOAT NOT NULL DEFAULT 0.0,
    UNIQUE (user_id, week_start)
);

ALTER TABLE token_savings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "token_savings: user can only access own rows"
    ON token_savings FOR ALL USING (auth.uid() = user_id);


-- ============================================================
-- 5. teams + team_members
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE DEFAULT substring(md5(random()::TEXT), 1, 6),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role    TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    PRIMARY KEY (team_id, user_id)
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_members: user can see their own membership"
    ON team_members FOR SELECT USING (auth.uid() = user_id);


-- ============================================================
-- 6. quiz_attempts
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    concept      TEXT NOT NULL,
    questions    JSONB NOT NULL DEFAULT '[]',
    answers      JSONB NOT NULL DEFAULT '[]',
    score        INT CHECK (score BETWEEN 0 AND 100),
    completed_at TIMESTAMPTZ
);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_attempts: user can only access own rows"
    ON quiz_attempts FOR ALL USING (auth.uid() = user_id);


-- ============================================================
-- 7. user_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_cost_per_mtok FLOAT NOT NULL DEFAULT 3.0,
    default_agent       TEXT NOT NULL DEFAULT 'claude' CHECK (default_agent IN ('claude', 'chatgpt', 'gemini')),
    timezone            TEXT NOT NULL DEFAULT 'UTC',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_profiles: user can only access own row"
    ON user_profiles FOR ALL USING (auth.uid() = id);
