package handlers

import (
	"net/http"

	"github.com/skillbridge/backend/internal/middleware"
	"github.com/skillbridge/backend/internal/models"
	"github.com/skillbridge/backend/internal/services"
)

type StudentHandler struct {
	students *services.StudentService
}

func NewStudentHandler(students *services.StudentService) *StudentHandler {
	return &StudentHandler{students: students}
}

func (h *StudentHandler) List(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("query")
	students, err := h.students.List(r.Context(), query)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, students)
}

func (h *StudentHandler) Profile(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing student id")
		return
	}
	profile, err := h.students.Profile(r.Context(), id)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, profile)
}

func (h *StudentHandler) Assignments(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing student id")
		return
	}
	assignments, err := h.students.AssignmentsForStudent(r.Context(), id)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, assignments)
}

// Skills returns a student's 3-level skill matrix. Admins may view any
// student; students may only view their own progression.
func (h *StudentHandler) Skills(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing student id")
		return
	}
	if middleware.Role(r.Context()) == string(models.RoleStudent) && middleware.UserID(r.Context()) != id {
		writeError(w, http.StatusForbidden, "you can only view your own skills")
		return
	}
	matrix, err := h.students.Skills(r.Context(), id)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, matrix)
}

func (h *StudentHandler) Me(w http.ResponseWriter, r *http.Request) {
	id := middleware.UserID(r.Context())
	assignments, err := h.students.AssignmentsForStudent(r.Context(), id)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, assignments)
}