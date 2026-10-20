export type UserType = 'eleve' | 'professeur';

export type AccountStatus = 'actif' | 'inactif' | 'suspendu';

export type UserRole = 'admin' | 'operateur';

export interface UserAccount {
  id: string;
  nom: string;
  prenom: string;
  displayName: string;
  email: string; // UserPrincipalName
  type: UserType;
  microsoft365_id: string;
  statut: AccountStatus;
  licenceSkuId: string;
  licenceName: string;
  groups: string[];
  mustChangePasswordOnNextLogin: boolean;
  lastSyncDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CsvRawRow {
  lineNumber: number;
  nom: string;
  prenom: string;
  adresse_mail: string;
  password?: string;
  raw: Record<string, string>;
}

export interface CsvValidationItem {
  lineNumber: number;
  nom: string;
  prenom: string;
  email: string;
  hasPassword: boolean;
  userType: UserType;
  status: 'ok' | 'warning' | 'error';
  errors: string[];
  ignored?: boolean;
  rawPassword?: string;
}

export interface CsvAnalysisResult {
  fileName: string;
  userType: UserType;
  totalLines: number;
  validCount: number;
  errorCount: number;
  warningCount: number;
  items: CsvValidationItem[];
  hasBlockingErrors: boolean;
}

export type PreviewActionType = 
  | 'creation' 
  | 'modification' 
  | 'aucun' 
  | 'licence_change' 
  | 'categorie_change';

export interface PreviewItem {
  id: string;
  lineNumber: number;
  nom: string;
  prenom: string;
  displayName: string;
  email: string;
  userType: UserType;
  rawPassword?: string;
  action: PreviewActionType;
  existingAccount?: UserAccount;
  oldLicenceSku?: string;
  oldLicenceName?: string;
  newLicenceSku: string;
  newLicenceName: string;
  oldGroup?: string;
  newGroup: string;
  changesDescription: string[];
  statusInTenant: 'Existe' | "N'existe pas";
  selected: boolean;
  isCategoryChanged?: boolean;
}

export interface M365License {
  skuId: string;
  skuPartNumber: string;
  displayName: string;
  targetType: 'eleve' | 'professeur' | 'tous';
  totalUnits: number;
  consumedUnits: number;
  availableUnits: number;
  active: boolean;
}

export interface SyncStats {
  totalProcessed: number;
  totalCreated: number;
  totalModified: number;
  totalUnchanged: number;
  totalErrors: number;
  eleves: {
    total: number;
    created: number;
    modified: number;
    unchanged: number;
    errors: number;
  };
  profs: {
    total: number;
    created: number;
    modified: number;
    unchanged: number;
    errors: number;
  };
}

export interface SyncLogItem {
  id: string;
  timestamp: string;
  userEmail: string;
  userName: string;
  userType: UserType;
  action: string;
  oldLicence?: string;
  newLicence?: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

export interface SynchronizationRecord {
  id: string;
  date: string;
  isSimulation: boolean;
  operatorRole: UserRole;
  operatorName: string;
  stats: SyncStats;
  logs: SyncLogItem[];
  filesProcessed: string[];
}

export interface TenantConfig {
  tenantId: string;
  clientId: string;
  clientSecret?: string;
  clientSecretMasked: string;
  domain: string;
  authMethod: 'secret' | 'certificate';
  defaultEleveSkuId: string;
  defaultProfSkuId: string;
  groupEleve: string;
  groupProf: string;
  forcePasswordChangeOnFirstLogin: boolean;
  purgeTempCsv: boolean;
  liveGraphApiEnabled: boolean;
  connectionStatus: 'connected' | 'untested' | 'error';
  lastTestedDate?: string;
}

export interface AbsentAccount {
  account: UserAccount;
  missingFrom: 'eleves' | 'professeurs';
  detectionDate: string;
  potentialStatus: string;
}
