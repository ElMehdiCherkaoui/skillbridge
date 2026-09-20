-- 001_init.sql
-- SkillBridge database schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users (students and admin/teachers)
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name     TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- Projects / briefs
CREATE TABLE IF NOT EXISTS projects (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title             TEXT NOT NULL,
    description       TEXT NOT NULL DEFAULT '',
    context           TEXT NOT NULL DEFAULT '',
    cahier_des_charges TEXT NOT NULL DEFAULT '',
    objectives        TEXT NOT NULL DEFAULT '',
    resources         JSONB NOT NULL DEFAULT '[]'::jsonb,
    start_date        DATE,
    deadline          DATE,
    status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'in_progress', 'completed', 'archived')),
    created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status);
CREATE INDEX IF NOT EXISTS idx_projects_deadline ON projects (deadline);

-- Skills
CREATE TABLE IF NOT EXISTS skills (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Skills required by a project
CREATE TABLE IF NOT EXISTS project_skills (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    skill_id   UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_project_skills_skill ON project_skills (skill_id);

-- Assignments (one project -> many students; one student -> many projects)
CREATE TABLE IF NOT EXISTS assignments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status     TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'submitted', 'under_review', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_student ON assignments (student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments (status);

-- Submissions (one per assignment)
CREATE TABLE IF NOT EXISTS submissions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL UNIQUE REFERENCES assignments(id) ON DELETE CASCADE,
    description   TEXT NOT NULL DEFAULT '',
    submitted_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Links attached to a submission (github, figma, deployment, presentation, other)
CREATE TABLE IF NOT EXISTS submission_links (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    type          TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('github', 'figma', 'deployment', 'presentation', 'other')),
    url           TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submission_links_submission ON submission_links (submission_id);

-- Skill evaluations (one per assignment + skill)
CREATE TABLE IF NOT EXISTS skill_evaluations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    skill_id      UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'not_validated')),
    feedback      TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (assignment_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_evaluations_skill ON skill_evaluations (skill_id);

-- Updated-at triggers
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['users', 'projects', 'skills', 'assignments', 'submissions', 'skill_evaluations']
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %I', t, t);
        EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
    END LOOP;
END;
$$;