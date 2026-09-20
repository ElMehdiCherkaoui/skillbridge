package handlers

import (
	"net/http"

	"github.com/skillbridge/backend/internal/middleware"
	"github.com/skillbridge/backend/internal/models"
	"github.com/skillbridge/backend/internal/services"
)

type ProjectHandler struct {
	projects *services.ProjectService
}

func NewProjectHandler(projects *services.ProjectService) *ProjectHandler {
	return &ProjectHandler{projects: projects}
}

func (h *ProjectHandler) List(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	projects, err := h.projects.List(r.Context(), status)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, projects)
}

// ListForUser returns all projects for admins and visible projects for students.
func (h *ProjectHandler) ListForUser(w http.ResponseWriter, r *http.Request) {
	isAdmin := middleware.Role(r.Context()) == string(models.RoleAdmin)
	if isAdmin {
		h.List(w, r)
		return
	}
	h.ListVisible(w, r)
}

func (h *ProjectHandler) ListVisible(w http.ResponseWriter, r *http.Request) {
	// Students only see published/in-progress/completed projects
	all, err := h.projects.List(r.Context(), "")
	if err != nil {
		writeServiceError(w, err)
		return
	}
	visible := make([]models.ProjectWithSkills, 0, len(all))
	for _, p := range all {
		if p.Status == "draft" || p.Status == "archived" {
			continue
		}
		visible = append(visible, p)
	}
	writeJSON(w, http.StatusOK, visible)
}

func (h *ProjectHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing project id")
		return
	}
	role := middleware.Role(r.Context())
	var project *models.ProjectWithSkills
	var err error
	if role == string(models.RoleAdmin) {
		project, err = h.projects.Get(r.Context(), id)
	} else {
		project, err = h.projects.GetPublic(r.Context(), id)
	}
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, project)
}

func (h *ProjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input models.Project
	if err := decodeJSON(w, r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	teacherID := middleware.UserID(r.Context())
	project, err := h.projects.Create(r.Context(), teacherID, input)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, project)
}

func (h *ProjectHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing project id")
		return
	}
	var input models.Project
	if err := decodeJSON(w, r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	input.ID = id
	project, err := h.projects.Update(r.Context(), id, input)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, project)
}

func (h *ProjectHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing project id")
		return
	}
	if err := h.projects.Delete(r.Context(), id); err != nil {
		writeServiceError(w, err)
		return
	}
	writeMessage(w, http.StatusOK, "project deleted")
}

func (h *ProjectHandler) SetStatus(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing project id")
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.projects.SetStatus(r.Context(), id, req.Status); err != nil {
		writeServiceError(w, err)
		return
	}
	project, err := h.projects.Get(r.Context(), id)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, project)
}

func (h *ProjectHandler) AddSkill(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing project id")
		return
	}
	var req struct {
		SkillID string `json:"skillId"`
	}
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.SkillID == "" {
		writeError(w, http.StatusBadRequest, "skillId is required")
		return
	}
	if err := h.projects.AddSkill(r.Context(), id, req.SkillID); err != nil {
		writeServiceError(w, err)
		return
	}
	project, err := h.projects.Get(r.Context(), id)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, project)
}

func (h *ProjectHandler) RemoveSkill(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing project id")
		return
	}
	skillID, ok2 := pathID(r, "skillId")
	if !ok2 {
		writeError(w, http.StatusBadRequest, "missing skill id")
		return
	}
	if err := h.projects.RemoveSkill(r.Context(), id, skillID); err != nil {
		writeServiceError(w, err)
		return
	}
	writeMessage(w, http.StatusOK, "skill removed")
}

func (h *ProjectHandler) AssignStudent(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing project id")
		return
	}
	var req struct {
		StudentID string `json:"studentId"`
	}
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.StudentID == "" {
		writeError(w, http.StatusBadRequest, "studentId is required")
		return
	}
	assignment, err := h.projects.AssignStudent(r.Context(), id, req.StudentID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, assignment)
}

func (h *ProjectHandler) Assignments(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing project id")
		return
	}
	assignments, err := h.projects.Assignments(r.Context(), id)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, assignments)
}