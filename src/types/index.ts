export type SchoolSection = 'Collège' | 'Lycée';

export type ClassLevel = '6e' | '5e' | '4e' | '3e' | '2nde' | '1ère' | 'Terminale';

export interface ClassItem {
  id: string;
  code: string; // e.g. "601", "201", "101", "T01"
  name: string; // e.g. "6ème 1"
  level: ClassLevel;
  section: SchoolSection;
  active: boolean;
  studentCount: number;
  teamsCount?: number;
  mainTeacher?: string;
  room?: string;
}

export type SubjectType = 'Tronc commun' | 'Spécialité' | 'Option' | 'LV2';

export interface SubjectItem {
  id: string;
  code: string; // e.g. "FRAN", "MATH", "HGGSP", "NSI"
  name: string; // e.g. "Français", "Histoire-Géographie, Géopolitique et Sciences Politiques"
  shortName: string; // e.g. "Français", "HGGSP"
  levels: ClassLevel[];
  section: SchoolSection | 'Tous';
  type: SubjectType;
  active: boolean;
  priority: number;
}

export type UserRole = 'student' | 'teacher' | 'admin';

export interface UserItem {
  id: string;
  m365Id: string;
  firstName: string;
  lastName: string;
  email: string;
  upn: string;
  role: UserRole;
  classCode?: string;
  specialties?: string[]; // IDs or codes of selected subjects
  options?: string[]; // e.g. Latin, Grec, LCE
  teachingSubjects?: { classCode: string; subjectName: string }[];
  officeLocation?: string;
  department?: string;
  status: 'active' | 'inactive' | 'pending' | 'anomaly' | 'archived';
  anomalyNote?: string;
  lastSeen?: string;
}

export type GeneralChannelModeration = 'everyone' | 'everyoneWithAlert' | 'ownersOnly';

export interface MemberRestrictionsSettings {
  generalChannelModeration?: GeneralChannelModeration;
  allowCreateUpdateChannels: boolean;
  allowCreatePrivateChannels: boolean;
  allowDeleteChannels: boolean;
  allowAddRemoveApps: boolean;
  allowCustomApps: boolean;
  allowCreateUpdateRemoveTabs: boolean;
  allowOwnerDeleteMessages: boolean;
  allowCreateUpdateRemoveConnectors: boolean;
  allowUserCreateUpdateTags: boolean;
  allowUserDeleteMessages: boolean;
  allowUserEditMessages: boolean;
}

export interface TeamItem {
  id: string;
  m365TeamId: string;
  name: string; // e.g. "601-Français"
  classCode: string;
  subjectCode: string;
  subjectName: string;
  schoolYear: string;
  memberCount: number;
  teacherCount: number;
  assignedTeacherIds?: string[];
  assignedTeachers?: { id: string; name: string; email: string }[];
  status: 'synced' | 'pending' | 'error' | 'archived';
  autoManaged: boolean; // Protect manual teams: OUI / NON
  isClassTeam: boolean; // Education Class Template vs Standard
  lastSync?: string;
  errorMessage?: string;
  memberRestrictions?: MemberRestrictionsSettings;
}

export interface SimulationAction {
  id: string;
  type: 'AJOUT' | 'RETRAIT' | 'CRÉATION' | 'ARCHIVAGE';
  target: string; // Team name or user
  details: string;
  reason: string;
  userName?: string;
  userRole?: string;
  classCode?: string;
}

export interface SimulationResult {
  schoolYear: string;
  teamsToCreateCount: number;
  teamsExistingCount: number;
  membersToAddCount: number;
  membersExistingCount: number;
  membersToRemoveCount: number;
  anomaliesCount: number;
  teamsToCreate: { name: string; classCode: string; subjectName: string; reason: string }[];
  membersToAdd: { userName: string; upn: string; userRole: string; teamName: string; reason: string }[];
  membersToRemove: { userName: string; upn: string; userRole: string; teamName: string; reason: string }[];
  anomalies: AnomalyItem[];
  actionsList: SimulationAction[];
}

export interface AnomalyItem {
  id: string;
  type: 'NO_CLASS' | 'MULTI_CLASS' | 'MISSING_M365' | 'NO_SPECIALTY' | 'TEAM_ERROR' | 'TEACHER_UNASSIGNED';
  title: string;
  description: string;
  severity: 'warning' | 'error';
  userId?: string;
  userName?: string;
  classCode?: string;
  teamName?: string;
  resolved: boolean;
  resolutionHint: string;
}

export interface SyncReport {
  id: string;
  timestamp: string;
  date: string;
  schoolYear: string;
  type: 'FULL' | 'CLASS' | 'TEAM' | 'DIFFERENTIAL';
  targetName?: string;
  totalUsers: number;
  studentsCount: number;
  teachersCount: number;
  classesCount: number;
  teamsAnalyzed: number;
  teamsCreated: number;
  studentsAdded: number;
  studentsRemoved: number;
  classChanges: number;
  errors: number;
  warnings: number;
  details: string[];
  status: 'success' | 'warning' | 'error';
}

export interface LogItem {
  id: string;
  timestamp: string;
  action: 'AJOUT' | 'RETRAIT' | 'CRÉATION' | 'ARCHIVAGE' | 'MODIFICATION' | 'ERREUR' | 'SIMULATION' | 'SYNCHRONISATION';
  target: string;
  user?: string;
  details: string;
  status: 'Réussi' | 'Échoué' | 'Avertissement';
  source: 'GraphAPI' | 'NDM-Core' | 'Admin';
}

export interface M365Config {
  tenantId: string;
  clientId: string;
  clientSecretSet: boolean;
  namingPattern: string; // e.g. "[CLASSE]-[MATIÈRE]"
  teamTemplate: 'educationClass' | 'standard';
  syncMode: 'group' | 'attribute' | 'upn' | 'dynamic';
  entraGroupPrefix: string; // e.g. "ELEVE-"
  entraAttributeName: string; // e.g. "Classe"
  studentDomain: string; // e.g. "eleves.ndmissions.fr"
  teacherDomain: string; // e.g. "ndmissions.fr"
  autoSyncEnabled: boolean;
  syncSchedule: string[]; // e.g. ["06:00", "12:00", "18:00"]
  currentSchoolYear: string; // e.g. "2026-2027"
  autoArchivePastYears: boolean;
  lastSuccessfulSync?: string;
  connected: boolean;
}

export interface DiagnosticStep {
  step: number;
  name: string;
  description: string;
  status: 'pending' | 'success' | 'warning' | 'error';
  message: string;
  latencyMs?: number;
}
