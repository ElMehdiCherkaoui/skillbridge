package handlers

import (
	"net/http"

	"github.com/skillbridge/backend/internal/services"
)

type SkillHandler struct {
	skills *services.SkillService
}

func NewSkillHandler(skills *services.SkillService) *SkillHandler {
	return &SkillHandler{skills: skills}
}

func (h *SkillHandler) List(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("query")
	skills, err := h.skills.List(r.Context(), query)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, skills)
}

func (h *SkillHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
	}
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	skill, err := h.skills.Create(r.Context(), req.Name)
	if err != nil {
		if err == services.ErrDuplicateSkill {
			writeError(w, http.StatusConflict, "skill already exists")
			return
		}
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, skill)
}

func (h *SkillHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "missing skill id")
		return
	}
	if err := h.skills.Delete(r.Context(), id); err != nil {
		writeServiceError(w, err)
		return
	}
	writeMessage(w, http.StatusOK, "skill deleted")
}