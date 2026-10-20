/**
 * Import annuel du PDF « Équipe pédagogique » (UnDeuxTEMPS) :
 *  - aperçu en lecture seule : professeurs trouvés / à créer, matières reconnues, équipes concernées ;
 *  - application : création des professeurs manquants (licence, mot de passe aléatoire)
 *    puis ajout de chaque professeur comme propriétaire des équipes « classe-matière » où il enseigne.
 * Les propriétaires déjà en place ne sont jamais retirés.
 */
import type { Express, Request, Response } from 'express';
import {
  entraKind, generateUpn, norm, randomPassword, slug, type EntraUser,
} from './rentreeLogic.ts';
import {
  DEFAULT_LABEL_SUBJECTS, extractPdfItems, labelKey, parsePedagogyItems, type PersonName,
} from './pedagogy.ts';

export interface TeamRef { id: string; name: string; classCode: string; subject: string }

export interface JobHelpers {
  say: (m: string) => void;
  count: (k: string, n?: number) => void;
  fail: (what: string, who: string, msg: string) => void;
  phase: (name: string, total: number) => void;
  tick: () => void;
}

export interface PedagogyDeps {
  GRAPH: string;
  wrap: (fn: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response) => Promise<void>;
  gfetch: (method: string, url: string, body?: unknown) => Promise<{ status: number; ok: boolean; data: any }>;
  gerr: (r: { status: number; ok: boolean; data: any }) => string;
  fetchAll: (pathWithQuery: string) => Promise<any[]>;
  batch: (reqs: { id: string; method: string; url: string; body?: unknown }[]) => Promise<Map<string, { status: number; body: any }>>;
  pool: <T>(items: T[], n: number, fn: (x: T, i: number) => Promise<void>) => Promise<void>;
  fetchEntraUsers: () => Promise<EntraUser[]>;
  fetchClassTeams: () => Promise<TeamRef[]>;
  fetchSkus: () => Promise<{ skuId: string; partNumber: string }[]>;
  detectDomain: () => Promise<string>;
  isBusy: () => boolean;
  startJob: (run: (h: JobHelpers, job: any) => Promise<void>) => any;
  writeCredentials: (job: any, header: string, rows: string[][], prefix: string) => void;
  store: () => any;
  getDb: () => any;
  persist: () => void;
  log: (action: string, target: string, details: string, status?: 'Réussi' | 'Erreur') => void;
}

interface TeacherEntry {
  person: PersonName;
  status: 'existing' | 'create' | 'ambiguous' | 'conflict';
  userId?: string;
  upn: string;
  labels: string[];
  teams: number;
}

export function registerPedagogyRoutes(app: Express, d: PedagogyDeps) {
  interface Input { pdfBase64?: string; subjectMap?: Record<string, string>; createMissing?: boolean }

  async function computePlan(input: Input) {
    if (!input.pdfBase64 || typeof input.pdfBase64 !== 'string') throw new Error('Aucun PDF reçu.');
    const bytes = new Uint8Array(Buffer.from(input.pdfBase64, 'base64'));
    if (bytes.length < 100 || String.fromCharCode(...bytes.slice(0, 4)) !== '%PDF') throw new Error('Ce fichier n\'est pas un PDF valide.');
    const parsed = parsePedagogyItems(await extractPdfItems(bytes));
    if (!parsed.assignments.length) throw new Error('Aucune affectation trouvée : est-ce bien l\'export « Équipe pédagogique » d\'UnDeuxTEMPS ?');

    const [entra, teams] = await Promise.all([d.fetchEntraUsers(), d.fetchClassTeams()]);
    const saved: Record<string, string> = d.store().subjectMap || {};
    const subjectMap: Record<string, string> = { ...saved, ...(input.subjectMap || {}) };

    const byTeam = new Map<string, TeamRef[]>();
    for (const t of teams) {
      const k = `${t.classCode}|${norm(t.subject)}`;
      byTeam.set(k, [...(byTeam.get(k) || []), t]);
    }
    const liveSubjects = [...new Set(teams.map(t => t.subject))].sort((a, b) => a.localeCompare(b, 'fr'));
    const liveNorm = new Map(liveSubjects.map(s => [norm(s), s]));

    // matière(s) candidates pour un libellé du PDF
    const candidatesFor = (label: string): string[] => {
      const k = labelKey(label);
      if (k in subjectMap) return subjectMap[k] ? [subjectMap[k]] : [];
      if (DEFAULT_LABEL_SUBJECTS[k]) return DEFAULT_LABEL_SUBJECTS[k];
      const live = liveNorm.get(norm(label));
      return live ? [live] : [];
    };

    // 1) affectations → équipes
    const resolved = new Map<string, { team: TeamRef; person: PersonName; label: string }>();
    const unmatched = new Map<string, { classCode: string; label: string; reason: string; persons: Set<string> }>();
    for (const a of parsed.assignments) {
      const cands = candidatesFor(a.label);
      let team: TeamRef | undefined;
      for (const c of cands) { team = byTeam.get(`${a.classCode}|${norm(c)}`)?.[0]; if (team) break; }
      if (team) { resolved.set(`${team.id}|${a.person.key}`, { team, person: a.person, label: a.label }); continue; }
      const k = `${a.classCode}|${labelKey(a.label)}`;
      const u = unmatched.get(k) || { classCode: a.classCode, label: a.label, reason: cands.length ? 'équipe introuvable' : 'matière non reconnue', persons: new Set<string>() };
      u.persons.add(a.person.raw);
      unmatched.set(k, u);
    }

    // 2) professeurs → comptes Microsoft 365
    const entraKey = (u: EntraUser) => norm(`${u.givenName} ${u.surname}`).replace(/['’`]/g, '').split(/[^a-z0-9]+/).filter(Boolean).sort().join('-');
    const byKey = new Map<string, EntraUser[]>();
    for (const u of entra) { const k = entraKey(u); if (k) byKey.set(k, [...(byKey.get(k) || []), u]); }
    const domain = await d.detectDomain();
    const taken = new Set(entra.map(u => u.upn.toLowerCase()));

    const persons = new Map<string, PersonName>();
    parsed.assignments.forEach(a => persons.set(a.person.key, a.person));
    const teachers = new Map<string, TeacherEntry>();
    for (const [key, person] of persons) {
      const cands = byKey.get(key) || [];
      const staff = cands.filter(u => entraKind(u) === 'other');
      const labels = [...new Set(parsed.assignments.filter(a => a.person.key === key).map(a => a.label))];
      const teamCount = [...resolved.values()].filter(r => r.person.key === key).length;
      if (staff.length === 1) teachers.set(key, { person, status: 'existing', userId: staff[0].id, upn: staff[0].upn, labels, teams: teamCount });
      else if (staff.length > 1) teachers.set(key, { person, status: 'ambiguous', upn: staff.map(s => s.upn).join(' / '), labels, teams: teamCount });
      else if (cands.length) teachers.set(key, { person, status: 'conflict', upn: cands.map(s => s.upn).join(' / '), labels, teams: teamCount });
      else {
        // L'identifiant habituel existe déjà (nom enregistré autrement) : c'est le même compte, on ne crée pas de doublon.
        const base = `${slug(person.prenom)}.${slug(person.nom)}@${domain}`.toLowerCase();
        const same = entra.find(u => u.upn.toLowerCase() === base);
        if (same) teachers.set(key, { person, status: entraKind(same) === 'other' ? 'existing' : 'conflict', userId: same.id, upn: same.upn, labels, teams: teamCount });
        else teachers.set(key, { person, status: 'create', upn: generateUpn(person.prenom, person.nom, domain, taken), labels, teams: teamCount });
      }
    }

    const labelStats = new Map<string, { label: string; count: number; subjects: string[]; teamsFound: number }>();
    for (const a of parsed.assignments) {
      const k = labelKey(a.label);
      const s = labelStats.get(k) || { label: a.label, count: 0, subjects: candidatesFor(a.label), teamsFound: 0 };
      s.count++;
      labelStats.set(k, s);
    }
    for (const r of resolved.values()) { const s = labelStats.get(labelKey(r.label)); if (s) s.teamsFound++; }

    // professeur principal : le nom en gras du bloc ; à défaut (ou si plusieurs), le professeur de « Vie de classe »
    const principals = parsed.principals.map(c => {
      let chosen = c.principals.length === 1 ? c.principals[0] : undefined;
      let source = 'gras';
      if (!chosen && c.principals.length > 1) chosen = c.principals.find(x => c.vieDeClasse.some(v => v.key === x.key));
      if (!chosen && c.vieDeClasse.length === 1) { chosen = c.vieDeClasse[0]; source = 'vie de classe'; }
      const t = chosen ? teachers.get(chosen.key) : undefined;
      // nom d'affichage : celui du compte Microsoft 365 s'il existe (accents corrects), sinon celui du PDF
      const acc = t?.userId ? entra.find(u => u.id === t.userId) : undefined;
      const civ = chosen ? (chosen.civilite === 'M' ? 'M.' : chosen.civilite) : '';
      const sameName = (a: string, b: string) => norm(a).replace(/[^a-z0-9]/g, '') === norm(b).replace(/[^a-z0-9]/g, '');
      const cap = (v: string) => v.toLowerCase().replace(/(^|[\s'’-])([a-zà-ÿ])/g, (_m, sep, ch) => sep + ch.toUpperCase());
      // on garde l'écriture du compte Microsoft 365 (accents) seulement si elle ne diffère du PDF que par les accents / la casse
      const useAcc = !!chosen && !!acc && sameName(acc.givenName, chosen.prenom) && sameName(acc.surname, chosen.nom);
      const display = chosen ? (useAcc ? `${civ} ${acc!.surname.toUpperCase()} ${cap(acc!.givenName)}` : `${civ} ${chosen.nom} ${chosen.prenom}`) : '';
      return {
        display,
        classCode: c.classCode, person: chosen || null, source: chosen ? source : '',
        status: t?.status || '', consistent: !!chosen && c.vieDeClasse.some(v => v.key === chosen!.key),
      };
    });

    return { parsed, resolved, unmatched, teachers, liveSubjects, labelStats, subjectMap, domain, principals };
  }

  const summarize = (p: Awaited<ReturnType<typeof computePlan>>) => {
    const ts = [...p.teachers.values()];
    const applicable = [...p.resolved.values()].filter(r => { const t = p.teachers.get(r.person.key); return t && (t.status === 'existing' || t.status === 'create'); });
    return {
      classes: p.parsed.classes.length,
      assignments: p.parsed.assignments.length,
      teachers: ts.length,
      existing: ts.filter(t => t.status === 'existing').length,
      create: ts.filter(t => t.status === 'create').length,
      ambiguous: ts.filter(t => t.status === 'ambiguous').length,
      conflict: ts.filter(t => t.status === 'conflict').length,
      teamLinks: applicable.length,
      unmatched: p.unmatched.size,
      principals: p.principals.filter(x => x.person).length,
    };
  };

  app.post('/api/rentree/pedagogy/preview', d.wrap(async (req, res) => {
    const p = await computePlan(req.body || {});
    res.json({
      success: true,
      summary: summarize(p),
      skipped: p.parsed.skipped,
      subjects: p.liveSubjects,
      labels: [...p.labelStats.entries()].map(([key, s]) => ({ key, ...s })).sort((a, b) => Number(a.subjects.length > 0) - Number(b.subjects.length > 0) || b.count - a.count),
      teachers: [...p.teachers.values()].map(t => ({
        nom: t.person.nom, prenom: t.person.prenom, raw: t.person.raw, status: t.status, upn: t.upn, labels: t.labels, teams: t.teams, uncertain: t.person.uncertain,
      })).sort((a, b) => a.status.localeCompare(b.status) || a.nom.localeCompare(b.nom, 'fr')),
      principals: p.principals.map(x => ({
        classCode: x.classCode,
        name: x.display,
        status: x.status, source: x.source, consistent: x.consistent,
      })),
      unmatched: [...p.unmatched.values()].map(u => ({ classCode: u.classCode, label: u.label, reason: u.reason, persons: [...u.persons] }))
        .sort((a, b) => a.label.localeCompare(b.label) || a.classCode.localeCompare(b.classCode)),
    });
  }));

  /** Met à jour uniquement le professeur principal de chaque classe (page « Classes »), sans toucher aux comptes ni aux équipes. */
  app.post('/api/rentree/pedagogy/principals', d.wrap(async (req, res) => {
    const plan = await computePlan(req.body || {});
    const db = d.getDb();
    const changes: { classCode: string; before: string; after: string }[] = [];
    const missing: string[] = [];
    for (const x of plan.principals) {
      const cls = (db.classes || []).find((k: any) => k.code === x.classCode);
      if (!cls) { missing.push(`${x.classCode} (classe absente de l'application)`); continue; }
      if (!x.person) { missing.push(`${x.classCode} (aucun nom en gras trouvé)`); continue; }
      if (cls.mainTeacher !== x.display) changes.push({ classCode: x.classCode, before: cls.mainTeacher || '', after: x.display });
      cls.mainTeacher = x.display;
    }
    d.log('MODIFICATION', 'Classes', `Professeurs principaux mis à jour depuis le PDF : ${changes.length} modifié(s) sur ${plan.principals.length} classe(s).`);
    d.persist();
    res.json({
      success: true, total: plan.principals.length, updated: changes.length, unchanged: plan.principals.length - changes.length - missing.length,
      missing, changes,
      message: `${changes.length} professeur(s) principal(aux) mis à jour sur ${plan.principals.length} classe(s)` + (missing.length ? `, ${missing.length} non trouvé(s)` : '') + '.',
    });
  }));

  app.post('/api/rentree/pedagogy/apply', d.wrap(async (req, res) => {
    const b = req.body || {};
    if (b.confirm !== 'EQUIPE') { res.status(400).json({ success: false, error: 'Confirmation manquante : tapez EQUIPE.' }); return; }
    if (d.isBusy()) { res.status(409).json({ success: false, error: 'Une autre opération est déjà en cours.' }); return; }
    const plan = await computePlan(b);
    const sum = summarize(plan);
    const exp = b.expected || {};
    for (const k of ['create', 'teamLinks'] as const) {
      if (exp[k] !== sum[k]) { res.status(409).json({ success: false, error: `Les données ont changé depuis l'aperçu (${k} : ${exp[k]} → ${sum[k]}). Relancez l'analyse.` }); return; }
    }
    const createMissing = b.createMissing !== false;
    const addOwners = b.addOwners !== false;
    const setPrincipals = b.setPrincipals !== false;
    const skuId = String(b.skuId || '');
    if (createMissing && sum.create && !skuId) { res.status(400).json({ success: false, error: 'Choisissez la licence des nouveaux professeurs.' }); return; }

    // mémorise la correspondance libellé → matière pour l'année suivante
    const store = d.store();
    store.subjectMap = { ...(store.subjectMap || {}), ...plan.subjectMap };
    d.persist();

    const job = d.startJob(async (h, jobRef) => {
      const userIds = new Map<string, string>(); // clé professeur → id Microsoft
      for (const [k, t] of plan.teachers) if (t.status === 'existing' && t.userId) userIds.set(k, t.userId);

      // 1. création des professeurs manquants
      const toCreate = [...plan.teachers.entries()].filter(([, t]) => t.status === 'create');
      if (createMissing && toCreate.length) {
        h.phase('Création des professeurs manquants', toCreate.length);
        const created: string[][] = [];
        await d.pool(toCreate, 4, async ([key, t]) => {
          const password = randomPassword();
          const subjects = t.labels.join(', ');
          const r = await d.gfetch('POST', '/users', {
            accountEnabled: true,
            displayName: `${t.person.prenom} ${t.person.nom}`,
            givenName: t.person.prenom,
            surname: t.person.nom,
            userPrincipalName: t.upn,
            mailNickname: t.upn.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') || 'professeur',
            usageLocation: 'FR',
            officeLocation: 'profs',
            department: `Professeurs / ${subjects}`.slice(0, 64),
            jobTitle: 'profs',
            passwordProfile: { forceChangePasswordNextSignIn: true, password },
          });
          if (!r.ok) h.fail('Création', t.upn, d.gerr(r));
          else {
            const id = r.data.id as string;
            userIds.set(key, id);
            const l = await d.gfetch('POST', `/users/${id}/assignLicense`, { addLicenses: [{ skuId }], removeLicenses: [] });
            if (!l.ok) h.fail('Licence', t.upn, d.gerr(l));
            created.push([t.person.nom, t.person.prenom, t.upn, password]);
            h.count('professeurs créés');
          }
          h.tick();
        });
        if (created.length) d.writeCredentials(jobRef, 'Nom;Prénom;Identifiant;Mot de passe temporaire', created, 'nouveaux-professeurs');
      }

      // 2. propriétaires des équipes
      if (addOwners) {
        const perTeam = new Map<string, { team: TeamRef; ids: Set<string> }>();
        for (const r of plan.resolved.values()) {
          const uid = userIds.get(r.person.key);
          if (!uid) continue;
          const e = perTeam.get(r.team.id) || { team: r.team, ids: new Set<string>() };
          e.ids.add(uid);
          perTeam.set(r.team.id, e);
        }
        const list = [...perTeam.values()];
        h.phase('Ajout des professeurs aux équipes', list.length);
        const db = d.getDb();
        await d.pool(list, 4, async ({ team, ids }) => {
          try {
            const [mem, own] = await Promise.all([
              d.fetchAll(`/groups/${team.id}/members?$select=id&$top=999`),
              d.fetchAll(`/groups/${team.id}/owners?$select=id&$top=999`),
            ]);
            const memSet = new Set(mem.map((x: any) => x.id));
            const ownSet = new Set(own.map((x: any) => x.id));
            const addMem = [...ids].filter(id => !memSet.has(id));
            const addOwn = [...ids].filter(id => !ownSet.has(id));
            const reqs: { id: string; method: string; url: string; body?: unknown }[] = [];
            addMem.forEach(id => reqs.push({ id: `m-${id}`, method: 'POST', url: `/groups/${team.id}/members/$ref`, body: { '@odata.id': `${d.GRAPH}/directoryObjects/${id}` } }));
            addOwn.forEach(id => reqs.push({ id: `o-${id}`, method: 'POST', url: `/groups/${team.id}/owners/$ref`, body: { '@odata.id': `${d.GRAPH}/directoryObjects/${id}` } }));
            const res2 = await d.batch(reqs);
            for (const [id, r] of res2) {
              const okay = r.status < 300 || /already exist/i.test(JSON.stringify(r.body || {}));
              if (!okay) h.fail(id.startsWith('o-') ? 'Propriétaire' : 'Membre', team.name, r.body?.error?.message || `HTTP ${r.status}`);
              else if (id.startsWith('o-')) h.count('propriétaires ajoutés');
              else h.count('membres ajoutés');
            }
            // reflet local (page « Équipes Teams »)
            const local = (db.teams || []).find((t: any) => t.m365TeamId === team.id || t.name === team.name);
            if (local) {
              const mapped = [...ids].map(uid => ({ uid, entry: [...plan.teachers.values()].find(t => userIds.get(t.person.key) === uid) })).filter(x => x.entry);
              local.assignedTeacherIds = [...new Set([...(local.assignedTeacherIds || []), ...mapped.map(m => 'u-m365-' + m.uid)])];
              const known = new Set((local.assignedTeachers || []).map((a: any) => a.id));
              local.assignedTeachers = [...(local.assignedTeachers || []), ...mapped.filter(m => !known.has('u-m365-' + m.uid)).map(m => ({ id: 'u-m365-' + m.uid, name: `${m.entry!.person.prenom} ${m.entry!.person.nom}`, email: m.entry!.upn }))];
              local.teacherCount = local.assignedTeacherIds.length;
            }
          } catch (e: any) { h.fail('Équipe', team.name, e.message); }
          h.tick();
        });
      }

      // 3. professeur principal de chaque classe (page « Classes »)
      if (setPrincipals) {
        const db = d.getDb();
        h.phase('Professeurs principaux', plan.principals.length);
        for (const x of plan.principals) {
          const cls = (db.classes || []).find((k: any) => k.code === x.classCode);
          if (cls && x.person) {
            cls.mainTeacher = x.display;
            h.count('professeurs principaux');
          }
          h.tick();
        }
        d.persist();
      }

      const c = jobRef.counters as Record<string, number>;
      const summary = Object.entries(c).map(([k, v]) => `${v} ${k}`).join(', ') || 'aucune modification';
      d.log('SYNCHRONISATION', 'Équipe pédagogique', `Import du PDF : ${summary}.`, c['erreurs'] ? 'Erreur' : 'Réussi');
      d.persist();
      h.say(`Terminé : ${summary}.`);
    });
    res.json({ success: true, jobId: job.id });
  }));
}
