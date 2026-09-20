-- 003_skill_levels.sql
-- 3-level skill validation system.
--
-- Each skill evaluation now tracks a validated level (1 = foundational,
-- 2 = practical application, 3 = mastery). We store one boolean per level so
-- teachers can toggle levels independently while the service layer enforces
-- the cumulative cascade (validating a higher level validates all lower ones).
--
-- The existing `status` column is kept in sync: 'validated' iff at least one
-- level is validated, otherwise 'pending'. This keeps all existing
-- aggregation queries (dashboard, assignment laterals, student stats) working.

ALTER TABLE skill_evaluations
    ADD COLUMN IF NOT EXISTS level_1_validated BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS level_2_validated BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS level_3_validated BOOLEAN NOT NULL DEFAULT false;

-- Backfill: legacy 'validated' evaluations become Level 1 (basic/foundational)
-- so no previously validated skill is lost. 'not_validated' / 'pending' rows
-- stay fully unvalidated.
UPDATE skill_evaluations
SET level_1_validated = true
WHERE status = 'validated';