import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  UserX, 
  Layers, 
  BookX, 
  HelpCircle, 
  ArrowRight,
  Filter,
  Sparkles
} from 'lucide-react';
import type { AnomalyItem } from '../types/index.ts';

interface AnomaliesTabProps {
  anomalies: AnomalyItem[];
  onResolveAnomaly: (id: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const AnomaliesTab: React.FC<AnomaliesTabProps> = ({
  anomalies,
  onResolveAnomaly,
  onNavigateTab,
}) => {
  const unresolved = anomalies.filter((a) => !a.resolved);
  const resolved = anomalies.filter((a) => a.resolved);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Anomalies & Prévention Rentrée (Section 35 & 57)
            </h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              unresolved.length === 0
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {unresolved.length} à traiter
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Détection automatique des incohérences avant répercussion sur Microsoft Teams.
          </p>
        </div>
      </div>

      {/* Pre-rentrée Checklist Widget (Section 57 Cahier des charges) */}
      <div className="bg-gradient-to-br from-white via-slate-100 to-blue-50 border border-slate-300/80 rounded-2xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Contrôles Préventifs de Rentrée Scolaire (Section 57)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white/80 border border-slate-300/60 flex items-center justify-between">
            <div>
              <div className="text-slate-500">Élèves sans classe</div>
              <div className="text-base font-bold text-amber-600 mt-0.5">1 détecté</div>
            </div>
            <UserX className="w-5 h-5 text-amber-600/60" />
          </div>

          <div className="p-3 rounded-xl bg-white/80 border border-slate-300/60 flex items-center justify-between">
            <div>
              <div className="text-slate-500">Spécialités non choisies</div>
              <div className="text-base font-bold text-amber-600 mt-0.5">1 élève 1ère</div>
            </div>
            <BookX className="w-5 h-5 text-amber-600/60" />
          </div>

          <div className="p-3 rounded-xl bg-white/80 border border-slate-300/60 flex items-center justify-between">
            <div>
              <div className="text-slate-500">Équipes manquantes</div>
              <div className="text-base font-bold text-blue-600 mt-0.5">18 à créer</div>
            </div>
            <Layers className="w-5 h-5 text-blue-600/60" />
          </div>

          <div className="p-3 rounded-xl bg-white/80 border border-slate-300/60 flex items-center justify-between">
            <div>
              <div className="text-slate-500">Classes sans élèves</div>
              <div className="text-base font-bold text-emerald-600 mt-0.5">0 (Conforme)</div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-600/60" />
          </div>
        </div>
      </div>

      {/* Anomalies List */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Anomalies Actives à Traiter ({unresolved.length})</h2>
        
        {unresolved.length === 0 ? (
          <div className="bg-slate-50 border border-slate-300/60 rounded-xl p-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <div className="text-slate-900 font-semibold">Toutes les anomalies sont résolues !</div>
            <p className="text-xs text-slate-500">La synchronisation Microsoft Teams peut se poursuivre en toute sérénité.</p>
          </div>
        ) : (
          unresolved.map((anomaly) => (
            <div
              key={anomaly.id}
              className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition shadow-sm ${
                anomaly.severity === 'error'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                  anomaly.severity === 'error' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{anomaly.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                      anomaly.severity === 'error'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {anomaly.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700">{anomaly.description}</p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                    <span className="text-blue-600 font-medium">Recommandation :</span>
                    {anomaly.resolutionHint}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                {anomaly.userId && (
                  <button
                    onClick={() => onNavigateTab('users')}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium border border-slate-300 transition"
                  >
                    Ouvrir Fiche
                  </button>
                )}

                <button
                  onClick={() => onResolveAnomaly(anomaly.id)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition active:scale-95"
                >
                  Marquer Résolu
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resolved History */}
      {resolved.length > 0 && (
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Anomalies Récemment Résolues ({resolved.length})
          </h3>
          <div className="space-y-2 opacity-60">
            {resolved.map((a) => (
              <div
                key={a.id}
                className="p-3 rounded-lg bg-white/60 border border-slate-200 flex items-center justify-between text-xs text-slate-500"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="line-through">{a.title} : {a.description}</span>
                </div>
                <span className="text-emerald-600 text-[11px] font-medium">Résolu</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
