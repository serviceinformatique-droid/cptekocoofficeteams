/**
 * Assistant de rentrée scolaire + création d'utilisateurs (élèves / professeurs).
 *
 *  - Aperçu (lecture seule) puis application d'un export CSV Charlemagne (Aplim) :
 *    changement de classe, création des nouveaux comptes, désactivation des sortants.
 *  - Les comptes sortants sont désactivés, puis supprimés automatiquement après N mois (2 par défaut).
 *  - Création d'un compte élève ou professeur : mot de passe choisi ou aléatoire, licence, équipes Teams.
 */
import type { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { registerPedagogyRoutes } from './pedagogyRoutes.ts';
import {
  CLASS_REGEX, buildPlan, entraKind, isAdminAccount, detectColumns, extractRecords, generateUpn, mapClassLabel, norm, parseCsv,
  dropExactDuplicates, guessPositional, passwordProblem, randomPassword, slug, teamClassCode,
  type ColumnMapping, type EntraUser, type Plan, type PlanItem,
} from './rentreeLogic.ts';

const GRAPH = 'https://graph.microsoft.com/v1.0';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const jsonH = { 'Content-Type': 'application/json' };

export interface RentreeContext {
  getConfig: () => any;
  defaults: { tenantId: string; clientId: string; clientSecret: string };
  getDb: () => any;
  persist: () => void;
  dataDir: string;
}

interface PendingDeletion {
  id: string;
  upn: string;
  name: string;
  lastClass: string;
  disabledAt: string;
  deleteAfter: string;
}

interface TeamRef { id: string; name: string; classCode: string; subject: string }

interface Job {
  id: string;
  status: 'running' | 'done' | 'error';
  phase: string;
  done: number;
  total: number;
  startedAt: string;
  finishedAt?: string;
  log: string[];
  counters: Record<string, number>;
  warnings: string[];
  credentialsFile?: string;
  error?: string;
}

export function registerRentreeRoutes(app: Express, ctx: RentreeContext) {
  // ───────── Accès Graph ─────────
  let tokenCache: { tok: string; exp: number } | null = null;
  const creds = () => {
    const c = ctx.getConfig();
    return {
      tenantId: c.tenantId || ctx.defaults.tenantId,
      clientId: c.clientId || ctx.defaults.clientId,
      clientSecret: c.clientSecret || ctx.defaults.clientSecret,
    };
  };

  async function getToken(): Promise<string> {
    if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.tok;
    const c = creds();
    if (!c.clientSecret) throw new Error('Client Secret Microsoft manquant (voir le fichier .env).');
    const r = await fetch(`https://login.microsoftonline.com/${c.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret.trim(), scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' }).toString(),
    });
    const d: any = await r.json();
    if (!r.ok || !d.access_token) throw new Error(`Authentification Microsoft refusée : ${d.error_description || d.error || r.status}`);
    tokenCache = { tok: d.access_token, exp: Date.now() + (Number(d.expires_in) || 3600) * 1000 };
    return d.access_token;
  }

  interface GRes { status: number; ok: boolean; data: any }

  async function gfetch(method: string, urlOrPath: string, body?: unknown): Promise<GRes> {
    const url = urlOrPath.startsWith('http') ? urlOrPath : GRAPH + urlOrPath;
    for (let i = 0; i < 6; i++) {
      const t = await getToken();
      const r = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${t}`, ...(body !== undefined ? jsonH : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(60_000),
      });
      if ([429, 503, 504].includes(r.status)) {
        await sleep(Math.min(Number(r.headers.get('retry-after')) || 2 ** i, 60) * 1000);
        continue;
      }
      const text = await r.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 200) }; }
      return { status: r.status, ok: r.ok, data };
    }
    return { status: 429, ok: false, data: { error: { message: 'Microsoft Graph limite le débit (429), abandon après plusieurs essais.' } } };
  }

  const gerr = (r: GRes) => r.data?.error?.message || `HTTP ${r.status}`;

  async function fetchAll(pathWithQuery: string): Promise<any[]> {
    let url: string | null = GRAPH + pathWithQuery;
    const out: any[] = [];
    while (url) {
      const r = await gfetch('GET', url);
      if (!r.ok) throw new Error(`Lecture Microsoft Graph impossible : ${gerr(r)}`);
      out.push(...(r.data.value || []));
      url = r.data['@odata.nextLink'] || null;
    }
    return out;
  }

  /** Envoie des requêtes par lots de 20 via $batch ; relance celles qui reçoivent un 429. */
  async function batch(reqs: { id: string; method: string; url: string; body?: unknown }[]): Promise<Map<string, { status: number; body: any }>> {
    const result = new Map<string, { status: number; body: any }>();
    let todo = reqs;
    for (let attempt = 0; attempt < 5 && todo.length; attempt++) {
      const retry: typeof reqs = [];
      let wait = 0;
      for (let i = 0; i < todo.length; i += 20) {
        const chunk = todo.slice(i, i + 20);
        const r = await gfetch('POST', '/$batch', {
          requests: chunk.map(q => ({ id: q.id, method: q.method, url: q.url, ...(q.body !== undefined ? { headers: jsonH, body: q.body } : {}) })),
        });
        if (!r.ok) { chunk.forEach(q => result.set(q.id, { status: r.status, body: r.data })); continue; }
        for (const resp of r.data.responses || []) {
          if (resp.status === 429 || resp.status === 503) {
            const q = chunk.find(c => c.id === resp.id);
            if (q) retry.push(q);
            wait = Math.max(wait, Number(resp.headers?.['Retry-After']) || 3);
          } else result.set(resp.id, { status: resp.status, body: resp.body });
        }
      }
      todo = retry;
      if (todo.length) await sleep(Math.min(wait || 3, 60) * 1000);
    }
    todo.forEach(q => result.set(q.id, { status: 429, body: { error: { message: 'Limite de débit Microsoft (429)' } } }));
    return result;
  }

  async function pool<T>(items: T[], n: number, fn: (x: T, i: number) => Promise<void>): Promise<void> {
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) { const i = next++; await fn(items[i], i); }
    }));
  }

  // ───────── Données Entra / Teams ─────────
  async function fetchEntraUsers(): Promise<EntraUser[]> {
    const raw = await fetchAll('/users?$top=999&$select=id,givenName,surname,userPrincipalName,mail,officeLocation,department,jobTitle,accountEnabled,assignedLicenses');
    return raw.map((u: any) => ({
      id: u.id,
      upn: u.userPrincipalName || '',
      mail: u.mail || '',
      givenName: u.givenName || '',
      surname: u.surname || '',
      officeLocation: u.officeLocation || '',
      department: u.department || '',
      jobTitle: u.jobTitle || '',
      accountEnabled: u.accountEnabled !== false,
      licenseCount: (u.assignedLicenses || []).length,
    }));
  }

  async function fetchClassTeams(): Promise<TeamRef[]> {
    const raw = await fetchAll("/groups?$filter=resourceProvisioningOptions/Any(x:x eq 'Team')&$top=999&$select=id,displayName");
    const out: TeamRef[] = [];
    for (const g of raw) {
      const t = teamClassCode(g.displayName || '');
      if (t) out.push({ id: g.id, name: g.displayName, classCode: t.classCode, subject: t.subject });
    }
    return out;
  }

  async function groupMemberIds(groupId: string): Promise<Set<string>> {
    const ids = await fetchAll(`/groups/${groupId}/members?$select=id&$top=999`);
    return new Set(ids.map((m: any) => m.id));
  }

  async function fetchSkus() {
    const r = await gfetch('GET', '/subscribedSkus?$select=skuId,skuPartNumber,consumedUnits,prepaidUnits');
    if (!r.ok) throw new Error(`Lecture des licences impossible : ${gerr(r)}`);
    return (r.data.value || []).map((s: any) => ({
      skuId: s.skuId,
      partNumber: s.skuPartNumber,
      total: s.prepaidUnits?.enabled || 0,
      used: s.consumedUnits || 0,
    }));
  }

  const skuByPart = (skus: any[], part: string) => skus.find(s => s.partNumber === part)?.skuId as string | undefined;

  async function detectDomain(): Promise<string> {
    const r = await gfetch('GET', '/users?$top=100&$select=userPrincipalName');
    const count: Record<string, number> = {};
    for (const u of r.data?.value || []) {
      const d = String(u.userPrincipalName || '').split('@')[1];
      if (d && !d.endsWith('.onmicrosoft.com')) count[d] = (count[d] || 0) + 1;
    }
    return Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] || 'notredamedesmissions.com';
  }

  // ───────── Base locale (comptes en attente de suppression) ─────────
  const store = () => {
    const db = ctx.getDb();
    if (!db.rentree) db.rentree = { pending: [] as PendingDeletion[] };
    if (!Array.isArray(db.rentree.pending)) db.rentree.pending = [];
    return db.rentree as { pending: PendingDeletion[] };
  };
  const log = (action: string, target: string, details: string, status: 'Réussi' | 'Erreur' = 'Réussi') => {
    const db = ctx.getDb();
    db.logs?.unshift({
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action, target, details, status, source: 'Rentrée',
    });
  };

  // ───────── Calcul du plan (commun à l'aperçu et à l'application) ─────────
  interface PlanInput {
    csvContent: string;
    mapping?: Partial<ColumnMapping>;
    classMap?: Record<string, string>;
    includeFormer?: boolean;
    /** Le fichier ne contient que des arrivants : aucun élève absent du fichier n'est désactivé. */
    additionsOnly?: boolean;
    /** true / false = l'utilisateur impose la présence ou l'absence d'en-tête ; absent = détection automatique. */
    hasHeader?: boolean | null;
  }

  async function computePlan(input: PlanInput) {
    if (!input.csvContent || typeof input.csvContent !== 'string') throw new Error('Fichier CSV vide.');
    const parsed = parseCsv(input.csvContent, typeof input.hasHeader === 'boolean' ? input.hasHeader : undefined);
    if (!parsed.rows.length) throw new Error('Le CSV ne contient aucune ligne de données.');
    const detected = parsed.headerRow < 0 ? guessPositional(parsed.rows) : detectColumns(parsed.headers);
    // En-tête présent mais colonnes non reconnues : on retombe sur la position (Nom ; Prénom ; Classe).
    if (parsed.headerRow >= 0 && detected.combined < 0 && (detected.nom < 0 || detected.prenom < 0)) {
      const pos = guessPositional(parsed.rows);
      if (detected.nom < 0) detected.nom = pos.nom;
      if (detected.prenom < 0) detected.prenom = pos.prenom;
      if (detected.classe < 0) detected.classe = pos.classe;
      if (detected.email < 0) detected.email = pos.email;
    }
    const mapping: ColumnMapping = { ...detected };
    for (const k of Object.keys(input.mapping || {}) as (keyof ColumnMapping)[]) {
      const v = (input.mapping as any)[k];
      if (typeof v === 'number') mapping[k] = v;
    }
    if (mapping.combined < 0 && (mapping.nom < 0 || mapping.prenom < 0)) {
      throw new Error('Colonnes Nom et Prénom introuvables : choisissez-les dans la liste de correspondance.');
    }
    const extracted = extractRecords(parsed, mapping);
    const { records, removed: duplicateRows } = dropExactDuplicates(extracted.records);
    const badRows = extracted.invalid;
    const classMap = input.classMap || {};
    const classOf = (label: string) => {
      const manual = classMap[label];
      if (manual && CLASS_REGEX.test(manual)) return manual;
      return mapClassLabel(label);
    };
    const labels = new Map<string, number>();
    records.forEach(r => labels.set(r.classLabel, (labels.get(r.classLabel) || 0) + 1));
    const classLabels = [...labels.entries()].sort().map(([label, count]) => ({ label, count, code: classOf(label) }));

    const entra = await fetchEntraUsers();
    const plan = buildPlan(records, entra, classOf, { includeFormer: !!input.includeFormer && !input.additionsOnly, additionsOnly: !!input.additionsOnly });
    for (const b of badRows) plan.invalid.push({ line: b.line, nom: '', prenom: '', classCode: '', reason: `${b.reason} (${b.raw})` });
    return { plan, entra, meta: { duplicatesRemoved: duplicateRows.length, hasHeader: parsed.headerRow >= 0, headers: parsed.headers, headerRow: parsed.headerRow, detected, mapping, rows: records.length, classLabels } };
  }

  const summarize = (p: Plan) => ({
    create: p.create.length, move: p.move.length, unchanged: p.unchanged.length, reactivate: p.reactivate.length,
    leave: p.leave.length, ambiguous: p.ambiguous.length, invalid: p.invalid.length, formerEnabled: p.formerEnabled, activeBefore: p.activeBefore,
  });

  const guards = (p: Plan, rows: number, additionsOnly = false) => {
    const out: string[] = [];
    if (additionsOnly) return out;
    if (p.activeBefore > 0 && rows < p.activeBefore * 0.5) out.push(`Le fichier ne contient que ${rows} lignes pour ${p.activeBefore} élèves actuels : fichier partiel ?`);
    if (p.activeBefore > 0 && p.leave.filter(l => !l.former).length > p.activeBefore * 0.4) out.push(`${p.leave.filter(l => !l.former).length} élèves sortants sur ${p.activeBefore} (plus de 40 %) : vérifiez le fichier.`);
    return out;
  };

  const wrap = (fn: (req: Request, res: Response) => Promise<void>) => async (req: Request, res: Response) => {
    try { await fn(req, res); } catch (e: any) { res.status(500).json({ success: false, error: e.message || 'Erreur' }); }
  };

  // ───────── Routes : options ─────────
  app.get('/api/rentree/options', wrap(async (_req, res) => {
    const skus = await fetchSkus();
    res.json({
      success: true,
      skus,
      defaults: { student: skuByPart(skus, 'STANDARDWOFFPACK_STUDENT') || '', teacher: skuByPart(skus, 'STANDARDWOFFPACK_FACULTY') || '' },
    });
  }));

  // ───────── Routes : aperçu (lecture seule) ─────────
  app.post('/api/rentree/preview', wrap(async (req, res) => {
    const { plan, meta } = await computePlan(req.body || {});
    const teams = await fetchClassTeams().catch(() => []);
    res.json({
      success: true,
      meta: { ...meta, teamsFound: teams.length },
      summary: summarize(plan),
      warnings: guards(plan, meta.rows, !!(req.body || {}).additionsOnly),
      partial: !(req.body || {}).additionsOnly && plan.activeBefore > 0 && meta.rows < plan.activeBefore * 0.5,
      plan: { create: plan.create, move: plan.move, reactivate: plan.reactivate, leave: plan.leave, ambiguous: plan.ambiguous, invalid: plan.invalid },
    });
  }));

  // ───────── Routes : application ─────────
  let currentJob: Job | null = null;
  const jobs = new Map<string, Job>();

  app.post('/api/rentree/apply', wrap(async (req, res) => {
    const b = req.body || {};
    if (b.confirm !== 'RENTREE') { res.status(400).json({ success: false, error: 'Confirmation manquante : tapez RENTREE.' }); return; }
    if (currentJob?.status === 'running') { res.status(409).json({ success: false, error: 'Une rentrée est déjà en cours.' }); return; }
    const { plan, meta } = await computePlan(b);
    const sum = summarize(plan);
    const exp = b.expected || {};
    for (const k of ['create', 'move', 'reactivate', 'leave'] as const) {
      if (exp[k] !== sum[k]) {
        res.status(409).json({ success: false, error: `L'annuaire ou le fichier a changé depuis l'aperçu (${k} : ${exp[k]} → ${sum[k]}). Relancez l'analyse.` });
        return;
      }
    }
    const warn = guards(plan, meta.rows, !!b.additionsOnly);
    if ((warn.length || sum.invalid || sum.ambiguous) && !b.ignoreWarnings) {
      res.status(409).json({ success: false, error: 'Des avertissements bloquent l\'application. Corrigez-les ou cochez « Ignorer les avertissements ».', warnings: warn });
      return;
    }
    const opts = {
      doCreate: b.doCreate !== false, doMoves: b.doMoves !== false, doLeavers: b.doLeavers !== false, doTeams: b.doTeams !== false,
      skuId: String(b.skuId || ''),
      months: Math.min(Math.max(Number(b.deleteAfterMonths) || 2, 1), 12),
    };
    if ((opts.doCreate && plan.create.length || plan.reactivate.length) && !opts.skuId) {
      res.status(400).json({ success: false, error: 'Choisissez la licence à attribuer aux élèves.' });
      return;
    }
    const job: Job = { id: randomUUID(), status: 'running', phase: 'Démarrage', done: 0, total: 0, startedAt: new Date().toISOString(), log: [], counters: {}, warnings: [] };
    jobs.set(job.id, job);
    currentJob = job;
    runRentree(job, plan, opts).catch(e => { job.status = 'error'; job.error = e.message; job.finishedAt = new Date().toISOString(); });
    res.json({ success: true, jobId: job.id });
  }));

  app.get('/api/rentree/job/:id', (req, res) => {
    const j = jobs.get(req.params.id);
    if (!j) { res.status(404).json({ success: false, error: 'Tâche introuvable (le serveur a peut-être redémarré).' }); return; }
    res.json({ success: true, job: { ...j, credentialsFile: undefined, hasCredentials: !!j.credentialsFile } });
  });

  app.get('/api/rentree/job/:id/credentials.csv', (req, res) => {
    const j = jobs.get(String(req.params.id));
    if (!j?.credentialsFile || !fs.existsSync(j.credentialsFile)) { res.status(404).send('Aucun fichier'); return; }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="nouveaux-comptes.csv"');
    res.send('﻿' + fs.readFileSync(j.credentialsFile, 'utf-8'));
  });

  async function runRentree(job: Job, plan: Plan, opts: { doCreate: boolean; doMoves: boolean; doLeavers: boolean; doTeams: boolean; skuId: string; months: number }) {
    const say = (m: string) => { job.log.push(`${new Date().toLocaleTimeString('fr-FR')} ${m}`); if (job.log.length > 400) job.log.shift(); };
    const count = (k: string, n = 1) => { job.counters[k] = (job.counters[k] || 0) + n; };
    const fail = (what: string, who: string, msg: string) => {
      count('erreurs');
      if (job.warnings.length < 60) job.warnings.push(`${what} – ${who} : ${msg}`);
    };
    const phase = (name: string, total: number) => { job.phase = name; job.done = 0; job.total = total; say(name); };

    const pending = store().pending;
    const moves: { id: string; from: string; to: string }[] = [];
    const leavers: { id: string; from: string }[] = [];
    const arrivals: { id: string; to: string }[] = [];

    // 1. Sortants : désactivation + suppression programmée
    if (opts.doLeavers && plan.leave.length) {
      phase('Désactivation des comptes sortants', plan.leave.length);
      const due = new Date();
      due.setMonth(due.getMonth() + opts.months);
      await pool(plan.leave, 5, async it => {
        const r = await gfetch('PATCH', `/users/${it.userId}`, it.former ? { accountEnabled: false } : { accountEnabled: false, officeLocation: null });
        if (!r.ok) fail('Désactivation', it.upn || '', gerr(r));
        else {
          await gfetch('POST', `/users/${it.userId}/revokeSignInSessions`);
          if (!pending.some(p => p.id === it.userId)) {
            pending.push({ id: it.userId!, upn: it.upn || '', name: `${it.prenom} ${it.nom}`.trim(), lastClass: it.fromClass || '', disabledAt: new Date().toISOString(), deleteAfter: due.toISOString() });
          }
          leavers.push({ id: it.userId!, from: it.fromClass || '' });
          count('désactivés');
        }
        job.done++;
      });
      ctx.persist();
    }

    // 2. Changements de classe
    if (opts.doMoves && plan.move.length) {
      phase('Changements de classe', plan.move.length);
      await pool(plan.move, 5, async it => {
        const r = await gfetch('PATCH', `/users/${it.userId}`, { officeLocation: it.classCode, department: `Elèves / ${it.classCode}` });
        if (!r.ok) fail('Changement de classe', it.upn || '', gerr(r));
        else { moves.push({ id: it.userId!, from: it.fromClass || '', to: it.classCode }); count('changements de classe'); }
        job.done++;
      });
    }

    // 3. Réactivations
    if (plan.reactivate.length) {
      phase('Réactivation des comptes', plan.reactivate.length);
      await pool(plan.reactivate, 5, async it => {
        const r = await gfetch('PATCH', `/users/${it.userId}`, { accountEnabled: true, officeLocation: it.classCode, department: `Elèves / ${it.classCode}` });
        if (!r.ok) { fail('Réactivation', it.upn || '', gerr(r)); job.done++; return; }
        if (!it.licenseCount && opts.skuId) {
          const l = await gfetch('POST', `/users/${it.userId}/assignLicense`, { addLicenses: [{ skuId: opts.skuId }], removeLicenses: [] });
          if (!l.ok) fail('Licence', it.upn || '', gerr(l));
        }
        const i = pending.findIndex(p => p.id === it.userId);
        if (i >= 0) pending.splice(i, 1);
        arrivals.push({ id: it.userId!, to: it.classCode });
        count('réactivés');
        job.done++;
      });
      ctx.persist();
    }

    // 4. Nouveaux comptes
    const created: { upn: string; nom: string; prenom: string; classCode: string; password: string }[] = [];
    if (opts.doCreate && plan.create.length) {
      phase('Création des nouveaux comptes', plan.create.length);
      const domain = await detectDomain();
      const taken = new Set((await fetchEntraUsers()).map(u => u.upn.toLowerCase()));
      const todo = plan.create.map(it => ({ it, upn: it.email && it.email.includes('@') ? it.email : generateUpn(it.prenom, it.nom, domain, taken), password: randomPassword() }));
      await pool(todo, 4, async ({ it, upn, password }) => {
        const r = await gfetch('POST', '/users', {
          accountEnabled: true,
          displayName: `${it.prenom} ${it.nom}`,
          givenName: it.prenom,
          surname: it.nom,
          userPrincipalName: upn,
          mailNickname: upn.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') || 'eleve',
          usageLocation: 'FR',
          officeLocation: it.classCode,
          department: `Elèves / ${it.classCode}`,
          jobTitle: 'Elèves',
          passwordProfile: { forceChangePasswordNextSignIn: true, password },
        });
        if (!r.ok) { fail('Création', upn, gerr(r)); job.done++; return; }
        const id = r.data.id as string;
        const l = await gfetch('POST', `/users/${id}/assignLicense`, { addLicenses: [{ skuId: opts.skuId }], removeLicenses: [] });
        if (!l.ok) fail('Licence', upn, gerr(l));
        created.push({ upn, nom: it.nom, prenom: it.prenom, classCode: it.classCode, password });
        arrivals.push({ id, to: it.classCode });
        count('comptes créés');
        job.done++;
      });
      if (created.length) {
        const dir = path.join(ctx.dataDir, 'rentree');
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `nouveaux-comptes-${new Date().toISOString().slice(0, 10)}-${job.id.slice(0, 8)}.csv`);
        const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
        const lines = ['Nom;Prénom;Classe;Identifiant;Mot de passe temporaire', ...created.map(c => [c.nom, c.prenom, c.classCode, c.upn, c.password].map(esc).join(';'))];
        fs.writeFileSync(file, lines.join('\r\n'), { encoding: 'utf-8', mode: 0o600 });
        job.credentialsFile = file;
      }
    }

    // 5. Équipes Teams : retrait des anciennes classes, ajout dans la nouvelle
    if (opts.doTeams && (moves.length || leavers.length || arrivals.length)) {
      const teams = await fetchClassTeams();
      const byClass = new Map<string, TeamRef[]>();
      teams.forEach(t => byClass.set(t.classCode, [...(byClass.get(t.classCode) || []), t]));
      const targets = teams.filter(t =>
        moves.some(m => m.from === t.classCode || m.to === t.classCode) || leavers.some(l => l.from === t.classCode) || arrivals.some(a => a.to === t.classCode));
      phase('Mise à jour des équipes Teams', targets.length);
      await pool(targets, 4, async team => {
        try {
          const removeIds = [...moves.filter(m => m.from === team.classCode && m.to !== team.classCode).map(m => m.id), ...leavers.filter(l => l.from === team.classCode).map(l => l.id)];
          const addIds = [...moves.filter(m => m.to === team.classCode).map(m => m.id), ...arrivals.filter(a => a.to === team.classCode).map(a => a.id)];
          const members = await groupMemberIds(team.id);
          const toRemove = removeIds.filter(id => members.has(id));
          const toAdd = addIds.filter(id => !members.has(id));
          const reqs: { id: string; method: string; url: string; body?: unknown }[] = [];
          toRemove.forEach(id => reqs.push({ id: `rm-${id}`, method: 'DELETE', url: `/groups/${team.id}/members/${id}/$ref` }));
          toAdd.forEach(id => reqs.push({ id: `add-${id}`, method: 'POST', url: `/groups/${team.id}/members/$ref`, body: { '@odata.id': `${GRAPH}/directoryObjects/${id}` } }));
          const res = await batch(reqs);
          for (const [id, r] of res) {
            if (id.startsWith('rm-')) { if (r.status < 300 || r.status === 404) count('retraits d\'équipes'); else fail('Retrait équipe', team.name, r.body?.error?.message || `HTTP ${r.status}`); }
            else if (r.status < 300) count('ajouts d\'équipes');
            else if (!/already exist/i.test(JSON.stringify(r.body || {}))) fail('Ajout équipe', team.name, r.body?.error?.message || `HTTP ${r.status}`);
          }
        } catch (e: any) { fail('Équipe', team.name, e.message); }
        job.done++;
      });
    }

    const c = job.counters;
    const summary = Object.entries(c).map(([k, v]) => `${v} ${k}`).join(', ') || 'aucune modification';
    log('SYNCHRONISATION', 'Rentrée scolaire', `Rentrée appliquée : ${summary}.`, c['erreurs'] ? 'Erreur' : 'Réussi');
    ctx.persist();
    job.phase = 'Terminé';
    job.status = 'done';
    job.finishedAt = new Date().toISOString();
    say(`Terminé : ${summary}.`);
  }

  // ───────── Visibilité des équipes de classe ─────────
  async function classTeamsWithVisibility() {
    const raw = await fetchAll("/groups?$filter=resourceProvisioningOptions/Any(x:x eq 'Team')&$top=999&$select=id,displayName,visibility");
    return raw.filter((g: any) => teamClassCode(g.displayName || '')).map((g: any) => ({ id: g.id as string, name: g.displayName as string, visibility: (g.visibility || 'Public') as string }));
  }

  app.get('/api/rentree/teams-visibility', wrap(async (_req, res) => {
    const teams = await classTeamsWithVisibility();
    const counts: Record<string, number> = {};
    teams.forEach(t => { counts[t.visibility] = (counts[t.visibility] || 0) + 1; });
    res.json({ success: true, total: teams.length, counts, publicCount: counts['Public'] || 0 });
  }));

  app.post('/api/rentree/teams-visibility/private', wrap(async (req, res) => {
    if ((req.body || {}).confirm !== 'PRIVE') { res.status(400).json({ success: false, error: 'Confirmation manquante : tapez PRIVE.' }); return; }
    const todo = (await classTeamsWithVisibility()).filter(t => t.visibility === 'Public');
    const result = await batch(todo.map(t => ({ id: t.id, method: 'PATCH', url: `/groups/${t.id}`, body: { visibility: 'Private' } })));
    let ok = 0;
    const errors: string[] = [];
    for (const t of todo) {
      const r = result.get(t.id);
      if (r && r.status < 300) ok++;
      else if (errors.length < 10) errors.push(`${t.name} : ${r?.body?.error?.message || `HTTP ${r?.status}`}`);
    }
    log('MODIFICATION', 'Équipes Teams', `${ok} équipe(s) de classe passée(s) en privé sur ${todo.length}.`, ok === todo.length ? 'Réussi' : 'Erreur');
    ctx.persist();
    res.json({ success: ok === todo.length, changed: ok, total: todo.length, errors, message: `${ok} équipe(s) passée(s) en privé sur ${todo.length}.` });
  }));

  // ───────── Comptes en attente de suppression ─────────
  app.get('/api/rentree/pending', (_req, res) => {
    const now = Date.now();
    res.json({
      success: true,
      pending: store().pending
        .map(p => ({ ...p, daysLeft: Math.ceil((new Date(p.deleteAfter).getTime() - now) / 86_400_000) }))
        .sort((a, b) => a.deleteAfter.localeCompare(b.deleteAfter)),
    });
  });

  app.post('/api/rentree/pending/:id/restore', wrap(async (req, res) => {
    const s = store();
    const i = s.pending.findIndex(p => p.id === req.params.id);
    if (i < 0) { res.status(404).json({ success: false, error: 'Compte introuvable dans la liste.' }); return; }
    const p = s.pending[i];
    const patch: any = { accountEnabled: true };
    if (p.lastClass && CLASS_REGEX.test(p.lastClass)) { patch.officeLocation = p.lastClass; patch.department = `Elèves / ${p.lastClass}`; }
    const r = await gfetch('PATCH', `/users/${p.id}`, patch);
    if (!r.ok) { res.status(400).json({ success: false, error: gerr(r) }); return; }
    s.pending.splice(i, 1);
    log('MODIFICATION', p.name, `Compte ${p.upn} restauré avant suppression définitive.`);
    ctx.persist();
    res.json({ success: true, message: `Compte ${p.upn} réactivé.` });
  }));

  /** Supprime les comptes dont le délai est écoulé (et toujours désactivés). */
  async function runPurge(): Promise<{ deleted: number; skipped: number; errors: string[] }> {
    const s = store();
    const now = Date.now();
    const due = s.pending.filter(p => new Date(p.deleteAfter).getTime() <= now);
    let deleted = 0, skipped = 0;
    const errors: string[] = [];
    for (const p of due) {
      const g = await gfetch('GET', `/users/${p.id}?$select=accountEnabled`);
      if (g.status === 404) { s.pending = s.pending.filter(x => x.id !== p.id); skipped++; continue; }
      if (!g.ok) { errors.push(`${p.upn} : ${gerr(g)}`); continue; }
      if (g.data.accountEnabled !== false) { s.pending = s.pending.filter(x => x.id !== p.id); skipped++; log('MODIFICATION', p.name, `${p.upn} a été réactivé : suppression annulée.`); continue; }
      const d = await gfetch('DELETE', `/users/${p.id}`);
      if (d.ok || d.status === 404) {
        s.pending = s.pending.filter(x => x.id !== p.id);
        deleted++;
        log('SUPPRESSION', p.name, `Compte ${p.upn} supprimé (désactivé depuis le ${p.disabledAt.slice(0, 10)}).`);
      } else errors.push(`${p.upn} : ${gerr(d)}`);
    }
    if (due.length) ctx.persist();
    return { deleted, skipped, errors };
  }

  app.post('/api/rentree/purge-due', wrap(async (_req, res) => {
    const r = await runPurge();
    res.json({ success: true, ...r, message: `${r.deleted} compte(s) supprimé(s), ${r.skipped} ignoré(s).` });
  }));

  // ───────── Création d'un utilisateur (élève ou professeur) ─────────
  app.post('/api/rentree/user', wrap(async (req, res) => {
    const b = req.body || {};
    const role = b.role === 'teacher' ? 'teacher' : 'student';
    const nom = String(b.nom || '').trim().toUpperCase();
    const prenom = String(b.prenom || '').trim();
    if (!nom || !prenom) { res.status(400).json({ success: false, error: 'Nom et prénom obligatoires.' }); return; }
    if (!b.skuId) { res.status(400).json({ success: false, error: 'Choisissez une licence.' }); return; }

    const manual = b.passwordMode === 'manual';
    const password = manual ? String(b.password || '') : randomPassword();
    if (manual) {
      const pb = passwordProblem(password);
      if (pb) { res.status(400).json({ success: false, error: pb }); return; }
    }

    const classCode = String(b.classCode || '');
    const assignments: { classCode: string; subject: string; aliases?: string[] }[] = Array.isArray(b.assignments) ? b.assignments : [];
    if (role === 'student' && !CLASS_REGEX.test(classCode)) { res.status(400).json({ success: false, error: 'Choisissez la classe de l\'élève.' }); return; }
    if (role === 'teacher' && assignments.some(a => !CLASS_REGEX.test(a.classCode) || !a.subject)) { res.status(400).json({ success: false, error: 'Chaque affectation doit avoir une classe et une discipline.' }); return; }

    // Identifiant : celui saisi, sinon prenom.nom@domaine (avec numéro en cas d'homonyme)
    let upn = String(b.email || '').trim().toLowerCase();
    if (upn) {
      const ex = await gfetch('GET', `/users/${encodeURIComponent(upn)}?$select=id`);
      if (ex.ok) { res.status(409).json({ success: false, error: `Le compte ${upn} existe déjà.` }); return; }
    } else {
      const domain = await detectDomain();
      const taken = new Set<string>();
      for (let n = 1; n < 30; n++) {
        const cand = `${slug(prenom)}.${slug(nom)}${n > 1 ? n : ''}@${domain}`;
        const ex = await gfetch('GET', `/users/${encodeURIComponent(cand)}?$select=id`);
        if (ex.status === 404) { upn = cand; break; }
        if (!ex.ok && ex.status !== 404) throw new Error(gerr(ex));
        taken.add(cand);
      }
      if (!upn) throw new Error('Impossible de trouver un identifiant libre.');
    }

    const subjects = [...new Set(assignments.map(a => a.subject))];
    const payload: any = {
      accountEnabled: true,
      displayName: `${prenom} ${nom}`,
      givenName: prenom,
      surname: nom,
      userPrincipalName: upn,
      mailNickname: upn.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') || 'utilisateur',
      usageLocation: 'FR',
      passwordProfile: { forceChangePasswordNextSignIn: b.forceChange !== false, password },
      ...(role === 'student'
        ? { officeLocation: classCode, department: `Elèves / ${classCode}`, jobTitle: 'Elèves' }
        : { officeLocation: 'profs', department: `Professeurs / ${subjects.join(', ')}`.slice(0, 64), jobTitle: 'profs' }),
    };
    const created = await gfetch('POST', '/users', payload);
    if (!created.ok) { res.status(400).json({ success: false, error: `Création refusée : ${gerr(created)}` }); return; }
    const userId = created.data.id as string;
    const warnings: string[] = [];

    const lic = await gfetch('POST', `/users/${userId}/assignLicense`, { addLicenses: [{ skuId: b.skuId }], removeLicenses: [] });
    if (!lic.ok) warnings.push(`Licence non attribuée : ${gerr(lic)}`);

    const teamsAdded: string[] = [];
    const teamsMissing: string[] = [];
    if (b.addToTeams !== false) {
      const teams = await fetchClassTeams().catch(() => [] as TeamRef[]);
      const addMember = async (t: TeamRef, owner: boolean) => {
        const m = await gfetch('POST', `/groups/${t.id}/members/$ref`, { '@odata.id': `${GRAPH}/directoryObjects/${userId}` });
        if (!m.ok && !/already exist/i.test(JSON.stringify(m.data || {}))) { warnings.push(`Équipe ${t.name} : ${gerr(m)}`); return false; }
        if (owner) {
          const o = await gfetch('POST', `/groups/${t.id}/owners/$ref`, { '@odata.id': `${GRAPH}/directoryObjects/${userId}` });
          if (!o.ok && !/already exist/i.test(JSON.stringify(o.data || {}))) warnings.push(`Propriétaire de ${t.name} : ${gerr(o)}`);
        }
        teamsAdded.push(t.name);
        return true;
      };
      if (role === 'student') {
        for (const t of teams.filter(x => x.classCode === classCode)) await addMember(t, false);
        if (!teamsAdded.length) teamsMissing.push(`aucune équipe trouvée pour la classe ${classCode}`);
      } else {
        for (const a of assignments) {
          const wanted = [a.subject, ...(a.aliases || [])].map(norm).filter(Boolean);
          const found = teams.filter(t => t.classCode === a.classCode && wanted.some(w => norm(t.subject) === w || norm(t.subject).includes(w) || w.includes(norm(t.subject)) && norm(t.subject).length > 3));
          if (!found.length) { teamsMissing.push(`${a.classCode}-${a.subject}`); continue; }
          for (const t of found) await addMember(t, true);
        }
      }
    }

    // Reflet dans la base locale de l'application
    const db = ctx.getDb();
    if (Array.isArray(db.users)) {
      db.users.push({
        id: 'u-m365-' + userId, m365Id: userId, firstName: prenom, lastName: nom, email: upn, upn,
        role, classCode: role === 'student' ? classCode : '', status: 'active', specialties: [], options: [],
        ...(role === 'teacher' ? { teachingSubjects: assignments.map(a => ({ classCode: a.classCode, subjectName: a.subject })) } : {}),
      });
    }
    log('CRÉATION', `${prenom} ${nom}`, `Compte ${role === 'teacher' ? 'professeur' : 'élève'} ${upn} créé, ${teamsAdded.length} équipe(s) rejointe(s).`);
    ctx.persist();

    res.json({ success: true, userId, upn, displayName: `${prenom} ${nom}`, password, forceChange: b.forceChange !== false, licenseAssigned: lic.ok, teamsAdded, teamsMissing, warnings });
  }));

  // ───────── Import du PDF « Équipe pédagogique » ─────────
  const startJob = (run: (h: any, job: Job) => Promise<void>): Job => {
    const job: Job = { id: randomUUID(), status: 'running', phase: 'Démarrage', done: 0, total: 0, startedAt: new Date().toISOString(), log: [], counters: {}, warnings: [] };
    jobs.set(job.id, job);
    currentJob = job;
    const say = (m: string) => { job.log.push(`${new Date().toLocaleTimeString('fr-FR')} ${m}`); if (job.log.length > 400) job.log.shift(); };
    const h = {
      say,
      count: (k: string, n = 1) => { job.counters[k] = (job.counters[k] || 0) + n; },
      fail: (what: string, who: string, msg: string) => {
        job.counters['erreurs'] = (job.counters['erreurs'] || 0) + 1;
        if (job.warnings.length < 60) job.warnings.push(`${what} – ${who} : ${msg}`);
      },
      phase: (name: string, total: number) => { job.phase = name; job.done = 0; job.total = total; say(name); },
      tick: () => { job.done++; },
    };
    run(h, job)
      .then(() => { job.phase = 'Terminé'; job.status = 'done'; job.finishedAt = new Date().toISOString(); })
      .catch(e => { job.status = 'error'; job.error = e.message; job.finishedAt = new Date().toISOString(); });
    return job;
  };

  const writeCredentials = (job: Job, header: string, rows: string[][], prefix: string) => {
    const dir = path.join(ctx.dataDir, 'rentree');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${prefix}-${new Date().toISOString().slice(0, 10)}-${job.id.slice(0, 8)}.csv`);
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    fs.writeFileSync(file, [header, ...rows.map(r => r.map(esc).join(';'))].join(String.fromCharCode(13, 10)), { encoding: 'utf-8', mode: 0o600 });
    job.credentialsFile = file;
  };

  registerPedagogyRoutes(app, {
    GRAPH, wrap, gfetch, gerr, fetchAll, batch, pool, fetchEntraUsers, fetchClassTeams, fetchSkus, detectDomain,
    isBusy: () => currentJob?.status === 'running',
    startJob, writeCredentials, store, getDb: ctx.getDb, persist: ctx.persist, log,
  });

  // ───────── Suppression manuelle d'un compte (élève ou professeur) ─────────
  const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  async function loadAccount(id: string): Promise<{ user?: EntraUser; status?: number; error?: string }> {
    if (!GUID_RE.test(id)) return { status: 400, error: 'Identifiant Microsoft invalide.' };
    const r = await gfetch('GET', `/users/${id}?$select=id,givenName,surname,userPrincipalName,mail,officeLocation,department,jobTitle,accountEnabled,assignedLicenses`);
    if (r.status === 404) return { status: 404, error: 'Ce compte n\'existe plus dans Microsoft 365.' };
    if (!r.ok) return { status: 400, error: gerr(r) };
    const u = r.data;
    const user: EntraUser = {
      id: u.id, upn: u.userPrincipalName || '', mail: u.mail || '', givenName: u.givenName || '', surname: u.surname || '',
      officeLocation: u.officeLocation || '', department: u.department || '', jobTitle: u.jobTitle || '',
      accountEnabled: u.accountEnabled !== false, licenseCount: (u.assignedLicenses || []).length,
    };
    if (isAdminAccount(user)) return { status: 403, error: 'Compte administrateur ou de service : protégé, il ne peut pas être supprimé ici.' };
    return { user };
  }

  const forgetLocally = (id: string, status?: string) => {
    const db = ctx.getDb();
    if (!Array.isArray(db.users)) return;
    if (status) db.users.forEach((u: any) => { if (u.m365Id === id) u.status = status; });
    else db.users = db.users.filter((u: any) => u.m365Id !== id);
  };

  /** Désactive le compte, ferme ses sessions et programme sa suppression. */
  app.post('/api/rentree/account/:id/disable', wrap(async (req, res) => {
    const months = Math.min(Math.max(Number((req.body || {}).months) || 2, 1), 12);
    const { user, status, error } = await loadAccount(String(req.params.id));
    if (!user) { res.status(status || 400).json({ success: false, error }); return; }
    const isStudent = entraKind(user) === 'active';
    const patch: any = { accountEnabled: false };
    if (isStudent) patch.officeLocation = null;
    const r = await gfetch('PATCH', `/users/${user.id}`, patch);
    if (!r.ok) { res.status(400).json({ success: false, error: gerr(r) }); return; }
    await gfetch('POST', `/users/${user.id}/revokeSignInSessions`);
    let removed = 0;
    if (isStudent) {
      const teams = (await fetchClassTeams().catch(() => [] as TeamRef[])).filter(t => t.classCode === user.officeLocation);
      const res2 = await batch(teams.map(t => ({ id: t.id, method: 'DELETE', url: `/groups/${t.id}/members/${user.id}/$ref` })));
      for (const r2 of res2.values()) if (r2.status < 300) removed++;
    }
    const due = new Date();
    due.setMonth(due.getMonth() + months);
    const s = store();
    s.pending = s.pending.filter(p => p.id !== user.id);
    s.pending.push({ id: user.id, upn: user.upn, name: `${user.givenName} ${user.surname}`.trim(), lastClass: isStudent ? user.officeLocation : '', disabledAt: new Date().toISOString(), deleteAfter: due.toISOString() });
    forgetLocally(user.id, 'inactive');
    log('MODIFICATION', `${user.givenName} ${user.surname}`, `Compte ${user.upn} désactivé manuellement, suppression programmée le ${due.toLocaleDateString('fr-FR')}.`);
    ctx.persist();
    res.json({ success: true, deleteAfter: due.toISOString(), removedFromTeams: removed, message: `Compte désactivé. Suppression automatique le ${due.toLocaleDateString('fr-FR')} (restaurable d'ici là).` });
  }));

  /** Suppression immédiate (corbeille Microsoft 30 jours), après confirmation explicite. */
  app.post('/api/rentree/account/:id/delete-now', wrap(async (req, res) => {
    if ((req.body || {}).confirm !== 'SUPPRIMER') { res.status(400).json({ success: false, error: 'Confirmation manquante : tapez SUPPRIMER.' }); return; }
    const { user, status, error } = await loadAccount(String(req.params.id));
    if (!user) { res.status(status || 400).json({ success: false, error }); return; }
    const d = await gfetch('DELETE', `/users/${user.id}`);
    if (!d.ok && d.status !== 404) { res.status(400).json({ success: false, error: gerr(d) }); return; }
    const s = store();
    s.pending = s.pending.filter(p => p.id !== user.id);
    forgetLocally(user.id);
    log('SUPPRESSION', `${user.givenName} ${user.surname}`, `Compte ${user.upn} supprimé manuellement.`);
    ctx.persist();
    res.json({ success: true, message: `Compte ${user.upn} supprimé (récupérable 30 jours dans la corbeille Microsoft).` });
  }));

  // ───────── Ajouter un utilisateur à des équipes choisies (toutes classes confondues) ─────────
  app.get('/api/rentree/teams', wrap(async (_req, res) => {
    const teams = await fetchClassTeams();
    res.json({
      success: true,
      teams: teams.map(t => ({ id: t.id, name: t.name, classCode: t.classCode, subject: t.subject })).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    });
  }));

  app.post('/api/rentree/teams/add-member', wrap(async (req, res) => {
    const b = req.body || {};
    const userId = String(b.userId || '');
    const role = b.role === 'owner' ? 'owner' : 'member';
    const teamIds: string[] = Array.isArray(b.teamIds) ? [...new Set<string>(b.teamIds.map(String))] : [];
    if (!GUID_RE.test(userId)) { res.status(400).json({ success: false, error: 'Utilisateur Microsoft 365 invalide.' }); return; }
    if (!teamIds.length || teamIds.length > 700) { res.status(400).json({ success: false, error: 'Choisissez au moins une équipe.' }); return; }
    const u = await gfetch('GET', `/users/${userId}?$select=id,displayName,userPrincipalName,accountEnabled`);
    if (!u.ok) { res.status(u.status === 404 ? 404 : 400).json({ success: false, error: u.status === 404 ? 'Ce compte n\'existe pas dans Microsoft 365.' : gerr(u) }); return; }
    // seules les équipes de classe existantes peuvent être ciblées
    const valid = new Map((await fetchClassTeams()).map(t => [t.id, t]));
    const targets = teamIds.filter(id => valid.has(id));
    if (!targets.length) { res.status(400).json({ success: false, error: 'Aucune des équipes choisies n\'existe.' }); return; }

    const ref = { '@odata.id': `${GRAPH}/directoryObjects/${userId}` };
    const reqs: { id: string; method: string; url: string; body?: unknown }[] = [];
    for (const tid of targets) {
      reqs.push({ id: `m-${tid}`, method: 'POST', url: `/groups/${tid}/members/$ref`, body: ref });
      if (role === 'owner') reqs.push({ id: `o-${tid}`, method: 'POST', url: `/groups/${tid}/owners/$ref`, body: ref });
    }
    const out = await batch(reqs);
    let added = 0, already = 0;
    const errors: string[] = [];
    for (const [id, r] of out) {
      const text = JSON.stringify(r.body || {});
      if (r.status < 300) added++;
      else if (/already exist|One or more added object references already exist/i.test(text)) already++;
      else if (errors.length < 15) errors.push(`${valid.get(id.slice(2))?.name || id.slice(2)} : ${r.body?.error?.message || `HTTP ${r.status}`}`);
    }
    log('MODIFICATION', u.data.displayName || userId, `Ajouté comme ${role === 'owner' ? 'propriétaire' : 'membre'} à ${targets.length} équipe(s) choisie(s) (${added} ajout(s), ${already} déjà présent(s)).`, errors.length ? 'Erreur' : 'Réussi');
    ctx.persist();
    res.json({
      success: errors.length === 0,
      user: u.data.displayName,
      teams: targets.length, added, already, errors,
      message: `${u.data.displayName} : ${added} ajout(s) dans ${targets.length} équipe(s)` + (already ? `, ${already} déjà présent(s)` : '') + (errors.length ? `, ${errors.length} erreur(s)` : '') + '.',
    });
  }));

  // ───────── Retirer un utilisateur de plusieurs équipes (ou de toutes) ─────────
  async function userClassTeams(userId: string) {
    const groups = await fetchAll(`/users/${userId}/memberOf/microsoft.graph.group?$select=id,displayName&$top=999`);
    const owned = await fetchAll(`/users/${userId}/ownedObjects/microsoft.graph.group?$select=id&$top=999`).catch(() => [] as any[]);
    const ownedSet = new Set(owned.map((g: any) => g.id));
    return groups
      .map((g: any) => ({ g, t: teamClassCode(g.displayName || '') }))
      .filter(x => x.t)
      .map(x => ({ id: x.g.id as string, name: x.g.displayName as string, classCode: x.t!.classCode, subject: x.t!.subject, owner: ownedSet.has(x.g.id) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  app.get('/api/rentree/user/:id/teams', wrap(async (req, res) => {
    const id = String(req.params.id);
    if (!GUID_RE.test(id)) { res.status(400).json({ success: false, error: 'Utilisateur Microsoft 365 invalide.' }); return; }
    res.json({ success: true, teams: await userClassTeams(id) });
  }));

  app.post('/api/rentree/teams/remove-member', wrap(async (req, res) => {
    const b = req.body || {};
    const userId = String(b.userId || '');
    if (!GUID_RE.test(userId)) { res.status(400).json({ success: false, error: 'Utilisateur Microsoft 365 invalide.' }); return; }
    const u = await gfetch('GET', `/users/${userId}?$select=id,displayName,userPrincipalName`);
    if (!u.ok) { res.status(u.status === 404 ? 404 : 400).json({ success: false, error: u.status === 404 ? 'Ce compte n\'existe pas dans Microsoft 365.' : gerr(u) }); return; }
    const mine = new Map((await userClassTeams(userId)).map(t => [t.id, t]));
    const wanted: string[] = b.all === true ? [...mine.keys()] : (Array.isArray(b.teamIds) ? [...new Set<string>(b.teamIds.map(String))] : []);
    const targets = wanted.filter(id => mine.has(id));
    if (!targets.length) { res.status(400).json({ success: false, error: 'Aucune équipe à retirer.' }); return; }
    if (targets.length > 3 && b.confirm !== 'RETIRER') { res.status(400).json({ success: false, error: 'Confirmation manquante : tapez RETIRER.' }); return; }

    const reqs: { id: string; method: string; url: string }[] = [];
    for (const tid of targets) {
      if (mine.get(tid)!.owner) reqs.push({ id: `o-${tid}`, method: 'DELETE', url: `/groups/${tid}/owners/${userId}/$ref` });
      reqs.push({ id: `m-${tid}`, method: 'DELETE', url: `/groups/${tid}/members/${userId}/$ref` });
    }
    const out = await batch(reqs);
    let removed = 0;
    const errors: string[] = [];
    for (const [id, r] of out) {
      if (r.status < 300 || r.status === 404 || /does not exist|not a member|not an owner|references? .*not/i.test(JSON.stringify(r.body || {}))) { if (id.startsWith('m-')) removed++; }
      else if (errors.length < 15) errors.push(`${mine.get(id.slice(2))?.name || id.slice(2)} : ${r.body?.error?.message || `HTTP ${r.status}`}`);
    }
    log('MODIFICATION', u.data.displayName || userId, `Retiré de ${removed} équipe(s) sur ${targets.length} (compte conservé).`, errors.length ? 'Erreur' : 'Réussi');
    ctx.persist();
    res.json({
      success: errors.length === 0, user: u.data.displayName, teams: targets.length, removed, errors,
      message: `${u.data.displayName} : retiré de ${removed} équipe(s) sur ${targets.length}` + (errors.length ? `, ${errors.length} erreur(s)` : '') + ' (le compte est conservé).',
    });
  }));

  // Purge automatique : au démarrage puis toutes les 6 h
  const schedule = () => runPurge().then(r => { if (r.deleted || r.errors.length) console.log(`[Rentrée] purge : ${r.deleted} supprimé(s), ${r.errors.length} erreur(s)`); }).catch(e => console.warn('[Rentrée] purge impossible :', e.message));
  setTimeout(schedule, 60_000);
  setInterval(schedule, 6 * 3600_000);
}
