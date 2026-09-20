package services

import (
	"context"
	"errors"
	"strings"

	"github.com/skillbridge/backend/internal/auth"
	"github.com/skillbridge/backend/internal/models"
	"github.com/skillbridge/backend/internal/repositories"
	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidCredentials = errors.New("invalid credentials")

type AuthService struct {
	users          *repositories.UserRepository
	jwtSecret      string
	jwtExpiryHours int
}

func NewAuthService(users *repositories.UserRepository, jwtSecret string, jwtExpiryHours int) *AuthService {
	return &AuthService{
		users:          users,
		jwtSecret:      jwtSecret,
		jwtExpiryHours: jwtExpiryHours,
	}
}

func (s *AuthService) Login(ctx context.Context, email, password string) (*models.User, string, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		return nil, "", ErrInvalidCredentials
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, "", ErrInvalidCredentials
	}

	token, err := auth.GenerateToken(s.jwtSecret, user.ID, string(user.Role), s.jwtExpiryHours)
	if err != nil {
		return nil, "", err
	}
	return &user.User, token, nil
}

// IssueToken mints a JWT for a freshly created user (e.g. after accepting an
// invitation) so they are signed in immediately.
func (s *AuthService) IssueToken(user *models.User) (string, error) {
	return auth.GenerateToken(s.jwtSecret, user.ID, string(user.Role), s.jwtExpiryHours)
}

func (s *AuthService) Me(ctx context.Context, userID string) (*models.User, error) {
	return s.users.FindByID(ctx, userID)
}