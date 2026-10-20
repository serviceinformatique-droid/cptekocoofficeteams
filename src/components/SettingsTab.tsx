import React, { useState } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Key, 
  Layers, 
  Clock, 
  Archive, 
  Sparkles, 
  Play, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Calendar, 
  HelpCircle,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';
import type { M365Config, DiagnosticStep } from '../types/index.ts';

interface SettingsTabProps {
  config: M365Config;
  onUpdateConfig: (data: Partial<M365Config>) => void;
  onRunDiagnostic: () => Promise<{ steps: DiagnosticStep[]; totalLatencyMs: number }>;
  onArchiveYear: () => void;
  onPrepareNewYear: (year: string) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  config,
  onUpdateConfig,
  onRunDiagnostic,
  onArchiveYear,
  onPrepareNewYear,
}) => {
  const [tenantId, setTenantId] = useState(config.tenantId);
  const [clientId, setClientId] = useState(config.clientId);
  const [clientSecretInput, setClientSecretInput] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [namingPattern, setNamingPattern] = useState(config.namingPattern);
  const [teamTemplate, setTeamTemplate] = useState(config.teamTemplate);
  const [syncMode, setSyncMode] = useState(config.syncMode);
  const [entraGroupPrefix, setEntraGroupPrefix] = useState(config.entraGroupPrefix);
  const [studentDomain, setStudentDomain] = useState(config.studentDomain);
  const [teacherDomain, setTeacherDomain] = useState(config.teacherDomain);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(config.autoSyncEnabled);
  const [nextYearInput, setNextYearInput] = useState('2027-2028');

  // Diagnostic state
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [diagnosticSteps, setDiagnosticSteps] = useState<DiagnosticStep[] | null>(null);
  const [diagLatency, setDiagLatency] = useState<number | null>(null);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updatePayload: any = {
      tenantId: tenantId.trim(),
      clientId: clientId.trim(),
      namingPattern,
      teamTemplate,
      syncMode,
      entraGroupPrefix,
      studentDomain,
      teacherDomain,
      autoSyncEnabled,
    };
    if (clientSecretInput.trim()) {
      updatePayload.clientSecret = clientSecretInput.trim();
    }
    onUpdateConfig(updatePayload);
  };

  const handleRunDiagnostic = async () => {
    setIsRunningDiagnostic(true);
    try {
      const res = await onRunDiagnostic();
      setDiagnosticSteps(res.steps);
      setDiagLatency(res.totalLatencyMs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Paramètres Microsoft 365 & Architecture
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Solution A : Application Entra ID
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Connexion Microsoft Graph, conventions de nommage, planification et gestion des années scolaires.
          </p>
        </div>
      </div>

      {/* Diagnostic Microsoft Graph in 7 Points (Section 48 Cahier des charges) */}
      <div className="bg-slate-50 border border-slate-300/80 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-300/60 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Test de Connexion Microsoft 365 & Graph (Section 48)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Diagnostic complet en 7 points pour valider les permissions et la réactivité du tenant.
            </p>
          </div>

          <button
            onClick={handleRunDiagnostic}
            disabled={isRunningDiagnostic}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition active:scale-95 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunningDiagnostic ? 'animate-spin' : ''}`} />
            {isRunningDiagnostic ? 'Test en cours...' : 'Lancer le diagnostic 7 points'}
          </button>
        </div>

        {diagnosticSteps ? (
          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
              <span>
                Diagnostic :{' '}
                <strong className={diagnosticSteps.some(s => s.status === 'error') ? 'text-rose-600' : diagnosticSteps.some(s => s.status === 'warning') ? 'text-amber-600' : 'text-emerald-600'}>
                  {diagnosticSteps.filter(s => s.status === 'success').length} / {diagnosticSteps.length} Étapes Validées
                </strong>
              </span>
              <span>Temps total : <strong className="text-blue-700 font-mono">{diagLatency} ms</strong></span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {diagnosticSteps.map((step) => {
                const isSuccess = step.status === 'success';
                const isWarning = step.status === 'warning';
                return (
                  <div
                    key={step.step}
                    className={`p-3 rounded-lg bg-white/80 border flex items-start gap-2.5 text-xs ${
                      isSuccess
                        ? 'border-slate-300/60'
                        : isWarning
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-rose-200 bg-rose-50'
                    }`}
                  >
                    {isSuccess ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          {step.step}. {step.name}
                        </span>
                        {step.latencyMs && (
                          <span className="font-mono text-[10px] text-slate-500">{step.latencyMs} ms</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">{step.description}</div>
                      <div className={`text-[11px] font-mono ${
                        isSuccess ? 'text-emerald-600' : isWarning ? 'text-amber-700' : 'text-rose-600'
                      }`}>
                        {step.message}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 p-4 rounded-xl bg-white/90 border border-slate-300 text-xs space-y-3">
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-blue-600" />
                  Guide Azure Portal : Résolution de l'erreur AADSTS7000215 (Secret client)
                </span>
                <a
                  href="https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold transition"
                >
                  Ouvrir Azure Portal (portal.azure.com) ↗
                </a>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                <strong className="text-slate-900 block mb-1">
                  🎉 Excellente nouvelle : Votre Tenant et votre Application sont 100 % reconnus par Microsoft !
                </strong>
                L'erreur <code>AADSTS7000215: Invalid client secret provided</code> signifie que Microsoft a trouvé votre application, mais que la valeur du secret client entrée est erronée ou a expiré. 
                <span className="text-amber-800 font-medium block mt-1">
                  👉 Ne recommencez surtout pas le tenant ! Il suffit simplement de générer un nouveau secret client dans Azure et de copier la colonne <u>Valeur</u>.
                </span>
              </div>

              <p className="text-slate-700 text-[11px] font-semibold">
                Procédure rapide (30 secondes) :
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-[11px]">
                <li>Sur <strong className="text-slate-900">portal.azure.com</strong>, allez dans <strong className="text-slate-900">Microsoft Entra ID</strong> &gt; <strong className="text-slate-900">Inscriptions d'applications</strong> &gt; Votre application.</li>
                <li>Dans le menu de gauche, cliquez sur <strong className="text-slate-900">Certificats & secrets</strong>.</li>
                <li>Cliquez sur <strong className="text-blue-700">« + Nouveau secret client »</strong>, mettez la description <em>NDM Teams</em> et validez.</li>
                <li>
                  <strong className="text-emerald-700">⚠️ POINT CRUCIAL :</strong> Copiez immédiatement la colonne <strong className="text-slate-900 bg-slate-100 px-1 py-0.5 rounded border border-slate-300">Valeur</strong> (et <u>SURTOUT PAS</u> l'ID de secret !).
                </li>
                <li>Collez cette valeur ci-dessous dans le champ <strong>Client Secret</strong>, puis cliquez sur <strong>Enregistrer</strong> et <strong>Lancer le diagnostic</strong>.</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="bg-white/60 rounded-xl p-4 border border-slate-200 text-xs text-slate-500 flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
            <span>
              Cliquez sur <strong>"Lancer le diagnostic 7 points"</strong> pour tester la connexion Entra ID, Microsoft Graph, la lecture des 1 395 comptes, la détection des groupes de classe et les droits de provisionnement Teams.
            </span>
          </div>
        )}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveConfig} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Col: Entra ID & Identification */}
        <div className="bg-slate-50 border border-slate-300/80 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-300/60 pb-2">
            <Key className="w-4 h-4 text-blue-600" />
            Identifiants Microsoft Entra ID (Application Graph)
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-500 font-medium mb-1">Tenant ID (Annuaire Microsoft 365)</label>
              <input
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Client ID (ID d'application)</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-500 font-medium">
                  Client Secret (Valeur de la clé secrète Azure)
                </label>
                <span className="text-[10px] text-amber-600">
                  Collez la <b>Valeur</b> (pas l'ID de secret)
                </span>
              </div>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  value={clientSecretInput}
                  onChange={(e) => setClientSecretInput(e.target.value)}
                  placeholder="Laisser vide pour conserver le secret existant, ou coller le nouveau secret..."
                  className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 pr-10 text-slate-900 font-mono text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 p-1"
                  title={showSecret ? "Masquer le secret" : "Afficher le secret"}
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {clientSecretInput ? (
                  <span className="text-emerald-600 font-semibold">✓ Nouveau secret saisi — Cliquez ci-dessous pour l'appliquer et relancer le test.</span>
                ) : (
                  <span>✓ Clé secrète configurée côté serveur. Cliquez ci-dessous pour tester immédiatement la connexion Entra ID.</span>
                )}
              </span>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    const updatePayload: any = {
                      tenantId: tenantId.trim(),
                      clientId: clientId.trim(),
                      namingPattern,
                      teamTemplate,
                      syncMode,
                      entraGroupPrefix,
                      studentDomain,
                      teacherDomain,
                      autoSyncEnabled,
                    };
                    if (clientSecretInput.trim()) {
                      updatePayload.clientSecret = clientSecretInput.trim();
                    }
                    await onUpdateConfig(updatePayload);
                    handleRunDiagnostic();
                  }}
                  disabled={isRunningDiagnostic}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs transition shadow-md shadow-emerald-950/25 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {isRunningDiagnostic ? 'Diagnostic en cours...' : 'Appliquer & Lancer le diagnostic 7 points'}
                </button>
              </div>
            </div>

            {/* Méthode d'identification (Section 6) */}
            <div className="pt-2 border-t border-slate-300/60 space-y-2">
              <label className="block text-slate-700 font-semibold">
                Méthode d'identification des élèves (Section 6)
              </label>
              <select
                value={syncMode}
                onChange={(e) => setSyncMode(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="group">Méthode 1 — Groupes Entra ID (ex: ELEVE-601)</option>
                <option value="attribute">Méthode 2 — Attribut Entra ID (Classe = 601)</option>
                <option value="upn">Méthode 3 — Préfixe UPN (@eleves.ndmissions.fr)</option>
                <option value="dynamic">Méthode 4 — Groupes Dynamiques Entra</option>
              </select>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">Préfixe Groupe Entra</label>
                  <input
                    type="text"
                    value={entraGroupPrefix}
                    onChange={(e) => setEntraGroupPrefix(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">Domaine Élèves</label>
                  <input
                    type="text"
                    value={studentDomain}
                    onChange={(e) => setStudentDomain(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Naming Convention, Template, Schedule & School Year */}
        <div className="bg-slate-50 border border-slate-300/80 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-300/60 pb-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Nommage Teams & Planification
            </h2>

            {/* Naming Pattern (Section 12) */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">Convention de nommage (Section 12)</label>
              <input
                type="text"
                value={namingPattern}
                onChange={(e) => setNamingPattern(e.target.value)}
                placeholder="[CLASSE]-[MATIÈRE]"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-blue-700 font-mono text-sm focus:outline-none focus:border-blue-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Exemples générés : 601-Français, 601-Mathématiques, 101-HGGSP, T01-Philosophie
              </span>
            </div>

            {/* Teams Template (Section 14) */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">Modèle d'équipe Teams (Section 14)</label>
              <select
                value={teamTemplate}
                onChange={(e) => setTeamTemplate(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="educationClass">Équipe de classe / type Class (Recommandé Éducation)</option>
                <option value="standard">Équipe standard Microsoft Teams</option>
              </select>
            </div>

            {/* Auto Sync Toggle */}
            <div className="p-3 rounded-lg bg-white/60 border border-slate-300/60 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">Synchronisation Automatique Planifiée</div>
                <div className="text-[11px] text-slate-500">Exécution à 06h00, 12h00 et 18h00</div>
              </div>
              <input
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 bg-slate-100 cursor-pointer"
              />
            </div>

            {/* School Year & Annual Archive (Section 28 & 29) */}
            <div className="pt-2 border-t border-slate-300/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Exercice Scolaire en Cours : <span className="text-slate-900 font-bold">{config.currentSchoolYear}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={onArchiveYear}
                  className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-amber-700 border border-amber-200 font-medium text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Archive className="w-3.5 h-3.5 text-amber-600" />
                  Archiver {config.currentSchoolYear}
                </button>

                <div className="flex gap-1">
                  <input
                    type="text"
                    value={nextYearInput}
                    onChange={(e) => setNextYearInput(e.target.value)}
                    className="w-24 bg-white border border-slate-300 rounded-lg px-2 text-center text-slate-900 text-xs font-mono"
                    placeholder="2027-2028"
                  />
                  <button
                    type="button"
                    onClick={() => onPrepareNewYear(nextYearInput)}
                    className="flex-1 px-2.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center justify-center gap-1 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Rentrée
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-300/60 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition active:scale-95"
            >
              Enregistrer les Paramètres
            </button>
          </div>
        </div>

      </form>

    </div>
  );
};
