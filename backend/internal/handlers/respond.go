package handlers

import (
	"encoding/json"
	"net/http"
	"reflect"
)

type errorResponse struct {
	Error string `json:"error"`
}

type messageResponse struct {
	Message string `json:"message"`
}

func normalizeJSON(v interface{}) interface{} {
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Interface, reflect.Ptr:
		if rv.IsNil() {
			return nil
		}
		return normalizeJSON(rv.Elem().Interface())
	case reflect.Slice:
		if rv.IsNil() {
			return []interface{}{}
		}
		out := make([]interface{}, rv.Len())
		for i := 0; i < rv.Len(); i++ {
			out[i] = normalizeJSON(rv.Index(i).Interface())
		}
		return out
	case reflect.Map:
		if rv.IsNil() {
			return map[string]interface{}{}
		}
		type kv struct {
			k string
			v interface{}
		}
		pairs := make([]kv, 0, rv.Len())
		iter := rv.MapRange()
		for iter.Next() {
			pairs = append(pairs, kv{iter.Key().String(), normalizeJSON(iter.Value().Interface())})
		}
		out := make(map[string]interface{}, len(pairs))
		for _, p := range pairs {
			out[p.k] = p.v
		}
		return out
	case reflect.Struct:
		return v
	case reflect.Array:
		out := make([]interface{}, rv.Len())
		for i := 0; i < rv.Len(); i++ {
			out[i] = normalizeJSON(rv.Index(i).Interface())
		}
		return out
	default:
		return v
	}
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		_ = json.NewEncoder(w).Encode(normalizeJSON(data))
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, errorResponse{Error: message})
}

func writeMessage(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, messageResponse{Message: message})
}

func decodeJSON(w http.ResponseWriter, r *http.Request, v interface{}) error {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // 1 MiB
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(v)
}