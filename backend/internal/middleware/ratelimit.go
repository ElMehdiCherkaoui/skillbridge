package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"
)

type ipBucket struct {
	start time.Time
	count int
}

type rateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*ipBucket
	max     int
	window  time.Duration
}

func newRateLimiter(max int, window time.Duration) *rateLimiter {
	return &rateLimiter{buckets: map[string]*ipBucket{}, max: max, window: window}
}

func (l *rateLimiter) allow(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	b, ok := l.buckets[ip]
	if !ok || now.Sub(b.start) >= l.window {
		if !ok && len(l.buckets) >= 10000 {
			for k, e := range l.buckets {
				if now.Sub(e.start) >= l.window {
					delete(l.buckets, k)
				}
			}
		}
		l.buckets[ip] = &ipBucket{start: now, count: 1}
		return true
	}
	b.count++
	return b.count <= l.max
}

func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// RateLimit imposes a per-IP fixed-window request limit. It derives the client
// IP only from RemoteAddr and never trusts forwarded headers, which is safe
// even when deployed behind a reverse proxy.
func RateLimit(max int, window time.Duration) func(http.Handler) http.Handler {
	l := newRateLimiter(max, window)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !l.allow(clientIP(r)) {
				w.Header().Set("Retry-After", "60")
				writeError(w, http.StatusTooManyRequests, "too many requests")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}