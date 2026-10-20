/**
 * Logique pure (sans réseau) de l'assistant de rentrée :
 * lecture de l'export CSV Charlemagne (Aplim), correspondance avec les comptes Entra,
 * construction du plan (créer / changer de classe / réactiver / désactiver).
 */
import Papa from 'papaparse';
import { randomInt } from 'crypto';

export const CLASS_REGEX = /^(60[1-6]|50[1-6]|40[1-6]|30[1-6]|20[1-5]|10[1-4]|T0[1-4])$/;

export const norm = (s: string): string =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Forme utilisable dans un identifiant (sans accents ni espaces, tirets conservés). */
export const slug = (s: string): string =>
  norm(s).replace(/['’`]/g, '').replace(/\s+/g, '').replace(/[^a-z0-9-]/g, '');

export const nameKey = (first: string, last: string): string =>
  norm(first).replace(/[^a-z0-9]/g, '') + '|' + norm(last).replace(/[^a-z0-9]/g, '');

const capitalize = (s: string) =>
  s.toLowerCase().replace(/(^|[\s'’-])([a-zà-ÿ])/g, (_m, p, c) => p + c.toUpperCase());

// ───────────────────────────── CSV ─────────────────────────────

export interface ColumnMapping {
  nom: number;
  prenom: number;
  classe: number;
  email: number;
  naissance: number;
  combined: number;
}

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  /** Index de la ligne d'en-tête, ou -1 si le fichier n'en a pas (la première ligne est déjà un élève). */
  headerRow: number;
}

/** `forceHeader` : true = la 1re ligne utile est un en-tête, false = pas d'en-tête, undefined = détection automatique. */
export function parseCsv(text: string, forceHeader?: boolean): ParsedCsv {
  const clean = text.replace(/^﻿/, '');
  const res = Papa.parse<string[]>(clean, { skipEmptyLines: 'greedy' });
  const data = (res.data as string[][]).map(r => r.map(c => (c ?? '').toString().trim()));
  let headerRow = -2;
  for (let i = 0; i < Math.min(data.length, 15); i++) {
    const hn = data[i].map(norm);
    if (hn.some(h => h.includes('prenom')) && hn.some(h => h === 'nom' || (h.startsWith('nom') && !h.includes('prenom')))) {
      headerRow = i;
      break;
    }
  }
  if (forceHeader === false) headerRow = -1;
  else if (headerRow < 0 && forceHeader === true) headerRow = 0;
  else if (headerRow === -2) {
    // Pas d'en-tête complet : la première ligne en est une si elle contient un mot-clé d'en-tête, sinon c'est déjà un élève.
    const first = (data[0] || []).map(norm);
    headerRow = first.some(h => /^(eleve|classe|division|nom|prenom|mail|courriel)/.test(h)) ? 0 : -1;
  }
  if (headerRow < 0) {
    const width = Math.max(0, ...data.slice(0, 20).map(r => r.length));
    return { headers: Array.from({ length: width }, (_, i) => `Colonne ${i + 1}`), rows: data, headerRow: -1 };
  }
  return { headers: data[headerRow] || [], rows: data.slice(headerRow + 1), headerRow };
}

export function detectColumns(headers: string[]): ColumnMapping {
  const hn = headers.map(norm);
  const find = (fn: (h: string) => boolean) => hn.findIndex(fn);
  const prenom = find(h => h.includes('prenom') || h === 'first name' || h === 'firstname' || h === 'given name');
  let nom = find(h => h === 'nom');
  if (nom < 0) nom = find(h => h.startsWith('nom') && !h.includes('prenom') && !h.includes('naiss'));
  if (nom < 0) nom = find(h => h === 'last name' || h === 'lastname' || h === 'surname');
  let classe = find(h => /classe|division/.test(h));
  if (classe < 0) classe = find(h => /niveau|groupe/.test(h));
  const email = find(h => /mail|courriel|upn/.test(h));
  const naissance = find(h => /naiss/.test(h));
  const combined = prenom < 0 && nom < 0 ? find(h => /eleve|apprenant|nom.*prenom/.test(h)) : -1;
  return { nom, prenom, classe, email, naissance, combined };
}

/** Fichier sans en-tête : Nom ; Prénom ; Classe (la colonne e-mail est repérée au contenu). */
export function guessPositional(rows: string[][]): ColumnMapping {
  const sample = rows.slice(0, 50);
  const width = Math.max(0, ...sample.map(r => r.length));
  let email = -1;
  for (let c = 0; c < width; c++) if (sample.filter(r => (r[c] || '').includes('@')).length > sample.length / 2) email = c;
  const free = Array.from({ length: width }, (_, i) => i).filter(i => i !== email);
  // la colonne « classe » est celle dont les valeurs sont reconnues comme des classes
  let classe = free.find(c => sample.length && sample.filter(r => mapClassLabel(r[c] || '')).length > sample.length / 2) ?? -1;
  const rest = free.filter(c => c !== classe);
  if (classe < 0 && rest.length >= 3) classe = rest.pop()!;
  return { nom: rest[0] ?? -1, prenom: rest[1] ?? -1, classe, email, naissance: -1, combined: -1 };
}

export interface CsvRecord {
  line: number;
  nom: string;
  prenom: string;
  classLabel: string;
  email: string;
  naissance: string;
}

export function extractRecords(parsed: ParsedCsv, m: ColumnMapping): { records: CsvRecord[]; invalid: { line: number; reason: string; raw: string }[] } {
  const records: CsvRecord[] = [];
  const invalid: { line: number; reason: string; raw: string }[] = [];
  parsed.rows.forEach((r, idx) => {
    const line = parsed.headerRow + idx + 2;
    const get = (i: number) => (i >= 0 && i < r.length ? r[i] : '');
    let nom = get(m.nom);
    let prenom = get(m.prenom);
    if (m.combined >= 0 && !nom && !prenom) {
      const tokens = get(m.combined).split(/\s+/).filter(Boolean);
      const lead: string[] = [];
      while (tokens.length > 1 && tokens[0] === tokens[0].toUpperCase() && /[A-ZÀ-Ý]{2,}/.test(tokens[0])) lead.push(tokens.shift()!);
      nom = lead.join(' ');
      prenom = tokens.join(' ');
    }
    if (!nom || !prenom) {
      invalid.push({ line, reason: 'nom ou prénom manquant', raw: r.join(' ; ').slice(0, 120) });
      return;
    }
    records.push({
      line,
      nom: nom.toUpperCase(),
      prenom: capitalize(prenom),
      classLabel: get(m.classe),
      email: get(m.email).toLowerCase(),
      naissance: get(m.naissance),
    });
  });
  return { records, invalid };
}

/** Retire les lignes strictement identiques (même nom, prénom, classe, e-mail, naissance) : doublons d'export. */
export function dropExactDuplicates(records: CsvRecord[]): { records: CsvRecord[]; removed: CsvRecord[] } {
  const seen = new Set<string>();
  const kept: CsvRecord[] = [];
  const removed: CsvRecord[] = [];
  for (const r of records) {
    const k = [nameKey(r.prenom, r.nom), norm(r.classLabel), r.email, r.naissance].join('|');
    if (seen.has(k)) removed.push(r);
    else { seen.add(k); kept.push(r); }
  }
  return { records: kept, removed };
}

/** Transforme un libellé de classe Charlemagne (6e 1, 6EME1, 2nde 3, 1ère 2, Tle 4…) en code NDM (601, 203, 102, T04). */
export function mapClassLabel(label: string): string | null {
  const direct = (label || '').trim().toUpperCase().replace(/\s+/g, '');
  if (CLASS_REGEX.test(direct)) return direct;
  const s = norm(label).replace(/[\s.\-_°]/g, '');
  if (!s) return null;
  let m: RegExpMatchArray | null;
  let code: string | null = null;
  if ((m = s.match(/^([3-6])(?:e|eme)?0?([1-6])$/))) code = `${m[1]}0${m[2]}`;
  else if ((m = s.match(/^(?:2nde?|2de|2nd|seconde)0?([1-5])$/))) code = `20${m[1]}`;
  else if ((m = s.match(/^(?:1ere?|1re|premiere|1e)0?([1-4])$/))) code = `10${m[1]}`;
  else if ((m = s.match(/^(?:t|tle|tl|term|terminale|tale)0?([1-4])$/))) code = `T0${m[1]}`;
  return code && CLASS_REGEX.test(code) ? code : null;
}

// ───────────────────────────── Entra ─────────────────────────────

export interface EntraUser {
  id: string;
  upn: string;
  mail: string;
  givenName: string;
  surname: string;
  officeLocation: string;
  department: string;
  jobTitle: string;
  accountEnabled: boolean;
  licenseCount: number;
}

export type EntraKind = 'active' | 'former' | 'other';

/** Mêmes règles que la synchronisation d'annuaire de l'application (server.ts, m365-pull). */
/** Comptes d'administration / service : jamais modifiés ni supprimés automatiquement. */
export function isAdminAccount(u: EntraUser): boolean {
  const dept = (u.department || '').trim();
  const job = (u.jobTitle || '').trim();
  const mail = (u.mail || u.upn || '').toLowerCase();
  const local = mail.split('@')[0];
  return (
    mail.includes('mjoubin') || mail.includes('admin@') || local === 'admin' || local.includes('admintest') ||
    local.includes('assistadmin') || dept.toLowerCase().includes('informatique') ||
    job.toLowerCase().includes('informatique') || job.toLowerCase().includes('administrateur')
  );
}

export function entraKind(u: EntraUser): EntraKind {
  const office = (u.officeLocation || '').trim();
  const dept = (u.department || '').trim();
  const job = (u.jobTitle || '').trim();
  if (isAdminAccount(u)) return 'other';
  if (CLASS_REGEX.test(office)) return 'active';
  if (CLASS_REGEX.test(dept) || dept.startsWith('Elèves /') || job === 'Elèves') return 'former';
  return 'other';
}

// ───────────────────────────── Plan ─────────────────────────────

export interface PlanItem {
  line?: number;
  nom: string;
  prenom: string;
  classCode: string;
  email?: string;
  userId?: string;
  upn?: string;
  fromClass?: string;
  former?: boolean;
  licenseCount?: number;
  reason?: string;
}

export interface Plan {
  create: PlanItem[];
  move: PlanItem[];
  unchanged: PlanItem[];
  reactivate: PlanItem[];
  leave: PlanItem[];
  ambiguous: PlanItem[];
  invalid: PlanItem[];
  formerEnabled: number;
  activeBefore: number;
}

const fullName = (u: EntraUser) => ({ nom: (u.surname || '').toUpperCase(), prenom: u.givenName || '' });

export function buildPlan(
  records: CsvRecord[],
  entra: EntraUser[],
  classOf: (label: string) => string | null,
  opts: { includeFormer: boolean; additionsOnly?: boolean },
): Plan {
  const students = entra.filter(u => entraKind(u) !== 'other');
  const kind = new Map(students.map(u => [u.id, entraKind(u)]));

  const byMail = new Map<string, EntraUser>();
  const byName = new Map<string, EntraUser[]>();
  const byLocal = new Map<string, EntraUser[]>();
  for (const u of students) {
    for (const k of [u.upn, u.mail]) if (k) byMail.set(k.toLowerCase(), u);
    const nk = nameKey(u.givenName, u.surname);
    byName.set(nk, [...(byName.get(nk) || []), u]);
    const lk = u.upn.split('@')[0].toLowerCase();
    byLocal.set(lk, [...(byLocal.get(lk) || []), u]);
  }

  const candidatesFor = (r: CsvRecord): EntraUser[] => {
    if (r.email) {
      const u = byMail.get(r.email);
      if (u) return [u];
    }
    const byN = byName.get(nameKey(r.prenom, r.nom));
    if (byN && byN.length) return byN;
    return byLocal.get(`${slug(r.prenom)}.${slug(r.nom)}`) || [];
  };

  // 1) candidats de chaque ligne, puis résolution des homonymes
  const resolved: { r: CsvRecord; user: EntraUser | null; ambiguous: boolean; cands: EntraUser[] }[] = records.map(r => {
    let cands = candidatesFor(r);
    if (cands.length > 1) {
      const act = cands.filter(c => kind.get(c.id) === 'active');
      if (act.length === 1) cands = act;
    }
    if (cands.length > 1) return { r, user: null, ambiguous: true, cands };
    return { r, user: cands[0] || null, ambiguous: false, cands };
  });
  const claims = new Map<string, number>();
  for (const x of resolved) if (x.user) claims.set(x.user.id, (claims.get(x.user.id) || 0) + 1);
  for (const x of resolved) if (x.user && (claims.get(x.user.id) || 0) > 1) { x.user = null; x.ambiguous = true; }

  const plan: Plan = { create: [], move: [], unchanged: [], reactivate: [], leave: [], ambiguous: [], invalid: [], formerEnabled: 0, activeBefore: students.filter(u => kind.get(u.id) === 'active').length };
  const present = new Set<string>();

  // Les lignes dont la classe est inconnue "revendiquent" quand même leur compte : l'élève n'est pas sortant.
  // Un compte correspondant à une ligne ambiguë est aussi considéré présent : jamais désactivé par erreur.
  for (const { r, user, ambiguous, cands } of resolved) {
    const base: PlanItem = { line: r.line, nom: r.nom, prenom: r.prenom, classCode: '', email: r.email || undefined };
    const code = classOf(r.classLabel);
    cands.forEach(c => present.add(c.id));
    if (user) present.add(user.id);
    if (ambiguous) { plan.ambiguous.push({ ...base, classCode: code || r.classLabel, reason: 'Plusieurs comptes ou lignes portent ce nom' }); continue; }
    if (!code) { plan.invalid.push({ ...base, classCode: r.classLabel, userId: user?.id, upn: user?.upn, reason: `Classe inconnue : « ${r.classLabel || 'vide'} »` }); continue; }
    base.classCode = code;
    if (!user) { plan.create.push(base); continue; }
    const k = kind.get(user.id);
    const item: PlanItem = { ...base, userId: user.id, upn: user.upn, fromClass: user.officeLocation || undefined, licenseCount: user.licenseCount };
    if (k === 'former') plan.reactivate.push({ ...item, reason: 'Ancien compte réactivé' });
    else if (!user.accountEnabled) plan.reactivate.push({ ...item, reason: 'Compte désactivé réactivé' });
    else if (user.officeLocation !== code) plan.move.push(item);
    else plan.unchanged.push(item);
  }

  for (const u of students) {
    if (opts.additionsOnly) break; // liste d'arrivants : personne n'est considéré comme sortant
    if (present.has(u.id)) continue;
    const k = kind.get(u.id);
    if (k === 'active') plan.leave.push({ ...fullName(u), classCode: '', fromClass: u.officeLocation, userId: u.id, upn: u.upn, reason: 'Absent du nouvel export' });
    else if (u.accountEnabled) {
      plan.formerEnabled++;
      if (opts.includeFormer) plan.leave.push({ ...fullName(u), classCode: '', fromClass: u.officeLocation || '', userId: u.id, upn: u.upn, former: true, reason: 'Ancien élève déjà sorti, compte encore actif' });
    }
  }
  return plan;
}

// ───────────────────────────── Comptes ─────────────────────────────

export function generateUpn(prenom: string, nom: string, domain: string, taken: Set<string>): string {
  const base = `${slug(prenom)}.${slug(nom)}`;
  let candidate = `${base}@${domain}`;
  for (let n = 2; taken.has(candidate.toLowerCase()); n++) candidate = `${base}${n}@${domain}`;
  taken.add(candidate.toLowerCase());
  return candidate;
}

const UP = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LO = 'abcdefghijkmnpqrstuvwxyz';
const DI = '23456789';
const SY = '!#$%*+-=?';

export function randomPassword(length = 12): string {
  const pick = (set: string) => set[randomInt(set.length)];
  const chars = [pick(UP), pick(LO), pick(DI), pick(SY)];
  const all = UP + LO + DI + SY;
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/** Règle de complexité Entra : 8 caractères minimum et 3 types parmi majuscule, minuscule, chiffre, symbole. */
export function passwordProblem(p: string): string | null {
  if (!p || p.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
  const kinds = [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(p)).length;
  return kinds < 3 ? 'Le mot de passe doit mélanger au moins 3 types : majuscule, minuscule, chiffre, symbole.' : null;
}

/** Extrait le code de classe d'un nom d'équipe du type « 601-Français ». */
export function teamClassCode(displayName: string): { classCode: string; subject: string } | null {
  const m = (displayName || '').match(/^(60[1-6]|50[1-6]|40[1-6]|30[1-6]|20[1-5]|10[1-4]|T0[1-4])\s*[-–]\s*(.*)$/);
  return m ? { classCode: m[1], subject: m[2].trim() } : null;
}
