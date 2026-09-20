package repositories

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/skillbridge/backend/internal/models"
)

var ErrNotFound = errors.New("not found")
var ErrDuplicate = errors.New("duplicate")

type UserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, email, passwordHash, fullName string, role models.Role) (*models.User, error) {
	u := &models.User{Role: role}
	err := r.db.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4)
		 RETURNING id, email, full_name, role, created_at`,
		email, passwordHash, fullName, string(role),
	).Scan(&u.ID, &u.Email, &u.FullName, &u.Role, &u.CreatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrDuplicate
		}
		return nil, err
	}
	return u, nil
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*models.UserWithHash, error) {
	u := &models.UserWithHash{}
	err := r.db.QueryRow(ctx,
		`SELECT id, email, password_hash, full_name, role, created_at
		 FROM users WHERE LOWER(email) = LOWER($1)`, email,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.FullName, &u.Role, &u.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return u, nil
}

func (r *UserRepository) FindByID(ctx context.Context, id string) (*models.User, error) {
	u := &models.User{}
	err := r.db.QueryRow(ctx,
		`SELECT id, email, full_name, role, created_at FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &u.Email, &u.FullName, &u.Role, &u.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return u, nil
}

func (r *UserRepository) ListStudents(ctx context.Context, query string) ([]models.User, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, email, full_name, role, created_at FROM users
		 WHERE role = 'student'
		   AND ($1 = '' OR full_name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%')
		 ORDER BY full_name`, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Email, &u.FullName, &u.Role, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

// ListAll returns every user (admins and students), for the admin team view.
func (r *UserRepository) ListAll(ctx context.Context) ([]models.User, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, email, full_name, role, created_at FROM users ORDER BY role, full_name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Email, &u.FullName, &u.Role, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (r *UserRepository) CountByRole(ctx context.Context, role string) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE role = $1`, role).Scan(&count)
	return count, err
}