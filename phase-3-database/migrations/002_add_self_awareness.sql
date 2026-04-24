-- Migration: Add AI Self-Awareness Score to sessions
-- Phase 1 - AI Self Awareness update

-- Add the column with a default of 0 and a check constraint between 0 and 100
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS ai_self_awareness_score INT NOT NULL DEFAULT 0 CHECK (ai_self_awareness_score BETWEEN 0 AND 100);
