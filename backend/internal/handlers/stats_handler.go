package handlers

import (
	"net/http"

	"github.com/skillbridge/backend/internal/repositories"
)

type StatsHandler struct {
	stats *repositories.StatsRepository
}

func NewStatsHandler(stats *repositories.StatsRepository) *StatsHandler {
	return &StatsHandler{stats: stats}
}

func (h *StatsHandler) Dashboard(w http.ResponseWriter, r *http.Request) {
	stats, err := h.stats.Dashboard(r.Context())
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, stats)
}