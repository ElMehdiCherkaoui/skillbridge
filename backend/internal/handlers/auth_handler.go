package handlers

import (
	"errors"
	"net/http"

	"github.com/skillbridge/backend/internal/middleware"
	"github.com/skillbridge/backend/internal/repositories"
	"github.com/skillbridge/backend/internal/services"
)

type AuthHandler struct {
	auth *services.AuthService
}

func NewAuthHandler(auth *services.AuthService) *AuthHandler {
	return &AuthHandler{auth: auth}
}

type credentialsRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req credentialsRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	user, token, err := h.auth.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, services.ErrInvalidCredentials) {
			writeError(w, http.StatusUnauthorized, "invalid email or password")
			return
		}
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"user":  user,
		"token": token,
	})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// JWT is stateless; the client discards the token. This endpoint exists
	// for API completeness.
	writeMessage(w, http.StatusOK, "logged out")
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r.Context())
	user, err := h.auth.Me(r.Context(), userID)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			writeError(w, http.StatusUnauthorized, "user not found")
			return
		}
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, repositories.ErrDuplicate):
		writeError(w, http.StatusConflict, "resource already exists")
	case errors.Is(err, repositories.ErrNotFound):
		writeError(w, http.StatusNotFound, "resource not found")
	case errors.Is(err, services.ErrProjectNotFound), errors.Is(err, services.ErrAssignmentNotFound), errors.Is(err, services.ErrStudentNotFound):
		writeError(w, http.StatusNotFound, err.Error())
	case errors.Is(err, services.ErrForbidden):
		writeError(w, http.StatusForbidden, "access denied")
	case errors.Is(err, services.ErrDuplicateAssign):
		writeError(w, http.StatusConflict, "student already assigned to this project")
	case errors.Is(err, services.ErrInvalidStatus):
		writeError(w, http.StatusBadRequest, "invalid status")
	case errors.Is(err, services.ErrInviteTokenInvalid):
		writeError(w, http.StatusBadRequest, "invitation link is invalid")
	case errors.Is(err, services.ErrInviteExpired):
		writeError(w, http.StatusBadRequest, "invitation link has expired")
	case errors.Is(err, services.ErrInviteAccepted):
		writeError(w, http.StatusBadRequest, "invitation has already been used")
	case errors.Is(err, services.ErrEmailTaken):
		writeError(w, http.StatusConflict, "an account with this email already exists")
	default:
		writeError(w, http.StatusBadRequest, err.Error())
	}
}