package services

import (
	"context"
	"errors"
	"net/url"
	"strings"

	"github.com/skillbridge/backend/internal/models"
	"github.com/skillbridge/backend/internal/repositories"
)

var validLinkTypes = map[string]bool{
	"github":       true,
	"figma":        true,
	"deployment":   true,
	"presentation": true,
	"other":        true,
}

type SubmissionService struct {
	assignments *repositories.AssignmentRepository
	submissions *repositories.SubmissionRepository
}

func NewSubmissionService(assignments *repositories.AssignmentRepository, submissions *repositories.SubmissionRepository) *SubmissionService {
	return &SubmissionService{assignments: assignments, submissions: submissions}
}

func (s *SubmissionService) GetForStudent(ctx context.Context, assignmentID, studentID string) (*models.Submission, error) {
	a, err := s.verifyStudent(ctx, assignmentID, studentID)
	if err != nil {
		return nil, err
	}
	_ = a
	sub, err := s.submissions.FindByAssignment(ctx, assignmentID)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return nil, ErrNoSubmission
		}
		return nil, err
	}
	return sub, nil
}

func (s *SubmissionService) SaveOrSubmit(ctx context.Context, assignmentID, studentID string, description string, links []models.SubmissionLink, finalize bool) (*models.Submission, error) {
	a, err := s.verifyStudent(ctx, assignmentID, studentID)
	if err != nil {
		return nil, err
	}

	cleanLinks, firstErr := validateAndCleanLinks(links)
	if firstErr != nil {
		return nil, firstErr
	}

	sub, err := s.submissions.Upsert(ctx, assignmentID, description, cleanLinks, finalize)
	if err != nil {
		return nil, err
	}

	// Update assignment status
	newStatus := "in_progress"
	if finalize {
		newStatus = "submitted"
	}
	if a.Status == "assigned" || a.Status == "in_progress" {
		_ = s.assignments.SetStatus(ctx, assignmentID, newStatus)
	}
	return sub, nil
}

func (s *SubmissionService) verifyStudent(ctx context.Context, assignmentID, studentID string) (*models.Assignment, error) {
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
	return a, nil
}

func validateAndCleanLinks(links []models.SubmissionLink) ([]models.SubmissionLink, error) {
	cleaned := make([]models.SubmissionLink, 0, len(links))
	seen := map[string]bool{}
	for _, l := range links {
		l.URL = strings.TrimSpace(l.URL)
		if l.URL == "" {
			continue
		}
		if !validLinkTypes[l.Type] {
			l.Type = "other"
		}
		// Basic URL validation (allows relative-ish links but mostly absolute)
		if strings.Contains(l.URL, " ") {
			return nil, errors.New("link contains invalid characters")
		}
		if !strings.Contains(l.URL, ".") && !strings.Contains(l.URL, "//") {
			return nil, errors.New("invalid link: " + l.URL)
		}
		if !strings.HasPrefix(l.URL, "http://") && !strings.HasPrefix(l.URL, "https://") {
			u, err := url.Parse("https://" + l.URL)
			if err != nil || u.Host == "" {
				return nil, errors.New("invalid link: " + l.URL)
			}
			l.URL = "https://" + l.URL
		} else {
			if _, err := url.Parse(l.URL); err != nil {
				return nil, errors.New("invalid link: " + l.URL)
			}
		}
		key := l.Type + "|" + l.URL
		if seen[key] {
			continue
		}
		seen[key] = true
		cleaned = append(cleaned, l)
	}
	return cleaned, nil
}