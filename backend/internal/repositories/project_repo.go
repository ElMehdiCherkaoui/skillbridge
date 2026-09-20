package repositories

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/skillbridge/backend/internal/models"
)

type ProjectRepository struct {
	db *pgxpool.Pool
}

func NewProjectRepository(db *pgxpool.Pool) *ProjectRepository {
	return &ProjectRepository{db: db}
}

func (r *ProjectRepository) List(ctx context.Context, status string) ([]models.Project, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, title, description, context, cahier_des_charges, objectives, resources,
		        to_char(start_date, 'YYYY-MM-DD'), to_char(deadline, 'YYYY-MM-DD'), status, created_by, created_at, updated_at
		 FROM projects
		 WHERE ($1 = '' OR status = $1)
		 ORDER BY created_at DESC`, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []models.Project
	for rows.Next() {
		p, err := scanProject(rows)
		if err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}
	return projects, rows.Err()
}

func (r *ProjectRepository) FindByID(ctx context.Context, id string) (*models.Project, error) {
	row := r.db.QueryRow(ctx,
		`SELECT id, title, description, context, cahier_des_charges, objectives, resources,
		        to_char(start_date, 'YYYY-MM-DD'), to_char(deadline, 'YYYY-MM-DD'), status, created_by, created_at, updated_at
		 FROM projects WHERE id = $1`, id)
	p, err := scanProject(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &p, nil
}

func (r *ProjectRepository) Create(ctx context.Context, p *models.Project) (*models.Project, error) {
	err := r.db.QueryRow(ctx,
		`INSERT INTO projects (title, description, context, cahier_des_charges, objectives, resources, start_date, deadline, status, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, '')::date, NULLIF($8, '')::date, $9, $10)
		 RETURNING id, title, description, context, cahier_des_charges, objectives, resources,
		           to_char(start_date, 'YYYY-MM-DD'), to_char(deadline, 'YYYY-MM-DD'), status, created_by, created_at, updated_at`,
		p.Title, p.Description, p.Context, p.CahierDesCharges, p.Objectives, toJSONB(p.Resources), nillableStr(p.StartDate), nillableStr(p.Deadline), p.Status, p.CreatedBy,
	).Scan(&p.ID, &p.Title, &p.Description, &p.Context, &p.CahierDesCharges, &p.Objectives, &p.Resources, &p.StartDate, &p.Deadline, &p.Status, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (r *ProjectRepository) Update(ctx context.Context, id string, p *models.Project) (*models.Project, error) {
	err := r.db.QueryRow(ctx,
		`UPDATE projects SET
		   title = $2, description = $3, context = $4, cahier_des_charges = $5, objectives = $6,
		   resources = $7, start_date = NULLIF($8, '')::date, deadline = NULLIF($9, '')::date, status = $10
		 WHERE id = $1
		 RETURNING id, title, description, context, cahier_des_charges, objectives, resources,
		           to_char(start_date, 'YYYY-MM-DD'), to_char(deadline, 'YYYY-MM-DD'), status, created_by, created_at, updated_at`,
		id, p.Title, p.Description, p.Context, p.CahierDesCharges, p.Objectives, toJSONB(p.Resources), nillableStr(p.StartDate), nillableStr(p.Deadline), p.Status,
	).Scan(&p.ID, &p.Title, &p.Description, &p.Context, &p.CahierDesCharges, &p.Objectives, &p.Resources, &p.StartDate, &p.Deadline, &p.Status, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return p, nil
}

func (r *ProjectRepository) Delete(ctx context.Context, id string) error {
	ct, err := r.db.Exec(ctx, `DELETE FROM projects WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *ProjectRepository) SetStatus(ctx context.Context, id, status string) error {
	ct, err := r.db.Exec(ctx, `UPDATE projects SET status = $2 WHERE id = $1`, id, status)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *ProjectRepository) Skills(ctx context.Context, projectID string) ([]models.Skill, error) {
	rows, err := r.db.Query(ctx,
		`SELECT s.id, s.name, s.created_at FROM project_skills ps
		 JOIN skills s ON s.id = ps.skill_id
		 WHERE ps.project_id = $1 ORDER BY s.name`, projectID)
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

func (r *ProjectRepository) AddSkill(ctx context.Context, projectID, skillID string) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO project_skills (project_id, skill_id) VALUES ($1, $2)
		 ON CONFLICT (project_id, skill_id) DO NOTHING`, projectID, skillID)
	return err
}

func (r *ProjectRepository) RemoveSkill(ctx context.Context, projectID, skillID string) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM project_skills WHERE project_id = $1 AND skill_id = $2`, projectID, skillID)
	return err
}

type rowScanner interface {
	Scan(dest ...interface{}) error
}

func scanProject(row rowScanner) (models.Project, error) {
	var p models.Project
	err := row.Scan(&p.ID, &p.Title, &p.Description, &p.Context, &p.CahierDesCharges, &p.Objectives, &p.Resources,
		&p.StartDate, &p.Deadline, &p.Status, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt)
	if p.Resources == nil {
		p.Resources = []string{}
	}
	return p, err
}

func toJSONB(items []string) []byte {
	if items == nil {
		items = []string{}
	}
	b, _ := json.Marshal(items)
	return b
}

func nillableStr(s *string) *string {
	if s == nil || *s == "" {
		return nil
	}
	return s
}