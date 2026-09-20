package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/skillbridge/backend/internal/auth"
	"github.com/skillbridge/backend/internal/models"
)

type contextKey string

const (
	ContextUserID contextKey = "userID"
	ContextRole   contextKey = "role"
)

func UserID(ctx context.Context) string {
	v, _ := ctx.Value(ContextUserID).(string)
	return v
}

func Role(ctx context.Context) string {
	v, _ := ctx.Value(ContextRole).(string)
	return v
}

// Auth validates the JWT bearer token and injects user context.
func Auth(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header == "" {
				writeError(w, http.StatusUnauthorized, "missing authorization header")
				return
			}
			parts := strings.SplitN(header, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				writeError(w, http.StatusUnauthorized, "invalid authorization header")
				return
			}
			claims, err := auth.ParseToken(secret, parts[1])
			if err != nil {
				writeError(w, http.StatusUnauthorized, "invalid or expired token")
				return
			}
			ctx := context.WithValue(r.Context(), ContextUserID, claims.UserID)
			ctx = context.WithValue(ctx, ContextRole, claims.Role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireAdmin rejects non-admin users.
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, ok := r.Context().Value(ContextRole).(string)
		if !ok || role != string(models.RoleAdmin) {
			writeError(w, http.StatusForbidden, "admin access required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequireStudent rejects non-students.
func RequireStudent(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, ok := r.Context().Value(ContextRole).(string)
		if !ok || role != string(models.RoleStudent) {
			writeError(w, http.StatusForbidden, "student access required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(`{"error":"` + strings.ReplaceAll(message, `"`, `'`) + `"}`))
}