package models

import "time"

type Role string

const (
	RoleStudent Role = "student"
	RoleAdmin   Role = "admin"
)

type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	FullName  string    `json:"fullName"`
	Role      Role      `json:"role"`
	CreatedAt time.Time `json:"createdAt"`
}

type UserWithHash struct {
	User
	PasswordHash string `json:"-"`
}

// Invite is an admin-issued invitation that, once accepted, creates a user.
// Token is only returned by the server once, at creation time, so the admin
// can share the invitation link with the invitee.
type Invite struct {
	ID         string     `json:"id"`
	Email      string     `json:"email"`
	Role       Role       `json:"role"`
	FullName   string     `json:"fullName"`
	Token      string     `json:"token,omitempty"`
	ExpiresAt  time.Time  `json:"expiresAt"`
	CreatedBy  *string    `json:"createdBy,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
	AcceptedAt *time.Time `json:"acceptedAt,omitempty"`
}

type Project struct {
	ID               string   `json:"id"`
	Title            string   `json:"title"`
	Description      string   `json:"description"`
	Context          string   `json:"context"`
	CahierDesCharges string   `json:"cahierDesCharges"`
	Objectives       string   `json:"objectives"`
	Resources        []string `json:"resources"`
	StartDate        *string  `json:"startDate"`
	Deadline         *string  `json:"deadline"`
	Status           string   `json:"status"`
	CreatedBy        *string  `json:"createdBy"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type ProjectWithSkills struct {
	Project
	Skills []Skill `json:"skills"`
}

type Skill struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"createdAt"`
}

type Assignment struct {
	ID          string     `json:"id"`
	ProjectID   string     `json:"projectId"`
	StudentID   string     `json:"studentId"`
	Status      string     `json:"status"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	HasSubmitted *bool     `json:"hasSubmitted,omitempty"`
	StatsTotal  int        `json:"statsTotal,omitempty"`
	StatsValidated int     `json:"statsValidated,omitempty"`
	StatsRejected int      `json:"statsRejected,omitempty"`
	Project     *Project   `json:"project,omitempty"`
	Student     *User      `json:"student,omitempty"`
	Skills      []Skill    `json:"skills,omitempty"`
	EvaluationStats *EvaluationStats `json:"evaluationStats,omitempty"`
}

type AssignmentDetail struct {
	Assignment
	Submission   *Submission       `json:"submission,omitempty"`
	Evaluations  []EvaluationView  `json:"evaluations,omitempty"`
}

type EvaluationStats struct {
	Total      int `json:"total"`
	Validated  int `json:"validated"`
	Rejected   int `json:"rejected"`
	Pending    int `json:"pending"`
}

type Submission struct {
	ID          string       `json:"id"`
	AssignmentID string      `json:"assignmentId"`
	Description string       `json:"description"`
	Links       []SubmissionLink `json:"links"`
	SubmittedAt *time.Time   `json:"submittedAt"`
	CreatedAt   time.Time    `json:"createdAt"`
	UpdatedAt   time.Time    `json:"updatedAt"`
}

type SubmissionLink struct {
	ID    string `json:"id"`
	Type  string `json:"type"`
	URL   string `json:"url"`
}

// SkillLevelMax is the highest validation level (3-level skill validation).
const SkillLevelMax = 3

// EvaluationView is one skill evaluation for an assignment. Level booleans
// track the 1/2/3 validation state; ValidatedLevel is the highest consecutive
// level with all lower levels validated (1, 2, or 3, or 0 when unvalidated).
type EvaluationView struct {
	ID              string `json:"id"`
	AssignmentID    string `json:"assignmentId"`
	SkillID         string `json:"skillId"`
	SkillName       string `json:"skillName"`
	Status          string `json:"status"`
	Feedback        string `json:"feedback"`
	Level1Validated bool   `json:"level1Validated"`
	Level2Validated bool   `json:"level2Validated"`
	Level3Validated bool   `json:"level3Validated"`
	ValidatedLevel  int    `json:"validatedLevel"`
}

// EvaluationLevels is the 3-level validation state of a single evaluation.
type EvaluationLevels struct {
	Level1Validated bool `json:"level1Validated"`
	Level2Validated bool `json:"level2Validated"`
	Level3Validated bool `json:"level3Validated"`
}

// ValidatedLevel returns the highest consecutive validated level (0 when the
// skill is unvalidated).
func (e EvaluationLevels) ValidatedLevel() int {
	if e.Level3Validated {
		return 3
	}
	if e.Level2Validated {
		return 2
	}
	if e.Level1Validated {
		return 1
	}
	return 0
}

// EvaluationInput is the request payload for saving one evaluation. Level
// booleans are pointers so that omitted fields leave the stored level
// unchanged, enabling independent per-level toggles.
type EvaluationInput struct {
	SkillID         string `json:"skillId"`
	Status          string `json:"status"`
	Feedback        string `json:"feedback"`
	Level1Validated *bool  `json:"level1Validated,omitempty"`
	Level2Validated *bool  `json:"level2Validated,omitempty"`
	Level3Validated *bool  `json:"level3Validated,omitempty"`
}

// ResolvedEvaluation is a fully-normalized evaluation write (levels cascaded,
// status derived) produced by the service layer and consumed by the repo.
type ResolvedEvaluation struct {
	SkillID  string
	Status   string
	Feedback string
	Levels   EvaluationLevels
}

// StudentSkill is a student's aggregated validation state for one skill across
// all of their assignments. A level counts as validated if it was validated in
// any assignment.
type StudentSkill struct {
	SkillID           string   `json:"skillId"`
	SkillName         string   `json:"skillName"`
	Level1Validated   bool     `json:"level1Validated"`
	Level2Validated   bool     `json:"level2Validated"`
	Level3Validated   bool     `json:"level3Validated"`
	ValidatedLevel    int      `json:"validatedLevel"`
	AssignmentsCount  int      `json:"assignmentsCount"`
}

// StudentSkillStats aggregates a student's level progression. Level counts are
// the number of skills whose highest validated level is exactly 1/2/3;
// Unvalidated counts skills with no level validated. OverallProgressPercent is
// the achieved level points out of the maximum (sum of validated levels over
// 3 * total skills), 0-100.
type StudentSkillStats struct {
	TotalSkills           int `json:"totalSkills"`
	Level1                int `json:"level1"`
	Level2                int `json:"level2"`
	Level3                int `json:"level3"`
	Unvalidated           int `json:"unvalidated"`
	OverallProgressPercent int `json:"overallProgressPercent"`
}

// StudentSkillMatrix is the response of GET /api/students/{id}/skills.
type StudentSkillMatrix struct {
	Skills []StudentSkill    `json:"skills"`
	Stats  StudentSkillStats `json:"stats"`
}

type StudentProfile struct {
	User
	Stats StudentStats `json:"stats"`
}

type StudentStats struct {
	TotalProjects     int `json:"totalProjects"`
	CompletedProjects int `json:"completedProjects"`
	InProgressProjects int `json:"inProgressProjects"`
	ValidatedSkills   int `json:"validatedSkills"`
	RejectedSkills    int `json:"rejectedSkills"`
	PendingSkills     int `json:"pendingSkills"`
}