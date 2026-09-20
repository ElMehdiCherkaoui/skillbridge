package handlers

import (
	"net/http"

	"github.com/skillbridge/backend/internal/middleware"
	"github.com/skillbridge/backend/internal/services"
)

type AssignmentHandler struct {
	assignments *services.AssignmentService
}

func NewAssignmentHandler(assignments *services.AssignmentService) *AssignmentHandler {
	return &AssignmentHandler{assignments: assignments}
}

func (h *AssignmentHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	assignments, err := h.assignments.ListAll(r.Context(), status)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, assignments)
}

// List returns all assignments for admins, the student's own for students.
func (h *AssignmentHandler) List(w http.ResponseWriter, r *http.Request) {
	if middleware.Role(r.Context()) == "admin" {
		h.ListAll(w, r)
		return
	}
	h.ListMy(w, r)
}

func (h *AssignmentHandler) ListMy(w http.ResponseWriter, r *http.Request) {
	studentID := middleware.UserID(r.Context())
	assignments, err := h.assignments.ListByStudent(r.Context(), studentID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, assignments)
}

func (h *AssignmentHandler) ListByProject(w http.ResponseWriter, r *http.Request) {
	projectID, ok := pathID(r, "projectId")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing project id")
		return
	}
	assignments, err := h.assignments.ListByProject(r.Context(), projectID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, assignments)
}

func (h *AssignmentHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing assignment id")
		return
	}
	role := middleware.Role(r.Context())
	var detail interface{}
	var err error
	if role == "admin" {
		detail, err = h.assignments.GetForReview(r.Context(), id)
	} else {
		studentID := middleware.UserID(r.Context())
		detail, err = h.assignments.GetForStudent(r.Context(), id, studentID)
	}
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, detail)
}

func (h *AssignmentHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing assignment id")
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.assignments.SetStatus(r.Context(), id, req.Status); err != nil {
		writeServiceError(w, err)
		return
	}
	detail, err := h.assignments.GetForReview(r.Context(), id)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, detail)
}

func (h *AssignmentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing assignment id")
		return
	}
	if err := h.assignments.Delete(r.Context(), id); err != nil {
		writeServiceError(w, err)
		return
	}
	writeMessage(w, http.StatusOK, "assignment removed")
}