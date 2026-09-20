package handlers

import (
	"errors"
	"net/http"

	"github.com/skillbridge/backend/internal/middleware"
	"github.com/skillbridge/backend/internal/models"
	"github.com/skillbridge/backend/internal/services"
)

type EvaluationHandler struct {
	evaluations *services.EvaluationService
}

func NewEvaluationHandler(evaluations *services.EvaluationService) *EvaluationHandler {
	return &EvaluationHandler{evaluations: evaluations}
}

func (h *EvaluationHandler) ListByAssignment(w http.ResponseWriter, r *http.Request) {
	assignmentID, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing assignment id")
		return
	}
	isAdmin := middleware.Role(r.Context()) == string(models.RoleAdmin)
	evals, err := h.evaluations.ListForUser(r.Context(), assignmentID, middleware.UserID(r.Context()), isAdmin)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, evals)
}

func (h *EvaluationHandler) Save(w http.ResponseWriter, r *http.Request) {
	assignmentID, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing assignment id")
		return
	}
	var req struct {
		Evaluations []models.EvaluationInput `json:"evaluations"`
		Finalize    bool                     `json:"finalize"`
	}
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(req.Evaluations) == 0 {
		writeError(w, http.StatusBadRequest, "no evaluations provided")
		return
	}
	if err := h.evaluations.SaveMany(r.Context(), assignmentID, req.Evaluations); err != nil {
		writeServiceError(w, err)
		return
	}
	if req.Finalize {
		if err := h.evaluations.CompleteReview(r.Context(), assignmentID); err != nil {
			writeServiceError(w, err)
			return
		}
	}
	evals, err := h.evaluations.ListByAssignment(r.Context(), assignmentID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, evals)
}

func (h *EvaluationHandler) SaveOne(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing evaluation id")
		return
	}
	var req models.EvaluationInput
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	// Find the assignment for this evaluation, then save.
	if err := h.evaluations.SaveOneByID(r.Context(), id, req); err != nil {
		if errors.Is(err, services.ErrNotFound) {
			writeError(w, http.StatusNotFound, "evaluation not found")
			return
		}
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"ok": true})
}