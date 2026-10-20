/**
 * Frontend API client with cache-busting headers
 */

import type {
  ClassItem,
  SubjectItem,
  UserItem,
  TeamItem,
  M365Config,
  SimulationResult,
  SyncReport,
  LogItem,
  AnomalyItem,
  DiagnosticStep,
  MemberRestrictionsSettings,
} from '../types/index.ts';

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export const api = {
  async getStats() {
    const res = await fetch('/api/stats', { headers });
    return res.json();
  },

  async getClasses(): Promise<ClassItem[]> {
    const res = await fetch('/api/classes', { headers });
    return res.json();
  },

  async createClass(data: Partial<ClassItem>): Promise<ClassItem> {
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateClass(id: string, data: Partial<ClassItem>): Promise<ClassItem> {
    const res = await fetch(`/api/classes/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteClass(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/classes/${id}`, {
      method: 'DELETE',
      headers,
    });
    return res.json();
  },

  async getSubjects(): Promise<SubjectItem[]> {
    const res = await fetch('/api/subjects', { headers });
    return res.json();
  },

  async createSubject(data: Partial<SubjectItem>): Promise<SubjectItem> {
    const res = await fetch('/api/subjects', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateSubject(id: string, data: Partial<SubjectItem>): Promise<SubjectItem> {
    const res = await fetch(`/api/subjects/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteSubject(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/subjects/${id}`, {
      method: 'DELETE',
      headers,
    });
    return res.json();
  },

  async getUsers(params?: { role?: string; classCode?: string; search?: string }): Promise<UserItem[]> {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.set('role', params.role);
    if (params?.classCode) searchParams.set('classCode', params.classCode);
    if (params?.search) searchParams.set('search', params.search);
    const res = await fetch(`/api/users?${searchParams.toString()}`, { headers });
    return res.json();
  },

  async updateUser(id: string, data: Partial<UserItem>): Promise<UserItem> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteUser(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers,
    });
    return res.json();
  },

  async getTeams(params?: { classCode?: string; autoManaged?: boolean; search?: string }): Promise<TeamItem[]> {
    const searchParams = new URLSearchParams();
    if (params?.classCode) searchParams.set('classCode', params.classCode);
    if (params?.autoManaged !== undefined) searchParams.set('autoManaged', String(params.autoManaged));
    if (params?.search) searchParams.set('search', params.search);
    const res = await fetch(`/api/teams?${searchParams.toString()}`, { headers });
    return res.json();
  },

  async updateTeam(id: string, data: Partial<TeamItem>): Promise<{ success: boolean; team?: TeamItem; error?: string }> {
    const res = await fetch(`/api/teams/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteTeam(id: string): Promise<{ success: boolean; deletedId?: string; deletedFromM365?: boolean; message?: string; error?: string }> {
    const res = await fetch(`/api/teams/${id}`, {
      method: 'DELETE',
      headers,
    });
    return res.json();
  },

  async deleteAllTeams(deleteFromM365: boolean = false): Promise<{ success: boolean; deletedCount?: number; m365DeletedCount?: number; message?: string; error?: string }> {
    const res = await fetch('/api/teams/delete-all', {
      method: 'POST',
      headers,
      body: JSON.stringify({ deleteFromM365 }),
    });
    return res.json();
  },

  async addUserToAllTeams(params: {
    userId?: string;
    userEmail?: string;
    roleInTeam?: 'owner' | 'member';
    teamIds?: string[];
  }): Promise<{
    success: boolean;
    localModifiedCount: number;
    m365SyncedCount: number;
    userName: string;
    userEmail: string;
    roleInTeam: string;
    message: string;
    error?: string;
  }> {
    const res = await fetch('/api/teams/add-user-to-all', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async generateTeamsCatalog(): Promise<{ success: boolean; createdCount: number; totalTeams: number; message: string }> {
    const res = await fetch('/api/teams/generate-catalog', {
      method: 'POST',
      headers,
    });
    return res.json();
  },

  async applyOfficialAssignments(): Promise<{ success: boolean; totalAssigned: number; teamsCreated: number; totalTeams: number; message: string }> {
    const res = await fetch('/api/teams/apply-official-assignments', {
      method: 'POST',
      headers,
    });
    return res.json();
  },

  async assignTeacherToTeam(teamId: string, teacherIds: string[]): Promise<{ success: boolean; team: TeamItem }> {
    const res = await fetch(`/api/teams/${teamId}/assign-teacher`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ teacherIds }),
    });
    return res.json();
  },

  async addTeacherToTeam(teamId: string, teacherId: string): Promise<{ success: boolean; team: TeamItem }> {
    const res = await fetch(`/api/teams/${teamId}/add-teacher`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ teacherId }),
    });
    return res.json();
  },

  async removeTeacherFromTeam(teamId: string, teacherId: string): Promise<{ success: boolean; team: TeamItem }> {
    const res = await fetch(`/api/teams/${teamId}/remove-teacher`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ teacherId }),
    });
    return res.json();
  },

  async bulkAddAdminOwners(adminEmails?: string[], teamIds?: string[]): Promise<{
    success: boolean;
    modifiedTeamsCount: number;
    adminsAdded: { id: string; name: string; email: string }[];
    message: string;
    error?: string;
  }> {
    const res = await fetch('/api/teams/bulk-add-admin-owners', {
      method: 'POST',
      headers,
      body: JSON.stringify({ adminEmails, teamIds }),
    });
    return res.json();
  },

  async provisionTeamM365(teamId: string): Promise<{ success: boolean; m365TeamId?: string; team?: TeamItem; error?: string; message?: string }> {
    const res = await fetch(`/api/teams/${teamId}/provision-m365`, {
      method: 'POST',
      headers,
    });
    return res.json();
  },

  async provisionBatchTeams(params: { classCode?: string; teamIds?: string[]; allPending?: boolean }): Promise<{
    success: boolean;
    message: string;
    processedCount: number;
    successCount: number;
    failedCount: number;
    remainingCount?: number;
    results?: { teamId: string; teamName: string; success: boolean; error?: string }[];
    error?: string;
  }> {
    const res = await fetch('/api/teams/provision-batch', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async enforceTeamRestrictions(params: {
    teamId?: string;
    all?: boolean;
    saveAsDefault?: boolean;
    settings?: Partial<MemberRestrictionsSettings>;
  }): Promise<{
    success: boolean;
    message: string;
    count?: number;
    team?: TeamItem;
    savedAsDefault?: boolean;
    error?: string;
  }> {
    const res = await fetch('/api/teams/enforce-restrictions', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async getRestrictionsSettings(): Promise<{
    defaultSettings: MemberRestrictionsSettings;
  }> {
    const res = await fetch('/api/teams/restrictions-settings', { headers });
    return res.json();
  },

  async importTeacherAssignmentsCsv(csvContent: string): Promise<{ success: boolean; assignedCount: number; message: string; error?: string }> {
    const res = await fetch('/api/teams/import-assignments-csv', {
      method: 'POST',
      headers,
      body: JSON.stringify({ csvContent }),
    });
    return res.json();
  },

  async pullM365(): Promise<{ success: boolean; importedCount: number; teamsCount: number; message: string; error?: string }> {
    const res = await fetch('/api/sync/m365-pull', {
      method: 'POST',
      headers,
    });
    return res.json();
  },

  async runSimulation(): Promise<SimulationResult> {
    const res = await fetch('/api/simulation', {
      method: 'POST',
      headers,
    });
    return res.json();
  },

  async executeSync(payload: { type: 'FULL' | 'CLASS' | 'TEAM'; targetId?: string; targetName?: string }): Promise<{ success: boolean; message: string; report: SyncReport }> {
    const res = await fetch('/api/sync/execute', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async testConnection(): Promise<{ success: boolean; steps: DiagnosticStep[]; totalLatencyMs: number }> {
    const res = await fetch('/api/test-connection', {
      method: 'POST',
      headers,
    });
    return res.json();
  },

  async getAnomalies(): Promise<AnomalyItem[]> {
    const res = await fetch('/api/anomalies', { headers });
    return res.json();
  },

  async resolveAnomaly(id: string): Promise<{ success: boolean; anomaly: AnomalyItem }> {
    const res = await fetch(`/api/anomalies/${id}/resolve`, {
      method: 'POST',
      headers,
    });
    return res.json();
  },

  async getConfig(): Promise<M365Config> {
    const res = await fetch('/api/config', { headers });
    return res.json();
  },

  async updateConfig(data: Partial<M365Config>): Promise<M365Config> {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getLogs(): Promise<LogItem[]> {
    const res = await fetch('/api/logs', { headers });
    return res.json();
  },

  async clearLogs(): Promise<{ success: boolean }> {
    const res = await fetch('/api/logs/clear', {
      method: 'POST',
      headers,
    });
    return res.json();
  },

  async getReports(): Promise<SyncReport[]> {
    const res = await fetch('/api/reports', { headers });
    return res.json();
  },

  async archiveSchoolYear(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/school-year/archive', {
      method: 'POST',
      headers,
    });
    return res.json();
  },

  async prepareNewSchoolYear(newSchoolYear: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/school-year/prepare-new', {
      method: 'POST',
      headers,
      body: JSON.stringify({ newSchoolYear }),
    });
    return res.json();
  },

  async getDeploymentScripts(): Promise<{ allInOneScript: string; gitPushScript: string; filezillaPath: string; runCommand: string }> {
    const res = await fetch('/api/scripts', { headers });
    return res.json();
  },
};
