package config

import (
	"os"
)

type Config struct {
	Port           string
	DatabaseURL    string
	JWTSecret      string
	JWTExpiryHours int
	CORSOrigins    string

	SeedOnStart       bool
	SeedAdminEmail    string
	SeedAdminPassword string
	SeedAdminName     string
}

func Load() *Config {
	return &Config{
		Port:           getEnv("PORT", "8080"),
		DatabaseURL:    getEnv("DATABASE_URL", "postgres://skillbridge:skillbridge@localhost:5432/skillbridge?sslmode=disable"),
		JWTSecret:      getEnv("JWT_SECRET", "dev-secret-change-me-in-production"),
		JWTExpiryHours: getEnvInt("JWT_EXPIRY_HOURS", 72),
		CORSOrigins:    getEnv("CORS_ORIGINS", "http://localhost:3000"),

		SeedOnStart:       getEnvBool("SEED_ON_START", true),
		SeedAdminEmail:    getEnv("SEED_ADMIN_EMAIL", "StudyHard@skillbridge.io.com"),
		SeedAdminPassword: getEnv("SEED_ADMIN_PASSWORD", "StudyHard451@@"),
		SeedAdminName:     getEnv("SEED_ADMIN_NAME", "StudyHard Admin"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}