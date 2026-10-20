import React, { useState } from 'react';
import { 
  X, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  PlusCircle, 
  UserPlus, 
  UserMinus, 
  ShieldCheck, 
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';
import type { SimulationResult } from '../types/index.ts';

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulation: SimulationResult | null;
  loading: boolean;
  onExecuteSync: () => void;
  isExecuting: boolean;
}

export const SimulationModal: React.FC<SimulationModalProps> = ({
  isOpen,
  onClose,
  simulation,
  loading,
  onExecuteSync,
  isExecuting,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'create' | 'add' | 'remove' | 'anomalies'>('all');
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-white/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <Play className="w-5 h-5 fill-amber-600/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Mode Simulation Différentielle</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  AUCUNE MODIFICATION RÉELLE
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Analyse comparative des élèves attendus vs équipes Microsoft Teams actuelles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-700">Calcul du delta différentiel Microsoft Graph...</p>
              <p className="text-xs text-slate-500">Comparaison des 1 395 comptes M365 et des 412 équipes Teams</p>
            </div>
          ) : simulation ? (
            <>
              {/* Summary KPIs - Conforme Section 22 Cahier des charges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-300/60 rounded-xl p-3.5">
                  <div className="text-xs text-slate-500 flex items-center justify-between">
                    <span>Équipes à créer</span>
                    <PlusCircle className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">{simulation.teamsToCreateCount}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{simulation.teamsExistingCount} déjà existantes (conservées)</div>
                </div>

                <div className="bg-slate-50 border border-slate-300/60 rounded-xl p-3.5">
                  <div className="text-xs text-slate-500 flex items-center justify-between">
                    <span>Élèves à ajouter</span>
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">+{simulation.membersToAddCount}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{simulation.membersExistingCount} déjà en place (inchangés)</div>
                </div>

                <div className="bg-slate-50 border border-slate-300/60 rounded-xl p-3.5">
                  <div className="text-xs text-slate-500 flex items-center justify-between">
                    <span>Élèves à retirer</span>
                    <UserMinus className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-bold text-amber-600 mt-1">-{simulation.membersToRemoveCount}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Changements de classe / groupe</div>
                </div>
              </div>

              {/* Notice Banner */}
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-3 text-xs text-blue-800">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Principe différentiel strict :</strong> Seules les modifications ci-dessous seront appliquées sur Microsoft Teams. 
                  Les 1 223 affectations déjà existantes et conformes ne subiront aucun appel API inutile.
                </div>
              </div>

              {/* Sub-tabs Filter for Details */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setActiveSubTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeSubTab === 'all'
                      ? 'bg-slate-200 text-slate-900'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Toutes les actions ({simulation.actionsList.length})
                </button>
                <button
                  onClick={() => setActiveSubTab('create')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeSubTab === 'create'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Créations d'équipes ({simulation.teamsToCreate.length})
                </button>
                <button
                  onClick={() => setActiveSubTab('add')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeSubTab === 'add'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Ajouts de membres ({simulation.membersToAdd.length})
                </button>
                <button
                  onClick={() => setActiveSubTab('remove')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeSubTab === 'remove'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Retraits de membres ({simulation.membersToRemove.length})
                </button>
                <button
                  onClick={() => setActiveSubTab('anomalies')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeSubTab === 'anomalies'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Anomalies ({simulation.anomalies.length})
                </button>
              </div>

              {/* Detailed Action List (Conforme Section 22 Cahier des charges) */}
              <div className="space-y-2">
                
                {/* 1. All or Additions */}
                {(activeSubTab === 'all' || activeSubTab === 'add') &&
                  simulation.membersToAdd.map((m, idx) => (
                    <div
                      key={`add-${idx}`}
                      className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center shrink-0">
                          +
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <span>{m.userName}</span>
                            <span className="text-slate-500 font-normal">({m.userRole})</span>
                            <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-mono font-medium">{m.teamName}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{m.reason} • {m.upn}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        AJOUT DIFFÉRENTIEL
                      </span>
                    </div>
                  ))}

                {/* 2. All or Removals */}
                {(activeSubTab === 'all' || activeSubTab === 'remove') &&
                  simulation.membersToRemove.map((m, idx) => (
                    <div
                      key={`rem-${idx}`}
                      className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 font-bold flex items-center justify-center shrink-0">
                          -
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <span>{m.userName}</span>
                            <span className="text-slate-500 font-normal">({m.userRole})</span>
                            <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                            <span className="text-amber-700 font-mono font-medium">{m.teamName}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{m.reason} • {m.upn}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        RETRAIT
                      </span>
                    </div>
                  ))}

                {/* 3. All or Creations */}
                {(activeSubTab === 'all' || activeSubTab === 'create') &&
                  simulation.teamsToCreate.map((t, idx) => (
                    <div
                      key={`cre-${idx}`}
                      className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0">
                          +
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <span>Créer Équipe Teams :</span>
                            <span className="text-blue-700 font-mono font-bold">{t.name}</span>
                            <span className="text-slate-500 font-normal">(Classe {t.classCode} • {t.subjectName})</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{t.reason} • Modèle Class Education</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        CRÉATION ÉQUIPE
                      </span>
                    </div>
                  ))}

                {/* 4. Anomalies */}
                {(activeSubTab === 'all' || activeSubTab === 'anomalies') &&
                  simulation.anomalies.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                        <div>
                          <div className="font-semibold text-rose-800">{a.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{a.description}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        NON BLOQUANT
                      </span>
                    </div>
                  ))}

              </div>
            </>
          ) : null}

        </div>

        {/* Modal Footer with Confirmation Safety Check */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white/90 flex flex-col sm:flex-row items-center justify-between gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 select-none">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 bg-slate-100"
            />
            <span>J'ai vérifié la simulation et confirme l'application sur Microsoft Teams</span>
          </label>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-300 transition"
            >
              Fermer
            </button>
            <button
              onClick={() => {
                onExecuteSync();
                onClose();
              }}
              disabled={!confirmed || isExecuting}
              className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isExecuting ? 'Application en cours...' : 'Appliquer les modifications Teams'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
