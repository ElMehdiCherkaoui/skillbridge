package services

import (
	"context"
	"errors"
	"strings"

	"github.com/skillbridge/backend/internal/models"
	"github.com/skillbridge/backend/internal/repositories"
)

var ErrDuplicateSkill = errors.New("skill already exists")

type SkillService struct {
	skills *repositories.SkillRepository
}

func NewSkillService(skills *repositories.SkillRepository) *SkillService {
	return &SkillService{skills: skills}
}

func (s *SkillService) List(ctx context.Context, query string) ([]models.Skill, error) {
	return s.skills.List(ctx, query)
}

func (s *SkillService) Create(ctx context.Context, name string) (*models.Skill, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("skill name is required")
	}
	skill, err := s.skills.Create(ctx, name)
	if err != nil {
		if errors.Is(err, repositories.ErrDuplicate) {
			return nil, ErrDuplicateSkill
		}
		return nil, err
	}
	return skill, nil
}

func (s *SkillService) Delete(ctx context.Context, id string) error {
	return s.skills.Delete(ctx, id)
}