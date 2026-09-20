package repositories

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type StatsRepository struct {
	db *pgxpool.Pool
}

func NewStatsRepository(db *pgxpool.Pool) *StatsRepository {
	return &StatsRepository{db: db}
}

type DashboardStats struct {
	Projects           int `json:"projects"`
	Students           int `json:"students"`
	Assignments        int `json:"assignments"`
	PendingCorrections int `json:"pendingCorrections"`
	ValidatedSkills    int `json:"validatedSkills"`
	CompletedProjects  int `json:"completedProjects"`
}

func (r *StatsRepository) Dashboard(ctx context.Context) (*DashboardStats, error) {
	stats := &DashboardStats{}
	err := r.db.QueryRow(ctx,
		`SELECT
		   (SELECT COUNT(*) FROM projects)::int,
		   (SELECT COUNT(*) FROM users WHERE role = 'student')::int,
		   (SELECT COUNT(*) FROM assignments)::int,
		   (SELECT COUNT(*) FROM assignments WHERE status IN ('submitted', 'under_review'))::int,
		   (SELECT COUNT(*) FROM skill_evaluations WHERE status = 'validated')::int,
		   (SELECT COUNT(*) FROM projects WHERE status IN ('in_progress', 'completed'))::int`,
	).Scan(&stats.Projects, &stats.Students, &stats.Assignments, &stats.PendingCorrections, &stats.ValidatedSkills, &stats.CompletedProjects)
	return stats, err
}

func (r *StatsRepository) StudentSkills(ctx context.Context, studentID string) (*SkillCounts, error) {
	c := &SkillCounts{}
	err := r.db.QueryRow(ctx,
		`SELECT
		   COALESCE(COUNT(*) FILTER (WHERE se.status = 'validated'), 0)::int,
		   COALESCE(COUNT(*) FILTER (WHERE se.status = 'not_validated'), 0)::int,
		   COALESCE(COUNT(*) FILTER (WHERE se.status = 'pending'), 0)::int
		 FROM skill_evaluations se
		 JOIN assignments a ON a.id = se.assignment_id
		 WHERE a.student_id = $1`, studentID,
	).Scan(&c.Validated, &c.Rejected, &c.Pending)
	return c, err
}

type SkillCounts struct {
	Validated int `json:"validated"`
	Rejected  int `json:"rejected"`
	Pending   int `json:"pending"`
}