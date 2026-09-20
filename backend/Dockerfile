# ---- Build stage ----
FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/skillbridge-api ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/seed ./cmd/seed

# ---- Runtime stage ----
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=build /out/skillbridge-api ./skillbridge-api
COPY --from=build /out/seed ./seed
COPY migrations ./migrations
EXPOSE 8080
CMD ["./skillbridge-api"]