package services

import (
	"context"
	"errors"

	"github.com/skillbridge/backend/internal/models"
	"github.com/skillbridge/backend/internal/repositories"
)

var (
	ErrNotFound = errors.New("not found")
)

type EvaluationService struct {
	assignments *repositories.AssignmentRepository
	evaluations *repositories.EvaluationRepository
}

func NewEvaluationService(assignments *repositories.AssignmentRepository, evaluations *repositories.EvaluationRepository) *EvaluationService {
	return &EvaluationService{assignments: assignments, evaluations: evaluations}
}

func (s *EvaluationService) ListByAssignment(ctx context.Context, assignmentID string) ([]models.EvaluationView, error) {
	return s.evaluations.ListByAssignment(ctx, assignmentID)
}

// ListForUser returns evaluations for an assignment. Admins may view any
// assignment; students may only view their own.
func (s *EvaluationService) ListForUser(ctx context.Context, assignmentID, userID string, isAdmin bool) ([]models.EvaluationView, error) {
	if isAdmin {
		return s.ListByAssignment(ctx, assignmentID)
	}
	a, err := s.assignments.FindByID(ctx, assignmentID)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return nil, ErrAssignmentNotFound
		}
		return nil, err
	}
	if a.StudentID != userID {
		return nil, ErrForbidden
	}
	return s.ListByAssignment(ctx, assignmentID)
}

func (s *EvaluationService) SaveMany(ctx context.Context, assignmentID string, inputs []models.EvaluationInput) error {
	if _, err := s.assignments.FindByID(ctx, assignmentID); err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return ErrAssignmentNotFound
		}
		return err
	}
	resolved := make([]models.ResolvedEvaluation, 0, len(inputs))
	for _, in := range inputs {
		if len(in.Feedback) > 2000 {
			return errors.New("feedback is too long")
		}
		// Batch saves are full snapshots: absent level fields mean "validated
		// is false" unless the caller only sent a legacy status.
		levels, status := resolveLevels(in, models.EvaluationLevels{}, false)
		if status != "" {
			resolved = append(resolved, models.ResolvedEvaluation{
				SkillID:  in.SkillID,
				Status:   status,
				Feedback: in.Feedback,
				Levels:   levels,
			})
		}
	}
	return s.evaluations.SaveMany(ctx, assignmentID, resolved)
}

// SaveOneByID updates a single evaluation identified by its id. Level fields
// are merged onto the stored state (nil = keep), enabling independent
// per-level toggles; the cumulative cascade is then applied.
func (s *EvaluationService) SaveOneByID(ctx context.Context, evalID string, in models.EvaluationInput) error {
	if len(in.Feedback) > 2000 {
		return errors.New("feedback is too long")
	}
	e, err := s.evaluations.FindByID(ctx, evalID)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return ErrNotFound
		}
		return err
	}
	current := models.EvaluationLevels{
		Level1Validated: e.Level1Validated,
		Level2Validated: e.Level2Validated,
		Level3Validated: e.Level3Validated,
	}
	levels, status := resolveLevels(in, current, true)
	return s.evaluations.Save(ctx, e.AssignmentID, e.SkillID, status, in.Feedback, levels)
}

// resolveLevels computes the target level state for an evaluation input and
// derives the resulting status.
//
//   - If any level pointer is set the levels are (re)written from the payload:
//     with merge=true, nil fields keep the current value; otherwise nil means
//     false (full snapshot).
//   - If no level field is set the payload is a legacy status-only update:
//     status "validated" maps to Level 1, "not_validated" stays unvalidated.
//
// The cumulative cascade is then applied: validating Level 2 validates Level 1,
// validating Level 3 validates Levels 1 and 2. Status is "validated" whenever
// at least one level is validated, otherwise the legacy hint wins (for
// "not_validated"), else "pending".
func resolveLevels(in models.EvaluationInput, current models.EvaluationLevels, merge bool) (models.EvaluationLevels, string) {
	levels := current
	hasLevelField := in.Level1Validated != nil || in.Level2Validated != nil || in.Level3Validated != nil

	if hasLevelField {
		if in.Level1Validated != nil {
			levels.Level1Validated = *in.Level1Validated
		} else if !merge {
			levels.Level1Validated = false
		}
		if in.Level2Validated != nil {
			levels.Level2Validated = *in.Level2Validated
		} else if !merge {
			levels.Level2Validated = false
		}
		if in.Level3Validated != nil {
			levels.Level3Validated = *in.Level3Validated
		} else if !merge {
			levels.Level3Validated = false
		}
	} else {
		// Legacy status-only payload.
		levels = models.EvaluationLevels{}
		if in.Status == "validated" {
			levels.Level1Validated = true
		}
	}

	// Cumulative cascade: a higher level implies all lower levels.
	if levels.Level2Validated {
		levels.Level1Validated = true
	}
	if levels.Level3Validated {
		levels.Level1Validated = true
		levels.Level2Validated = true
	}

	if levels.Level1Validated || levels.Level2Validated || levels.Level3Validated {
		return levels, "validated"
	}
	if in.Status == "not_validated" {
		return levels, "not_validated"
	}
	return levels, "pending"
}

// CompleteReview is called by teachers after saving a full evaluation.
func (s *EvaluationService) CompleteReview(ctx context.Context, assignmentID string) error {
	stats, err := s.evaluations.Stats(ctx, assignmentID)
	if err != nil {
		return err
	}
	status := "under_review"
	if stats.Pending == 0 && stats.Total > 0 {
		status = "completed"
	}
	return s.assignments.SetStatus(ctx, assignmentID, status)
}