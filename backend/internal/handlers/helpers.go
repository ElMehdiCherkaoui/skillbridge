package handlers

import "net/http"

// pathID returns a path parameter from a Go 1.22+ ServeMux route.
func pathID(r *http.Request, name string) (string, bool) {
	v := r.PathValue(name)
	return v, v != ""
}