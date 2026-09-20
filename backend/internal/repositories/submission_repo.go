package repositories

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/skillbridge/backend/internal/models"
)

type SubmissionRepository struct {
	db *pgxpool.Pool
}

func NewSubmissionRepository(db *pgxpool.Pool) *SubmissionRepository {
	return &SubmissionRepository{db: db}
}

// Upsert creates or updates the submission for an assignment.
func (r *SubmissionRepository) Upsert(ctx context.Context, assignmentID string, description string, links []models.SubmissionLink, finalize bool) (*models.Submission, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	sub := &models.Submission{AssignmentID: assignmentID, Description: description}
	now := time.Now()
	var submittedAt *time.Time
	if finalize {
		submittedAt = &now
	}

	err = tx.QueryRow(ctx,
		`INSERT INTO submissions (assignment_id, description, submitted_at)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (assignment_id) DO UPDATE SET
		   description = EXCLUDED.description,
		   submitted_at = COALESCE(submissions.submitted_at, EXCLUDED.submitted_at),
		   updated_at = now()
		 RETURNING id, assignment_id, description, submitted_at, created_at, updated_at`,
		assignmentID, description, submittedAt,
	).Scan(&sub.ID, &sub.AssignmentID, &sub.Description, &sub.SubmittedAt, &sub.CreatedAt, &sub.UpdatedAt)
	if err != nil {
		return nil, err
	}

	// Replace links atomically
	if _, err := tx.Exec(ctx, `DELETE FROM submission_links WHERE submission_id = $1`, sub.ID); err != nil {
		return nil, err
	}
	for _, l := range links {
		if _, err := tx.Exec(ctx,
			`INSERT INTO submission_links (submission_id, type, url) VALUES ($1, $2, $3)`,
			sub.ID, l.Type, l.URL); err != nil {
			return nil, err
		}
	}

	submission, err := r.getLinks(ctx, tx, sub)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return submission, nil
}

type txOrPool interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

func (r *SubmissionRepository) getLinks(ctx context.Context, q txOrPool, sub *models.Submission) (*models.Submission, error) {
	sub.Links = []models.SubmissionLink{}
	rows, err := q.Query(ctx,
		`SELECT id, type, url FROM submission_links WHERE submission_id = $1 ORDER BY created_at`, sub.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var l models.SubmissionLink
		if err := rows.Scan(&l.ID, &l.Type, &l.URL); err != nil {
			return nil, err
		}
		sub.Links = append(sub.Links, l)
	}
	return sub, rows.Err()
}

func (r *SubmissionRepository) FindByAssignment(ctx context.Context, assignmentID string) (*models.Submission, error) {
	sub := &models.Submission{AssignmentID: assignmentID}
	err := r.db.QueryRow(ctx,
		`SELECT id, assignment_id, description, submitted_at, created_at, updated_at
		 FROM submissions WHERE assignment_id = $1`, assignmentID,
	).Scan(&sub.ID, &sub.AssignmentID, &sub.Description, &sub.SubmittedAt, &sub.CreatedAt, &sub.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return r.getLinks(ctx, r.db, sub)
}

func (r *SubmissionRepository) HasSubmission(ctx context.Context, assignmentID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM submissions WHERE assignment_id = $1)`, assignmentID).Scan(&exists)
	return exists, err
}

func (r *SubmissionRepository) SubmittedAt(ctx context.Context, assignmentID string) (*time.Time, error) {
	sub, err := r.FindByAssignment(ctx, assignmentID)
	if err != nil {
		return nil, err
	}
	if sub.SubmittedAt == nil {
		return nil, nil
	}
	return sub.SubmittedAt, nil
}