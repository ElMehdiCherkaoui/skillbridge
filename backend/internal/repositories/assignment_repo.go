package repositories

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/skillbridge/backend/internal/models"
)

type AssignmentRepository struct {
	db *pgxpool.Pool
}

func NewAssignmentRepository(db *pgxpool.Pool) *AssignmentRepository {
	return &AssignmentRepository{db: db}
}

type assignmentScan struct {
	ID        string
	ProjectID string
	StudentID string
	Status    string
}

func (r *AssignmentRepository) Create(ctx context.Context, projectID, studentID string) (*models.Assignment, error) {
	a := &models.Assignment{ProjectID: projectID, StudentID: studentID, Status: "assigned"}
	err := r.db.QueryRow(ctx,
		`INSERT INTO assignments (project_id, student_id) VALUES ($1, $2)
		 RETURNING id, project_id, student_id, status, created_at, updated_at`,
		projectID, studentID,
	).Scan(&a.ID, &a.ProjectID, &a.StudentID, &a.Status, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrDuplicate
		}
		return nil, err
	}

	if err := r.EnsureEvaluationsForAssignment(ctx, a.ID, projectID); err != nil {
		return nil, err
	}
	return a, nil
}

// EnsureEvaluationsForAssignment creates a pending evaluation row for every project skill.
func (r *AssignmentRepository) EnsureEvaluationsForAssignment(ctx context.Context, assignmentID, projectID string) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO skill_evaluations (assignment_id, skill_id)
		 SELECT $1, ps.skill_id FROM project_skills ps
		 WHERE ps.project_id = $2
		 ON CONFLICT (assignment_id, skill_id) DO NOTHING`,
		assignmentID, projectID)
	return err
}

func (r *AssignmentRepository) FindByID(ctx context.Context, id string) (*models.Assignment, error) {
	a := &models.Assignment{}
	err := r.db.QueryRow(ctx,
		`SELECT id, project_id, student_id, status, created_at, updated_at FROM assignments WHERE id = $1`, id,
	).Scan(&a.ID, &a.ProjectID, &a.StudentID, &a.Status, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return a, nil
}

func (r *AssignmentRepository) FindWhere(ctx context.Context, projectID, studentID string) (*models.Assignment, error) {
	a := &models.Assignment{}
	err := r.db.QueryRow(ctx,
		`SELECT id, project_id, student_id, status, created_at, updated_at FROM assignments
		 WHERE project_id = $1 AND student_id = $2`, projectID, studentID,
	).Scan(&a.ID, &a.ProjectID, &a.StudentID, &a.Status, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return a, nil
}

func (r *AssignmentRepository) SetStatus(ctx context.Context, id, status string) error {
	ct, err := r.db.Exec(ctx, `UPDATE assignments SET status = $2 WHERE id = $1`, id, status)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *AssignmentRepository) Delete(ctx context.Context, id string) error {
	ct, err := r.db.Exec(ctx, `DELETE FROM assignments WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ListStudents lists assignments for a given student.
func (r *AssignmentRepository) ListByStudent(ctx context.Context, studentID string) ([]models.Assignment, error) {
	rows, err := r.db.Query(ctx,
		`SELECT a.id, a.project_id, a.student_id, a.status, a.created_at, a.updated_at,
		        p.id, p.title, p.description, p.status::text, to_char(p.deadline, 'YYYY-MM-DD'),
		        COALESCE(se.total, 0), COALESCE(se.validated, 0), COALESCE(se.rejected, 0)
		 FROM assignments a
		 JOIN projects p ON p.id = a.project_id
		 LEFT JOIN LATERAL (
		   SELECT
		     COUNT(*)::int AS total,
		     COUNT(*) FILTER (WHERE status = 'validated')::int AS validated,
		     COUNT(*) FILTER (WHERE status = 'not_validated')::int AS rejected
		   FROM skill_evaluations se WHERE se.assignment_id = a.id
		 ) se ON true
		 WHERE a.student_id = $1
		 ORDER BY p.deadline ASC`, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assignments []models.Assignment
	for rows.Next() {
		var a models.Assignment
		var p models.Project
		var appliedProjectStatus string
		err := rows.Scan(&a.ID, &a.ProjectID, &a.StudentID, &a.Status, &a.CreatedAt, &a.UpdatedAt,
			&p.ID, &p.Title, &p.Description, &appliedProjectStatus, &p.Deadline,
			&a.StatsTotal, &a.StatsValidated, &a.StatsRejected)
		if err != nil {
			return nil, err
		}
		p.Status = appliedProjectStatus
		a.Project = &p
		assignments = append(assignments, a)
	}
	return assignments, rows.Err()
}

func (r *AssignmentRepository) DeleteByProject(ctx context.Context, projectID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM assignments WHERE project_id = $1`, projectID)
	return err
}

// ListAll returns all assignments with project and student info.
func (r *AssignmentRepository) ListAll(ctx context.Context, status string) ([]models.Assignment, error) {
	rows, err := r.db.Query(ctx,
		`SELECT a.id, a.project_id, a.student_id, a.status, a.created_at, a.updated_at,
		        p.id, p.title, p.description, p.status::text, to_char(p.deadline, 'YYYY-MM-DD'),
		        u.id, u.email, u.full_name, u.created_at,
		        COALESCE(se.total, 0), COALESCE(se.validated, 0), COALESCE(se.rejected, 0),
		        COALESCE(s.submitted_at IS NOT NULL, false), COALESCE(s.submitted_at, NULL)
		 FROM assignments a
		 JOIN projects p ON p.id = a.project_id
		 JOIN users u ON u.id = a.student_id
		 LEFT JOIN LATERAL (
		   SELECT
		     COUNT(*)::int AS total,
		     COUNT(*) FILTER (WHERE status = 'validated')::int AS validated,
		     COUNT(*) FILTER (WHERE status = 'not_validated')::int AS rejected
		   FROM skill_evaluations se WHERE se.assignment_id = a.id
		 ) se ON true
		 LEFT JOIN submissions s ON s.assignment_id = a.id
		 WHERE ($1 = '' OR a.status = $1)
		 ORDER BY p.title, u.full_name`, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assignments []models.Assignment
	for rows.Next() {
		var a models.Assignment
		var p models.Project
		var u models.User
		var appliedProjectStatus string
		var submitted bool
		var submittedAt *time.Time
		err := rows.Scan(&a.ID, &a.ProjectID, &a.StudentID, &a.Status, &a.CreatedAt, &a.UpdatedAt,
			&p.ID, &p.Title, &p.Description, &appliedProjectStatus, &p.Deadline,
			&u.ID, &u.Email, &u.FullName, &u.CreatedAt,
			&a.StatsTotal, &a.StatsValidated, &a.StatsRejected,
			&submitted, &submittedAt)
		if err != nil {
			return nil, err
		}
		p.Status = appliedProjectStatus
		a.Project = &p
		if submitted && submittedAt != nil {
			a.HasSubmitted = &submitted
		}
		a.Student = &u
		assignments = append(assignments, a)
	}
	return assignments, rows.Err()
}

func (r *AssignmentRepository) ListByProject(ctx context.Context, projectID string) ([]models.Assignment, error) {
	rows, err := r.db.Query(ctx,
		`SELECT a.id, a.project_id, a.student_id, a.status, a.created_at, a.updated_at,
		        u.id, u.email, u.full_name, u.created_at,
		        COALESCE(se.total, 0), COALESCE(se.validated, 0), COALESCE(se.rejected, 0),
		        COALESCE(s.submitted_at IS NOT NULL, false)
		 FROM assignments a
		 JOIN users u ON u.id = a.student_id
		 LEFT JOIN LATERAL (
		   SELECT
		     COUNT(*)::int AS total,
		     COUNT(*) FILTER (WHERE status = 'validated')::int AS validated,
		     COUNT(*) FILTER (WHERE status = 'not_validated')::int AS rejected
		   FROM skill_evaluations se WHERE se.assignment_id = a.id
		 ) se ON true
		 LEFT JOIN submissions s ON s.assignment_id = a.id
		 WHERE a.project_id = $1
		 ORDER BY u.full_name`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assignments []models.Assignment
	for rows.Next() {
		var a models.Assignment
		var u models.User
		var submitted bool
		err := rows.Scan(&a.ID, &a.ProjectID, &a.StudentID, &a.Status, &a.CreatedAt, &a.UpdatedAt,
			&u.ID, &u.Email, &u.FullName, &u.CreatedAt,
			&a.StatsTotal, &a.StatsValidated, &a.StatsRejected,
			&submitted)
		if err != nil {
			return nil, err
		}
		if submitted {
			a.HasSubmitted = &submitted
		}
		a.Student = &u
		assignments = append(assignments, a)
	}
	return assignments, rows.Err()
}