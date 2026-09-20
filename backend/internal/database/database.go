package database

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}
	cfg.MaxConns = 10
	cfg.MinConns = 1
	cfg.MaxConnLifetime = time.Hour

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}

// MustMigrate applies all .sql files from the migrations directory in order.
func MustMigrate(ctx context.Context, pool *pgxpool.Pool, migrationDir string) error {
	if err := createSchemaMigrations(pool); err != nil {
		return err
	}
	entries, err := listSQLFiles(migrationDir)
	if err != nil {
		return err
	}
	for _, entry := range entries {
		applied, err := isApplied(ctx, pool, entry.name)
		if err != nil {
			return err
		}
		if applied {
			continue
		}
		if _, err := pool.Exec(ctx, entry.content); err != nil {
			return err
		}
		if _, err := pool.Exec(ctx, `INSERT INTO schema_migrations (name) VALUES ($1)`, entry.name); err != nil {
			return err
		}
	}
	return nil
}

func createSchemaMigrations(pool *pgxpool.Pool) error {
	_, err := pool.Exec(context.Background(), `CREATE TABLE IF NOT EXISTS schema_migrations (
		name TEXT PRIMARY KEY,
		applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
	)`)
	return err
}

func isApplied(ctx context.Context, pool *pgxpool.Pool, name string) (bool, error) {
	var exists bool
	err := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE name = $1)`, name).Scan(&exists)
	return exists, err
}