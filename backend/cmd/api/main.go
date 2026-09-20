package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/skillbridge/backend/internal/config"
	"github.com/skillbridge/backend/internal/database"
	"github.com/skillbridge/backend/internal/handlers"
	"github.com/skillbridge/backend/internal/repositories"
	"github.com/skillbridge/backend/internal/seed"
	"github.com/skillbridge/backend/internal/services"
)

func main() {
	config.LoadEnvFile(".env")

	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer pool.Close()

	migrationDir := os.Getenv("MIGRATIONS_DIR")
	if migrationDir == "" {
		migrationDir = filepath.Join("migrations")
	}
	if err := database.MustMigrate(ctx, pool, migrationDir); err != nil {
		log.Fatalf("migration failed: %v", err)
	}
	log.Printf("database migrations applied")

	seed.Bootstrap(ctx, pool, cfg)

	// Build repositories
	userRepo := repositories.NewUserRepository(pool)
	projectRepo := repositories.NewProjectRepository(pool)
	skillRepo := repositories.NewSkillRepository(pool)
	assignmentRepo := repositories.NewAssignmentRepository(pool)
	submissionRepo := repositories.NewSubmissionRepository(pool)
	evaluationRepo := repositories.NewEvaluationRepository(pool)
	inviteRepo := repositories.NewInviteRepository(pool)

	// Build services
	authService := services.NewAuthService(userRepo, cfg.JWTSecret, cfg.JWTExpiryHours)
	inviteService := services.NewInviteService(inviteRepo, userRepo)
	projectService := services.NewProjectService(projectRepo, skillRepo, assignmentRepo, userRepo)
	assignmentService := services.NewAssignmentService(assignmentRepo, projectRepo, submissionRepo, evaluationRepo)
	submissionService := services.NewSubmissionService(assignmentRepo, submissionRepo)
	evaluationService := services.NewEvaluationService(assignmentRepo, evaluationRepo)
	skillService := services.NewSkillService(skillRepo)
	studentService := services.NewStudentService(userRepo, assignmentRepo, evaluationRepo)

	app := handlers.NewApp(cfg, pool)
	app.Auth = authService
	app.Invites = inviteService
	app.Projects = projectService
	app.Assignments = assignmentService
	app.Submissions = submissionService
	app.Evaluations = evaluationService
	app.Skills = skillService
	app.Students = studentService
	app.UsersRepo = userRepo

	addr := ":" + cfg.Port
	log.Printf("SkillBridge API listening on %s", addr)

	srv := &http.Server{
		Addr:              addr,
		Handler:           app.Handler(),
		ReadTimeout:       15 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20, // 1 MiB
	}
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server failed: %v", err)
	}
}