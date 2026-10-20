export type RoleType = 'teacher' | 'student';

export interface RawRow {
  index: number;
  originalValues: string[];
  nom: string;
  prenom: string;
  codeClasse: string;
  roleRaw?: string;
}

export interface ProcessedRow {
  index: number;
  role: RoleType;
  nom: string;
  prenom: string;
  codeClasse: string;
  password: string;
  originalNom: string;
  originalPrenom: string;
  originalIdentifiant?: string;
  identifiant: string;
  isHomonym: boolean;
  homonymNumber: number; // 0 if unique, 1 for 1st, 2 for 2nd, etc.
  homonymBase: string;
  isTruncated: boolean;
  truncatedFromLength: number;
  extraColumns: Record<string, string>;
  hasWarning?: boolean;
  warningMessage?: string;
  keptExisting?: boolean; // identifier taken from the source file, not regenerated
}

export type HomonymStyle = 
  | 'startAt1'      // DUPONT, DUPONT1, DUPONT2...
  | 'startAt2'      // DUPONT, DUPONT2, DUPONT3...
  | 'allNumbered';  // DUPONT1, DUPONT2, DUPONT3...

export type CasingStyle = 'uppercase' | 'lowercase' | 'preserve';

export interface KoXoConfig {
  // Separation
  splitMode: 'lineCount' | 'roleColumn' | 'allStudents';
  teacherLineCount: number; // e.g. first N rows are teachers
  roleColumnIndex: number;
  teacherKeyword: string; // e.g. "prof", "enseignant", "ens"

  // Identifier Rules
  maxIdLength: number; // strictly 12 by default as requested
  homonymStyle: HomonymStyle;
  casing: CasingStyle;
  removeAccents: boolean;
  removeSpacesAndSpecials: boolean;
  avoidTeacherCollisions: boolean;
  keepExistingIds: boolean; // keep the identifiers already present in the file

  // CSV Output
  delimiter: ';' | ',' | '\t';
  includeBom: boolean;
  columnsToExport: Array<'nom' | 'prenom' | 'identifiant' | 'codeClasse' | 'password' | 'role'>;
  customHeaders: {
    nom: string;
    prenom: string;
    identifiant: string;
    codeClasse: string;
    password: string;
    role: string;
  };
}

export interface ProcessedStats {
  totalRows: number;
  teacherCount: number;
  studentCount: number;
  homonymCount: number;
  truncatedCount: number;
  warningCount: number;
  ignoredCount?: number; // repeated header lines dropped from the file
}

export interface KoxoOfficePayload {
  eleves: { csv: string; name: string; count: number } | null;
  profs: { csv: string; name: string; count: number } | null;
  domain: string;
}
