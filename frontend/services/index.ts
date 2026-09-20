import { api } from "@/lib/api";
import {
  Assignment,
  EvaluationInput,
  EvaluationView,
  Project,
  ProjectWithSkills,
  Submission,
} from "@/types";

export const projectsApi = {
  list(status?: string) {
    const q = status ? `?status=${status}` : "";
    return api.get<ProjectWithSkills[]>(`/api/projects${q}`);
  },
  get(id: string) {
    return api.get<ProjectWithSkills>(`/api/projects/${id}`);
  },
  create(body: Partial<Project>) {
    return api.post<ProjectWithSkills>("/api/projects", body);
  },
  update(id: string, body: Partial<Project>) {
    return api.put<ProjectWithSkills>(`/api/projects/${id}`, body);
  },
  remove(id: string) {
    return api.delete(`/api/projects/${id}`);
  },
  setStatus(id: string, status: string) {
    return api.put<ProjectWithSkills>(`/api/projects/${id}/status`, { status });
  },
  addSkill(projectId: string, skillId: string) {
    return api.post<ProjectWithSkills>(`/api/projects/${projectId}/skills`, { skillId });
  },
  removeSkill(projectId: string, skillId: string) {
    return api.delete(`/api/projects/${projectId}/skills/${skillId}`);
  },
  assign(projectId: string, studentId: string) {
    return api.post<Assignment>(`/api/projects/${projectId}/assign`, { studentId });
  },
  assignments(projectId: string) {
    return api.get<Assignment[]>(`/api/projects/${projectId}/assignments`);
  },
};

export const assignmentsApi = {
  list(status?: string) {
    const q = status ? `?status=${status}` : "";
    return api.get<Assignment[]>(`/api/assignments${q}`);
  },
  get(id: string) {
    return api.get<Assignment & { project?: Project; submission?: Submission | null; evaluations?: EvaluationView[] }>(
      `/api/assignments/${id}`,
    );
  },
  remove(id: string) {
    return api.delete(`/api/assignments/${id}`);
  },
};

export const submissionsApi = {
  get(assignmentId: string) {
    return api.get<{ submission: Submission | null }>(`/api/assignments/${assignmentId}/submission`);
  },
  save(assignmentId: string, body: { description: string; links: { type: string; url: string }[]; finalize: boolean }) {
    return api.post<Submission>(`/api/assignments/${assignmentId}/submission`, body);
  },
};

export const evaluationsApi = {
  list(assignmentId: string) {
    return api.get<EvaluationView[]>(`/api/assignments/${assignmentId}/evaluations`);
  },
  save(assignmentId: string, evaluations: EvaluationInput[], finalize = false) {
    return api.put<EvaluationView[]>(`/api/assignments/${assignmentId}/evaluations`, {
      evaluations,
      finalize,
    });
  },
};

export const skillsApi = {
  list() {
    return api.get<import("@/types").Skill[]>("/api/skills");
  },
  create(name: string) {
    return api.post<import("@/types").Skill>("/api/skills", { name });
  },
  remove(id: string) {
    return api.delete(`/api/skills/${id}`);
  },
};

export const studentsApi = {
  list(query?: string) {
    return api.get<import("@/types").User[]>(`/api/students${query ? `?query=${query}` : ""}`);
  },
  profile(id: string) {
    return api.get<import("@/types").StudentProfile>(`/api/students/${id}`);
  },
  assignments(id: string) {
    return api.get<Assignment[]>(`/api/students/${id}/assignments`);
  },
  skills(id: string) {
    return api.get<import("@/types").StudentSkillMatrix>(`/api/students/${id}/skills`);
  },
};

export const statsApi = {
  dashboard() {
    return api.get<import("@/types").DashboardStats>("/api/dashboard/stats");
  },
};

export const invitesApi = {
  list() {
    return api.get<import("@/types").Invite[]>("/api/admin/invites");
  },
  create(body: { email: string; role: "student" | "admin"; fullName: string }) {
    return api.post<import("@/types").Invite>("/api/admin/invites", body);
  },
  revoke(id: string) {
    return api.delete(`/api/admin/invites/${id}`);
  },
};

export const adminApi = {
  team() {
    return api.get<import("@/types").User[]>("/api/admin/users");
  },
};