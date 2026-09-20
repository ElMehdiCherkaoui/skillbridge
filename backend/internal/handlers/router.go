package handlers

import (
	"net/http"
	"time"

	"github.com/skillbridge/backend/internal/config"
	"github.com/skillbridge/backend/internal/middleware"
	"github.com/skillbridge/backend/internal/repositories"
	"github.com/skillbridge/backend/internal/services"
	"github.com/jackc/pgx/v5/pgxpool"
)

type App struct {
	cfg  *config.Config
	pool *pgxpool.Pool

	Auth        *services.AuthService
	Invites     *services.InviteService
	Projects    *services.ProjectService
	Assignments *services.AssignmentService
	Submissions *services.SubmissionService
	Evaluations *services.EvaluationService
	Skills      *services.SkillService
	Students    *services.StudentService
	UsersRepo   *repositories.UserRepository
}

func NewApp(cfg *config.Config, pool *pgxpool.Pool) *App {
	return &App{cfg: cfg, pool: pool}
}

func (a *App) Handler() http.Handler {
	r := http.NewServeMux()

	authHandler := NewAuthHandler(a.Auth)
	inviteHandler := NewInviteHandler(a.Invites, a.UsersRepo, a.Auth)
	projectHandler := NewProjectHandler(a.Projects)
	assignmentHandler := NewAssignmentHandler(a.Assignments)
	submissionHandler := NewSubmissionHandler(a.Submissions)
	evaluationHandler := NewEvaluationHandler(a.Evaluations)
	skillHandler := NewSkillHandler(a.Skills)
	studentHandler := NewStudentHandler(a.Students)
	statsHandler := NewStatsHandler(repositories.NewStatsRepository(a.pool))

	// -- Public routes --
	r.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "skillbridge-api"})
	})
	authLimiter := middleware.RateLimit(15, time.Minute)
	r.Handle("POST /api/invites/accept", authLimiter(http.HandlerFunc(inviteHandler.Accept)))
	r.Handle("POST /api/auth/login", authLimiter(http.HandlerFunc(authHandler.Login)))
	r.HandleFunc("POST /api/auth/logout", authHandler.Logout)

	// -- Authenticated routes (both roles) --
	r.Handle("GET /api/auth/me", a.authed(http.HandlerFunc(authHandler.Me)))

	r.Handle("GET /api/projects", a.authed(http.HandlerFunc(projectHandler.ListForUser)))
	r.Handle("GET /api/projects/{id}", a.authed(http.HandlerFunc(projectHandler.Get)))

	r.Handle("GET /api/assignments", a.authed(http.HandlerFunc(assignmentHandler.List)))
	r.Handle("GET /api/assignments/{id}", a.authed(http.HandlerFunc(assignmentHandler.Get)))
	r.Handle("GET /api/assignments/{id}/evaluations", a.authed(http.HandlerFunc(evaluationHandler.ListByAssignment)))

	r.Handle("GET /api/skills", a.authed(http.HandlerFunc(skillHandler.List)))

	// -- Student-only routes --
	r.Handle("POST /api/assignments/{id}/submission", a.student(http.HandlerFunc(submissionHandler.Save)))
	r.Handle("GET /api/assignments/{id}/submission", a.student(http.HandlerFunc(submissionHandler.Get)))

	// -- Admin-only routes --
	r.Handle("POST /api/admin/invites", a.admin(http.HandlerFunc(inviteHandler.Create)))
	r.Handle("GET /api/admin/invites", a.admin(http.HandlerFunc(inviteHandler.List)))
	r.Handle("DELETE /api/admin/invites/{id}", a.admin(http.HandlerFunc(inviteHandler.Revoke)))
	r.Handle("GET /api/admin/users", a.admin(http.HandlerFunc(inviteHandler.Team)))

	r.Handle("POST /api/projects", a.admin(http.HandlerFunc(projectHandler.Create)))
	r.Handle("PUT /api/projects/{id}", a.admin(http.HandlerFunc(projectHandler.Update)))
	r.Handle("DELETE /api/projects/{id}", a.admin(http.HandlerFunc(projectHandler.Delete)))
	r.Handle("PUT /api/projects/{id}/status", a.admin(http.HandlerFunc(projectHandler.SetStatus)))
	r.Handle("POST /api/projects/{id}/skills", a.admin(http.HandlerFunc(projectHandler.AddSkill)))
	r.Handle("DELETE /api/projects/{id}/skills/{skillId}", a.admin(http.HandlerFunc(projectHandler.RemoveSkill)))
	r.Handle("POST /api/projects/{id}/assign", a.admin(http.HandlerFunc(projectHandler.AssignStudent)))
	r.Handle("GET /api/projects/{id}/assignments", a.admin(http.HandlerFunc(projectHandler.Assignments)))

	r.Handle("PUT /api/assignments/{id}/status", a.admin(http.HandlerFunc(assignmentHandler.UpdateStatus)))
	r.Handle("DELETE /api/assignments/{id}", a.admin(http.HandlerFunc(assignmentHandler.Delete)))
	r.Handle("PUT /api/assignments/{id}/evaluations", a.admin(http.HandlerFunc(evaluationHandler.Save)))
	r.Handle("PUT /api/evaluations/{id}", a.admin(http.HandlerFunc(evaluationHandler.SaveOne)))

	r.Handle("POST /api/skills", a.admin(http.HandlerFunc(skillHandler.Create)))
	r.Handle("DELETE /api/skills/{id}", a.admin(http.HandlerFunc(skillHandler.Delete)))

	r.Handle("GET /api/dashboard/stats", a.admin(http.HandlerFunc(statsHandler.Dashboard)))
	r.Handle("GET /api/students", a.admin(http.HandlerFunc(studentHandler.List)))
	r.Handle("GET /api/students/{id}", a.admin(http.HandlerFunc(studentHandler.Profile)))
	r.Handle("GET /api/students/{id}/assignments", a.admin(http.HandlerFunc(studentHandler.Assignments)))
	// Students may view their own skill progression, admins any.
	r.Handle("GET /api/students/{id}/skills", a.authed(http.HandlerFunc(studentHandler.Skills)))

	return middleware.CORS(a.cfg.CORSOrigins)(middleware.SecurityHeaders(r))
}

func (a *App) authed(h http.Handler) http.Handler {
	return middleware.Auth(a.cfg.JWTSecret)(h)
}

func (a *App) admin(h http.Handler) http.Handler {
	return middleware.Auth(a.cfg.JWTSecret)(middleware.RequireAdmin(h))
}

func (a *App) student(h http.Handler) http.Handler {
	return middleware.Auth(a.cfg.JWTSecret)(middleware.RequireStudent(h))
}