export type Role = "student" | "admin";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export type InviteRole = "student" | "admin";

export interface Invite {
  id: string;
  email: string;
  role: Role;
  fullName: string;
  token?: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string | null;
  createdBy?: string;
}

export interface Skill {
  id: string;
  name: string;
  createdAt: string;
}

export type ProjectStatus =
  | "draft"
  | "published"
  | "in_progress"
  | "completed"
  | "archived";

export interface Project {
  id: string;
  title: string;
  description: string;
  context: string;
  cahierDesCharges: string;
  objectives: string;
  resources: string[];
  startDate?: string | null;
  deadline?: string | null;
  status: ProjectStatus;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWithSkills extends Project {
  skills: Skill[];
}

export type AssignmentStatus =
  | "assigned"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "completed";

export interface Assignment {
  id: string;
  projectId: string;
  studentId: string;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
  hasSubmitted?: boolean;
  statsTotal?: number;
  statsValidated?: number;
  statsRejected?: number;
  project?: Project;
  student?: User;
  skills?: Skill[];
  evaluationStats?: EvaluationStats;
}

export type LinkType = "github" | "figma" | "deployment" | "presentation" | "other";

export interface SubmissionLink {
  id?: string;
  type: LinkType;
  url: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  description: string;
  links: SubmissionLink[];
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EvaluationStatus = "pending" | "validated" | "not_validated";

export const SKILL_LEVEL_MAX = 3;
export const SKILL_LEVEL_LABELS: Record<number, string> = {
  0: "Unvalidated",
  1: "Level 1",
  2: "Level 2",
  3: "Level 3",
};

export interface EvaluationView {
  id: string;
  assignmentId: string;
  skillId: string;
  skillName: string;
  status: EvaluationStatus;
  feedback: string;
  level1Validated: boolean;
  level2Validated: boolean;
  level3Validated: boolean;
  validatedLevel: number;
}

// Level booleans are optional so omitted fields leave the stored state
// unchanged (independent per-level toggles).
export interface EvaluationInput {
  skillId: string;
  status: EvaluationStatus;
  feedback: string;
  level1Validated?: boolean;
  level2Validated?: boolean;
  level3Validated?: boolean;
}

export interface StudentSkill {
  skillId: string;
  skillName: string;
  level1Validated: boolean;
  level2Validated: boolean;
  level3Validated: boolean;
  validatedLevel: number;
  assignmentsCount: number;
}

export interface StudentSkillStats {
  totalSkills: number;
  level1: number;
  level2: number;
  level3: number;
  unvalidated: number;
  overallProgressPercent: number;
}

export interface StudentSkillMatrix {
  skills: StudentSkill[];
  stats: StudentSkillStats;
}

export interface EvaluationStats {
  total: number;
  validated: number;
  rejected: number;
  pending: number;
}

export interface AssignmentDetail extends Assignment {
  submission?: Submission | null;
  evaluations?: EvaluationView[];
}

export interface DashboardStats {
  projects: number;
  students: number;
  assignments: number;
  pendingCorrections: number;
  validatedSkills: number;
  completedProjects: number;
}

export interface StudentStats {
  totalProjects: number;
  completedProjects: number;
  inProgressProjects: number;
  validatedSkills: number;
  rejectedSkills: number;
  pendingSkills: number;
}

export interface StudentProfile extends User {
  stats: StudentStats;
}

export interface ApiError {
  error: string;
}

export const SUBMISSION_LINK_TYPES: { value: LinkType; label: string }[] = [
  { value: "github", label: "GitHub Repository" },
  { value: "figma", label: "Figma" },
  { value: "deployment", label: "Deployment" },
  { value: "presentation", label: "Presentation" },
  { value: "other", label: "Other" },
];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Draft",
  published: "Published",
  in_progress: "In Progress",
  completed: "Completed",
  archived: "Archived",
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  assigned: "Assigned",
  in_progress: "In Progress",
  submitted: "Submitted",
  under_review: "Under Review",
  completed: "Completed",
};

export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  pending: "Pending",
  validated: "Validated",
  not_validated: "Not Validated",
};