package repositories

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/skillbridge/backend/internal/models"
)

var ErrInviteNotFound = errors.New("invite not found")
var ErrInviteExpired = errors.New("invite expired")

type InviteRepository struct {
	db *pgxpool.Pool
}

func NewInviteRepository(db *pgxpool.Pool) *InviteRepository {
	return &InviteRepository{db: db}
}

type InviteRow struct {
	models.Invite
	TokenHash string
}

func (r *InviteRepository) Create(ctx context.Context, email, tokenHash, fullName string, role models.Role, expiresAt time.Time, createdBy string) (*models.Invite, error) {
	in := &models.Invite{Role: role}
	err := r.db.QueryRow(ctx,
		`INSERT INTO invites (email, token, full_name, role, expires_at, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, email, role, full_name, token, expires_at, created_at, accepted_at`,
		email, tokenHash, fullName, string(role), expiresAt, createdBy,
	).Scan(&in.ID, &in.Email, &in.Role, &in.FullName, &in.Token, &in.ExpiresAt, &in.CreatedAt, &in.AcceptedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrDuplicate
		}
		return nil, err
	}
	return in, nil
}

func (r *InviteRepository) List(ctx context.Context) ([]models.Invite, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, email, role, full_name, token, expires_at, created_at, accepted_at
		 FROM invites
		 ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invites []models.Invite
	for rows.Next() {
		var in models.Invite
		if err := rows.Scan(&in.ID, &in.Email, &in.Role, &in.FullName, &in.Token, &in.ExpiresAt, &in.CreatedAt, &in.AcceptedAt); err != nil {
			return nil, err
		}
		invites = append(invites, in)
	}
	return invites, rows.Err()
}

func (r *InviteRepository) FindByToken(ctx context.Context, tokenHash string) (*InviteRow, error) {
	in := &InviteRow{}
	err := r.db.QueryRow(ctx,
		`SELECT id, email, role, full_name, token, expires_at, created_by, created_at, accepted_at
		 FROM invites WHERE token = $1`, tokenHash,
	).Scan(&in.ID, &in.Email, &in.Role, &in.FullName, &in.Token, &in.ExpiresAt, &in.CreatedBy, &in.CreatedAt, &in.AcceptedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInviteNotFound
		}
		return nil, err
	}
	return in, nil
}

func (r *InviteRepository) MarkAccepted(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE invites SET accepted_at = now() WHERE id = $1`, id)
	return err
}

func (r *InviteRepository) Delete(ctx context.Context, id string) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM invites WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrInviteNotFound
	}
	return nil
}

func (r *InviteRepository) EmailPending(ctx context.Context, email string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM invites WHERE email = $1 AND accepted_at IS NULL AND expires_at > now())`,
		email,
	).Scan(&exists)
	return exists, err
}