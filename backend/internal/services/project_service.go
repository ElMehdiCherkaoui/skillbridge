package services

import (
	"context"
	"errors"
	"strings"

	"github.com/skillbridge/backend/internal/models"
	"github.com/skillbridge/backend/internal/repositories"
)

var (
	ErrProjectNotFound = errors.New("project not found")
	ErrInvalidStatus   = errors.New("invalid status")
	ErrSkillNotFound   = errors.New("skill not found")
	ErrDuplicateAssign = errors.New("student already assigned to this project")
)

var validProjectStatuses = map[string]bool{
	"draft":     true,
	"published": true,
	"in_progress": true,
	"completed": true,
	"archived":  true,
}

var validAssignmentStatuses = map[string]bool{
	"assigned":     true,
	"in_progress":  true,
	"submitted":    true,
	"under_review": true,
	"completed":    true,
}

var validEvaluationStatuses = map[string]bool{
	"pending":       true,
	"validated":     true,
	"not_validated": true,
}

type ProjectService struct {
	projects    *repositories.ProjectRepository
	skills      *repositories.SkillRepository
	assignments *repositories.AssignmentRepository
	users       *repositories.UserRepository
}

func NewProjectService(projects *repositories.ProjectRepository, skills *repositories.SkillRepository, assignments *repositories.AssignmentRepository, users *repositories.UserRepository) *ProjectService {
	return &ProjectService{projects: projects, skills: skills, assignments: assignments, users: users}
}

func (s *ProjectService) List(ctx context.Context, status string) ([]models.ProjectWithSkills, error) {
	list, err := s.projects.List(ctx, status)
	if err != nil {
		return nil, err
	}
	result := make([]models.ProjectWithSkills, 0, len(list))
	for _, p := range list {
		skills, err := s.projects.Skills(ctx, p.ID)
		if err != nil {
			return nil, err
		}
		result = append(result, models.ProjectWithSkills{Project: p, Skills: skills})
	}
	return result, nil
}

func (s *ProjectService) Get(ctx context.Context, id string) (*models.ProjectWithSkills, error) {
	p, err := s.projects.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return nil, ErrProjectNotFound
		}
		return nil, err
	}
	skills, err := s.projects.Skills(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	return &models.ProjectWithSkills{Project: *p, Skills: skills}, nil
}

func (s *ProjectService) GetPublic(ctx context.Context, id string) (*models.ProjectWithSkills, error) {
	p, err := s.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if p.Status == "draft" || p.Status == "archived" {
		// Students only see published/in-progress/completed projects
		return nil, ErrProjectNotFound
	}
	return p, nil
}

func (s *ProjectService) Create(ctx context.Context, teacherID string, input models.Project) (*models.ProjectWithSkills, error) {
	input.Title = strings.TrimSpace(input.Title)
	if input.Title == "" {
		return nil, errors.New("title is required")
	}
	if input.Status == "" {
		input.Status = "draft"
	}
	if !validProjectStatuses[input.Status] {
		return nil, ErrInvalidStatus
	}
	if input.Resources == nil {
		input.Resources = []string{}
	}
	input.CreatedBy = &teacherID

	if input.Status == "published" {
		input.Status = "in_progress"
	}

	p, err := s.projects.Create(ctx, &input)
	if err != nil {
		return nil, err
	}
	// Add skills if provided with creation
	for _, sn := range input.Resources {
		_ = sn
	}
	return &models.ProjectWithSkills{Project: *p}, nil
}

func (s *ProjectService) Update(ctx context.Context, id string, input models.Project) (*models.ProjectWithSkills, error) {
	existing, err := s.projects.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return nil, ErrProjectNotFound
		}
		return nil, err
	}
	input.Title = strings.TrimSpace(input.Title)
	if input.Title == "" {
		input.Title = existing.Title
	}
	if input.Status != "" && !validProjectStatuses[input.Status] {
		return nil, ErrInvalidStatus
	}
	// Merge empty status with existing
	if input.Status == "" {
		input.Status = existing.Status
	}
	input.CreatedBy = existing.CreatedBy
	input.ID = id

	if input.StartDate == nil {
		input.StartDate = existing.StartDate
	}
	if input.Deadline == nil {
		input.Deadline = existing.Deadline
	}
	if input.Status == "published" {
		input.Status = "in_progress"
	}

	p, err := s.projects.Update(ctx, id, &input)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return nil, ErrProjectNotFound
		}
		return nil, err
	}
	return &models.ProjectWithSkills{Project: *p}, nil
}

func (s *ProjectService) Delete(ctx context.Context, id string) error {
	return s.projects.Delete(ctx, id)
}

func (s *ProjectService) SetStatus(ctx context.Context, id, status string) error {
	if status == "published" {
		status = "in_progress"
	}
	if !validProjectStatuses[status] {
		return ErrInvalidStatus
	}
	return s.projects.SetStatus(ctx, id, status)
}

func (s *ProjectService) AddSkill(ctx context.Context, projectID, skillID string) error {
	if _, err := s.projects.FindByID(ctx, projectID); err != nil {
		return ErrProjectNotFound
	}
	return s.projects.AddSkill(ctx, projectID, skillID)
}

func (s *ProjectService) RemoveSkill(ctx context.Context, projectID, skillID string) error {
	return s.projects.RemoveSkill(ctx, projectID, skillID)
}

// Assignments lists assignments for a project.
func (s *ProjectService) Assignments(ctx context.Context, projectID string) ([]models.Assignment, error) {
	return s.assignments.ListByProject(ctx, projectID)
}

// AssignStudent assigns a project to a student, creating evaluation rows.
func (s *ProjectService) AssignStudent(ctx context.Context, projectID, studentID string) (*models.Assignment, error) {
	if _, err := s.projects.FindByID(ctx, projectID); err != nil {
		return nil, ErrProjectNotFound
	}
	student, err := s.users.FindByID(ctx, studentID)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return nil, errors.New("student not found")
		}
		return nil, err
	}
	if student.Role != models.RoleStudent {
		return nil, errors.New("can only assign to students")
	}
	a, err := s.assignments.Create(ctx, projectID, studentID)
	if err != nil {
		if errors.Is(err, repositories.ErrDuplicate) {
			return nil, ErrDuplicateAssign
		}
		return nil, err
	}
	return a, nil
}