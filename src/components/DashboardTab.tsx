import React from 'react';
import { 
  Users, 
  GraduationCap, 
  Layers, 
  MessagesSquare, 
  PlusCircle, 
  UserPlus, 
  UserMinus, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Play
} from 'lucide-react';
import type { AnomalyItem, LogItem } from '../types/index.ts';

interface DashboardTabProps {
  stats: any;
  anomalies: AnomalyItem[];
  logs: LogItem[];
  onOpenSimulation: () => void;
  onQuickSync: () => void;
  onNavigateTab: (tab: string) => void;
  onResolveAnomaly: (id: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  stats,
  anomalies,
  logs,
  onOpenSimulation,
  onQuickSync,
  onNavigateTab,
  onResolveAnomaly,
}) => {
  const unresolvedAnomalies = anomalies.filter(a => !a.resolved);

  return (
    <div className="space-y-6">
      
      {/* Top Welcome & Architecture Principle Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-slate-100 to-white border border-blue-200 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-50 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Microsoft Graph Connecté
              </span>
              <span className="text-xs text-slate-500">
                Année Scolaire {stats?.currentSchoolYear || '2026-2027'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Gestionnaire Automatisé Teams M365
            </h1>
            <p className="text-xs sm:text-sm text-slate-700 mt-1 max-w-2xl">
              Synchronisation différentielle intelligente sans Koxo ni saisie manuelle.
              <strong className="text-blue-700 font-medium"> Microsoft 365</strong> est la source des comptes,
              <strong className="text-blue-700 font-medium"> NDM</strong> porte les règles de classes et matières,
              <strong className="text-blue-700 font-medium"> Microsoft Teams</strong> est l'environnement pédagogique d'exécution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={onOpenSimulation}
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-amber-700 text-xs font-semibold border border-amber-200 flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Play className="w-4 h-4 text-amber-600 fill-amber-600/20" />
              Lancer Simulation
            </button>
            <button
              onClick={onQuickSync}
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition active:scale-95"
            >
              <Zap className="w-4 h-4" />
              Synchroniser Maintenant
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid (Conforme Cahier des charges Section 21) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Élèves */}
        <div 
          onClick={() => onNavigateTab('users')} 
          className="bg-slate-50 hover:bg-slate-100 border border-slate-300/80 rounded-xl p-4 cursor-pointer transition shadow-sm hover:border-blue-200 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Élèves M365</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">
            {stats?.studentsCount ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-600 font-medium">100% Entra ID</span> • {stats?.studentsCount > 0 ? 'Synchronisés' : 'Aucun compte'}
          </div>
        </div>

        {/* Enseignants */}
        <div 
          onClick={() => onNavigateTab('users')} 
          className="bg-slate-50 hover:bg-slate-100 border border-slate-300/80 rounded-xl p-4 cursor-pointer transition shadow-sm hover:border-blue-200 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Enseignants</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">
            {stats?.teachersCount ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats?.teachersCount > 0 ? 'Propriétaires équipes Class' : 'Source Microsoft 365'}
          </div>
        </div>

        {/* Classes */}
        <div 
          onClick={() => onNavigateTab('classes')} 
          className="bg-slate-50 hover:bg-slate-100 border border-slate-300/80 rounded-xl p-4 cursor-pointer transition shadow-sm hover:border-blue-200 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Classes NDM</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">
            {stats?.classesCount || 37}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            24 Collège • 13 Lycée
          </div>
        </div>

        {/* Équipes Teams */}
        <div 
          onClick={() => onNavigateTab('teams')} 
          className="bg-slate-50 hover:bg-slate-100 border border-slate-300/80 rounded-xl p-4 cursor-pointer transition shadow-sm hover:border-blue-200 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Équipes Teams</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
              <MessagesSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">
            {stats?.teamsCount ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats?.teamsCount > 0 ? `${stats.teamsCount} équipes Teams` : 'Prêt pour création auto'}
          </div>
        </div>

      </div>

      {/* Differential Status Cards (À Créer, À Ajouter, À Retirer, Anomalies) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        
        {/* À Créer */}
        <div className="bg-slate-50 border border-slate-300/60 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">Équipes à créer</div>
            <div className="text-lg font-bold text-blue-600">{stats?.teamsToCreateCount ?? 18}</div>
          </div>
        </div>

        {/* Élèves à ajouter */}
        <div className="bg-slate-50 border border-slate-300/60 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">Élèves à ajouter</div>
            <div className="text-lg font-bold text-emerald-600">+{stats?.membersToAddCount ?? 27}</div>
          </div>
        </div>

        {/* Élèves à retirer */}
        <div className="bg-slate-50 border border-slate-300/60 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
            <UserMinus className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">Élèves à retirer</div>
            <div className="text-lg font-bold text-amber-600">-{stats?.membersToRemoveCount ?? 4}</div>
          </div>
        </div>

        {/* Anomalies */}
        <div 
          onClick={() => onNavigateTab('anomalies')}
          className="bg-slate-50 hover:bg-slate-100 border border-slate-300/60 rounded-xl p-3.5 flex items-center gap-3 cursor-pointer transition hover:border-red-200"
        >
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">Anomalies détectées</div>
            <div className="text-lg font-bold text-rose-600">{unresolvedAnomalies.length}</div>
          </div>
        </div>

      </div>

      {/* Middle Grid: Quick Actions & Synchronisation Differencielle Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Anomalies to resolve immediately */}
        <div className="lg:col-span-2 bg-slate-50 border border-slate-300/80 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-slate-900">Anomalies & Alertes de Prévention</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {unresolvedAnomalies.length} actives
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('anomalies')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Voir tout <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {unresolvedAnomalies.slice(0, 3).map((anomaly) => (
              <div
                key={anomaly.id}
                className="p-3 rounded-lg bg-white/60 border border-slate-300/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      anomaly.severity === 'error'
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : 'bg-amber-50 text-amber-600 border border-amber-200'
                    }`}>
                      {anomaly.type}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">{anomaly.title}</span>
                  </div>
                  <p className="text-xs text-slate-500">{anomaly.description}</p>
                </div>

                <button
                  onClick={() => onResolveAnomaly(anomaly.id)}
                  className="self-start sm:self-center px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium border border-slate-300 transition shrink-0"
                >
                  Résoudre
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-300/50 flex flex-wrap items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Contrôles RGPD actifs : Données strictement cantonnées au fonctionnement pédagogique.
            </span>
            <span>Dernière synchro : {new Date(stats?.lastSync || Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* Right Column: Automated Sync Schedules & Naming Info */}
        <div className="bg-slate-50 border border-slate-300/80 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Planification Automatique
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-600">
                ACTIF
              </span>
            </div>

            <div className="bg-white/60 rounded-lg p-3 space-y-2 border border-slate-300/50 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span>06h00</span>
                <span className="text-emerald-600 font-medium">Synchronisation matinale</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>12h00</span>
                <span className="text-emerald-600 font-medium">Synchronisation mi-journée</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>18h00</span>
                <span className="text-emerald-600 font-medium">Synchronisation de clôture</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="text-slate-500 font-medium">Convention de nommage active :</div>
              <code className="block bg-slate-50 px-3 py-2 rounded border border-slate-200 text-blue-700 font-mono text-xs">
                [CLASSE]-[MATIÈRE] (ex: 601-Français, 101-HGGSP)
              </code>
            </div>

            <div className="space-y-1.5 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Protection des équipes manuelles garantie</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Gestion sélective des spécialités du lycée</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zéro écrasement des membres déjà présents</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-300/50">
            <button
              onClick={() => onNavigateTab('deployment')}
              className="w-full py-2 px-3 rounded-lg bg-slate-200/60 hover:bg-slate-200 text-slate-800 text-xs font-medium flex items-center justify-center gap-1.5 transition"
            >
              Voir instructions de déploiement LXC / Proxmox
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Recent Activity Log Mini-table */}
      <div className="bg-slate-50 border border-slate-300/80 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Dernières opérations Microsoft Graph</h2>
          <button
            onClick={() => onNavigateTab('logs')}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            Consulter l'historique complet <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-white/60 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Date/Heure</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Cible</th>
                <th className="py-2.5 px-3">Détails</th>
                <th className="py-2.5 px-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300/40">
              {logs.slice(0, 5).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.action === 'AJOUT'
                        ? 'bg-emerald-50 text-emerald-600'
                        : log.action === 'RETRAIT'
                        ? 'bg-amber-50 text-amber-600'
                        : log.action === 'CRÉATION'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">{log.target}</td>
                  <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate">{log.details}</td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
