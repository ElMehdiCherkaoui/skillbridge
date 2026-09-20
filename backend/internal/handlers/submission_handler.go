package handlers

import (
	"errors"
	"net/http"

	"github.com/skillbridge/backend/internal/middleware"
	"github.com/skillbridge/backend/internal/models"
	"github.com/skillbridge/backend/internal/services"
)

type SubmissionHandler struct {
	submissions *services.SubmissionService
}

func NewSubmissionHandler(submissions *services.SubmissionService) *SubmissionHandler {
	return &SubmissionHandler{submissions: submissions}
}

func (h *SubmissionHandler) Get(w http.ResponseWriter, r *http.Request) {
	assignmentID, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing assignment id")
		return
	}
	studentID := middleware.UserID(r.Context())
	sub, err := h.submissions.GetForStudent(r.Context(), assignmentID, studentID)
	if err != nil {
		if errors.Is(err, services.ErrNoSubmission) {
			writeJSON(w, http.StatusOK, map[string]interface{}{"submission": nil})
			return
		}
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, sub)
}

type submissionRequest struct {
	Description string                `json:"description"`
	Links       []models.SubmissionLink `json:"links"`
	Finalize    bool                  `json:"finalize"`
}

func (h *SubmissionHandler) Save(w http.ResponseWriter, r *http.Request) {
	assignmentID, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing assignment id")
		return
	}
	var req submissionRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	studentID := middleware.UserID(r.Context())
	sub, err := h.submissions.SaveOrSubmit(r.Context(), assignmentID, studentID, req.Description, req.Links, req.Finalize)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, sub)
}