package services

import (
	"context"
	"errors"
	"math"

	"github.com/skillbridge/backend/internal/models"
	"github.com/skillbridge/backend/internal/repositories"
)

var ErrStudentNotFound = errors.New("student not found")

type StudentService struct {
	users      *repositories.UserRepository
	assignments *repositories.AssignmentRepository
	evaluations *repositories.EvaluationRepository
}

func NewStudentService(users *repositories.UserRepository, assignments *repositories.AssignmentRepository, evaluations *repositories.EvaluationRepository) *StudentService {
	return &StudentService{users: users, assignments: assignments, evaluations: evaluations}
}

func (s *StudentService) List(ctx context.Context, query string) ([]models.User, error) {
	return s.users.ListStudents(ctx, query)
}

func (s *StudentService) Profile(ctx context.Context, id string) (*models.StudentProfile, error) {
	user, err := s.users.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return nil, ErrStudentNotFound
		}
		return nil, err
	}
	if user.Role != models.RoleStudent {
		return nil, ErrStudentNotFound
	}

	assignments, err := s.assignments.ListByStudent(ctx, id)
	if err != nil {
		return nil, err
	}

	counts := struct {
		total, completed, inProgress int
	}{}
	for _, a := range assignments {
		counts.total++
		if a.Status == "completed" {
			counts.completed++
		}
		if a.Status == "in_progress" || a.Status == "submitted" || a.Status == "under_review" || a.Status == "assigned" {
			counts.inProgress++
		}
	}

	skillCounts, err := s.KnownSkillCounts(ctx, id)
	if err != nil {
		return nil, err
	}

	return &models.StudentProfile{
		User: *user,
		Stats: models.StudentStats{
			TotalProjects:      counts.total,
			CompletedProjects:  counts.completed,
			InProgressProjects: counts.inProgress,
			ValidatedSkills:    skillCounts.ValidatedSkills,
			RejectedSkills:     skillCounts.RejectedSkills,
			PendingSkills:      skillCounts.PendingSkills,
		},
	}, nil
}

func (s *StudentService) KnownSkillCounts(ctx context.Context, id string) (*models.StudentStats, error) {
	return s.evaluations.CountForStudent(ctx, id)
}

func (s *StudentService) AssignmentsForStudent(ctx context.Context, id string) ([]models.Assignment, error) {
	return s.assignments.ListByStudent(ctx, id)
}

// Skills returns the student's 3-level skill matrix, aggregated across all of
// their assignments. Only students can see their own matrix / admins any.
func (s *StudentService) Skills(ctx context.Context, id string) (*models.StudentSkillMatrix, error) {
	user, err := s.users.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return nil, ErrStudentNotFound
		}
		return nil, err
	}
	if user.Role != models.RoleStudent {
		return nil, ErrStudentNotFound
	}

	skills, err := s.evaluations.StudentSkills(ctx, id)
	if err != nil {
		return nil, err
	}

	matrix := &models.StudentSkillMatrix{Skills: skills}
	totalLevelPoints := 0
	for _, sk := range skills {
		matrix.Stats.TotalSkills++
		switch sk.ValidatedLevel {
		case 1:
			matrix.Stats.Level1++
		case 2:
			matrix.Stats.Level2++
		case 3:
			matrix.Stats.Level3++
		default:
			matrix.Stats.Unvalidated++
		}
		totalLevelPoints += sk.ValidatedLevel
	}
	if matrix.Stats.TotalSkills > 0 {
		maxLevelPoints := matrix.Stats.TotalSkills * models.SkillLevelMax
		matrix.Stats.OverallProgressPercent = int(math.Round(float64(totalLevelPoints) / float64(maxLevelPoints) * 100))
	}
	return matrix, nil
}