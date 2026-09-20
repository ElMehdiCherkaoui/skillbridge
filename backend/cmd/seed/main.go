// Command seed provisions an admin/teacher account (and optionally a demo
// student) into the database. It is a bootstrap tool, run once after the
// migrations are applied. It never creates project/submission data.
//
// Usage:
//
//	seed -email=admin@skillbridge.io -password=secret123 -name="Teacher"
//	seed -email=student@skillbridge.io -password=secret123 -name="Student" -role=student
package main

import (
	"context"
	"flag"
	"log"

	"github.com/skillbridge/backend/internal/config"
	"github.com/skillbridge/backend/internal/database"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	config.LoadEnvFile(".env")

	email := flag.String("email", "admin@skillbridge.io", "email address of the user to create")
	password := flag.String("password", "secret123", "password for the user")
	name := flag.String("name", "Administrator", "full name of the user")
	role := flag.String("role", "admin", "role: admin or student")
	flag.Parse()

	if *role != "admin" && *role != "student" {
		log.Fatalf("role must be 'admin' or 'student'")
	}

	cfg := config.Load()
	ctx := context.Background()

	pool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer pool.Close()

	hash, err := bcrypt.GenerateFromPassword([]byte(*password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("failed to hash password: %v", err)
	}

	ct, err := pool.Exec(ctx,
		`INSERT INTO users (email, password_hash, full_name, role)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (email) DO UPDATE SET
		   password_hash = EXCLUDED.password_hash,
		   full_name = EXCLUDED.full_name,
		   role = EXCLUDED.role`,
		*email, string(hash), *name, *role,
	)
	if err != nil {
		log.Fatalf("failed to create user: %v", err)
	}
	log.Printf("user '%s' (role=%s) ensured. rows affected: %d", *email, *role, ct.RowsAffected())
}