// Package seed bootstraps default accounts at API startup. It upserts the
// master admin user by email, so it is idempotent and safe to run on every
// start/rebuild. All other accounts are created exclusively through admin
// invitations.
package seed

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/skillbridge/backend/internal/config"
	"golang.org/x/crypto/bcrypt"
)

// Bootstrap runs after migrations. It ensures the master admin account exists.
// Failures are logged but non-fatal so the API still starts; the upsert is
// retried on the next start.
func Bootstrap(ctx context.Context, pool *pgxpool.Pool, cfg *config.Config) {
	if !cfg.SeedOnStart {
		log.Printf("seed: disabled (SEED_ON_START=false), skipping bootstrap")
		return
	}

	if err := ensureUser(ctx, pool, cfg.SeedAdminEmail, cfg.SeedAdminPassword, cfg.SeedAdminName, "admin"); err != nil {
		log.Printf("seed: failed to ensure admin user '%s': %v", cfg.SeedAdminEmail, err)
	} else {
		log.Printf("seed: master admin '%s' ensured", cfg.SeedAdminEmail)
	}
}

func ensureUser(ctx context.Context, pool *pgxpool.Pool, email, password, fullName, role string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = pool.Exec(ctx,
		`INSERT INTO users (email, password_hash, full_name, role)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (email) DO UPDATE SET
		   password_hash = EXCLUDED.password_hash,
		   full_name = EXCLUDED.full_name,
		   role = EXCLUDED.role`,
		email, string(hash), fullName, role,
	)
	return err
}