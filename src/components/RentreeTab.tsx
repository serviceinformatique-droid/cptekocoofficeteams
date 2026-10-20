/**
 * Rentrée scolaire (import CSV Charlemagne) + création d'élèves / professeurs.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Download, FileUp, GraduationCap, Loader2, Plus, RefreshCw,
  RotateCcw, ShieldCheck, Trash2, UserPlus, X, Copy,
} from 'lucide-react';
import type { ClassItem, SubjectItem } from '../types/index.ts';

interface Props {
  classes: ClassItem[];
  subjects: SubjectItem[];
  onDone: () => void | Promise<void>;
}

interface Sku { skuId: string; partNumber: string; total: number; used: number }
interface PlanItem { line?: number; nom: string; prenom: string; classCode: string; fromClass?: string; upn?: string; reason?: string; former?: boolean }
type ListKey = 'create' | 'move' | 'reactivate' | 'leave' | 'ambiguous' | 'invalid';

const jsonHeaders = { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' };
async function call(method: 'GET' | 'POST', url: string, body?: unknown) {
  const r = await fetch(url, { method, headers: jsonHeaders, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({ success: false, error: `Réponse invalide (${r.status})` }));
  if (!r.ok || data.success === false) throw Object.assign(new Error(data.error || `Erreur ${r.status}`), { data });
  return data;
}

/** Lit un fichier texte en UTF-8, ou en Windows-1252 si les accents sont invalides (exports Windows). */
async function readText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch { return new TextDecoder('windows-1252').decode(buf); }
}

const card = 'bg-white border border-slate-200 rounded-xl p-5';
const input = 'w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500';
const btn = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed';
const btnPrimary = `${btn} bg-blue-600 hover:bg-blue-700 text-white`;
const btnGhost = `${btn} bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300`;
const btnDanger = `${btn} bg-rose-600 hover:bg-rose-700 text-white`;

const FALLBACK_CODES = [
  ...[6, 5, 4, 3].flatMap(l => [1, 2, 3, 4, 5, 6].map(n => `${l}0${n}`)),
  ...[1, 2, 3, 4, 5].map(n => `20${n}`), ...[1, 2, 3, 4].map(n => `10${n}`), ...[1, 2, 3, 4].map(n => `T0${n}`),
];

/** Avancement d'une tâche de fond (rentrée, équipe pédagogique…). */
const JobPanel: React.FC<{ job: any; jobId: string }> = ({ job, jobId }) => {
  const running = job.status === 'running';
  return (
    <div className={card}>
      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
        {running ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : job.status === 'done' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
        {job.phase}
      </h2>
      <div className="mt-3 h-2 rounded bg-slate-100 overflow-hidden"><div className="h-full bg-blue-500 transition-all" style={{ width: `${job.total ? Math.round((job.done / job.total) * 100) : running ? 5 : 100}%` }} /></div>
      <p className="text-xs text-slate-500 mt-1">{job.done} / {job.total}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.entries(job.counters as Record<string, number>).map(([k, v]) => <span key={k} className="px-2.5 py-1 rounded-full bg-slate-100 text-xs text-slate-800">{v} {k}</span>)}
      </div>
      {job.error && <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">{job.error}</div>}
      {job.warnings.length > 0 && (
        <details className="mt-3"><summary className="text-xs text-amber-700 cursor-pointer">{job.warnings.length} avertissement(s) / erreur(s)</summary>
          <ul className="mt-2 text-[11px] text-slate-500 space-y-1 max-h-48 overflow-auto font-mono">{job.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul>
        </details>
      )}
      {job.status === 'done' && job.hasCredentials && (
        <a href={`/api/rentree/job/${jobId}/credentials.csv`} className={`${btnPrimary} mt-4`}><Download className="w-4 h-4" /> Télécharger les identifiants des nouveaux comptes</a>
      )}
    </div>
  );
};

export const RentreeTab: React.FC<Props> = ({ classes, subjects, onDone }) => {
  const [section, setSection] = useState<'rentree' | 'pedagogy' | 'user' | 'addteams' | 'pending' | 'teams'>('rentree');
  const [skus, setSkus] = useState<Sku[]>([]);
  const [defaults, setDefaults] = useState<{ student: string; teacher: string }>({ student: '', teacher: '' });
  const [optionsError, setOptionsError] = useState('');

  const classCodes = useMemo(() => {
    const c = classes.map(x => x.code).filter(Boolean);
    return (c.length ? c : FALLBACK_CODES).slice().sort();
  }, [classes]);

  useEffect(() => {
    call('GET', '/api/rentree/options')
      .then(d => { setSkus(d.skus); setDefaults(d.defaults); })
      .catch(e => setOptionsError(e.message));
  }, []);

  const tabs = [
    { id: 'rentree', label: 'Rentrée scolaire (CSV)', icon: GraduationCap },
    { id: 'pedagogy', label: 'Équipe pédagogique (PDF)', icon: FileUp },
    { id: 'user', label: 'Nouvel utilisateur', icon: UserPlus },
    { id: 'addteams', label: "Ajouter / retirer d'équipes", icon: Plus },
    { id: 'pending', label: 'Comptes sortants', icon: Trash2 },
    { id: 'teams', label: 'Visibilité des équipes', icon: ShieldCheck },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSection(t.id)}
            className={`${btn} ${section === t.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {optionsError && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> Licences indisponibles : {optionsError}
        </div>
      )}
      {section === 'rentree' && <RentreeSection skus={skus} defaultSku={defaults.student} classCodes={classCodes} onDone={onDone} />}
      {section === 'pedagogy' && <PedagogySection skus={skus} defaultSku={defaults.teacher} onDone={onDone} />}
      {section === 'user' && <UserSection skus={skus} defaults={defaults} classes={classes} classCodes={classCodes} subjects={subjects} onDone={onDone} />}
      {section === 'addteams' && <AddToTeamsSection />}
      {section === 'pending' && <PendingSection />}
      {section === 'teams' && <TeamsVisibilitySection />}
    </div>
  );
};

/* ───────────────────────── Rentrée ───────────────────────── */

const LIST_LABELS: Record<ListKey, string> = {
  create: 'Nouveaux élèves', move: 'Changements de classe', reactivate: 'Réactivés', leave: 'Sortants (désactivés)',
  ambiguous: 'Ambigus (ignorés)', invalid: 'Lignes invalides (ignorées)',
};

const RentreeSection: React.FC<{ skus: Sku[]; defaultSku: string; classCodes: string[]; onDone: Props['onDone'] }> = ({ skus, defaultSku, classCodes, onDone }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [classMap, setClassMap] = useState<Record<string, string>>({});
  const [includeFormer, setIncludeFormer] = useState(false);
  const [additionsOnly, setAdditionsOnly] = useState(false);
  const [hasHeader, setHasHeader] = useState<boolean | null>(null); // null = détection automatique
  const [opts, setOpts] = useState({ doCreate: true, doMoves: true, doLeavers: true, doTeams: true, months: 2 });
  const [skuId, setSkuId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [list, setList] = useState<ListKey>('move');
  const [confirm, setConfirm] = useState('');
  const [ignoreWarnings, setIgnoreWarnings] = useState(false);
  const [job, setJob] = useState<any>(null);
  const [jobId, setJobId] = useState('');

  useEffect(() => { if (!skuId && defaultSku) setSkuId(defaultSku); }, [defaultSku, skuId]);

  const analyze = useCallback(async (text: string, m: Record<string, number>, cm: Record<string, string>, former: boolean, adds: boolean, header: boolean | null) => {
    setBusy(true); setError(''); setPreview(null); setJob(null); setJobId(''); setConfirm('');
    try {
      const d = await call('POST', '/api/rentree/preview', { csvContent: text, mapping: m, classMap: cm, includeFormer: former, additionsOnly: adds, hasHeader: header });
      setPreview(d);
      const first = (['create', 'move', 'reactivate', 'leave', 'ambiguous', 'invalid'] as ListKey[]).find(k => d.plan[k].length);
      setList(prev => (d.plan[prev]?.length ? prev : first || 'move'));
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }, []);

  const onFile = async (f?: File | null) => {
    if (!f) return;
    const text = await readText(f);
    setCsv(text); setFileName(f.name); setMapping({}); setClassMap({}); setHasHeader(null);
    analyze(text, {}, {}, includeFormer, additionsOnly, null);
  };

  const reanalyze = (m = mapping, cm = classMap, former = includeFormer, adds = additionsOnly, header = hasHeader) => csv && analyze(csv, m, cm, former, adds, header);

  // Suivi de la tâche en cours
  useEffect(() => {
    if (!jobId) return;
    let stop = false;
    const tick = async () => {
      try {
        const d = await call('GET', `/api/rentree/job/${jobId}`);
        if (stop) return;
        setJob(d.job);
        if (d.job.status === 'running') setTimeout(tick, 1500);
        else await onDone();
      } catch (e: any) { if (!stop) { setError(e.message); } }
    };
    tick();
    return () => { stop = true; };
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = async () => {
    setBusy(true); setError('');
    try {
      const s = preview.summary;
      const d = await call('POST', '/api/rentree/apply', {
        csvContent: csv, mapping, classMap, includeFormer, additionsOnly, hasHeader, ...opts, skuId, deleteAfterMonths: opts.months,
        expected: { create: s.create, move: s.move, reactivate: s.reactivate, leave: s.leave },
        confirm, ignoreWarnings,
      });
      setJobId(d.jobId);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const s = preview?.summary;
  const unmapped = (preview?.meta.classLabels || []).filter((c: any) => !c.code);
  const running = job?.status === 'running';
  const blocking = !!preview && (preview.warnings.length || s.invalid || s.ambiguous);
  const needSku = !!preview && ((opts.doCreate && s.create) || s.reactivate) && !skuId;
  const canApply = !!preview && !busy && !running && confirm === 'RENTREE' && !needSku && (!blocking || ignoreWarnings) && !job;
  const headers: string[] = preview?.meta.headers || [];

  return (
    <div className="space-y-5">
      <div className={card}>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2"><FileUp className="w-5 h-5 text-blue-600" /> 1. Importer l'export Charlemagne (Aplim)</h2>
        <p className="text-xs text-slate-500 mt-1">
          Le fichier doit contenir tous les élèves de la nouvelle année avec leur nouvelle classe. L'analyse ne modifie rien : elle compare le fichier à l'annuaire Microsoft 365.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
          <button className={btnPrimary} onClick={() => fileRef.current?.click()} disabled={busy || running}><FileUp className="w-4 h-4" /> Choisir le fichier CSV</button>
          {fileName && <span className="text-xs text-slate-700 font-mono">{fileName}</span>}
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={additionsOnly} disabled={busy || running || !!job} onChange={e => { setAdditionsOnly(e.target.checked); reanalyze(mapping, classMap, includeFormer, e.target.checked); }} />
            Ce fichier ne contient que des nouveaux élèves (ne désactiver personne)
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={includeFormer && !additionsOnly} disabled={busy || running || additionsOnly} onChange={e => { setIncludeFormer(e.target.checked); reanalyze(mapping, classMap, e.target.checked); }} />
            Inclure aussi les anciens élèves déjà sortis dont le compte est encore actif {s ? `(${s.formerEnabled})` : ''}
          </label>
        </div>
        {busy && !job && <p className="mt-3 text-xs text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Analyse en cours…</p>}
        {error && <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {error}</div>}
      </div>

      {preview && (
        <>
          <div className={card}>
            <h2 className="text-base font-bold text-slate-900">2. Vérifier la correspondance</h2>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              {([['nom', 'Nom'], ['prenom', 'Prénom'], ['classe', 'Classe'], ['email', 'E-mail (facultatif)']] as const).map(([k, label]) => (
                <label key={k} className="text-xs text-slate-500 space-y-1 block">
                  {label}
                  <select className={input} value={preview.meta.mapping[k]} disabled={busy}
                    onChange={e => { const m = { ...mapping, [k]: Number(e.target.value) }; setMapping(m); reanalyze(m); }}>
                    <option value={-1}>— aucune —</option>
                    {headers.map((h, i) => <option key={i} value={i}>{h || `Colonne ${i + 1}`}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={preview.meta.hasHeader} disabled={busy} onChange={e => { setHasHeader(e.target.checked); setMapping({}); reanalyze({}, classMap, includeFormer, additionsOnly, e.target.checked); }} />
              Mon fichier contient une ligne d'en-têtes (Nom, Prénom, Classe…) {hasHeader === null && <span className="text-slate-500">— détecté automatiquement</span>}
            </label>
            <p className="text-[11px] text-slate-500 mt-2">{preview.meta.rows} lignes lues{preview.meta.duplicatesRemoved > 0 ? ` (${preview.meta.duplicatesRemoved} ligne(s) en double ignorée(s))` : ''} • {preview.meta.teamsFound} équipes de classe trouvées dans Teams</p>
            {unmapped.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-800 font-semibold mb-2">Classes non reconnues : associez-les à une classe NDM.</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {unmapped.map((c: any) => (
                    <label key={c.label} className="flex items-center gap-2 text-xs text-slate-700">
                      <span className="font-mono w-28 truncate" title={c.label}>« {c.label || 'vide'} »</span><span className="text-slate-500">×{c.count}</span>
                      <select className={input} value={classMap[c.label] || ''} onChange={e => { const cm = { ...classMap, [c.label]: e.target.value }; setClassMap(cm); reanalyze(mapping, cm); }}>
                        <option value="">— choisir —</option>
                        {classCodes.map(code => <option key={code} value={code}>{code}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={card}>
            <h2 className="text-base font-bold text-slate-900">3. Résultat de l'analyse</h2>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {([
                ['create', s.create, 'text-emerald-700'], ['move', s.move, 'text-blue-700'], ['reactivate', s.reactivate, 'text-sky-700'],
                ['leave', s.leave, 'text-rose-700'], ['ambiguous', s.ambiguous, 'text-amber-700'], ['invalid', s.invalid, 'text-amber-700'],
              ] as [ListKey, number, string][]).map(([k, n, color]) => (
                <button key={k} onClick={() => setList(k)} className={`text-left p-3 rounded-lg border transition ${list === k ? 'bg-slate-100 border-blue-500' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                  <div className={`text-2xl font-bold ${color}`}>{n}</div>
                  <div className="text-[11px] text-slate-500 leading-tight">{LIST_LABELS[k]}</div>
                </button>
              ))}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-2xl font-bold text-slate-700">{s.unchanged}</div>
                <div className="text-[11px] text-slate-500 leading-tight">Inchangés</div>
              </div>
            </div>
            {preview.partial && (
              <div className="mt-3 p-3 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-xs flex flex-wrap items-center gap-3">
                <span>Ce fichier est très court par rapport au nombre d'élèves actuels : s'il ne contient que des nouveaux élèves, activez le mode « ajout seulement » pour qu'aucun autre élève ne soit désactivé.</span>
                <button className={btnGhost} onClick={() => { setAdditionsOnly(true); reanalyze(mapping, classMap, includeFormer, true); }}>Mode ajout seulement</button>
              </div>
            )}
            {preview.warnings.map((w: string) => (
              <div key={w} className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {w}</div>
            ))}
            <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-700 sticky top-0">
                  <tr><th className="text-left p-2">Nom</th><th className="text-left p-2">Prénom</th><th className="text-left p-2">Classe</th><th className="text-left p-2">Détail</th></tr>
                </thead>
                <tbody>
                  {(preview.plan[list] as PlanItem[]).map((it, i) => (
                    <tr key={i} className="border-t border-slate-200 text-slate-800">
                      <td className="p-2">{it.nom}</td><td className="p-2">{it.prenom}</td>
                      <td className="p-2 font-mono">{list === 'move' ? `${it.fromClass || '?'} → ${it.classCode}` : list === 'leave' ? (it.fromClass || '—') : it.classCode}</td>
                      <td className="p-2 text-slate-500">{it.reason || it.upn || (it.line ? `ligne ${it.line}` : '')}</td>
                    </tr>
                  ))}
                  {!preview.plan[list].length && <tr><td colSpan={4} className="p-4 text-center text-slate-500">Rien dans cette catégorie.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className={card}>
            <h2 className="text-base font-bold text-slate-900">4. Appliquer</h2>
            <div className="mt-3 grid md:grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-700">
              {([['doMoves', `Changer la classe des élèves (${s.move})`], ['doCreate', `Créer les nouveaux comptes avec licence (${s.create})`], ['doLeavers', `Désactiver les sortants (${s.leave})`], ['doTeams', 'Mettre à jour les équipes Teams (retrait ancienne classe, ajout nouvelle)']] as const).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={(opts as any)[k]} disabled={running || !!job} onChange={e => setOpts({ ...opts, [k]: e.target.checked })} /> {label}</label>
              ))}
              <label className="flex items-center gap-2">Supprimer définitivement les sortants après
                <input type="number" min={1} max={12} className={`${input} !w-16`} value={opts.months} disabled={running || !!job} onChange={e => setOpts({ ...opts, months: Number(e.target.value) || 2 })} /> mois
              </label>
              <label className="flex items-center gap-2">Licence des nouveaux élèves
                <select className={input} value={skuId} onChange={e => setSkuId(e.target.value)} disabled={running || !!job}>
                  <option value="">— choisir —</option>
                  {skus.map(k => <option key={k.skuId} value={k.skuId}>{k.partNumber} ({k.total - k.used} libres)</option>)}
                </select>
              </label>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">
              Les sortants sont désactivés (connexion impossible, sessions fermées) et leur licence est conservée jusqu'à la suppression. Ils peuvent être restaurés dans l'onglet « Comptes sortants ». Les professeurs et administrateurs ne sont jamais modifiés.
            </p>
            {blocking && (
              <label className="mt-3 flex items-center gap-2 text-xs text-amber-800"><input type="checkbox" checked={ignoreWarnings} onChange={e => setIgnoreWarnings(e.target.checked)} /> Ignorer les avertissements (les lignes ambiguës ou invalides ne seront pas traitées)</label>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input className={`${input} !w-56`} placeholder="Tapez RENTREE pour confirmer" value={confirm} onChange={e => setConfirm(e.target.value)} disabled={running || !!job} />
              <button className={btnDanger} disabled={!canApply} onClick={apply}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Lancer la rentrée</button>
              {needSku && <span className="text-xs text-amber-700">Choisissez une licence.</span>}
            </div>
          </div>
        </>
      )}

      {job && <JobPanel job={job} jobId={jobId} />}
    </div>
  );
};

/* ───────────────────────── Nouvel utilisateur ───────────────────────── */

interface Assignment { classCode: string; subject: string }

const UserSection: React.FC<{ skus: Sku[]; defaults: { student: string; teacher: string }; classes: ClassItem[]; classCodes: string[]; subjects: SubjectItem[]; onDone: Props['onDone'] }> = ({ skus, defaults, classes, classCodes, subjects, onDone }) => {
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [passwordMode, setPasswordMode] = useState<'random' | 'manual'>('random');
  const [password, setPassword] = useState('');
  const [forceChange, setForceChange] = useState(true);
  const [skuId, setSkuId] = useState('');
  const [classCode, setClassCode] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([{ classCode: '', subject: '' }]);
  const [addToTeams, setAddToTeams] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setSkuId(role === 'teacher' ? defaults.teacher : defaults.student); }, [role, defaults]);

  const levelOf = (code: string) => classes.find(c => c.code === code)?.level;
  const subjectsFor = (code: string) => {
    const lv = levelOf(code);
    return subjects.filter(s => s.active !== false && (!lv || s.levels.includes(lv))).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  };
  const subjectByShort = (short: string) => subjects.find(s => s.shortName === short);

  const submit = async () => {
    setBusy(true); setError(''); setResult(null); setCopied(false);
    try {
      const body: any = { role, nom, prenom, email, passwordMode, password, forceChange, skuId, addToTeams };
      if (role === 'student') body.classCode = classCode;
      else body.assignments = assignments.filter(a => a.classCode && a.subject).map(a => {
        const s = subjectByShort(a.subject);
        return { classCode: a.classCode, subject: a.subject, aliases: s ? [s.name, s.code] : [] };
      });
      const d = await call('POST', '/api/rentree/user', body);
      setResult(d);
      setNom(''); setPrenom(''); setEmail(''); setPassword('');
      await onDone();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(`${result.upn}\t${result.password}`); setCopied(true); } catch { /* presse-papiers indisponible */ }
  };

  const valid = nom.trim() && prenom.trim() && skuId && (passwordMode === 'random' || password) &&
    (role === 'student' ? classCode : assignments.some(a => a.classCode && a.subject));

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className={`${card} space-y-4`}>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2"><UserPlus className="w-5 h-5 text-blue-600" /> Nouvel utilisateur</h2>
        <div className="flex gap-2">
          {(['student', 'teacher'] as const).map(r => (
            <button key={r} onClick={() => setRole(r)} className={`${btn} flex-1 justify-center ${role === r ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-300'}`}>
              {r === 'student' ? 'Élève' : 'Professeur'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-500 space-y-1 block">Nom<input className={input} value={nom} onChange={e => setNom(e.target.value)} /></label>
          <label className="text-xs text-slate-500 space-y-1 block">Prénom<input className={input} value={prenom} onChange={e => setPrenom(e.target.value)} /></label>
        </div>
        <label className="text-xs text-slate-500 space-y-1 block">Identifiant / e-mail (laisser vide = prenom.nom automatique)
          <input className={input} placeholder="prenom.nom@notredamedesmissions.com" value={email} onChange={e => setEmail(e.target.value)} />
        </label>

        <div className="space-y-2">
          <div className="text-xs text-slate-500">Mot de passe</div>
          <div className="flex gap-4 text-xs text-slate-800">
            <label className="flex items-center gap-2"><input type="radio" checked={passwordMode === 'random'} onChange={() => setPasswordMode('random')} /> Aléatoire</label>
            <label className="flex items-center gap-2"><input type="radio" checked={passwordMode === 'manual'} onChange={() => setPasswordMode('manual')} /> Je le choisis</label>
          </div>
          {passwordMode === 'manual' && <input className={input} type="text" placeholder="8 caractères min., 3 types (Aa1!)" value={password} onChange={e => setPassword(e.target.value)} />}
          <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={forceChange} onChange={e => setForceChange(e.target.checked)} /> Obliger à changer le mot de passe à la première connexion</label>
        </div>

        <label className="text-xs text-slate-500 space-y-1 block">Licence
          <select className={input} value={skuId} onChange={e => setSkuId(e.target.value)}>
            <option value="">— choisir —</option>
            {skus.map(k => <option key={k.skuId} value={k.skuId}>{k.partNumber} ({k.total - k.used} libres)</option>)}
          </select>
        </label>

        {role === 'student' ? (
          <label className="text-xs text-slate-500 space-y-1 block">Classe
            <select className={input} value={classCode} onChange={e => setClassCode(e.target.value)}>
              <option value="">— choisir —</option>
              {classCodes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-slate-500">Classes et disciplines enseignées</div>
            {assignments.map((a, i) => (
              <div key={i} className="flex gap-2">
                <select className={`${input} !w-28`} value={a.classCode} onChange={e => setAssignments(assignments.map((x, j) => j === i ? { classCode: e.target.value, subject: '' } : x))}>
                  <option value="">Classe</option>
                  {classCodes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className={input} value={a.subject} onChange={e => setAssignments(assignments.map((x, j) => j === i ? { ...x, subject: e.target.value } : x))}>
                  <option value="">Discipline</option>
                  {subjectsFor(a.classCode).map(s => <option key={s.id} value={s.shortName}>{s.name}</option>)}
                </select>
                <button className={btnGhost} onClick={() => setAssignments(assignments.length > 1 ? assignments.filter((_, j) => j !== i) : [{ classCode: '', subject: '' }])} title="Retirer"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <button className={btnGhost} onClick={() => setAssignments([...assignments, { classCode: assignments[assignments.length - 1]?.classCode || '', subject: '' }])}><Plus className="w-4 h-4" /> Ajouter une classe / discipline</button>
          </div>
        )}

        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input type="checkbox" checked={addToTeams} onChange={e => setAddToTeams(e.target.checked)} />
          {role === 'student' ? 'Ajouter aux équipes Teams de sa classe' : 'Ajouter aux équipes Teams correspondantes (propriétaire)'}
        </label>

        <button className={btnPrimary} disabled={busy || !valid} onClick={submit}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Créer le compte
        </button>
        {error && <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {error}</div>}
      </div>

      <div className="space-y-5">
        {result ? (
          <div className={`${card} space-y-3`}>
            <h3 className="text-sm font-bold text-emerald-700 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Compte créé : {result.displayName}</h3>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-sm space-y-1">
              <div><span className="text-slate-500">Identifiant : </span><span className="text-slate-900">{result.upn}</span></div>
              <div><span className="text-slate-500">Mot de passe : </span><span className="text-slate-900">{result.password}</span></div>
              <div className="text-[11px] text-slate-500 font-sans">{result.forceChange ? 'À changer à la première connexion.' : 'Pas de changement imposé.'} Ce mot de passe ne sera plus affiché.</div>
            </div>
            <button className={btnGhost} onClick={copy}><Copy className="w-4 h-4" /> {copied ? 'Copié' : 'Copier identifiant + mot de passe'}</button>
            <div className="text-xs text-slate-700">Licence : {result.licenseAssigned ? 'attribuée ✔' : 'non attribuée ✘'}</div>
            {result.teamsAdded.length > 0 && <div className="text-xs text-slate-700">Équipes rejointes ({result.teamsAdded.length}) : <span className="text-slate-500">{result.teamsAdded.join(', ')}</span></div>}
            {result.teamsMissing.length > 0 && <div className="text-xs text-amber-700">Équipes introuvables : {result.teamsMissing.join(', ')}</div>}
            {result.warnings.map((w: string, i: number) => <div key={i} className="text-xs text-amber-700">⚠ {w}</div>)}
          </div>
        ) : (
          <div className={`${card} text-xs text-slate-500 space-y-2`}>
            <h3 className="text-sm font-bold text-slate-900">Comment ça marche</h3>
            <p>• <b className="text-slate-800">Élève</b> : compte créé avec sa classe, licence attribuée, ajouté à toutes les équipes de sa classe.</p>
            <p>• <b className="text-slate-800">Professeur</b> : compte créé, licence attribuée, puis ajouté comme propriétaire de chaque équipe « classe-discipline » choisie (ex. 601-Français).</p>
            <p>• Le mot de passe aléatoire fait 12 caractères sans caractères ambigus. Il s'affiche une seule fois après la création.</p>
            <p>• Si l'identifiant existe déjà, le compte n'est pas écrasé : la création est refusée.</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ───────────────────────── Comptes sortants ───────────────────────── */

const PendingSection: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setRows((await call('GET', '/api/rentree/pending')).pending); } catch (e: any) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const restore = async (id: string) => {
    setBusy(true); setError(''); setMsg('');
    try { setMsg((await call('POST', `/api/rentree/pending/${id}/restore`)).message); await load(); } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };
  const purge = async () => {
    setBusy(true); setError(''); setMsg('');
    try { setMsg((await call('POST', '/api/rentree/purge-due')).message); await load(); } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };
  const due = rows.filter(r => r.daysLeft <= 0).length;

  return (
    <div className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2"><Trash2 className="w-5 h-5 text-rose-600" /> Comptes désactivés en attente de suppression</h2>
          <p className="text-xs text-slate-500 mt-1">Ces comptes sont supprimés automatiquement à l'échéance (vérification toutes les 6 heures). Restaurer un compte le réactive.</p>
        </div>
        <div className="flex gap-2">
          <button className={btnGhost} onClick={load} disabled={busy}><RefreshCw className="w-4 h-4" /> Actualiser</button>
          <button className={btnDanger} onClick={purge} disabled={busy || !due}>Supprimer les comptes échus ({due})</button>
        </div>
      </div>
      {msg && <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">{msg}</div>}
      {error && <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">{error}</div>}
      <div className="mt-4 max-h-[28rem] overflow-auto rounded-lg border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-100 text-slate-700 sticky top-0">
            <tr><th className="text-left p-2">Élève</th><th className="text-left p-2">Identifiant</th><th className="text-left p-2">Ancienne classe</th><th className="text-left p-2">Désactivé le</th><th className="text-left p-2">Suppression</th><th className="p-2" /></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-slate-200 text-slate-800">
                <td className="p-2">{r.name}</td><td className="p-2 font-mono text-slate-500">{r.upn}</td><td className="p-2 font-mono">{r.lastClass || '—'}</td>
                <td className="p-2">{new Date(r.disabledAt).toLocaleDateString('fr-FR')}</td>
                <td className={`p-2 ${r.daysLeft <= 7 ? 'text-rose-700' : ''}`}>{new Date(r.deleteAfter).toLocaleDateString('fr-FR')} ({r.daysLeft > 0 ? `dans ${r.daysLeft} j` : 'échu'})</td>
                <td className="p-2 text-right"><button className={btnGhost} disabled={busy} onClick={() => restore(r.id)}><RotateCcw className="w-3.5 h-3.5" /> Restaurer</button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="p-6 text-center text-slate-500">Aucun compte en attente.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ───────────────────────── Visibilité des équipes ───────────────────────── */

const TeamsVisibilitySection: React.FC = () => {
  const [info, setInfo] = useState<{ total: number; counts: Record<string, number>; publicCount: number } | null>(null);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try { setInfo(await call('GET', '/api/rentree/teams-visibility')); } catch (e: any) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const apply = async () => {
    setBusy(true); setError(''); setMsg('');
    try { const d = await call('POST', '/api/rentree/teams-visibility/private', { confirm }); setMsg(d.message); setConfirm(''); await load(); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className={`${card} space-y-4`}>
      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-blue-600" /> Visibilité des équipes de classe</h2>
      <p className="text-xs text-slate-500">
        Une équipe <b className="text-slate-800">publique</b> apparaît dans « Rejoindre une équipe » pour tous les élèves, qui peuvent la rejoindre eux-mêmes, même celle d'une autre classe.
        Une équipe <b className="text-slate-800">privée</b> n'est visible que de ses membres. Les membres actuels ne sont pas retirés.
      </p>
      {info && (
        <div className="flex flex-wrap gap-3">
          <div className="px-4 py-3 rounded-lg bg-slate-50 border border-slate-200"><div className="text-2xl font-bold text-slate-800">{info.total}</div><div className="text-[11px] text-slate-500">équipes de classe</div></div>
          <div className="px-4 py-3 rounded-lg bg-slate-50 border border-slate-200"><div className="text-2xl font-bold text-amber-600">{info.publicCount}</div><div className="text-[11px] text-slate-500">publiques</div></div>
          <div className="px-4 py-3 rounded-lg bg-slate-50 border border-slate-200"><div className="text-2xl font-bold text-emerald-600">{info.total - info.publicCount}</div><div className="text-[11px] text-slate-500">privées / masquées</div></div>
        </div>
      )}
      {info && info.publicCount > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <input className={`${input} !w-56`} placeholder="Tapez PRIVE pour confirmer" value={confirm} onChange={e => setConfirm(e.target.value)} />
          <button className={btnPrimary} disabled={busy || confirm !== 'PRIVE'} onClick={apply}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Passer les {info.publicCount} équipes publiques en privé
          </button>
          <span className="text-[11px] text-slate-500">Réversible : une équipe peut être remise en publique depuis Teams.</span>
        </div>
      )}
      {info && info.publicCount === 0 && <div className="text-xs text-emerald-600">Toutes les équipes de classe sont privées.</div>}
      {msg && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">{msg}</div>}
      {error && <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">{error}</div>}
    </div>
  );
};

/* ───────────────────────── Équipe pédagogique (PDF) ───────────────────────── */

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  existing: { label: 'Déjà dans Microsoft 365', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  create: { label: 'À créer', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  ambiguous: { label: 'Plusieurs comptes : ignoré', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  conflict: { label: 'Homonyme d\'un élève : ignoré', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

const PedagogySection: React.FC<{ skus: Sku[]; defaultSku: string; onDone: Props['onDone'] }> = ({ skus, defaultSku, onDone }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pdf, setPdf] = useState('');
  const [fileName, setFileName] = useState('');
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [skuId, setSkuId] = useState('');
  const [createMissing, setCreateMissing] = useState(true);
  const [addOwners, setAddOwners] = useState(true);
  const [confirm, setConfirm] = useState('');
  const [job, setJob] = useState<any>(null);
  const [jobId, setJobId] = useState('');
  const [tab, setTab] = useState<'teachers' | 'labels' | 'principals' | 'unmatched'>('labels');
  const [setPrincipals, setSetPrincipals] = useState(true);
  const [ppBusy, setPpBusy] = useState(false);
  const [ppMsg, setPpMsg] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => { if (!skuId && defaultSku) setSkuId(defaultSku); }, [defaultSku, skuId]);

  const analyze = useCallback(async (b64: string, map: Record<string, string>) => {
    setBusy(true); setError(''); setPreview(null); setJob(null); setJobId(''); setConfirm('');
    try {
      const d = await call('POST', '/api/rentree/pedagogy/preview', { pdfBase64: b64, subjectMap: map });
      setPreview(d);
      setTab(d.labels.some((l: any) => !l.subjects.length) ? 'labels' : d.summary.create ? 'teachers' : 'labels');
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }, []);

  const onFile = async (f?: File | null) => {
    if (!f) return;
    const b64 = await fileToBase64(f);
    setPdf(b64); setFileName(f.name); setOverrides({});
    analyze(b64, {});
  };

  useEffect(() => {
    if (!jobId) return;
    let stop = false;
    const tick = async () => {
      try {
        const d = await call('GET', `/api/rentree/job/${jobId}`);
        if (stop) return;
        setJob(d.job);
        if (d.job.status === 'running') setTimeout(tick, 1500);
        else await onDone();
      } catch (e: any) { if (!stop) setError(e.message); }
    };
    tick();
    return () => { stop = true; };
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updatePrincipals = async () => {
    setPpBusy(true); setError(''); setPpMsg('');
    try {
      const d = await call('POST', '/api/rentree/pedagogy/principals', { pdfBase64: pdf });
      setPpMsg(d.message + (d.missing.length ? ' Non trouvés : ' + d.missing.join(', ') : ''));
      await onDone();
    } catch (e: any) { setError(e.message); }
    finally { setPpBusy(false); }
  };

  const apply = async () => {
    setBusy(true); setError('');
    try {
      const d = await call('POST', '/api/rentree/pedagogy/apply', {
        pdfBase64: pdf, subjectMap: overrides, skuId, createMissing, addOwners, setPrincipals, confirm,
        expected: { create: preview.summary.create, teamLinks: preview.summary.teamLinks },
      });
      setJobId(d.jobId);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const sum = preview?.summary;
  const running = job?.status === 'running';
  const needSku = !!preview && createMissing && sum.create > 0 && !skuId;
  const canApply = !!preview && !busy && !running && !job && confirm === 'EQUIPE' && !needSku && (sum.teamLinks > 0 || (createMissing && sum.create > 0));
  const q = filter.trim().toLowerCase();

  return (
    <div className="space-y-5">
      <div className={card}>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2"><FileUp className="w-5 h-5 text-blue-600" /> Importer l'équipe pédagogique (PDF UnDeuxTEMPS)</h2>
        <p className="text-xs text-slate-500 mt-1">
          Déposez chaque année l'export « Équipe pédagogique » : les professeurs absents de Microsoft 365 sont créés (avec licence), puis chacun est ajouté comme propriétaire des équipes « classe-matière » où il enseigne. L'analyse ne modifie rien. Les propriétaires déjà en place ne sont jamais retirés.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
          <button className={btnPrimary} onClick={() => fileRef.current?.click()} disabled={busy || running}><FileUp className="w-4 h-4" /> Choisir le PDF</button>
          {fileName && <span className="text-xs text-slate-600 font-mono">{fileName}</span>}
        </div>
        {busy && !job && <p className="mt-3 text-xs text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Lecture et analyse du PDF…</p>}
        {error && <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {error}</div>}
      </div>

      {preview && (
        <>
          <div className={card}>
            <h2 className="text-base font-bold text-slate-900">Résultat de l'analyse</h2>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {([
                [sum.classes, 'classes lues', 'text-slate-700'], [sum.teachers, 'enseignants', 'text-slate-700'], [sum.existing, 'déjà dans M365', 'text-emerald-600'],
                [sum.create, 'à créer', 'text-blue-600'], [sum.teamLinks, 'ajouts à des équipes', 'text-blue-600'], [sum.principals, 'profs principaux (en gras)', 'text-emerald-600'], [sum.unmatched, 'matières sans équipe', 'text-amber-600'],
                [sum.ambiguous + sum.conflict, 'ignorés (homonymes)', 'text-rose-600'],
              ] as [number, string, string][]).map(([n, label, color]) => (
                <div key={label} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div className={`text-2xl font-bold ${color}`}>{n}</div>
                  <div className="text-[11px] text-slate-500 leading-tight">{label}</div>
                </div>
              ))}
            </div>
            {preview.skipped.length > 0 && <p className="mt-3 text-[11px] text-slate-500">Lignes ignorées (ce ne sont pas des personnes) : {preview.skipped.join(' ; ')}</p>}

            <div className="mt-4 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
              {([['labels', `Matières (${preview.labels.length})`], ['teachers', `Professeurs (${preview.teachers.length})`], ['principals', `Profs principaux (${preview.principals.length})`], ['unmatched', `Sans équipe (${preview.unmatched.length})`]] as const).map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} className={`${btn} ${tab === id ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}`}>{label}</button>
              ))}
              {tab === 'teachers' && <input className={`${input} !w-56 ml-auto`} placeholder="Filtrer un nom…" value={filter} onChange={e => setFilter(e.target.value)} />}
            </div>

            {tab === 'labels' && (
              <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0"><tr><th className="text-left p-2">Libellé du PDF</th><th className="text-left p-2">Lignes</th><th className="text-left p-2">Matière de l'équipe Teams</th><th className="text-left p-2">Équipes trouvées</th></tr></thead>
                  <tbody>
                    {preview.labels.map((l: any) => {
                      const value = l.key in overrides ? overrides[l.key] : (l.subjects[0] || '');
                      return (
                        <tr key={l.key} className={`border-t border-slate-200 ${!l.subjects.length && !(l.key in overrides) ? 'bg-amber-50' : ''}`}>
                          <td className="p-2 font-mono">{l.label}</td><td className="p-2">{l.count}</td>
                          <td className="p-2">
                            <select className={input} value={value} disabled={busy || running || !!job}
                              onChange={e => { const m = { ...overrides, [l.key]: e.target.value }; setOverrides(m); analyze(pdf, m); }}>
                              <option value="">— ignorer ce libellé —</option>
                              {preview.subjects.map((sub: string) => <option key={sub} value={sub}>{sub}</option>)}
                            </select>
                          </td>
                          <td className="p-2">{l.teamsFound}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'teachers' && (
              <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0"><tr><th className="text-left p-2">Professeur</th><th className="text-left p-2">Statut</th><th className="text-left p-2">Identifiant</th><th className="text-left p-2">Matières</th><th className="text-left p-2">Équipes</th></tr></thead>
                  <tbody>
                    {preview.teachers.filter((t: any) => !q || `${t.nom} ${t.prenom}`.toLowerCase().includes(q)).map((t: any) => (
                      <tr key={t.raw} className="border-t border-slate-200 text-slate-800">
                        <td className="p-2">{t.nom} {t.prenom}{t.uncertain && <span className="ml-1 text-amber-600" title="Coupure nom / prénom estimée">?</span>}</td>
                        <td className="p-2"><span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${STATUS_LABELS[t.status].cls}`}>{STATUS_LABELS[t.status].label}</span></td>
                        <td className="p-2 font-mono text-slate-500">{t.upn}</td><td className="p-2 text-slate-500">{t.labels.join(', ')}</td><td className="p-2">{t.teams}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'principals' && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button className={btnPrimary} disabled={ppBusy || busy || running} onClick={updatePrincipals}>
                  {ppBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />} Mettre à jour les professeurs principaux (page Classes)
                </button>
                <span className="text-[11px] text-slate-500">Action indépendante : ne crée aucun compte et ne modifie aucune équipe.</span>
                {ppMsg && <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {ppMsg}</span>}
              </div>
            )}
            {tab === 'principals' && (
              <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0"><tr><th className="text-left p-2">Classe</th><th className="text-left p-2">Professeur principal (en gras dans le PDF)</th><th className="text-left p-2">Compte</th><th className="text-left p-2">Contrôle</th></tr></thead>
                  <tbody>
                    {preview.principals.map((x: any) => (
                      <tr key={x.classCode} className="border-t border-slate-200 text-slate-800">
                        <td className="p-2 font-mono">{x.classCode}</td>
                        <td className="p-2">{x.name || <span className="text-amber-600">non trouvé</span>}</td>
                        <td className="p-2">{x.status && <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${STATUS_LABELS[x.status]?.cls || ''}`}>{STATUS_LABELS[x.status]?.label || x.status}</span>}</td>
                        <td className="p-2 text-slate-500">{!x.name ? '' : x.consistent ? 'même personne que « Vie de classe »' : x.source === 'vie de classe' ? 'déduit de « Vie de classe » (pas de gras)' : 'différent de « Vie de classe »'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'unmatched' && (
              <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0"><tr><th className="text-left p-2">Classe</th><th className="text-left p-2">Libellé</th><th className="text-left p-2">Raison</th><th className="text-left p-2">Professeurs concernés</th></tr></thead>
                  <tbody>
                    {preview.unmatched.map((u: any, i: number) => (
                      <tr key={i} className="border-t border-slate-200 text-slate-800"><td className="p-2 font-mono">{u.classCode}</td><td className="p-2">{u.label}</td><td className="p-2 text-amber-700">{u.reason}</td><td className="p-2 text-slate-500">{u.persons.join(', ')}</td></tr>
                    ))}
                    {!preview.unmatched.length && <tr><td colSpan={4} className="p-4 text-center text-slate-500">Toutes les matières ont une équipe.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={card}>
            <h2 className="text-base font-bold text-slate-900">Appliquer</h2>
            <div className="mt-3 grid md:grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-700">
              <label className="flex items-center gap-2"><input type="checkbox" checked={createMissing} disabled={running || !!job} onChange={e => setCreateMissing(e.target.checked)} /> Créer les professeurs manquants ({sum.create})</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={addOwners} disabled={running || !!job} onChange={e => setAddOwners(e.target.checked)} /> Les ajouter comme propriétaires des équipes ({sum.teamLinks} liens)</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={setPrincipals} disabled={running || !!job} onChange={e => setSetPrincipals(e.target.checked)} /> Mettre à jour le professeur principal de chaque classe ({sum.principals})</label>
              <label className="flex items-center gap-2">Licence des nouveaux professeurs
                <select className={input} value={skuId} disabled={running || !!job} onChange={e => setSkuId(e.target.value)}>
                  <option value="">— choisir —</option>
                  {skus.map(k => <option key={k.skuId} value={k.skuId}>{k.partNumber} ({k.total - k.used} libres)</option>)}
                </select>
              </label>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">Les professeurs ambigus ou homonymes d'un élève ne sont pas touchés. Les nouveaux comptes reçoivent un mot de passe aléatoire à changer à la première connexion : le fichier des identifiants est téléchargeable à la fin.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input className={`${input} !w-56`} placeholder="Tapez EQUIPE pour confirmer" value={confirm} onChange={e => setConfirm(e.target.value)} disabled={running || !!job} />
              <button className={btnPrimary} disabled={!canApply} onClick={apply}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Importer l'équipe pédagogique</button>
              {needSku && <span className="text-xs text-amber-700">Choisissez une licence.</span>}
            </div>
          </div>
        </>
      )}

      {job && <JobPanel job={job} jobId={jobId} />}
    </div>
  );
};

/* ───────────────────────── Ajouter / retirer d'équipes ───────────────────────── */

interface DirUser { id: string; m365Id: string; firstName: string; lastName: string; upn: string; role: string; classCode?: string }
interface TeamRow { id: string; name: string; classCode: string; subject: string; owner?: boolean }

const AddToTeamsSection: React.FC = () => {
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [users, setUsers] = useState<DirUser[]>([]);
  const [allTeams, setAllTeams] = useState<TeamRow[]>([]);
  const [memberTeams, setMemberTeams] = useState<TeamRow[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [picked, setPicked] = useState<DirUser | null>(null);
  const [teamQuery, setTeamQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [role, setRole] = useState<'member' | 'owner'>('member');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/users', { headers: jsonHeaders }).then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : [])).catch(e => setLoadError(e.message));
    call('GET', '/api/rentree/teams').then(d => setAllTeams(d.teams)).catch(e => setLoadError(e.message));
  }, []);

  // en mode « retirer », on liste les équipes dont la personne fait réellement partie
  const loadMemberTeams = useCallback(async (u: DirUser) => {
    setMemberTeams(null); setError('');
    try { setMemberTeams((await call('GET', `/api/rentree/user/${u.m365Id}/teams`)).teams); } catch (e: any) { setError(e.message); setMemberTeams([]); }
  }, []);
  useEffect(() => { if (mode === 'remove' && picked) loadMemberTeams(picked); }, [mode, picked, loadMemberTeams]);

  const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const uq = userQuery.trim().toLowerCase();
  const found = uq.length < 2 ? [] : users.filter(u => guid.test(u.m365Id || '') && `${u.firstName} ${u.lastName} ${u.lastName} ${u.firstName} ${u.upn}`.toLowerCase().includes(uq)).slice(0, 12);
  const tq = teamQuery.trim().toLowerCase();
  const source: TeamRow[] = mode === 'add' ? allTeams : (memberTeams || []);
  const shown = source.filter(t => !tq || t.name.toLowerCase().includes(tq));

  const toggle = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectShown = () => setSelected(prev => new Set([...prev, ...shown.map(t => t.id)]));
  const changeMode = (m: 'add' | 'remove') => { setMode(m); setSelected(new Set()); setResult(null); setError(''); setConfirm(''); setTeamQuery(''); };

  const submit = async () => {
    if (!picked) return;
    setBusy(true); setError(''); setResult(null);
    try {
      if (mode === 'add') {
        setResult(await call('POST', '/api/rentree/teams/add-member', { userId: picked.m365Id, teamIds: [...selected], role }));
        setSelected(new Set());
      } else {
        const d = await call('POST', '/api/rentree/teams/remove-member', { userId: picked.m365Id, teamIds: [...selected], confirm });
        setResult(d); setSelected(new Set()); setConfirm('');
        await loadMemberTeams(picked);
      }
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const needConfirm = mode === 'remove' && selected.size > 3;
  const canSubmit = !busy && !!picked && selected.size > 0 && (!needConfirm || confirm === 'RETIRER');
  const who = (u: DirUser) => (u.role === 'teacher' ? 'professeur' : u.role === 'student' ? `élève ${u.classCode || ''}` : u.role);

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className={`${card} space-y-4`}>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2"><Plus className="w-5 h-5 text-blue-600" /> Équipes d'un utilisateur</h2>
        <div className="flex gap-2">
          <button onClick={() => changeMode('add')} className={`${btn} flex-1 justify-center ${mode === 'add' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>Ajouter à des équipes</button>
          <button onClick={() => changeMode('remove')} className={`${btn} flex-1 justify-center ${mode === 'remove' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>Retirer d'équipes</button>
        </div>
        <p className="text-xs text-slate-500">
          {mode === 'add' ? 'Ajoutez un élève ou un professeur à n\'importe quelle équipe, même d\'une autre classe.' : 'Retirez un élève ou un professeur de plusieurs équipes, ou de toutes. Son compte Microsoft 365 est conservé.'}
        </p>
        {loadError && <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">{loadError}</div>}

        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-700">1. Qui ?</div>
          {picked ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs">
              <div><b className="text-slate-900">{picked.firstName} {picked.lastName}</b> <span className="text-slate-500">· {who(picked)} · {picked.upn}</span></div>
              <button className={btnGhost} onClick={() => { setPicked(null); setResult(null); setSelected(new Set()); setMemberTeams(null); }}><X className="w-3.5 h-3.5" /> Changer</button>
            </div>
          ) : (
            <>
              <input className={input} placeholder="Nom, prénom ou identifiant (2 lettres minimum)" value={userQuery} onChange={e => setUserQuery(e.target.value)} />
              {users.length === 0 && !loadError && <p className="text-[11px] text-slate-500">Annuaire vide : synchronisez-le d'abord (onglet « Élèves & Profs »).</p>}
              <div className="max-h-56 overflow-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                {found.map(u => (
                  <button key={u.id} onClick={() => setPicked(u)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex justify-between gap-2">
                    <span><b className="text-slate-900">{u.firstName} {u.lastName}</b> <span className="text-slate-500">{u.upn}</span></span>
                    <span className="text-slate-500">{who(u)}</span>
                  </button>
                ))}
                {uq.length >= 2 && !found.length && <div className="px-3 py-3 text-xs text-slate-500">Aucun résultat.</div>}
              </div>
            </>
          )}
        </div>

        {mode === 'add' && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700">2. En tant que</div>
            <div className="flex gap-4 text-xs text-slate-700">
              <label className="flex items-center gap-2"><input type="radio" checked={role === 'member'} onChange={() => setRole('member')} /> Membre (élève)</label>
              <label className="flex items-center gap-2"><input type="radio" checked={role === 'owner'} onChange={() => setRole('owner')} /> Propriétaire (professeur)</label>
            </div>
          </div>
        )}

        {needConfirm && <input className={`${input} !w-56`} placeholder="Tapez RETIRER pour confirmer" value={confirm} onChange={e => setConfirm(e.target.value)} />}
        <button className={mode === 'add' ? btnPrimary : btnDanger} disabled={!canSubmit} onClick={submit}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'add' ? <Plus className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
          {mode === 'add' ? 'Ajouter à' : 'Retirer de'} {selected.size} équipe{selected.size > 1 ? 's' : ''}
        </button>
        {error && <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {error}</div>}
        {result && (
          <div className={`p-3 rounded-lg border text-xs space-y-1 ${result.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
            <div className="font-semibold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> {result.message}</div>
            {result.errors?.map((e: string, i: number) => <div key={i} className="font-mono text-[11px]">{e}</div>)}
          </div>
        )}
      </div>

      <div className={`${card} space-y-3`}>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-slate-700">
            {mode === 'add' ? '3. Dans quelles équipes ?' : '2. De quelles équipes ?'} <span className="text-slate-500 font-normal">({selected.size} sélectionnée{selected.size > 1 ? 's' : ''} sur {source.length})</span>
          </div>
          <div className="flex gap-2">
            <button className={btnGhost} onClick={selectShown} disabled={!shown.length}>Tout cocher ({shown.length})</button>
            <button className={btnGhost} onClick={() => setSelected(new Set())} disabled={!selected.size}>Vider</button>
          </div>
        </div>
        <input className={input} placeholder="Filtrer : 301, Français, EPS, T02-Philosophie…" value={teamQuery} onChange={e => setTeamQuery(e.target.value)} />
        <div className="max-h-[28rem] overflow-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
          {shown.map(t => (
            <label key={t.id} className={`flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-slate-50 ${selected.has(t.id) ? (mode === 'add' ? 'bg-blue-50' : 'bg-rose-50') : ''}`}>
              <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
              <span className="font-mono text-slate-500 w-10">{t.classCode}</span><span className="text-slate-800">{t.subject}</span>
              {t.owner && <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold">propriétaire</span>}
            </label>
          ))}
          {mode === 'remove' && !picked && <div className="px-3 py-4 text-xs text-slate-500">Choisissez d'abord la personne : ses équipes s'afficheront ici.</div>}
          {mode === 'remove' && picked && memberTeams === null && <div className="px-3 py-4 text-xs text-slate-500 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Lecture de ses équipes…</div>}
          {mode === 'remove' && picked && memberTeams && !memberTeams.length && <div className="px-3 py-4 text-xs text-slate-500">Cette personne n'est dans aucune équipe de classe.</div>}
          {mode === 'add' && !allTeams.length && <div className="px-3 py-4 text-xs text-slate-500">Chargement des équipes…</div>}
        </div>
      </div>
    </div>
  );
};
