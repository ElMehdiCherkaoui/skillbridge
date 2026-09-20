package services

import (
	"context"
	"errors"

	"github.com/skillbridge/backend/internal/models"
	"github.com/skillbridge/backend/internal/repositories"
)

var (
	ErrAssignmentNotFound = errors.New("assignment not found")
	ErrForbidden          = errors.New("access denied")
	ErrNoSubmission       = errors.New("no submission found")
)

type AssignmentService struct {
	assignments *repositories.AssignmentRepository
	projects    *repositories.ProjectRepository
	submissions *repositories.SubmissionRepository
	evaluations *repositories.EvaluationRepository
}

func NewAssignmentService(
	assignments *repositories.AssignmentRepository,
	projects *repositories.ProjectRepository,
	submissions *repositories.SubmissionRepository,
	evaluations *repositories.EvaluationRepository,
) *AssignmentService {
	return &AssignmentService{assignments: assignments, projects: projects, submissions: submissions, evaluations: evaluations}
}

func (s *AssignmentService) ListAll(ctx context.Context, status string) ([]models.Assignment, error) {
	return s.assignments.ListAll(ctx, status)
}

func (s *AssignmentService) ListByStudent(ctx context.Context, studentID string) ([]models.Assignment, error) {
	return s.assignments.ListByStudent(ctx, studentID)
}

func (s *AssignmentService) ListByProject(ctx context.Context, projectID string) ([]models.Assignment, error) {
	return s.assignments.ListByProject(ctx, projectID)
}

// GetForStudent returns an assignment if it belongs to the given student.
func (s *AssignmentService) GetForStudent(ctx context.Context, assignmentID, studentID string) (*models.AssignmentDetail, error) {
	a, err := s.assignments.FindByID(ctx, assignmentID)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return nil, ErrAssignmentNotFound
		}
		return nil, err
	}
	if a.StudentID != studentID {
		return nil, ErrForbidden
	}
	return s.detail(ctx, a)
}

func (s *AssignmentService) GetForReview(ctx context.Context, assignmentID string) (*models.AssignmentDetail, error) {
	a, err := s.assignments.FindByID(ctx, assignmentID)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return nil, ErrAssignmentNotFound
		}
		return nil, err
	}
	return s.detail(ctx, a)
}

func (s *AssignmentService) detail(ctx context.Context, a *models.Assignment) (*models.AssignmentDetail, error) {
	detail := &models.AssignmentDetail{Assignment: *a}

	p, err := s.projects.FindByID(ctx, a.ProjectID)
	if err == nil {
		detail.Project = p
		skills, err := s.projects.Skills(ctx, a.ProjectID)
		if err == nil {
			detail.Skills = skills
		}
	}
	sub, err := s.submissions.FindByAssignment(ctx, a.ID)
	if err == nil {
		detail.Submission = sub
	} else if !errors.Is(err, repositories.ErrNotFound) {
		return nil, err
	}
	evals, err := s.evaluations.ListByAssignment(ctx, a.ID)
	if err != nil {
		return nil, err
	}
	detail.Evaluations = evals
	stats, err := s.evaluations.Stats(ctx, a.ID)
	if err == nil {
		detail.EvaluationStats = stats
	}
	return detail, nil
}

func (s *AssignmentService) SetStatus(ctx context.Context, assignmentID string, status string) error {
	if !validAssignmentStatuses[status] {
		return errors.New("invalid assignment status")
	}
	return s.assignments.SetStatus(ctx, assignmentID, status)
}

func (s *AssignmentService) MarkSubmittedByStudent(ctx context.Context, assignmentID, studentID string) error {
	a, err := s.assignments.FindByID(ctx, assignmentID)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return ErrAssignmentNotFound
		}
		return err
	}
	if a.StudentID != studentID {
		return ErrForbidden
	}
	return s.assignments.SetStatus(ctx, assignmentID, "submitted")
}

func (s *AssignmentService) Delete(ctx context.Context, assignmentID string) error {
	return s.assignments.Delete(ctx, assignmentID)
}