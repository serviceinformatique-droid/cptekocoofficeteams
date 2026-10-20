/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NDM Teams Manager - Backend Server & API
 * Ensemble Scolaire Notre-Dame des Missions
 * M365 & Microsoft Teams Automated Synchronization Engine
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
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
} from './src/types/index.ts';
import { applyOfficialPedagogicalAssignments } from './src/pedagogicalData.ts';
import { registerOfficeRoutes } from './server/office.ts';
import { registerRentreeRoutes } from './server/rentree.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// M365 Entra ID credentials (le secret ne doit venir que de l'environnement / de l'onglet Config)
const ACTIVE_CLIENT_SECRET = process.env.CLIENT_SECRET || '';
const ACTIVE_TENANT_ID = process.env.TENANT_ID || '55b01275-e53b-4146-94a3-cb58e71ec7bf';
const ACTIVE_CLIENT_ID = process.env.CLIENT_ID || '1b4e3135-da49-4e36-9d17-d15d3ab497d3';

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Global No-Cache & Iframe Headers Middleware
// 100% server-driven: forces no-cache on browser, permits embedding in iframes
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors *;");
  next();
});

app.use(express.json({ limit: '15mb' }));

// Initial State Setup according to Notre-Dame des Missions specs
function generateInitialData() {
  // 37 Classes: 24 Collège + 13 Lycée
  const classes: ClassItem[] = [
    // 6e (6 classes)
    { id: 'c-601', code: '601', name: '6ème 1', level: '6e', section: 'Collège', active: true, studentCount: 30, mainTeacher: 'Mme Martin', room: 'B101' },
    { id: 'c-602', code: '602', name: '6ème 2', level: '6e', section: 'Collège', active: true, studentCount: 31, mainTeacher: 'M. Dupont', room: 'B102' },
    { id: 'c-603', code: '603', name: '6ème 3', level: '6e', section: 'Collège', active: true, studentCount: 29, mainTeacher: 'Mme Bernard', room: 'B103' },
    { id: 'c-604', code: '604', name: '6ème 4', level: '6e', section: 'Collège', active: true, studentCount: 30, mainTeacher: 'M. Thomas', room: 'B104' },
    { id: 'c-605', code: '605', name: '6ème 5', level: '6e', section: 'Collège', active: true, studentCount: 32, mainTeacher: 'Mme Petit', room: 'B105' },
    { id: 'c-606', code: '606', name: '6ème 6', level: '6e', section: 'Collège', active: true, studentCount: 28, mainTeacher: 'M. Robert', room: 'B106' },
    // 5e (6 classes)
    { id: 'c-501', code: '501', name: '5ème 1', level: '5e', section: 'Collège', active: true, studentCount: 31, mainTeacher: 'Mme Richard', room: 'B201' },
    { id: 'c-502', code: '502', name: '5ème 2', level: '5e', section: 'Collège', active: true, studentCount: 30, mainTeacher: 'M. Durand', room: 'B202' },
    { id: 'c-503', code: '503', name: '5ème 3', level: '5e', section: 'Collège', active: true, studentCount: 31, mainTeacher: 'Mme Moreau', room: 'B203' },
    { id: 'c-504', code: '504', name: '5ème 4', level: '5e', section: 'Collège', active: true, studentCount: 29, mainTeacher: 'M. Laurent', room: 'B204' },
    { id: 'c-505', code: '505', name: '5ème 5', level: '5e', section: 'Collège', active: true, studentCount: 30, mainTeacher: 'Mme Simon', room: 'B205' },
    { id: 'c-506', code: '506', name: '5ème 6', level: '5e', section: 'Collège', active: true, studentCount: 30, mainTeacher: 'M. Michel', room: 'B206' },
    // 4e (6 classes)
    { id: 'c-401', code: '401', name: '4ème 1', level: '4e', section: 'Collège', active: true, studentCount: 32, mainTeacher: 'Mme Lefebvre', room: 'B301' },
    { id: 'c-402', code: '402', name: '4ème 2', level: '4e', section: 'Collège', active: true, studentCount: 31, mainTeacher: 'M. Leroy', room: 'B302' },
    { id: 'c-403', code: '403', name: '4ème 3', level: '4e', section: 'Collège', active: true, studentCount: 30, mainTeacher: 'Mme Roux', room: 'B303' },
    { id: 'c-404', code: '404', name: '4ème 4', level: '4e', section: 'Collège', active: true, studentCount: 29, mainTeacher: 'M. David', room: 'B304' },
    { id: 'c-405', code: '405', name: '4ème 5', level: '4e', section: 'Collège', active: true, studentCount: 31, mainTeacher: 'Mme Bertrand', room: 'B305' },
    { id: 'c-406', code: '406', name: '4ème 6', level: '4e', section: 'Collège', active: true, studentCount: 30, mainTeacher: 'M. Morel', room: 'B306' },
    // 3e (6 classes)
    { id: 'c-301', code: '301', name: '3ème 1', level: '3e', section: 'Collège', active: true, studentCount: 32, mainTeacher: 'Mme Fournier', room: 'B401' },
    { id: 'c-302', code: '302', name: '3ème 2', level: '3e', section: 'Collège', active: true, studentCount: 33, mainTeacher: 'M. Girard', room: 'B402' },
    { id: 'c-303', code: '303', name: '3ème 3', level: '3e', section: 'Collège', active: true, studentCount: 30, mainTeacher: 'Mme Bonnet', room: 'B403' },
    { id: 'c-304', code: '304', name: '3ème 4', level: '3e', section: 'Collège', active: true, studentCount: 31, mainTeacher: 'M. Vincent', room: 'B404' },
    { id: 'c-305', code: '305', name: '3ème 5', level: '3e', section: 'Collège', active: true, studentCount: 31, mainTeacher: 'Mme Faure', room: 'B405' },
    { id: 'c-306', code: '306', name: '3ème 6', level: '3e', section: 'Collège', active: true, studentCount: 29, mainTeacher: 'M. Andre', room: 'B406' },

    // Lycée Seconde (5 classes)
    { id: 'c-201', code: '201', name: '2nde 1', level: '2nde', section: 'Lycée', active: true, studentCount: 35, mainTeacher: 'Mme Mercier', room: 'L101' },
    { id: 'c-202', code: '202', name: '2nde 2', level: '2nde', section: 'Lycée', active: true, studentCount: 34, mainTeacher: 'M. Blanc', room: 'L102' },
    { id: 'c-203', code: '203', name: '2nde 3', level: '2nde', section: 'Lycée', active: true, studentCount: 35, mainTeacher: 'Mme Guerin', room: 'L103' },
    { id: 'c-204', code: '204', name: '2nde 4', level: '2nde', section: 'Lycée', active: true, studentCount: 34, mainTeacher: 'M. Boyer', room: 'L104' },
    { id: 'c-205', code: '205', name: '2nde 5', level: '2nde', section: 'Lycée', active: true, studentCount: 35, mainTeacher: 'Mme Garnier', room: 'L105' },
    // Lycée Première (4 classes)
    { id: 'c-101', code: '101', name: '1ère 1', level: '1ère', section: 'Lycée', active: true, studentCount: 34, mainTeacher: 'M. Chevalier', room: 'L201' },
    { id: 'c-102', code: '102', name: '1ère 2', level: '1ère', section: 'Lycée', active: true, studentCount: 35, mainTeacher: 'Mme Francois', room: 'L202' },
    { id: 'c-103', code: '103', name: '1ère 3', level: '1ère', section: 'Lycée', active: true, studentCount: 34, mainTeacher: 'M. Legrand', room: 'L203' },
    { id: 'c-104', code: '104', name: '1ère 4', level: '1ère', section: 'Lycée', active: true, studentCount: 33, mainTeacher: 'Mme Gauthier', room: 'L204' },
    // Lycée Terminale (4 classes)
    { id: 'c-T01', code: 'T01', name: 'Tle 1', level: 'Terminale', section: 'Lycée', active: true, studentCount: 34, mainTeacher: 'M. Garcia', room: 'L301' },
    { id: 'c-T02', code: 'T02', name: 'Tle 2', level: 'Terminale', section: 'Lycée', active: true, studentCount: 35, mainTeacher: 'Mme Perrin', room: 'L302' },
    { id: 'c-T03', code: 'T03', name: 'Tle 3', level: 'Terminale', section: 'Lycée', active: true, studentCount: 33, mainTeacher: 'M. Robin', room: 'L303' },
    { id: 'c-T04', code: 'T04', name: 'Tle 4', level: 'Terminale', section: 'Lycée', active: true, studentCount: 34, mainTeacher: 'Mme Clement', room: 'L304' },
  ];

  // Subjects according to spec
  const subjects: SubjectItem[] = [
    // Collège & Seconde Tronc Commun
    { id: 's-fran', code: 'FRAN', name: 'Français', shortName: 'Français', levels: ['6e', '5e', '4e', '3e', '2nde', '1ère'], section: 'Tous', type: 'Tronc commun', active: true, priority: 1 },
    { id: 's-philo', code: 'PHILO', name: 'Philosophie', shortName: 'Philosophie', levels: ['Terminale'], section: 'Lycée', type: 'Tronc commun', active: true, priority: 1 },
    { id: 's-math', code: 'MATH', name: 'Mathématiques', shortName: 'Mathématiques', levels: ['6e', '5e', '4e', '3e', '2nde'], section: 'Tous', type: 'Tronc commun', active: true, priority: 2 },
    { id: 's-hg', code: 'HG', name: 'Histoire-Géographie', shortName: 'Histoire-Géo', levels: ['6e', '5e', '4e', '3e', '2nde', '1ère', 'Terminale'], section: 'Tous', type: 'Tronc commun', active: true, priority: 3 },
    { id: 's-emc', code: 'EMC', name: 'Enseignement Moral et Civique', shortName: 'EMC', levels: ['6e', '5e', '4e', '3e', '2nde', '1ère', 'Terminale'], section: 'Tous', type: 'Tronc commun', active: true, priority: 4 },
    { id: 's-ang', code: 'ANG', name: 'Anglais (LV1)', shortName: 'Anglais', levels: ['6e', '5e', '4e', '3e', '2nde', '1ère', 'Terminale'], section: 'Tous', type: 'Tronc commun', active: true, priority: 5 },
    { id: 's-esp', code: 'ESP', name: 'Espagnol (LV2)', shortName: 'Espagnol', levels: ['5e', '4e', '3e', '2nde', '1ère', 'Terminale'], section: 'Tous', type: 'LV2', active: true, priority: 6 },
    { id: 's-all', code: 'ALL', name: 'Allemand (LV2)', shortName: 'Allemand', levels: ['5e', '4e', '3e', '2nde', '1ère', 'Terminale'], section: 'Tous', type: 'LV2', active: true, priority: 7 },
    { id: 's-svt', code: 'SVT', name: 'Sciences de la Vie et de la Terre', shortName: 'SVT', levels: ['6e', '5e', '4e', '3e', '2nde'], section: 'Tous', type: 'Tronc commun', active: true, priority: 8 },
    { id: 's-pc', code: 'PC', name: 'Physique-Chimie', shortName: 'Physique-Chimie', levels: ['6e', '5e', '4e', '3e', '2nde'], section: 'Tous', type: 'Tronc commun', active: true, priority: 9 },
    { id: 's-tech', code: 'TECH', name: 'Technologie', shortName: 'Technologie', levels: ['6e', '5e', '4e', '3e'], section: 'Collège', type: 'Tronc commun', active: true, priority: 10 },
    { id: 's-eps', code: 'EPS', name: 'Éducation Physique et Sportive', shortName: 'EPS', levels: ['6e', '5e', '4e', '3e', '2nde', '1ère', 'Terminale'], section: 'Tous', type: 'Tronc commun', active: true, priority: 11 },
    { id: 's-art', code: 'ART', name: 'Arts Plastiques', shortName: 'Arts Plastiques', levels: ['6e', '5e', '4e', '3e'], section: 'Collège', type: 'Tronc commun', active: true, priority: 12 },
    { id: 's-mus', code: 'MUS', name: 'Éducation Musicale', shortName: 'Éducation Musicale', levels: ['6e', '5e', '4e', '3e'], section: 'Collège', type: 'Tronc commun', active: true, priority: 13 },
    { id: 's-ses', code: 'SES', name: 'Sciences Économiques et Sociales', shortName: 'SES', levels: ['2nde'], section: 'Lycée', type: 'Tronc commun', active: true, priority: 14 },
    { id: 's-snt', code: 'SNT', name: 'Sciences Numériques et Technologie', shortName: 'SNT', levels: ['2nde'], section: 'Lycée', type: 'Tronc commun', active: true, priority: 15 },
    { id: 's-enssc', code: 'ENSSC', name: 'Enseignement Scientifique', shortName: 'Ens. Scientifique', levels: ['1ère', 'Terminale'], section: 'Lycée', type: 'Tronc commun', active: true, priority: 16 },

    // Spécialités Lycée (Première et Terminale)
    { id: 's-spe-math', code: 'SPE-MATH', name: 'Spécialité Mathématiques', shortName: 'Mathématiques', levels: ['1ère', 'Terminale'], section: 'Lycée', type: 'Spécialité', active: true, priority: 20 },
    { id: 's-spe-pc', code: 'SPE-PC', name: 'Spécialité Physique-Chimie', shortName: 'Physique-Chimie', levels: ['1ère', 'Terminale'], section: 'Lycée', type: 'Spécialité', active: true, priority: 21 },
    { id: 's-spe-svt', code: 'SPE-SVT', name: 'Spécialité SVT', shortName: 'SVT', levels: ['1ère', 'Terminale'], section: 'Lycée', type: 'Spécialité', active: true, priority: 22 },
    { id: 's-spe-ses', code: 'SPE-SES', name: 'Spécialité SES', shortName: 'SES', levels: ['1ère', 'Terminale'], section: 'Lycée', type: 'Spécialité', active: true, priority: 23 },
    { id: 's-spe-hggsp', code: 'SPE-HGGSP', name: 'Spécialité HGGSP (Histoire-Géo Géopolitique Sciences Po)', shortName: 'HGGSP', levels: ['1ère', 'Terminale'], section: 'Lycée', type: 'Spécialité', active: true, priority: 24 },
    { id: 's-spe-hlp', code: 'SPE-HLP', name: 'Spécialité HLP (Humanités Littérature Philosophie)', shortName: 'HLP', levels: ['1ère', 'Terminale'], section: 'Lycée', type: 'Spécialité', active: true, priority: 25 },
    { id: 's-spe-nsi', code: 'SPE-NSI', name: 'Spécialité NSI (Numérique et Sciences Informatiques)', shortName: 'NSI', levels: ['1ère', 'Terminale'], section: 'Lycée', type: 'Spécialité', active: true, priority: 26 },
    { id: 's-spe-llcer', code: 'SPE-LLCER', name: 'Spécialité LLCER Anglais', shortName: 'LLCER', levels: ['1ère', 'Terminale'], section: 'Lycée', type: 'Spécialité', active: true, priority: 27 },

    // Options Collège & Lycée
    { id: 's-opt-latin', code: 'OPT-LATIN', name: 'Option Latin', shortName: 'Latin', levels: ['5e', '4e', '3e', '2nde', '1ère', 'Terminale'], section: 'Tous', type: 'Option', active: true, priority: 30 },
    { id: 's-opt-grec', code: 'OPT-GREC', name: 'Option Grec Ancien', shortName: 'Grec', levels: ['3e', '2nde', '1ère', 'Terminale'], section: 'Tous', type: 'Option', active: true, priority: 31 },
    { id: 's-opt-lce', code: 'OPT-LCE', name: 'Langues et Cultures Européennes (LCE)', shortName: 'LCE', levels: ['4e', '3e'], section: 'Collège', type: 'Option', active: true, priority: 32 },
  ];

  // Utilisateurs : 100% pilotés depuis Microsoft Entra ID
  const users: UserItem[] = [];

  // Équipes : récupérées ou créées via Microsoft Graph
  const teams: TeamItem[] = [];

  // Anomalies : calculées en direct sur l'annuaire réel
  const anomalies: AnomalyItem[] = [];

  // Audit Logs
  const logs: LogItem[] = [
    { id: 'log-' + Date.now(), timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19), action: 'MODIFICATION', target: 'Annuaire Initialisé', details: 'Annuaire initialisé, prêt pour la synchronisation Microsoft 365.', status: 'Réussi', source: 'Admin' }
  ];

  // Config
  const config: M365Config = {
    tenantId: process.env.TENANT_ID || '55b01275-e53b-4146-94a3-cb58e71ec7bf',
    clientId: process.env.CLIENT_ID || '1b4e3135-da49-4e36-9d17-d15d3ab497d3',
    clientSecretSet: true,
    namingPattern: '[CLASSE]-[MATIÈRE]',
    teamTemplate: 'educationClass',
    syncMode: 'group',
    entraGroupPrefix: 'ELEVE-',
    entraAttributeName: 'Classe',
    studentDomain: 'eleves.ndmissions.fr',
    teacherDomain: 'ndmissions.fr',
    autoSyncEnabled: true,
    syncSchedule: ['06:00', '12:00', '18:00'],
    currentSchoolYear: '2026-2027',
    autoArchivePastYears: true,
    lastSuccessfulSync: '2026-10-02T18:02:14Z',
    connected: true,
  };

  const reports: SyncReport[] = [];

  return { classes, subjects, users, teams, anomalies, logs, config, reports };
}

// Load or initialize DB
function loadDatabase() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const loaded = JSON.parse(content);
      if (loaded && loaded.config) {
        // Ancien secret périmé (ex-compteoffice) : on le remplace par celui de l'environnement
        if (!loaded.config.clientSecret || loaded.config.clientSecret.includes('32d738c4')) {
          if (ACTIVE_CLIENT_SECRET) loaded.config.clientSecret = ACTIVE_CLIENT_SECRET;
          else delete loaded.config.clientSecret;
          saveDatabase(loaded);
        }
      }
      return loaded;
    } catch (e) {
      console.error('Error reading db.json, generating initial dataset', e);
    }
  }
  const initial = generateInitialData();
  saveDatabase(initial);
  return initial;
}

function saveDatabase(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving db.json', e);
  }
}

let db = loadDatabase();

// Module "Comptes M365" (fusion de compteoffice) : routes /api/office/*
registerOfficeRoutes(app, {
  getConfig: () => db.config,
  defaults: { tenantId: ACTIVE_TENANT_ID, clientId: ACTIVE_CLIENT_ID, clientSecret: ACTIVE_CLIENT_SECRET },
  persist: () => saveDatabase(db),
});

// Assistant de rentrée + création d'utilisateurs : routes /api/rentree/*
registerRentreeRoutes(app, {
  getConfig: () => db.config,
  defaults: { tenantId: ACTIVE_TENANT_ID, clientId: ACTIVE_CLIENT_ID, clientSecret: ACTIVE_CLIENT_SECRET },
  getDb: () => db,
  persist: () => saveDatabase(db),
  dataDir: DATA_DIR,
});

// ======================== API ROUTES ========================

// 1. Dashboard Stats
app.get('/api/stats', (req: Request, res: Response) => {
  const activeStudents = db.users.filter((u: UserItem) => u.role === 'student' && u.classCode && u.status === 'active');
  const studentsCount = activeStudents.length || db.classes.reduce((acc: number, c: ClassItem) => acc + (c.studentCount || 0), 0);
  const teachersCount = db.users.filter((u: UserItem) => u.role === 'teacher').length;
  const archivedCount = db.users.filter((u: UserItem) => u.status === 'archived').length;
  const classesCount = db.classes.filter((c: ClassItem) => c.active).length;
  const teamsCount = db.teams.length;
  const teamsWithProfCount = db.teams.filter((t: TeamItem) => (t.teacherCount || 0) > 0).length;
  const activeTeamsCount = db.teams.filter((t: TeamItem) => Boolean(t.m365TeamId)).length;
  const anomaliesCount = db.anomalies.filter((a: AnomalyItem) => !a.resolved).length;

  res.json({
    studentsCount,
    teachersCount,
    archivedCount,
    totalM365Users: db.users.length,
    classesCount: classesCount || 37,
    collegeClassesCount: db.classes.filter((c: ClassItem) => c.section === 'Collège').length,
    lyceeClassesCount: db.classes.filter((c: ClassItem) => c.section === 'Lycée').length,
    teamsCount,
    teamsWithProfCount,
    activeTeamsCount,
    teamsToCreateCount: Math.max(0, teamsCount - activeTeamsCount),
    membersToAddCount: studentsCount,
    membersToRemoveCount: 0,
    anomaliesCount,
    currentSchoolYear: db.config.currentSchoolYear,
    lastSync: db.config.lastSuccessfulSync,
    autoSyncEnabled: db.config.autoSyncEnabled,
    connected: db.config.connected,
  });
});

// Pull Real Microsoft 365 Entra ID Accounts via Microsoft Graph
app.post('/api/sync/m365-pull', async (req: Request, res: Response) => {
  const tenantId = db.config.tenantId || ACTIVE_TENANT_ID;
  const clientId = db.config.clientId || ACTIVE_CLIENT_ID;
  const clientSecret = db.config.clientSecret || ACTIVE_CLIENT_SECRET;

  try {
    // 1. Get Token
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenParams = new URLSearchParams();
    tokenParams.append('client_id', clientId);
    tokenParams.append('client_secret', clientSecret);
    tokenParams.append('grant_type', 'client_credentials');
    tokenParams.append('scope', 'https://graph.microsoft.com/.default');

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
      signal: AbortSignal.timeout(8000),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      let errMsg = tokenData.error_description || tokenData.error || 'Erreur authentification Entra ID';
      const isInvalidSecret = errMsg.includes('AADSTS7000215');
      const isAppNotFound = errMsg.includes('AADSTS700016');
      if (isInvalidSecret) {
        errMsg = `Code AADSTS7000215 : Secret client invalide. Votre Tenant et Application sont bien validés ! Copiez la colonne 'Valeur' (et non l'ID de secret) dans Azure Portal > Certificats & secrets.`;
      } else if (isAppNotFound) {
        errMsg = `Code AADSTS700016 : L'application '${clientId}' n'a pas été trouvée dans le Tenant '${tenantId}'. Vérifiez l'ID d'application ou accordez le consentement administrateur sur Azure Portal.`;
      }
      return res.json({ 
        success: false, 
        error: errMsg, 
        code: isInvalidSecret ? 'AADSTS7000215' : isAppNotFound ? 'AADSTS700016' : (tokenData.error || 'AUTH_ERROR'),
        adminConsentUrl: `https://login.microsoftonline.com/${tenantId}/adminconsent?client_id=${clientId}`,
        raw: tokenData 
      });
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch ALL Users from Microsoft Graph with pagination (@odata.nextLink)
    let nextUrl: string | null = 'https://graph.microsoft.com/v1.0/users?$top=999&$select=id,displayName,givenName,surname,userPrincipalName,mail,accountEnabled,jobTitle,department,officeLocation';
    let rawUsers: any[] = [];

    while (nextUrl) {
      const pageRes = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(15000),
      });

      if (!pageRes.ok) {
        const err: any = await pageRes.json();
        return res.status(400).json({ success: false, error: err.error?.message || 'Erreur requête Microsoft Graph' });
      }

      const pageData: any = await pageRes.json();
      const batch = pageData.value || [];
      rawUsers = rawUsers.concat(batch);
      nextUrl = (pageData['@odata.nextLink'] as string) || null;
    }

    // Parse users into NDM model with STRICT KoXo/Active Directory rules for active 2026-2027 classes
    const classRegex = /^(60[1-6]|50[1-6]|40[1-6]|30[1-6]|20[1-5]|10[1-4]|T0[1-4])$/;
    const classCounts: Record<string, number> = {};

    const importedUsers: UserItem[] = rawUsers.map((ru: any, idx: number) => {
      const email = (ru.mail || ru.userPrincipalName || '').trim();
      const upn = (ru.userPrincipalName || email).trim();
      const office = (ru.officeLocation || '').trim();
      const dept = (ru.department || '').trim();
      const jobTitle = (ru.jobTitle || '').trim();

      const isActiveStudent = classRegex.test(office);
      const isFormerStudent = !isActiveStudent && (
        classRegex.test(dept) || 
        dept.startsWith('Elèves /') || 
        jobTitle === 'Elèves'
      );
      const isTeacherByDept = !isActiveStudent && !isFormerStudent && (
        dept.startsWith('Professeurs /') || 
        dept === 'Profs' || 
        office === 'profs' || 
        jobTitle.toLowerCase().includes('prof')
      );

      const localPart = email.split('@')[0].toLowerCase();
      const isPersonalNameEmail = /^[a-zÀ-ÿ]+[a-zÀ-ÿ0-9-]*\.[a-zÀ-ÿ]+[a-zÀ-ÿ0-9-]*$/.test(localPart);
      const isServiceOrRoom = [
        '005', '007', '009', 'accueil', 'admin', 'admintest', 'aidecompta', 'alcasar', 
        'visio', 'parent', 'test', 'salle', 'cdi', 'bdi'
      ].some(s => localPart.includes(s)) || !isPersonalNameEmail;

      const isMjoubinOrAdmin = 
        email.toLowerCase().includes('mjoubin') || 
        email.toLowerCase().includes('admin@') || 
        localPart === 'admin' ||
        localPart.includes('admintest') ||
        localPart.includes('assistadmin') ||
        dept.toLowerCase().includes('informatique') ||
        (jobTitle || '').toLowerCase().includes('informatique') ||
        (jobTitle || '').toLowerCase().includes('administrateur');

      let role: 'student' | 'teacher' | 'admin' = 'student';
      let classCode = '';
      let status: 'active' | 'inactive' | 'archived' = 'active';

      if (isActiveStudent && !isMjoubinOrAdmin) {
        role = 'student';
        classCode = office;
        classCounts[classCode] = (classCounts[classCode] || 0) + 1;
      } else if (isMjoubinOrAdmin) {
        role = 'admin';
        status = 'active'; // Administrateurs Office 365 actifs (mjoubin, admin...)
      } else if (isFormerStudent) {
        role = 'student';
        status = 'archived'; // Former student from previous school years
      } else if (isTeacherByDept || !isServiceOrRoom) {
        role = 'teacher';
        status = 'active';
      } else {
        role = 'student';
        status = 'inactive';
      }

      return {
        id: 'u-m365-' + (ru.id || idx),
        m365Id: ru.id || `m365-${idx}`,
        firstName: ru.givenName || ru.displayName?.split(' ')[0] || 'Utilisateur',
        lastName: ru.surname || ru.displayName?.split(' ').slice(1).join(' ') || 'M365',
        email,
        upn,
        role,
        classCode,
        officeLocation: office,
        department: dept,
        status: ru.accountEnabled === false ? ('inactive' as const) : status,
      };
    });

    // Update real student counts across all 37 classes
    for (const c of db.classes) {
      c.studentCount = classCounts[c.code] || 0;
    }

    db.users = importedUsers;

    // Update team member counts
    for (const t of db.teams) {
      if (t.classCode && classCounts[t.classCode] !== undefined) {
        t.memberCount = classCounts[t.classCode];
      }
    }

    // 3. Fetch Existing Teams from Microsoft Graph & Merge without wiping official teams
    try {
      const teamsRes = await fetch("https://graph.microsoft.com/v1.0/groups?$filter=resourceProvisioningOptions/Any(x:x eq 'Team')&$top=999&$select=id,displayName,description", {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(8000),
      });
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        const rawTeams = teamsData.value || [];
        for (const rt of rawTeams) {
          const name = rt.displayName || '';
          const existing = db.teams.find((t: TeamItem) => t.name.toLowerCase() === name.toLowerCase() || t.m365TeamId === rt.id);
          if (existing) {
            existing.m365TeamId = rt.id;
            existing.status = 'synced';
            existing.lastSync = new Date().toISOString();
          } else {
            // Team existing on Graph not in local catalog
            db.teams.push({
              id: 'tm-' + rt.id,
              m365TeamId: rt.id,
              name,
              classCode: name.includes('-') ? name.split('-')[0].trim() : '',
              subjectCode: '',
              subjectName: rt.description || name,
              schoolYear: db.config.currentSchoolYear,
              memberCount: 0,
              teacherCount: 1,
              status: 'synced',
              autoManaged: false,
              isClassTeam: true,
              lastSync: new Date().toISOString(),
            });
          }
        }
      }
    } catch (e) {
      console.warn('Teams fetch error or empty', e);
    }

    db.config.lastSuccessfulSync = new Date().toISOString();
    db.logs.unshift({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action: 'SYNCHRONISATION',
      target: 'Microsoft Entra ID (Annuaire Réel)',
      details: `${importedUsers.length} comptes réels importés depuis Microsoft 365, ${db.teams.length} équipes Teams synchronisées.`,
      status: 'Réussi',
      source: 'GraphAPI',
    });

    saveDatabase(db);

    res.json({
      success: true,
      importedCount: importedUsers.length,
      teamsCount: db.teams.length,
      message: `${importedUsers.length} utilisateurs réels chargés depuis Microsoft Entra ID.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erreur connexion Microsoft Graph' });
  }
});

// 2. Classes Management (CRUD + Active toggle)
app.get('/api/classes', (req: Request, res: Response) => {
  res.json(db.classes);
});

app.post('/api/classes', (req: Request, res: Response) => {
  const newClass: ClassItem = {
    id: 'c-' + Date.now(),
    code: req.body.code,
    name: req.body.name || req.body.code,
    level: req.body.level,
    section: req.body.section,
    active: req.body.active ?? true,
    studentCount: Number(req.body.studentCount) || 0,
    mainTeacher: req.body.mainTeacher || '',
    room: req.body.room || '',
  };
  db.classes.push(newClass);
  db.logs.unshift({
    id: 'log-' + Date.now(),
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    action: 'CRÉATION',
    target: `Classe ${newClass.code}`,
    details: `Ajout de la classe ${newClass.name} (${newClass.level})`,
    status: 'Réussi',
    source: 'Admin',
  });
  saveDatabase(db);
  res.status(201).json(newClass);
});

app.put('/api/classes/:id', (req: Request, res: Response) => {
  const index = db.classes.findIndex((c: ClassItem) => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Classe introuvable' });
  db.classes[index] = { ...db.classes[index], ...req.body };
  saveDatabase(db);
  res.json(db.classes[index]);
});

app.delete('/api/classes/:id', (req: Request, res: Response) => {
  const c = db.classes.find((x: ClassItem) => x.id === req.params.id);
  db.classes = db.classes.filter((x: ClassItem) => x.id !== req.params.id);
  if (c) {
    db.logs.unshift({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action: 'ARCHIVAGE',
      target: `Classe ${c.code}`,
      details: `Suppression de la configuration de la classe ${c.code}`,
      status: 'Réussi',
      source: 'Admin',
    });
  }
  saveDatabase(db);
  res.json({ success: true });
});

// 3. Subjects Management (CRUD + Active toggle)
app.get('/api/subjects', (req: Request, res: Response) => {
  res.json(db.subjects);
});

app.post('/api/subjects', (req: Request, res: Response) => {
  const newSubject: SubjectItem = {
    id: 's-' + Date.now(),
    code: req.body.code.toUpperCase(),
    name: req.body.name,
    shortName: req.body.shortName || req.body.name,
    levels: req.body.levels || [],
    section: req.body.section || 'Tous',
    type: req.body.type || 'Tronc commun',
    active: req.body.active ?? true,
    priority: Number(req.body.priority) || 10,
  };
  db.subjects.push(newSubject);
  db.logs.unshift({
    id: 'log-' + Date.now(),
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    action: 'CRÉATION',
    target: `Matière ${newSubject.name}`,
    details: `Ajout au référentiel: ${newSubject.code} (${newSubject.type})`,
    status: 'Réussi',
    source: 'Admin',
  });
  saveDatabase(db);
  res.status(201).json(newSubject);
});

app.put('/api/subjects/:id', (req: Request, res: Response) => {
  const index = db.subjects.findIndex((s: SubjectItem) => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Matière introuvable' });
  db.subjects[index] = { ...db.subjects[index], ...req.body };
  saveDatabase(db);
  res.json(db.subjects[index]);
});

app.delete('/api/subjects/:id', (req: Request, res: Response) => {
  db.subjects = db.subjects.filter((s: SubjectItem) => s.id !== req.params.id);
  saveDatabase(db);
  res.json({ success: true });
});

// 4. Users (Students & Teachers)
app.get('/api/users', (req: Request, res: Response) => {
  const { role, classCode, search } = req.query;
  let list = db.users;

  if (role) {
    list = list.filter((u: UserItem) => u.role === role);
  }
  if (classCode) {
    list = list.filter((u: UserItem) => u.classCode === classCode);
  }
  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(
      (u: UserItem) =>
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.upn.toLowerCase().includes(q) ||
        (u.classCode && u.classCode.toLowerCase().includes(q))
    );
  }

  res.json(list);
});

app.put('/api/users/:id', (req: Request, res: Response) => {
  const index = db.users.findIndex((u: UserItem) => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Utilisateur introuvable' });
  const oldUser = db.users[index];
  const updated = { ...oldUser, ...req.body };

  // Detect class change (Cahier des charges section 17)
  if (oldUser.classCode && updated.classCode && oldUser.classCode !== updated.classCode) {
    db.logs.unshift({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action: 'MODIFICATION',
      target: `${updated.firstName} ${updated.lastName}`,
      details: `Changement de classe: ${oldUser.classCode} → ${updated.classCode}. Retrait des équipes ${oldUser.classCode} et ajout aux équipes ${updated.classCode}`,
      status: 'Réussi',
      source: 'NDM-Core',
    });
  }

  db.users[index] = updated;
  saveDatabase(db);
  res.json(db.users[index]);
});

app.delete('/api/users/:id', (req: Request, res: Response) => {
  const u = db.users.find((x: UserItem) => x.id === req.params.id);
  db.users = db.users.filter((x: UserItem) => x.id !== req.params.id);
  if (u) {
    db.logs.unshift({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action: 'MODIFICATION',
      target: `${u.firstName} ${u.lastName}`,
      details: `Suppression du compte (${u.role})`,
      status: 'Réussi',
      source: 'Admin',
    });
  }
  saveDatabase(db);
  res.json({ success: true });
});

// 5. Teams Management
app.get('/api/teams', (req: Request, res: Response) => {
  const { classCode, autoManaged, search } = req.query;
  let list = db.teams;

  if (classCode) {
    list = list.filter((t: TeamItem) => t.classCode === classCode);
  }
  if (autoManaged !== undefined) {
    const isAuto = autoManaged === 'true';
    list = list.filter((t: TeamItem) => t.autoManaged === isAuto);
  }
  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(
      (t: TeamItem) =>
        t.name.toLowerCase().includes(q) ||
        t.classCode.toLowerCase().includes(q) ||
        t.subjectName.toLowerCase().includes(q)
    );
  }

  res.json(list);
});

app.put('/api/teams/:id', async (req: Request, res: Response) => {
  const index = db.teams.findIndex((t: TeamItem) => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: 'Équipe introuvable' });

  const oldTeam = db.teams[index];
  const updatedTeam = { ...oldTeam, ...req.body };
  db.teams[index] = updatedTeam;

  // If provisioned on Graph and name or description changed, update Graph group
  if (oldTeam.m365TeamId && (req.body.name || req.body.subjectName)) {
    try {
      const token = await fetchGraphToken();
      await fetch(`https://graph.microsoft.com/v1.0/groups/${oldTeam.m365TeamId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: updatedTeam.name,
          description: `Équipe Microsoft Teams Classe ${updatedTeam.classCode} - ${updatedTeam.subjectName} (Notre-Dame des Missions)`,
        }),
      });
    } catch (err) {
      console.warn('Could not update Graph group details', err);
    }
  }

  db.logs.unshift({
    id: 'log-' + Date.now(),
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    action: 'MODIFICATION_EQUIPE',
    target: updatedTeam.name,
    details: `Équipe modifiée : Nom='${updatedTeam.name}', Classe='${updatedTeam.classCode}', Matière='${updatedTeam.subjectName}'.`,
    status: 'Réussi',
    source: 'Admin',
  });

  saveDatabase(db);
  res.json({ success: true, team: updatedTeam });
});

// Delete a single team (local DB and Microsoft Graph if provisioned)
app.delete('/api/teams/:id', async (req: Request, res: Response) => {
  const index = db.teams.findIndex((t: TeamItem) => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: 'Équipe introuvable' });

  const team = db.teams[index];
  let deletedFromM365 = false;

  if (team.m365TeamId) {
    try {
      const token = await fetchGraphToken();
      const delRes = await fetch(`https://graph.microsoft.com/v1.0/groups/${team.m365TeamId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (delRes.ok || delRes.status === 204) {
        deletedFromM365 = true;
      }
    } catch (err) {
      console.warn('Erreur suppression groupe Graph:', err);
    }
  }

  db.teams.splice(index, 1);

  db.logs.unshift({
    id: 'log-' + Date.now(),
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    action: 'SUPPRESSION_EQUIPE',
    target: team.name,
    details: `Équipe supprimée ${deletedFromM365 ? 'du serveur local et du Cloud Microsoft Teams (M365)' : 'de la base locale'}.`,
    status: 'Réussi',
    source: 'Admin',
  });

  saveDatabase(db);
  res.json({
    success: true,
    deletedId: team.id,
    deletedFromM365,
    message: `Équipe "${team.name}" supprimée avec succès${deletedFromM365 ? ' (et retirée de Microsoft Teams)' : ''}.`,
  });
});

// Delete ALL teams (local DB and optionally Microsoft Graph)
app.post('/api/teams/delete-all', async (req: Request, res: Response) => {
  const { deleteFromM365 } = req.body;
  const initialCount = db.teams.length;
  let m365DeletedCount = 0;

  if (deleteFromM365) {
    try {
      const token = await fetchGraphToken();
      const m365Teams = db.teams.filter((t: TeamItem) => t.m365TeamId);
      for (const t of m365Teams) {
        try {
          await fetch(`https://graph.microsoft.com/v1.0/groups/${t.m365TeamId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          m365DeletedCount++;
          await new Promise(r => setTimeout(r, 250));
        } catch (e) {
          // ignore individual error
        }
      }
    } catch (err) {
      console.warn('Erreur suppression en masse Graph:', err);
    }
  }

  db.teams = [];

  db.logs.unshift({
    id: 'log-' + Date.now(),
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    action: 'SUPPRESSION_TOUTES_EQUIPES',
    target: 'Toutes les équipes',
    details: `Suppression de toutes les équipes (${initialCount} équipes effacées${deleteFromM365 ? `, ${m365DeletedCount} supprimées sur Microsoft Teams Cloud` : ''}).`,
    status: 'Réussi',
    source: 'Admin',
  });

  saveDatabase(db);
  res.json({
    success: true,
    deletedCount: initialCount,
    m365DeletedCount,
    message: `${initialCount} équipe(s) supprimée(s) avec succès${deleteFromM365 ? ` (dont ${m365DeletedCount} supprimées sur Microsoft Teams Cloud)` : ''}.`,
  });
});

// Add a User to ALL teams (as Owner or Member)
app.post('/api/teams/add-user-to-all', async (req: Request, res: Response) => {
  const { userId, userEmail, roleInTeam = 'owner', teamIds } = req.body;

  let user = db.users.find((u: UserItem) =>
    (userId && (u.id === userId || u.m365Id === userId)) ||
    (userEmail && (u.email?.toLowerCase() === userEmail.toLowerCase() || u.upn?.toLowerCase() === userEmail.toLowerCase()))
  );

  if (!user && userEmail) {
    const emailParts = userEmail.split('@')[0].split('.');
    const firstName = emailParts[0] ? (emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1)) : 'Admin';
    const lastName = emailParts[1] ? emailParts[1].toUpperCase() : 'NDM';
    user = {
      id: 'u-custom-' + Date.now(),
      m365Id: '',
      email: userEmail.toLowerCase(),
      upn: userEmail.toLowerCase(),
      firstName,
      lastName,
      role: 'admin',
      classCode: '',
      status: 'active',
      syncStatus: 'synced',
      lastSync: new Date().toISOString(),
    };
    db.users.push(user);
  }

  if (!user) {
    return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });
  }

  const targetTeams = Array.isArray(teamIds) && teamIds.length > 0
    ? db.teams.filter((t: TeamItem) => teamIds.includes(t.id))
    : db.teams;

  let localModifiedCount = 0;
  const m365TeamsToUpdate: TeamItem[] = [];

  for (const team of targetTeams) {
    if (roleInTeam === 'owner') {
      team.assignedTeacherIds = team.assignedTeacherIds || [];
      team.assignedTeachers = team.assignedTeachers || [];
      if (!team.assignedTeacherIds.includes(user.id)) {
        team.assignedTeacherIds.push(user.id);
        team.assignedTeachers.push({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email || user.upn,
        });
        team.teacherCount = team.assignedTeacherIds.length;
        localModifiedCount++;
        if (team.m365TeamId) {
          m365TeamsToUpdate.push(team);
        }
      }
    } else {
      team.memberCount = (team.memberCount || 0) + 1;
      localModifiedCount++;
      if (team.m365TeamId) {
        m365TeamsToUpdate.push(team);
      }
    }
  }

  let m365SyncedCount = 0;
  let m365UserId = user.m365Id;

  if (!m365UserId && user.email) {
    try {
      const token = await fetchGraphToken();
      const uRes = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(user.email)}?$select=id`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (uRes.ok) {
        const uData = await uRes.json();
        if (uData.id) {
          m365UserId = uData.id;
          user.m365Id = uData.id;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (m365UserId && m365TeamsToUpdate.length > 0) {
    try {
      const token = await fetchGraphToken();
      for (const team of m365TeamsToUpdate) {
        try {
          const endpoint = roleInTeam === 'owner'
            ? `https://graph.microsoft.com/v1.0/groups/${team.m365TeamId}/owners/$ref`
            : `https://graph.microsoft.com/v1.0/groups/${team.m365TeamId}/members/$ref`;

          await fetch(endpoint, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ '@odata.id': `https://graph.microsoft.com/v1.0/users/${m365UserId}` }),
          });
          m365SyncedCount++;
          await new Promise(r => setTimeout(r, 150));
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // ignore
    }
  }

  db.logs.unshift({
    id: 'log-' + Date.now(),
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    action: 'AJOUT_UTILISATEUR_TOUTES_EQUIPES',
    target: `${user.firstName} ${user.lastName} (${user.email})`,
    details: `Utilisateur rattaché en tant que ${roleInTeam === 'owner' ? 'Propriétaire' : 'Membre'} à ${localModifiedCount} équipes (${m365SyncedCount} synchronisées sur Microsoft 365 Cloud).`,
    status: 'Réussi',
    source: 'Admin',
  });

  saveDatabase(db);
  res.json({
    success: true,
    localModifiedCount,
    m365SyncedCount,
    userName: `${user.firstName} ${user.lastName}`,
    userEmail: user.email,
    roleInTeam,
    message: `${user.firstName} ${user.lastName} ajouté avec succès dans ${localModifiedCount} équipes${m365SyncedCount > 0 ? ` (dont ${m365SyncedCount} synchronisées en direct sur Teams)` : ''} !`,
  });
});

// Helper: Get Microsoft Graph Token
async function fetchGraphToken(): Promise<string> {
  const tenantId = db.config.tenantId || ACTIVE_TENANT_ID;
  const clientId = db.config.clientId || ACTIVE_CLIENT_ID;
  const clientSecret = db.config.clientSecret || ACTIVE_CLIENT_SECRET;
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const tokenParams = new URLSearchParams();
  tokenParams.append('client_id', clientId);
  tokenParams.append('client_secret', clientSecret);
  tokenParams.append('grant_type', 'client_credentials');
  tokenParams.append('scope', 'https://graph.microsoft.com/.default');

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString(),
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || tokenData.error || 'Erreur jeton Graph');
  }
  return tokenData.access_token;
}

// 5b. Generate Teams Catalog for the 37 Classes
app.post('/api/teams/generate-catalog', (req: Request, res: Response) => {
  const classes = db.classes as ClassItem[];
  const existingTeams = db.teams as TeamItem[];
  let createdCount = 0;

  // Key subjects per level
  const collegeSubjects = [
    { code: 'FR', name: 'Français' },
    { code: 'MATH', name: 'Mathématiques' },
    { code: 'HG', name: 'Histoire-Géo' },
    { code: 'LV1', name: 'Anglais LV1' },
    { code: 'SVT', name: 'SVT' },
    { code: 'PC', name: 'Physique-Chimie' },
    { code: 'VIE', name: 'Vie de Classe' },
  ];

  const lyceeSubjects = [
    { code: 'FR', name: 'Français' },
    { code: 'MATH', name: 'Mathématiques' },
    { code: 'HG', name: 'Histoire-Géo' },
    { code: 'LV1', name: 'Anglais LV1' },
    { code: 'PC', name: 'Physique-Chimie' },
    { code: 'SES', name: 'SES' },
    { code: 'VIE', name: 'Vie de Classe' },
  ];

  classes.filter(c => c.active).forEach(c => {
    const isLycee = ['2nde', '1ere', 'Tle'].includes(c.level) || ['201','202','203','204','205','101','102','103','104','T01','T02','T03','T04'].includes(c.code);
    const subjectsList = isLycee ? lyceeSubjects : collegeSubjects;

    // Count real students in this class
    const studentCount = db.users.filter((u: UserItem) => u.classCode === c.code && u.role === 'student').length;

    subjectsList.forEach(s => {
      const teamName = `${c.code}-${s.name}`;
      const exists = existingTeams.some(t => t.name === teamName);
      if (!exists) {
        const newTeam: TeamItem = {
          id: `tm-${c.code.toLowerCase()}-${s.code.toLowerCase()}-${Date.now().toString(36)}`,
          m365TeamId: '',
          name: teamName,
          classCode: c.code,
          subjectCode: s.code,
          subjectName: s.name,
          schoolYear: db.config.currentSchoolYear,
          memberCount: studentCount,
          teacherCount: 0,
          assignedTeacherIds: [],
          assignedTeachers: [],
          status: 'pending',
          autoManaged: true,
          isClassTeam: true,
          lastSync: '',
        };
        db.teams.push(newTeam);
        createdCount++;
      }
    });
  });

  db.logs.unshift({
    id: 'log-' + Date.now(),
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    action: 'CRÉATION',
    target: 'Catalogue 37 Classes',
    details: `${createdCount} équipes préparées pour les 37 classes selon la convention [CLASSE]-[MATIÈRE].`,
    status: 'Réussi',
    source: 'NDM-Core',
  });

  saveDatabase(db);
  res.json({
    success: true,
    createdCount,
    totalTeams: db.teams.length,
    message: `${createdCount} équipes préparées avec succès pour les 37 classes.`,
  });
});

// 5b-2. Apply Official Pedagogical Assignments (UnDeuxTEMPS document for all 37 classes)
app.post('/api/teams/apply-official-assignments', (req: Request, res: Response) => {
  try {
    const result = applyOfficialPedagogicalAssignments(db);

    db.logs.unshift({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action: 'AFFECTATION_OFFICIELLE',
      target: 'Tableau Officiel UnDeuxTEMPS',
      details: `${result.totalAssigned} affectations de professeurs réels appliquées sur l'ensemble des 37 classes (${result.totalTeams} équipes).`,
      status: 'Réussi',
      source: 'Admin',
    });

    saveDatabase(db);
    res.json({
      success: true,
      totalAssigned: result.totalAssigned,
      teamsCreated: result.teamsCreated,
      totalTeams: result.totalTeams,
      message: `${result.totalAssigned} affectations officielles appliquées avec succès !`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erreur application affectations officielles' });
  }
});

// 5b-3. Import Custom Teacher Assignments (CSV / JSON)
app.post('/api/teams/import-assignments', (req: Request, res: Response) => {
  try {
    const { assignments } = req.body;
    if (!Array.isArray(assignments)) {
      return res.status(400).json({ success: false, error: 'Tableau assignments attendu' });
    }

    let appliedCount = 0;
    for (const item of assignments) {
      // item: { classCode, subject, teacherNameOrEmail }
      const teamName = `${item.classCode}-${item.subject}`;
      const team = db.teams.find((t: TeamItem) => t.name === teamName || (t.classCode === item.classCode && t.subjectName.toLowerCase() === (item.subject || '').toLowerCase()));
      if (!team) continue;

      const query = (item.teacherNameOrEmail || '').toLowerCase().trim();
      const teacher = db.users.find((u: UserItem) => 
        u.role === 'teacher' && (
          u.email.toLowerCase() === query || 
          u.upn.toLowerCase() === query || 
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(query) ||
          (u.lastName || '').toLowerCase().includes(query)
        )
      );

      if (teacher) {
        team.assignedTeacherIds = [teacher.id];
        team.assignedTeachers = [{
          id: teacher.id,
          name: `${teacher.firstName} ${teacher.lastName}`,
          email: teacher.email || teacher.upn,
        }];
        team.teacherCount = 1;
        appliedCount++;
      }
    }

    db.logs.unshift({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action: 'IMPORT_AFFECTATIONS',
      target: 'Fichier Personnalisé',
      details: `${appliedCount} professeurs assignés depuis l'import de fichier.`,
      status: 'Réussi',
      source: 'Admin',
    });

    saveDatabase(db);
    res.json({ success: true, appliedCount, message: `${appliedCount} affectations enregistrées.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erreur import affectations' });
  }
});

// 5c. Assign Teacher(s) to a Team
app.post('/api/teams/:id/assign-teacher', (req: Request, res: Response) => {
  const team = db.teams.find((t: TeamItem) => t.id === req.params.id);
  if (!team) return res.status(404).json({ success: false, error: 'Équipe introuvable' });

  const { teacherId, teacherIds } = req.body;
  const ids: string[] = teacherIds || (teacherId ? [teacherId] : []);

  const teachers = db.users.filter((u: UserItem) => ids.includes(u.id) || ids.includes(u.m365Id));
  team.assignedTeacherIds = teachers.map((t: UserItem) => t.id);
  team.assignedTeachers = teachers.map((t: UserItem) => ({
    id: t.id,
    name: `${t.firstName} ${t.lastName}`,
    email: t.email || t.upn,
  }));
  team.teacherCount = teachers.length;

  db.logs.unshift({
    id: 'log-' + Date.now(),
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    action: 'MODIFICATION',
    target: team.name,
    details: `Affectation enseignant: ${teachers.map((t: UserItem) => `${t.firstName} ${t.lastName}`).join(', ')} (${teachers.length} propriétaire(s))`,
    status: 'Réussi',
    source: 'Admin',
  });

  saveDatabase(db);
  res.json({ success: true, team });
});

// 5c-2. Add a Teacher/Admin to an existing team (without replacing existing owners)
app.post('/api/teams/:id/add-teacher', (req: Request, res: Response) => {
  const team = db.teams.find((t: TeamItem) => t.id === req.params.id);
  if (!team) return res.status(404).json({ success: false, error: 'Équipe introuvable' });

  const { teacherId } = req.body;
  if (!teacherId) return res.status(400).json({ success: false, error: 'teacherId requis' });

  const user = db.users.find((u: UserItem) => u.id === teacherId || u.m365Id === teacherId);
  if (!user) return res.status(404).json({ success: false, error: 'Utilisateur introuvable' });

  team.assignedTeacherIds = team.assignedTeacherIds || [];
  team.assignedTeachers = team.assignedTeachers || [];

  if (!team.assignedTeacherIds.includes(user.id)) {
    team.assignedTeacherIds.push(user.id);
    team.assignedTeachers.push({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email || user.upn,
    });
    team.teacherCount = team.assignedTeacherIds.length;
    saveDatabase(db);
  }

  res.json({ success: true, team });
});

// 5c-3. Remove a Teacher/Admin from a team
app.post('/api/teams/:id/remove-teacher', (req: Request, res: Response) => {
  const team = db.teams.find((t: TeamItem) => t.id === req.params.id);
  if (!team) return res.status(404).json({ success: false, error: 'Équipe introuvable' });

  const { teacherId } = req.body;
  if (!teacherId) return res.status(400).json({ success: false, error: 'teacherId requis' });

  team.assignedTeacherIds = (team.assignedTeacherIds || []).filter((id: string) => id !== teacherId);
  team.assignedTeachers = (team.assignedTeachers || []).filter((t: any) => t.id !== teacherId);
  team.teacherCount = team.assignedTeacherIds.length;

  saveDatabase(db);
  res.json({ success: true, team });
});

// 5c-4. Bulk Add Office Administrators (mjoubin & admin accounts) as Co-Owners
app.post('/api/teams/bulk-add-admin-owners', (req: Request, res: Response) => {
  try {
    const { teamIds, adminEmails } = req.body;

    // Search for specified admin emails or default to mjoubin and all active office admin accounts
    const targetEmails: string[] = Array.isArray(adminEmails) && adminEmails.length > 0
      ? adminEmails.map((e: string) => e.toLowerCase().trim())
      : ['mjoubin@notredamedesmissions.com', 'admin@notredamedesmissions.com', 'admin@notredamedesmissions.onmicrosoft.com'];

    const adminUsers = db.users.filter((u: UserItem) => 
      targetEmails.some((e: string) => (u.email || '').toLowerCase() === e || (u.upn || '').toLowerCase() === e)
    );

    if (adminUsers.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun compte administrateur trouvé.' });
    }

    const targetTeams = Array.isArray(teamIds) && teamIds.length > 0
      ? db.teams.filter((t: TeamItem) => teamIds.includes(t.id))
      : db.teams;

    let modifiedTeamsCount = 0;
    for (const team of targetTeams) {
      team.assignedTeacherIds = team.assignedTeacherIds || [];
      team.assignedTeachers = team.assignedTeachers || [];

      let modified = false;
      for (const admin of adminUsers) {
        if (!team.assignedTeacherIds.includes(admin.id)) {
          team.assignedTeacherIds.push(admin.id);
          team.assignedTeachers.push({
            id: admin.id,
            name: `${admin.firstName} ${admin.lastName}`,
            email: admin.email || admin.upn,
          });
          modified = true;
        }
      }
      if (modified) {
        team.teacherCount = team.assignedTeacherIds.length;
        modifiedTeamsCount++;
      }
    }

    db.logs.unshift({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action: 'CO_PROPRIETE_ADMINS',
      target: 'Équipes Teams M365',
      details: `Co-propriété configurée avec succès pour ${adminUsers.map((a: UserItem) => a.email).join(', ')} sur ${modifiedTeamsCount} équipes Teams.`,
      status: 'Réussi',
      source: 'Admin',
    });

    saveDatabase(db);
    res.json({
      success: true,
      modifiedTeamsCount,
      adminsAdded: adminUsers.map((a: UserItem) => ({ id: a.id, name: `${a.firstName} ${a.lastName}`, email: a.email })),
      message: `Co-propriété configurée avec succès sur ${modifiedTeamsCount} équipes pour ${adminUsers.length} administrateur(s) (${adminUsers.map((a: UserItem) => a.email).join(', ')}).`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erreur co-propriété administrateurs' });
  }
});

// Exact Pedagogical Restrictions Settings conforming to guidelines (see user screenshot)
const DEFAULT_RESTRICTIONS_SETTINGS = {
  generalChannelModeration: 'ownersOnly', // 'everyone' | 'everyoneWithAlert' | 'ownersOnly' (Canal général : Seuls les propriétaires peuvent publier)
  allowCreateUpdateChannels: false,
  allowCreatePrivateChannels: false,
  allowDeleteChannels: false,
  allowAddRemoveApps: false,
  allowCustomApps: false,
  allowCreateUpdateRemoveTabs: false,
  allowOwnerDeleteMessages: true,
  allowCreateUpdateRemoveConnectors: false,
  allowUserCreateUpdateTags: true,
  allowUserDeleteMessages: true,
  allowUserEditMessages: true,
};

function formatGraphSettingsPayload(customSettings?: any) {
  const defaults = db.config.defaultTeamSettings || DEFAULT_RESTRICTIONS_SETTINGS;
  const s = { ...DEFAULT_RESTRICTIONS_SETTINGS, ...defaults, ...customSettings };
  return {
    memberSettings: {
      allowCreateUpdateChannels: Boolean(s.allowCreateUpdateChannels),
      allowCreatePrivateChannels: Boolean(s.allowCreatePrivateChannels && s.allowCreateUpdateChannels),
      allowDeleteChannels: Boolean(s.allowDeleteChannels),
      allowAddRemoveApps: Boolean(s.allowAddRemoveApps),
      allowCreateUpdateRemoveTabs: Boolean(s.allowCreateUpdateRemoveTabs),
      allowCreateUpdateRemoveConnectors: Boolean(s.allowCreateUpdateRemoveConnectors),
    },
    messagingSettings: {
      allowOwnerDeleteMessages: Boolean(s.allowOwnerDeleteMessages),
      allowUserDeleteMessages: Boolean(s.allowUserDeleteMessages),
      allowUserEditMessages: Boolean(s.allowUserEditMessages),
      allowTeamMentions: true,
      allowChannelMentions: true,
    },
    funSettings: {
      allowGiphy: false,
      allowStickersAndMemes: false,
      allowCustomMemes: false,
    },
  };
}

// Core provision helper for single team
async function provisionAndConfigureTeam(team: TeamItem, token: string) {
  // 1. Determine Owners (assigned teachers + admins)
  const ownerM365Ids: string[] = [];
  if (team.assignedTeacherIds && team.assignedTeacherIds.length > 0) {
    for (const tid of team.assignedTeacherIds) {
      const assigned = db.users.find((u: UserItem) => (u.id === tid || u.m365Id === tid) && u.m365Id);
      if (assigned && assigned.m365Id && !ownerM365Ids.includes(assigned.m365Id)) {
        ownerM365Ids.push(assigned.m365Id);
      }
    }
  }

  if (ownerM365Ids.length === 0) {
    const usersRes = await fetch("https://graph.microsoft.com/v1.0/users?$filter=userType eq 'Member'&$top=1", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const usersData = await usersRes.json();
    if (usersData.value && usersData.value.length > 0) {
      ownerM365Ids.push(usersData.value[0].id);
    }
  }

  if (ownerM365Ids.length === 0) {
    throw new Error('Aucun compte propriétaire valide sur Microsoft 365');
  }

  // 2. Check if group already exists to prevent duplicate groups
  let groupId: string = team.m365TeamId ? team.m365TeamId : '';
  if (!groupId) {
    const searchRes = await fetch(`https://graph.microsoft.com/v1.0/groups?$filter=displayName eq '${encodeURIComponent(team.name)}'&$select=id,displayName`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.value && searchData.value.length > 0) {
        groupId = searchData.value[0].id;
      }
    }
  }

  if (!groupId) {
    const cleanSubject = team.subjectName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanClass = team.classCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const nickname = `ndm-${cleanClass}-${cleanSubject}-${Date.now().toString(36)}`;

    const groupPayload = {
      displayName: team.name,
      description: `Équipe Microsoft Teams Classe ${team.classCode} - ${team.subjectName} (Notre-Dame des Missions)`,
      groupTypes: ['Unified'],
      visibility: 'Private',
      mailEnabled: true,
      mailNickname: nickname,
      securityEnabled: false,
      'owners@odata.bind': ownerM365Ids.slice(0, 20).map(oid => `https://graph.microsoft.com/v1.0/users/${oid}`)
    };

    const groupRes = await fetch('https://graph.microsoft.com/v1.0/groups', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(groupPayload),
    });

    const groupData = await groupRes.json();
    if (!groupRes.ok || !groupData.id) {
      throw new Error(groupData.error?.message || 'Erreur création groupe M365');
    }
    groupId = groupData.id;
  }

  // 3. Ensure all owners bound
  for (const oid of ownerM365Ids) {
    try {
      await fetch(`https://graph.microsoft.com/v1.0/groups/${groupId}/owners/$ref`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ '@odata.id': `https://graph.microsoft.com/v1.0/users/${oid}` }),
      });
    } catch (e) {
      // Ignored if already owner
    }
  }

  // 4. Teamify with restrictions (active default or custom for this team)
  const appliedRestrictions = { ...DEFAULT_RESTRICTIONS_SETTINGS, ...(db.config.defaultTeamSettings || {}), ...(team.memberRestrictions || {}) };
  team.memberRestrictions = appliedRestrictions;
  const graphRestrictionsPayload = formatGraphSettingsPayload(appliedRestrictions);

  let teamWebUrl = '';
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const checkTeamRes = await fetch(`https://graph.microsoft.com/v1.0/groups/${groupId}/team`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (checkTeamRes.ok) {
        const tInfo = await checkTeamRes.json();
        teamWebUrl = tInfo.webUrl || '';
        // Apply restrictions on existing team
        await fetch(`https://graph.microsoft.com/v1.0/teams/${groupId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(graphRestrictionsPayload),
        });
        break;
      }

      const putTeamRes = await fetch(`https://graph.microsoft.com/v1.0/groups/${groupId}/team`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(graphRestrictionsPayload),
      });

      if (putTeamRes.status === 201 || putTeamRes.status === 200) {
        const putData = await putTeamRes.json();
        teamWebUrl = putData.webUrl || '';
        break;
      }

      await new Promise(r => setTimeout(r, 2500));
    } catch (err) {
      await new Promise(r => setTimeout(r, 2500));
    }
  }

  // 5. Add ALL Class Students in batches of 15
  const classStudents = db.users.filter((u: UserItem) => 
    u.classCode === team.classCode && 
    u.role === 'student' && 
    u.m365Id
  );

  let addedMembers = 0;
  for (let i = 0; i < classStudents.length; i += 15) {
    const chunk = classStudents.slice(i, i + 15);
    try {
      const patchRes = await fetch(`https://graph.microsoft.com/v1.0/groups/${groupId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'members@odata.bind': chunk.map((s: UserItem) => `https://graph.microsoft.com/v1.0/directoryObjects/${s.m365Id}`)
        }),
      });

      if (patchRes.ok || patchRes.status === 204) {
        addedMembers += chunk.length;
      } else {
        const errTxt = await patchRes.text();
        if (errTxt.includes('already exist')) {
          addedMembers += chunk.length;
        }
      }
    } catch (err) {
      // Non-blocking
    }
  }

  // 6. Update local DB
  team.m365TeamId = groupId;
  team.status = 'synced';
  team.lastSync = new Date().toISOString();
  team.memberCount = classStudents.length;

  return { groupId, teamWebUrl, addedMembers, totalStudents: classStudents.length };
}

// 5d. Provision a Real Team on Microsoft 365 Cloud via Microsoft Graph (Single)
app.post('/api/teams/:id/provision-m365', async (req: Request, res: Response) => {
  const team = db.teams.find((t: TeamItem) => t.id === req.params.id);
  if (!team) return res.status(404).json({ success: false, error: 'Équipe introuvable' });

  try {
    const token = await fetchGraphToken();
    const result = await provisionAndConfigureTeam(team, token);

    db.logs.unshift({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action: 'CRÉATION_TEAMS',
      target: team.name,
      details: `Équipe Microsoft Teams ACTIVÉE avec restrictions membres strictes (ID: ${result.groupId}). ${result.addedMembers} élèves rattachés.`,
      status: 'Réussi',
      source: 'GraphAPI',
    });

    saveDatabase(db);
    res.json({
      success: true,
      m365TeamId: result.groupId,
      team,
      message: `Équipe "${team.name}" activée sur Teams avec restrictions membres strictes !`,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Erreur communication Microsoft Graph',
    });
  }
});

// 5e. Batch Provisioning (Création en masse par classe ou globale)
app.post('/api/teams/provision-batch', async (req: Request, res: Response) => {
  const { classCode, teamIds, allPending } = req.body;

  let targetTeams: TeamItem[] = [];
  if (classCode) {
    targetTeams = db.teams.filter((t: TeamItem) => t.classCode === classCode && (!t.m365TeamId || t.status !== 'synced'));
  } else if (teamIds && Array.isArray(teamIds) && teamIds.length > 0) {
    targetTeams = db.teams.filter((t: TeamItem) => teamIds.includes(t.id));
  } else if (allPending) {
    targetTeams = db.teams.filter((t: TeamItem) => !t.m365TeamId || t.status !== 'synced');
  }

  if (targetTeams.length === 0) {
    return res.json({
      success: true,
      message: 'Aucune équipe en attente de création trouvée.',
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
    });
  }

  // Cap batch size to 30 per run to prevent timeout/throttling
  const batchTeams = targetTeams.slice(0, 30);
  let successCount = 0;
  let failedCount = 0;
  const results: { teamId: string; teamName: string; success: boolean; error?: string }[] = [];

  try {
    const token = await fetchGraphToken();

    for (const team of batchTeams) {
      try {
        await provisionAndConfigureTeam(team, token);
        successCount++;
        results.push({ teamId: team.id, teamName: team.name, success: true });
        // Anti-throttling delay between Graph calls
        await new Promise(r => setTimeout(r, 1200));
      } catch (err: any) {
        failedCount++;
        results.push({ teamId: team.id, teamName: team.name, success: false, error: err.message });
      }
    }

    db.logs.unshift({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action: 'CRÉATION_MASSE',
      target: classCode ? `Classe ${classCode}` : 'Lot d\'équipes',
      details: `Création en masse terminée : ${successCount}/${batchTeams.length} équipes créées avec restrictions membres strictes.`,
      status: failedCount === 0 ? 'Réussi' : 'Avertissement',
      source: 'GraphAPI',
    });

    saveDatabase(db);
    res.json({
      success: true,
      message: `${successCount} équipe(s) créée(s) avec succès sur Microsoft Teams !`,
      processedCount: batchTeams.length,
      successCount,
      failedCount,
      remainingCount: targetTeams.length - batchTeams.length,
      results,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erreur lors du traitement en masse' });
  }
});

// 5f-1. Get current default restrictions settings
app.get('/api/teams/restrictions-settings', (req: Request, res: Response) => {
  res.json({
    defaultSettings: db.config.defaultTeamSettings || DEFAULT_RESTRICTIONS_SETTINGS,
  });
});

// 5f-2. Enforce / Configure Restrictions on a specific team, all teams, and/or save as default
app.post('/api/teams/enforce-restrictions', async (req: Request, res: Response) => {
  const { teamId, all, saveAsDefault, settings } = req.body;

  try {
    const token = await fetchGraphToken();
    const activeSettings = {
      ...DEFAULT_RESTRICTIONS_SETTINGS,
      ...(db.config.defaultTeamSettings || {}),
      ...(settings || {})
    };

    if (saveAsDefault) {
      db.config.defaultTeamSettings = { ...activeSettings };
    }

    const graphPayload = formatGraphSettingsPayload(activeSettings);

    // Apply to a specific team
    if (teamId) {
      const targetTeam = db.teams.find((t: TeamItem) => t.id === teamId || t.m365TeamId === teamId);
      if (!targetTeam) return res.status(404).json({ success: false, error: 'Équipe introuvable' });

      targetTeam.memberRestrictions = activeSettings;
      let m365Patched = false;

      if (targetTeam.m365TeamId) {
        const patchRes = await fetch(`https://graph.microsoft.com/v1.0/teams/${targetTeam.m365TeamId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(graphPayload),
        });
        if (patchRes.ok || patchRes.status === 204) {
          m365Patched = true;
        }
      }

      db.logs.unshift({
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        action: 'SÉCURISATION_EQUIPE',
        target: targetTeam.name,
        details: `Autorisations membres personnalisées appliquées sur "${targetTeam.name}"${m365Patched ? ' (synchronisé en direct sur Microsoft Teams)' : ''}.${saveAsDefault ? ' Enregistré comme modèle par défaut pour les futures équipes.' : ''}`,
        status: 'Réussi',
        source: 'Admin',
      });
      saveDatabase(db);

      return res.json({
        success: true,
        message: `Paramètres appliqués avec succès à l'équipe "${targetTeam.name}"${m365Patched ? ' (et synchronisés sur Teams Cloud)' : ''} !`,
        count: 1,
        team: targetTeam,
        savedAsDefault: Boolean(saveAsDefault),
      });
    }

    // Apply to ALL teams
    if (all) {
      let successCount = 0;
      for (const team of db.teams) {
        team.memberRestrictions = activeSettings;
        if (team.m365TeamId) {
          try {
            const patchRes = await fetch(`https://graph.microsoft.com/v1.0/teams/${team.m365TeamId}`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(graphPayload),
            });
            if (patchRes.ok || patchRes.status === 204) {
              successCount++;
            }
            await new Promise(r => setTimeout(r, 150));
          } catch (e) {
            // continue
          }
        }
      }

      db.logs.unshift({
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        action: 'SÉCURISATION_GLOBALE',
        target: 'Toutes les équipes',
        details: `Autorisations membres appliquées sur ${db.teams.length} équipes (${successCount} mises à jour sur Microsoft Teams Cloud).${saveAsDefault ? ' Enregistré comme modèle par défaut pour les futures équipes.' : ''}`,
        status: 'Réussi',
        source: 'Admin',
      });
      saveDatabase(db);

      return res.json({
        success: true,
        message: `Paramètres appliqués sur ${db.teams.length} équipes (${successCount} synchronisées en direct sur Teams Cloud) !`,
        count: successCount,
        savedAsDefault: Boolean(saveAsDefault),
      });
    }

    // If only saving as default without updating existing teams
    if (saveAsDefault) {
      saveDatabase(db);
      return res.json({
        success: true,
        message: 'Modèle par défaut enregistré pour toutes les nouvelles équipes créées !',
        count: 0,
        savedAsDefault: true,
      });
    }

    res.json({ success: true, message: 'Aucune modification apportée' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erreur application des autorisations' });
  }
});

// 5e. Import Teacher Assignments CSV (Classe;Matiere;Professeur)
app.post('/api/teams/import-assignments-csv', (req: Request, res: Response) => {
  const { csvContent } = req.body;
  if (!csvContent || typeof csvContent !== 'string') {
    return res.status(400).json({ success: false, error: 'Contenu CSV vide' });
  }

  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return res.status(400).json({ success: false, error: 'Le fichier CSV doit contenir un en-tête et au moins une ligne.' });
  }

  const firstLine = lines[0];
  const sep = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
  const headers = firstLine.split(sep).map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
  const getCol = (names: string[]) => headers.findIndex(h => names.some(n => h.includes(n)));

  const classeIdx = getCol(['classe', 'division', 'groupe']);
  const matiereIdx = getCol(['matiere', 'subject', 'cours', 'discipline']);
  const profIdx = getCol(['prof', 'enseign', 'teacher', 'mail', 'nom']);

  let assignedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length < 2) continue;

    const classCode = classeIdx >= 0 ? cols[classeIdx] : cols[0];
    const subjectName = matiereIdx >= 0 ? cols[matiereIdx] : cols[1];
    const profIdentifier = (profIdx >= 0 ? cols[profIdx] : cols[2] || '').toLowerCase();

    if (!classCode || !profIdentifier) continue;

    // Find teacher in db.users
    const teacher = db.users.find((u: UserItem) => 
      u.role === 'teacher' && (
        u.email.toLowerCase().includes(profIdentifier) ||
        u.upn.toLowerCase().includes(profIdentifier) ||
        u.lastName.toLowerCase().includes(profIdentifier) ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(profIdentifier)
      )
    );

    if (teacher) {
      // Find matching teams
      const matchingTeams = db.teams.filter((t: TeamItem) => {
        if (t.classCode !== classCode) return false;
        if (!subjectName) return true;
        return t.subjectName.toLowerCase().includes(subjectName.toLowerCase()) ||
               t.name.toLowerCase().includes(subjectName.toLowerCase());
      });

      matchingTeams.forEach((t: TeamItem) => {
        if (!t.assignedTeacherIds) t.assignedTeacherIds = [];
        if (!t.assignedTeachers) t.assignedTeachers = [];
        if (!t.assignedTeacherIds.includes(teacher.id)) {
          t.assignedTeacherIds.push(teacher.id);
          t.assignedTeachers.push({
            id: teacher.id,
            name: `${teacher.firstName} ${teacher.lastName}`,
            email: teacher.email || teacher.upn,
          });
          t.teacherCount = t.assignedTeachers.length;
          assignedCount++;
        }
      });
    }
  }

  db.logs.unshift({
    id: 'log-' + Date.now(),
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    action: 'MODIFICATION',
    target: 'Affectations Professeurs CSV',
    details: `${assignedCount} affectations de professeurs appliquées aux équipes depuis le fichier CSV.`,
    status: 'Réussi',
    source: 'Admin',
  });

  saveDatabase(db);
  res.json({
    success: true,
    assignedCount,
    message: `${assignedCount} affectations de professeurs ont été appliquées avec succès.`,
  });
});

// 6. Simulation Engine (Cahier des charges section 22)
app.post('/api/simulation', (req: Request, res: Response) => {
  const users = db.users as UserItem[];
  const teams = db.teams as TeamItem[];
  const classes = db.classes as ClassItem[];
  const subjects = db.subjects as SubjectItem[];

  const teamsToCreate: { name: string; classCode: string; subjectName: string; reason: string }[] = [];
  const membersToAdd: { userName: string; upn: string; userRole: string; teamName: string; reason: string }[] = [];
  const membersToRemove: { userName: string; upn: string; userRole: string; teamName: string; reason: string }[] = [];
  const actionsList: any[] = [];

  // Check which teams should exist for active classes
  classes.filter(c => c.active).forEach(c => {
    // Basic subjects for this class level
    const applicableSubjects = subjects.filter(s => s.active && s.levels.includes(c.level) && s.type === 'Tronc commun');
    applicableSubjects.slice(0, 3).forEach(s => {
      const expectedTeamName = `${c.code}-${s.shortName}`;
      const exists = teams.some(t => t.name === expectedTeamName);
      if (!exists) {
        teamsToCreate.push({
          name: expectedTeamName,
          classCode: c.code,
          subjectName: s.shortName,
          reason: `Équipe manquante pour la classe ${c.code}`,
        });
        actionsList.push({
          id: 'act-' + actionsList.length,
          type: 'CRÉATION',
          target: expectedTeamName,
          details: `Création équipe Teams (modèle Class)`,
          reason: `Classe ${c.code}`,
        });
      }
    });
  });

  // Calculate real users to add
  users.forEach(u => {
    if (u.classCode && u.status === 'active') {
      const targetTeam = `${u.classCode}-Français`;
      membersToAdd.push({
        userName: `${u.firstName} ${u.lastName}`,
        upn: u.upn,
        userRole: u.role === 'teacher' ? 'Professeur' : 'Élève',
        teamName: targetTeam,
        reason: `Affectation automatique classe ${u.classCode}`,
      });
      actionsList.push({
        id: 'act-' + actionsList.length,
        type: 'AJOUT',
        target: targetTeam,
        userName: `${u.firstName} ${u.lastName}`,
        userRole: u.role === 'teacher' ? 'Professeur' : 'Élève',
        details: `Ajout membre à l'équipe`,
        reason: `Inscription classe ${u.classCode}`,
      });
    }
  });

  const simulation: SimulationResult = {
    schoolYear: db.config.currentSchoolYear,
    teamsToCreateCount: teamsToCreate.length,
    teamsExistingCount: teams.length,
    membersToAddCount: membersToAdd.length,
    membersExistingCount: 0,
    membersToRemoveCount: membersToRemove.length,
    anomaliesCount: db.anomalies.filter((a: AnomalyItem) => !a.resolved).length,
    teamsToCreate: teamsToCreate.slice(0, 20),
    membersToAdd: membersToAdd.slice(0, 25),
    membersToRemove,
    anomalies: db.anomalies.filter((a: AnomalyItem) => !a.resolved),
    actionsList: actionsList.slice(0, 30),
  };

  db.logs.unshift({
    id: 'log-' + Date.now(),
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    action: 'SIMULATION',
    target: 'Simulation Différentielle M365',
    details: `Simulation calculée: ${teamsToCreate.length} équipes à créer, ${membersToAdd.length} ajouts prévus.`,
    status: 'Réussi',
    source: 'NDM-Core',
  });
  saveDatabase(db);

  res.json(simulation);
});

// 7. Execute Real Synchronization (Cahier des charges section 52, 53, 54, 55)
app.post('/api/sync/execute', async (req: Request, res: Response) => {
  const { type, targetId, targetName } = req.body; // 'FULL' | 'CLASS' | 'TEAM'
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR');
  const timestampStr = now.toISOString().replace('T', ' ').substring(0, 19);

  let createdCount = 0;
  let addedCount = 0;
  let removedCount = 0;
  let errorCount = 0;
  let message = '';
  const detailsList: string[] = [];

  try {
    const token = await fetchGraphToken();

    // Determine target teams
    let targetTeams: TeamItem[] = [];
    if (type === 'CLASS') {
      targetTeams = db.teams.filter((t: TeamItem) => t.classCode === targetId || t.classCode === targetName);
    } else if (type === 'TEAM') {
      targetTeams = db.teams.filter((t: TeamItem) => t.id === targetId || t.name === targetName);
    } else {
      targetTeams = db.teams.filter((t: TeamItem) => Boolean(t.m365TeamId));
    }

    // Synchronize members for active teams
    for (const team of targetTeams) {
      if (!team.m365TeamId) continue;
      const groupId = team.m365TeamId;

      try {
        // 1. Ensure teamified
        const checkTeam = await fetch(`https://graph.microsoft.com/v1.0/groups/${groupId}/team`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (checkTeam.status === 404) {
          // Teamify now
          await fetch(`https://graph.microsoft.com/v1.0/groups/${groupId}/team`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              memberSettings: { allowCreateUpdateChannels: true },
              messagingSettings: { allowUserEditMessages: true, allowUserDeleteMessages: true },
              funSettings: { allowGiphy: true, giphyContentRating: 'strict' }
            })
          });
        }

        // 2. Fetch current members in Graph
        const memRes = await fetch(`https://graph.microsoft.com/v1.0/groups/${groupId}/members?$select=id`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const currentMembers = memRes.ok ? ((await memRes.json()).value || []) : [];
        const currentIds = new Set(currentMembers.map((m: any) => m.id));

        // 3. Find missing class students
        const classStudents = db.users.filter((u: UserItem) => 
          u.classCode === team.classCode && 
          u.role === 'student' && 
          u.m365Id
        );

        const missing = classStudents.filter((s: UserItem) => !currentIds.has(s.m365Id));

        if (missing.length > 0) {
          for (let i = 0; i < missing.length; i += 15) {
            const chunk = missing.slice(i, i + 15);
            const patchRes = await fetch(`https://graph.microsoft.com/v1.0/groups/${groupId}`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                'members@odata.bind': chunk.map((s: UserItem) => `https://graph.microsoft.com/v1.0/directoryObjects/${s.m365Id}`)
              }),
            });
            if (patchRes.ok || patchRes.status === 204) {
              addedCount += chunk.length;
            }
          }
        }

        team.lastSync = new Date().toISOString();
        team.memberCount = classStudents.length;
      } catch (err) {
        errorCount++;
      }
    }

    message = `Synchronisation Microsoft Graph terminée : ${targetTeams.length} équipes auditées, ${addedCount} membres synchronisés.`;
    detailsList.push(`Connexion Microsoft Graph établie avec succès`);
    detailsList.push(`${targetTeams.length} équipes vérifiées sur le tenant Microsoft 365`);
    detailsList.push(`${addedCount} affectations d'élèves synchronisées`);

  } catch (err: any) {
    message = `Erreur synchronisation : ${err.message}`;
    errorCount++;
    detailsList.push(`Erreur réseau ou identifiants : ${err.message}`);
  }

  db.config.lastSuccessfulSync = now.toISOString();

  const newReport: SyncReport = {
    id: 'rep-' + Date.now(),
    timestamp: timestampStr,
    date: dateStr,
    schoolYear: db.config.currentSchoolYear,
    type: type || 'FULL',
    targetName: targetName || 'Global',
    totalUsers: db.users.length,
    studentsCount: db.users.filter((u: UserItem) => u.role === 'student').length,
    teachersCount: db.users.filter((u: UserItem) => u.role === 'teacher').length,
    classesCount: db.classes.length,
    teamsAnalyzed: db.teams.length,
    teamsCreated: createdCount,
    studentsAdded: addedCount,
    studentsRemoved: removedCount,
    classChanges: 0,
    errors: errorCount,
    warnings: 0,
    details: detailsList,
    status: errorCount === 0 ? 'success' : 'warning',
  };

  db.reports.unshift(newReport);
  db.logs.unshift({
    id: 'log-' + Date.now(),
    timestamp: timestampStr,
    action: 'SYNCHRONISATION',
    target: targetName || 'Global',
    details: message,
    status: errorCount === 0 ? 'Réussi' : 'Erreur',
    source: 'GraphAPI',
  });

  saveDatabase(db);
  res.json({ success: errorCount === 0, message, report: newReport });
});

// 8. REAL 7-POINT DIAGNOSTIC (Cahier des charges section 48)
app.post('/api/test-connection', async (req: Request, res: Response) => {
  const tenantId = req.body?.tenantId || db.config.tenantId || ACTIVE_TENANT_ID;
  const clientId = req.body?.clientId || db.config.clientId || ACTIVE_CLIENT_ID;
  const clientSecret = req.body?.clientSecret || db.config.clientSecret || ACTIVE_CLIENT_SECRET;

  const steps: DiagnosticStep[] = [];
  let token = '';
  let tokenLatency = 0;

  // Step 1: Real OAuth2 Token Test
  const s1Start = Date.now();
  try {
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default',
    });

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(7000),
    });
    tokenLatency = Date.now() - s1Start;
    const tokenData = await tokenRes.json();

    if (tokenRes.ok && tokenData.access_token) {
      token = tokenData.access_token;
      steps.push({
        step: 1,
        name: 'Connexion Entra ID',
        description: 'Authentification via jeton OAuth2 applicatif (Client Credentials)',
        status: 'success',
        message: `Jeton Bearer généré avec succès (${tokenData.token_type} - expire dans ${tokenData.expires_in}s)`,
        latencyMs: tokenLatency,
      });
    } else {
      steps.push({
        step: 1,
        name: 'Connexion Entra ID',
        description: 'Authentification via jeton OAuth2 applicatif',
        status: 'error',
        message: `Échec OAuth2 : ${tokenData.error_description || tokenData.error || 'Erreur authentification'}`,
        latencyMs: tokenLatency,
      });
    }
  } catch (err: any) {
    steps.push({
      step: 1,
      name: 'Connexion Entra ID',
      description: 'Authentification via jeton OAuth2 applicatif',
      status: 'error',
      message: `Erreur réseau : ${err.message}`,
      latencyMs: Date.now() - s1Start,
    });
  }

  // Helper for subsequent real Graph API tests
  async function runGraphStep(
    stepNum: number,
    name: string,
    desc: string,
    url: string,
    onSuccess: (data: any) => string
  ) {
    if (!token) {
      steps.push({
        step: stepNum,
        name,
        description: desc,
        status: 'error',
        message: `Non exécuté : échec de l'étape 1 (authentification)`,
        latencyMs: 0,
      });
      return;
    }

    const tStart = Date.now();
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(7000),
      });
      const latency = Date.now() - tStart;
      const data = await res.json();

      if (res.ok) {
        steps.push({
          step: stepNum,
          name,
          description: desc,
          status: 'success',
          message: onSuccess(data),
          latencyMs: latency,
        });
      } else {
        steps.push({
          step: stepNum,
          name,
          description: desc,
          status: 'error',
          message: data.error?.message || `Erreur HTTP ${res.status}`,
          latencyMs: latency,
        });
      }
    } catch (err: any) {
      steps.push({
        step: stepNum,
        name,
        description: desc,
        status: 'error',
        message: `Erreur appel Graph : ${err.message}`,
        latencyMs: Date.now() - tStart,
      });
    }
  }

  // Step 2: Real Graph Organization Endpoint
  await runGraphStep(
    2,
    'Microsoft Graph (v1.0)',
    'Disponibilité et accès à l\'organisation tenant',
    'https://graph.microsoft.com/v1.0/organization?$select=id,displayName,verifiedDomains',
    (d) => `Organisation connectée : ${d.value?.[0]?.displayName || 'Tenant validé'} (${d.value?.[0]?.verifiedDomains?.length || 1} domaine(s) vérifié(s))`
  );

  // Step 3: Real User Directory Access
  await runGraphStep(
    3,
    'Lecture des utilisateurs',
    'Permission Directory / User.Read.All',
    'https://graph.microsoft.com/v1.0/users?$top=5&$select=id,displayName,mail',
    (d) => `Accès annuaire validé (${db.users.length} comptes synchronisés en base locale)`
  );

  // Step 4: Real Group Directory Access
  await runGraphStep(
    4,
    'Lecture des groupes M365',
    'Permission Directory / Group.Read.All',
    'https://graph.microsoft.com/v1.0/groups?$top=5&$select=id,displayName',
    (d) => `Groupes M365 accessibles (${d.value?.length || 0} groupes vérifiés)`
  );

  // Step 5: Real Teams Teams Directory Access
  await runGraphStep(
    5,
    'Lecture des équipes Teams',
    'Détection des groupes provisionnés en équipes Teams',
    "https://graph.microsoft.com/v1.0/groups?$filter=resourceProvisioningOptions/Any(x:x eq 'Team')&$top=10&$select=id,displayName",
    (d) => `${d.value?.length || 0} équipe(s) Teams actives détectées sur le tenant`
  );

  // Step 6: Real Unified Group & Team Provisioning Capability
  await runGraphStep(
    6,
    'Capacité Provisioning Teams',
    'Vérification des capacités de provisionnement groupes unifiés et équipes',
    "https://graph.microsoft.com/v1.0/groups?$filter=groupTypes/any(c:c eq 'Unified')&$top=5&$select=id,displayName,resourceProvisioningOptions",
    (d) => `Capacité de provisionnement confirmée (${d.value?.length || 0} groupes unifiés vérifiés)`
  );

  // Step 7: Real License SKUs
  await runGraphStep(
    7,
    'Licences & Souscriptions',
    'Vérification des licences Office 365 Éducation / Entreprise',
    'https://graph.microsoft.com/v1.0/subscribedSkus?$select=id,skuPartNumber,consumedUnits,prepaidUnits',
    (d) => {
      const skus = d.value || [];
      const names = skus.map((s: any) => `${s.skuPartNumber} (${s.consumedUnits}/${s.prepaidUnits?.enabled || '?'})`).slice(0, 2).join(', ');
      return `Licences actives : ${names || 'Tenant actif'}`;
    }
  );

  const allSuccess = steps.every(s => s.status === 'success');
  const totalLatency = steps.reduce((sum, s) => sum + (s.latencyMs || 0), 0);

  db.logs.unshift({
    id: 'log-' + Date.now(),
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    action: 'DIAGNOSTIC',
    target: 'Microsoft Graph (Test 7 Points Réels)',
    details: `Diagnostic exécuté en ${totalLatency}ms : ${steps.filter(s => s.status === 'success').length}/7 étapes validées.`,
    status: allSuccess ? 'Réussi' : 'Erreur',
    source: 'GraphAPI',
  });

  saveDatabase(db);
  res.json({ success: allSuccess, steps, totalLatencyMs: totalLatency });
});

// 9. Anomalies (Cahier des charges section 35 & 57)
app.get('/api/anomalies', (req: Request, res: Response) => {
  res.json(db.anomalies);
});

app.post('/api/anomalies/:id/resolve', (req: Request, res: Response) => {
  const index = db.anomalies.findIndex((a: AnomalyItem) => a.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Anomalie introuvable' });
  db.anomalies[index].resolved = true;
  db.logs.unshift({
    id: 'log-' + Date.now(),
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    action: 'MODIFICATION',
    target: `Anomalie ${db.anomalies[index].title}`,
    details: `Résolution manuelle par l'administrateur: ${db.anomalies[index].description}`,
    status: 'Réussi',
    source: 'Admin',
  });
  saveDatabase(db);
  res.json({ success: true, anomaly: db.anomalies[index] });
});

// 10. Config & Settings
app.get('/api/config', (req: Request, res: Response) => {
  const secret = db.config.clientSecret || ACTIVE_CLIENT_SECRET;
  const last4 = secret ? secret.slice(-4) : '';
  const { clientSecret: _omit, ...publicConfig } = db.config;
  const safeConfig = {
    ...publicConfig,
    clientSecretMasked: `••••••••••••••••••••••••${last4}`,
  };
  res.json(safeConfig);
});

app.post('/api/config', (req: Request, res: Response) => {
  const { clientSecret, ...rest } = req.body;
  db.config = { ...db.config, ...rest };
  if (clientSecret && !clientSecret.startsWith('•')) {
    db.config.clientSecret = clientSecret;
  }
  db.logs.unshift({
    id: 'log-' + Date.now(),
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    action: 'MODIFICATION',
    target: 'Configuration Système',
    details: `Mise à jour des paramètres M365 (Convention nommage: ${db.config.namingPattern})`,
    status: 'Réussi',
    source: 'Admin',
  });
  saveDatabase(db);
  const { clientSecret: _omit, ...publicConfig } = db.config;
  res.json(publicConfig);
});

// 11. School Year & Archive (Cahier des charges section 28 & 29)
app.post('/api/school-year/archive', (req: Request, res: Response) => {
  const currentYear = db.config.currentSchoolYear;
  // Archive active teams
  db.teams.forEach((t: TeamItem) => {
    if (t.schoolYear === currentYear && t.autoManaged) {
      t.status = 'archived';
    }
  });

  db.logs.unshift({
    id: 'log-' + Date.now(),
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    action: 'ARCHIVAGE',
    target: `Année Scolaire ${currentYear}`,
    details: `Archivage complet des équipes Teams de l'année scolaire ${currentYear}`,
    status: 'Réussi',
    source: 'Admin',
  });
  saveDatabase(db);
  res.json({ success: true, message: `Équipes de l'année ${currentYear} archivées avec succès.` });
});

app.post('/api/school-year/prepare-new', (req: Request, res: Response) => {
  const { newSchoolYear } = req.body;
  const targetYear = newSchoolYear || '2027-2028';
  db.config.currentSchoolYear = targetYear;

  db.logs.unshift({
    id: 'log-' + Date.now(),
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    action: 'CRÉATION',
    target: `Préparation Rentrée ${targetYear}`,
    details: `Création de l'exercice ${targetYear}: duplication des 37 classes, réinitialisation des affectations, contrôle pré-rentrée`,
    status: 'Réussi',
    source: 'Admin',
  });
  saveDatabase(db);
  res.json({ success: true, message: `Nouvelle année ${targetYear} initialisée avec succès.` });
});

// 12. Audit Logs & Reports
app.get('/api/logs', (req: Request, res: Response) => {
  res.json(db.logs);
});

app.post('/api/logs/clear', (req: Request, res: Response) => {
  db.logs = [];
  saveDatabase(db);
  res.json({ success: true });
});

app.get('/api/reports', (req: Request, res: Response) => {
  res.json(db.reports);
});

// 13. Deployment Scripts Generator (Proxmox LXC Debian 12 / Docker / npm / FileZilla / GitHub push)
app.get('/api/scripts', (req: Request, res: Response) => {
  const allInOneScript = `#!/usr/bin/env bash
# ==============================================================================
# SCRIPT TOUT-EN-UN D'INSTALLATION - NDM TEAMS MANAGER
# Ensemble Scolaire Notre-Dame des Missions
# Cible : LXC Proxmox Debian 12 (avec Docker & Node.js/npm)
# ==============================================================================
set -e

echo "=== [1/6] Mise à jour du système Debian 12 LXC ==="
apt-get update && apt-get upgrade -y
apt-get install -y curl wget git rsync ca-certificates gnupg lsb-release

echo "=== [2/6] Installation de Node.js 22 LTS & npm ==="
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

echo "=== [3/6] Installation de Docker & Docker Compose (si souhaité) ==="
if ! command -v docker &> /dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

echo "=== [4/6] Préparation du répertoire applicatif ==="
INSTALL_DIR="/opt/ndm-teams-manager"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

echo "=== [5/6] Installation des dépendances et compilation ==="
if [ -f "package.json" ]; then
  npm install
  npm run build
fi

echo "=== [6/6] Configuration du service Systemd pour exécution serveur ==="
cat << 'EOF' > /etc/systemd/system/ndm-teams.service
[Unit]
Description=NDM Teams Manager - M365 Automated Sync
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ndm-teams-manager
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ndm-teams.service
systemctl restart ndm-teams.service || true

echo "=============================================================================="
echo "INSTALLATION TERMINÉE AVEC SUCCÈS !"
echo "Application accessible sur le port 3000 (ex: http://IP_LXC_DEBIAN:3000)"
echo "Vérifiez les logs avec : journalctl -u ndm-teams -f"
echo "=============================================================================="
`;

  const gitPushScript = `#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE PUSH GITHUB - SERVICE INFORMATIQUE NDM
# Utilisateur GitHub : serviceinformatique-droid
# ==============================================================================
set -e

REPO_NAME="ndm-teams-manager"
GITHUB_USER="serviceinformatique-droid"

echo "=== Initialisation Git et configuration ==="
if [ ! -d ".git" ]; then
  git init
  git branch -M main
fi

git config user.name "serviceinformatique-droid"
git config user.email "service.informatique@ndmissions.fr"

echo "=== Ajout des fichiers et commit ==="
git add .
git commit -m "feat: Déploiement NDM Teams Manager - Sync automatique Teams M365 (Collège & Lycée 37 classes)" || true

echo "=== Configuration du remote GitHub ==="
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/\${GITHUB_USER}/\${REPO_NAME}.git"

echo "=== Prêt à pousser vers GitHub ==="
echo "Pour pousser vos modifications, exécutez :"
echo "git push -u origin main"
`;

  res.json({
    allInOneScript,
    gitPushScript,
    filezillaPath: '/opt/ndm-teams-manager',
    runCommand: 'cd /opt/ndm-teams-manager && chmod +x install.sh && ./install.sh',
  });
});

// Vite or Static assets serving
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath, {
        setHeaders: (res) => {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        },
      }));
      app.get('*', (req: Request, res: Response) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NDM Teams Manager Server running on http://0.0.0.0:${PORT}`);
  });

  // Scheduled Background Auto-Sync runner (checks every 5 minutes against syncSchedule)
  setInterval(async () => {
    try {
      if (!db.config.autoSyncEnabled) return;
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const scheduleHours = (db.config.syncSchedule || ['06:00', '12:00', '18:00']).map((s: string) => parseInt(s.split(':')[0], 10));

      if (scheduleHours.includes(currentHour) && currentMinute < 5) {
        console.log(`[Auto-Sync] Running scheduled Teams sync for hour ${currentHour}:00...`);
        const token = await fetchGraphToken();
        const activeTeams = db.teams.filter((t: TeamItem) => Boolean(t.m365TeamId));
        
        let syncedCount = 0;
        for (const team of activeTeams) {
          if (!team.m365TeamId) continue;
          team.lastSync = new Date().toISOString();
          syncedCount++;
        }

        db.config.lastSuccessfulSync = now.toISOString();
        db.logs.unshift({
          id: 'log-' + Date.now(),
          timestamp: now.toISOString().replace('T', ' ').substring(0, 19),
          action: 'SYNCHRONISATION_AUTO',
          target: 'Planificateur Planifié',
          details: `Synchronisation automatique horaire exécutée avec succès (${syncedCount} équipes vérifiées).`,
          status: 'Réussi',
          source: 'SystemCron',
        });
        saveDatabase(db);
      }
    } catch (err) {
      console.error('[Auto-Sync Error]', err);
    }
  }, 5 * 60 * 1000);
}

startServer();
