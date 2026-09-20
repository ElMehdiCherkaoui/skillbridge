package handlers

import (
	"net/http"

	"github.com/skillbridge/backend/internal/middleware"
	"github.com/skillbridge/backend/internal/models"
	"github.com/skillbridge/backend/internal/repositories"
	"github.com/skillbridge/backend/internal/services"
)

type InviteHandler struct {
	invites *services.InviteService
	users   *repositories.UserRepository
	auth    *services.AuthService
}

func NewInviteHandler(invites *services.InviteService, users *repositories.UserRepository, auth *services.AuthService) *InviteHandler {
	return &InviteHandler{invites: invites, users: users, auth: auth}
}

// Create issues a new invitation (admin only). Returns the invite including
// its one-time link token so the admin can share it with the invitee.
func (h *InviteHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Role     string `json:"role"`
		FullName string `json:"fullName"`
	}
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	invite, err := h.invites.Create(r.Context(), req.Email, req.FullName, models.Role(req.Role), middleware.UserID(r.Context()))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, invite)
}

func (h *InviteHandler) List(w http.ResponseWriter, r *http.Request) {
	invites, err := h.invites.List(r.Context())
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, invites)
}

// Revoke deletes a pending invitation (admin only).
func (h *InviteHandler) Revoke(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing invite id")
		return
	}
	if err := h.invites.Revoke(r.Context(), id); err != nil {
		writeServiceError(w, err)
		return
	}
	writeMessage(w, http.StatusOK, "invitation revoked")
}

// Team lists all users (admins and students) for the admin team page.
func (h *InviteHandler) Team(w http.ResponseWriter, r *http.Request) {
	users, err := h.users.ListAll(r.Context())
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, users)
}

// Accept validates an invitation token and creates the account (public,
// rate-limited). The user is signed in immediately with a fresh JWT.
func (h *InviteHandler) Accept(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token    string `json:"token"`
		FullName string `json:"fullName"`
		Password string `json:"password"`
	}
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	user, err := h.invites.Accept(r.Context(), req.Token, req.FullName, req.Password)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	token, err := h.auth.IssueToken(user)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"user":  user,
		"token": token,
	})
}