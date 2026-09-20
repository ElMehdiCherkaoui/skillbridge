package repositories

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/skillbridge/backend/internal/models"
)

type SkillRepository struct {
	db *pgxpool.Pool
}

func NewSkillRepository(db *pgxpool.Pool) *SkillRepository {
	return &SkillRepository{db: db}
}

func (r *SkillRepository) List(ctx context.Context, query string) ([]models.Skill, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, name, created_at FROM skills
		 WHERE ($1 = '' OR name ILIKE '%' || $1 || '%')
		 ORDER BY name`, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var skills []models.Skill
	for rows.Next() {
		var s models.Skill
		if err := rows.Scan(&s.ID, &s.Name, &s.CreatedAt); err != nil {
			return nil, err
		}
		skills = append(skills, s)
	}
	return skills, rows.Err()
}

func (r *SkillRepository) Create(ctx context.Context, name string) (*models.Skill, error) {
	s := &models.Skill{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO skills (name) VALUES ($1) RETURNING id, name, created_at`, name,
	).Scan(&s.ID, &s.Name, &s.CreatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrDuplicate
		}
		return nil, err
	}
	return s, nil
}

func (r *SkillRepository) FindByID(ctx context.Context, id string) (*models.Skill, error) {
	s := &models.Skill{}
	err := r.db.QueryRow(ctx, `SELECT id, name, created_at FROM skills WHERE id = $1`, id,
	).Scan(&s.ID, &s.Name, &s.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return s, nil
}

func (r *SkillRepository) Delete(ctx context.Context, id string) error {
	ct, err := r.db.Exec(ctx, `DELETE FROM skills WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}