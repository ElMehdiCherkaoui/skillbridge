-- 002_invites.sql
-- Admin-issued invitations. A user is only created once an invite is accepted.

CREATE TABLE IF NOT EXISTS invites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT NOT NULL UNIQUE,
    role        TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    full_name   TEXT NOT NULL DEFAULT '',
    token       TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invites_token ON invites (token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites (email);