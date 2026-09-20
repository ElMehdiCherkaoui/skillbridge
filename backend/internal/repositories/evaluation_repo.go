package repositories

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/skillbridge/backend/internal/models"
)

type EvaluationRepository struct {
	db *pgxpool.Pool
}

func NewEvaluationRepository(db *pgxpool.Pool) *EvaluationRepository {
	return &EvaluationRepository{db: db}
}

const evaluationCols = `se.id, se.assignment_id, se.skill_id, s.name, se.status, se.feedback,
	se.level_1_validated, se.level_2_validated, se.level_3_validated`

func scanEvaluation(row interface{ Scan(...any) error }) (models.EvaluationView, error) {
	var e models.EvaluationView
	var levels models.EvaluationLevels
	if err := row.Scan(
		&e.ID, &e.AssignmentID, &e.SkillID, &e.SkillName, &e.Status, &e.Feedback,
		&levels.Level1Validated, &levels.Level2Validated, &levels.Level3Validated,
	); err != nil {
		return e, err
	}
	e.Level1Validated = levels.Level1Validated
	e.Level2Validated = levels.Level2Validated
	e.Level3Validated = levels.Level3Validated
	e.ValidatedLevel = levels.ValidatedLevel()
	return e, nil
}

// ListByAssignment lists evaluations for an assignment.
func (r *EvaluationRepository) ListByAssignment(ctx context.Context, assignmentID string) ([]models.EvaluationView, error) {
	rows, err := r.db.Query(ctx,
		`SELECT `+evaluationCols+`
		 FROM skill_evaluations se
		 JOIN skills s ON s.id = se.skill_id
		 WHERE se.assignment_id = $1
		 ORDER BY s.name`, assignmentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var evals []models.EvaluationView
	for rows.Next() {
		e, err := scanEvaluation(rows)
		if err != nil {
			return nil, err
		}
		evals = append(evals, e)
	}
	return evals, rows.Err()
}

func (r *EvaluationRepository) FindByID(ctx context.Context, id string) (*models.EvaluationView, error) {
	row := r.db.QueryRow(ctx,
		`SELECT `+evaluationCols+`
		 FROM skill_evaluations se
		 JOIN skills s ON s.id = se.skill_id
		 WHERE se.id = $1`, id)
	e, err := scanEvaluation(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &e, nil
}

// AddIfMissing creates pending evaluation rows for every project skill.
func (r *EvaluationRepository) AddIfMissing(ctx context.Context, assignmentID string, projectID string) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO skill_evaluations (assignment_id, skill_id)
		 SELECT $1, ps.skill_id FROM project_skills ps
		 WHERE ps.project_id = $2
		 ON CONFLICT (assignment_id, skill_id) DO NOTHING`,
		assignmentID, projectID)
	return err
}

// Save upserts a single evaluation with a fully-resolved level state. The
// caller (service layer) is responsible for cascade + status derivation.
func (r *EvaluationRepository) Save(ctx context.Context, assignmentID string, skillID, status, feedback string, levels models.EvaluationLevels) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO skill_evaluations (assignment_id, skill_id, status, feedback,
		    level_1_validated, level_2_validated, level_3_validated)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (assignment_id, skill_id) DO UPDATE SET
		   status = EXCLUDED.status,
		   feedback = EXCLUDED.feedback,
		   level_1_validated = EXCLUDED.level_1_validated,
		   level_2_validated = EXCLUDED.level_2_validated,
		   level_3_validated = EXCLUDED.level_3_validated,
		   updated_at = now()`,
		assignmentID, skillID, status, feedback,
		levels.Level1Validated, levels.Level2Validated, levels.Level3Validated)
	return err
}

// SaveMany transactionally upserts a batch of resolved evaluations.
func (r *EvaluationRepository) SaveMany(ctx context.Context, assignmentID string, evals []models.ResolvedEvaluation) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, in := range evals {
		_, err := tx.Exec(ctx,
			`INSERT INTO skill_evaluations (assignment_id, skill_id, status, feedback,
			    level_1_validated, level_2_validated, level_3_validated)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)
			 ON CONFLICT (assignment_id, skill_id) DO UPDATE SET
			   status = EXCLUDED.status,
			   feedback = EXCLUDED.feedback,
			   level_1_validated = EXCLUDED.level_1_validated,
			   level_2_validated = EXCLUDED.level_2_validated,
			   level_3_validated = EXCLUDED.level_3_validated,
			   updated_at = now()`,
			assignmentID, in.SkillID, in.Status, in.Feedback,
			in.Levels.Level1Validated, in.Levels.Level2Validated, in.Levels.Level3Validated)
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// Stats returns counts for an assignment's evaluations.
func (r *EvaluationRepository) Stats(ctx context.Context, assignmentID string) (*models.EvaluationStats, error) {
	stats := &models.EvaluationStats{}
	err := r.db.QueryRow(ctx,
		`SELECT
		   COUNT(*)::int,
		   COUNT(*) FILTER (WHERE status = 'validated')::int,
		   COUNT(*) FILTER (WHERE status = 'not_validated')::int,
		   COUNT(*) FILTER (WHERE status = 'pending')::int
		 FROM skill_evaluations WHERE assignment_id = $1`, assignmentID,
	).Scan(&stats.Total, &stats.Validated, &stats.Rejected, &stats.Pending)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &models.EvaluationStats{}, nil
		}
		return nil, err
	}
	return stats, nil
}

func (r *EvaluationRepository) CountGlobal(ctx context.Context, status string) (int, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM skill_evaluations WHERE ($1 = '' OR status = $1)`, status).Scan(&count)
	return count, err
}

func (r *EvaluationRepository) NeedReviewCount(ctx context.Context) (int, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM assignments WHERE status IN ('submitted', 'under_review')`).Scan(&count)
	return count, err
}

// CountForStudent returns validated/rejected/pending counts for all of a student's assignments.
func (r *EvaluationRepository) CountForStudent(ctx context.Context, studentID string) (*models.StudentStats, error) {
	stats := &models.StudentStats{}
	err := r.db.QueryRow(ctx,
		`SELECT
		   COALESCE(COUNT(*) FILTER (WHERE se.status = 'validated'), 0)::int,
		   COALESCE(COUNT(*) FILTER (WHERE se.status = 'not_validated'), 0)::int,
		   COALESCE(COUNT(*) FILTER (WHERE se.status = 'pending'), 0)::int
		 FROM skill_evaluations se
		 JOIN assignments a ON a.id = se.assignment_id
		 WHERE a.student_id = $1`, studentID,
	).Scan(&stats.ValidatedSkills, &stats.RejectedSkills, &stats.PendingSkills)
	if err != nil {
		return nil, err
	}
	return stats, nil
}

// StudentSkills returns each skill a student has been evaluated on, aggregated
// across all of their assignments. A level is treated as validated if it was
// validated in any assignment.
func (r *EvaluationRepository) StudentSkills(ctx context.Context, studentID string) ([]models.StudentSkill, error) {
	rows, err := r.db.Query(ctx,
		`SELECT se.skill_id, s.name,
		        BOOL_OR(se.level_1_validated),
		        BOOL_OR(se.level_2_validated),
		        BOOL_OR(se.level_3_validated),
		        COUNT(*)::int
		 FROM skill_evaluations se
		 JOIN assignments a ON a.id = se.assignment_id
		 JOIN skills s ON s.id = se.skill_id
		 WHERE a.student_id = $1
		 GROUP BY se.skill_id, s.name
		 ORDER BY s.name`, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var skills []models.StudentSkill
	for rows.Next() {
		var sk models.StudentSkill
		var levels models.EvaluationLevels
		if err := rows.Scan(&sk.SkillID, &sk.SkillName,
			&levels.Level1Validated, &levels.Level2Validated, &levels.Level3Validated,
			&sk.AssignmentsCount); err != nil {
			return nil, err
		}
		sk.Level1Validated = levels.Level1Validated
		sk.Level2Validated = levels.Level2Validated
		sk.Level3Validated = levels.Level3Validated
		sk.ValidatedLevel = levels.ValidatedLevel()
		skills = append(skills, sk)
	}
	return skills, rows.Err()
}