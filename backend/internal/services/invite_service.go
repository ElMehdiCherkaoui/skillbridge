package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/skillbridge/backend/internal/models"
	"github.com/skillbridge/backend/internal/repositories"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInviteTokenInvalid = errors.New("invitation link is invalid")
	ErrInviteExpired      = errors.New("invitation link has expired")
	ErrInviteAccepted     = errors.New("invitation has already been used")
	ErrEmailTaken         = errors.New("an account with this email already exists")
)

const inviteTTL = 7 * 24 * time.Hour

type InviteService struct {
	invites *repositories.InviteRepository
	users   *repositories.UserRepository
}

func NewInviteService(invites *repositories.InviteRepository, users *repositories.UserRepository) *InviteService {
	return &InviteService{invites: invites, users: users}
}

// Create issues an invitation for a new account. The returned token (the
// plaintext part of the link) is only available here, at creation time.
func (s *InviteService) Create(ctx context.Context, email, fullName string, role models.Role, createdBy string) (*models.Invite, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if !strings.Contains(email, "@") {
		return nil, errors.New("invalid email address")
	}
	if role != models.RoleStudent && role != models.RoleAdmin {
		return nil, errors.New("invalid role")
	}
	if _, err := s.users.FindByEmail(ctx, email); err == nil {
		return nil, ErrEmailTaken
	} else if !errors.Is(err, repositories.ErrNotFound) {
		return nil, err
	}

	pending, err := s.invites.EmailPending(ctx, email)
	if err != nil {
		return nil, err
	}
	if pending {
		return nil, errors.New("an invitation for this email is already pending")
	}

	token := generateToken(32)
	invite, err := s.invites.Create(ctx, email, token, strings.TrimSpace(fullName), role, time.Now().Add(inviteTTL), createdBy)
	if err != nil {
		return nil, err
	}
	return invite, nil
}

func (s *InviteService) List(ctx context.Context) ([]models.Invite, error) {
	return s.invites.List(ctx)
}

func (s *InviteService) Revoke(ctx context.Context, id string) error {
	return s.invites.Delete(ctx, id)
}

// Accept validates the invitation token, creates the user account with the
// chosen password, and marks the invitation used.
func (s *InviteService) Accept(ctx context.Context, token, fullName, password string) (*models.User, error) {
	token = strings.TrimSpace(token)
	if len(token) < 16 {
		return nil, ErrInviteTokenInvalid
	}
	invite, err := s.invites.FindByToken(ctx, token)
	if err != nil {
		if errors.Is(err, repositories.ErrInviteNotFound) {
			return nil, ErrInviteTokenInvalid
		}
		return nil, err
	}
	if invite.AcceptedAt != nil {
		return nil, ErrInviteAccepted
	}
	if time.Now().After(invite.ExpiresAt) {
		return nil, ErrInviteExpired
	}

	fullName = strings.TrimSpace(fullName)
	if fullName == "" {
		return nil, errors.New("full name is required")
	}
	if len(password) < 6 {
		return nil, errors.New("password must be at least 6 characters")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user, err := s.users.Create(ctx, invite.Email, string(hash), fullName, invite.Role)
	if err != nil {
		if errors.Is(err, repositories.ErrDuplicate) {
			return nil, ErrEmailTaken
		}
		return nil, err
	}

	if err := s.invites.MarkAccepted(ctx, invite.ID); err != nil {
		return nil, err
	}
	return user, nil
}

func generateToken(bytes int) string {
	b := make([]byte, bytes)
	if _, err := rand.Read(b); err != nil {
		panic("failed to generate secure random token: " + err.Error())
	}
	return hex.EncodeToString(b)
}