import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Trash2, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock,
  Share2
} from 'lucide-react';
import type { LogItem, SyncReport } from '../types/index.ts';

interface LogsTabProps {
  logs: LogItem[];
  reports: SyncReport[];
  onClearLogs: () => void;
}

export const LogsTab: React.FC<LogsTabProps> = ({
  logs,
  reports,
  onClearLogs,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'logs' | 'reports'>('logs');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const filteredLogs = logs.filter((l) => {
    const matchSearch =
      l.target.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      (l.user && l.user.toLowerCase().includes(search.toLowerCase()));

    const matchAction = actionFilter === 'all' || l.action === actionFilter;
    return matchSearch && matchAction;
  });

  const exportCSV = () => {
    const header = 'Horodatage;Action;Cible;Utilisateur;Détails;Statut;Source\n';
    const rows = logs
      .map((l) =>
        `"${l.timestamp}";"${l.action}";"${l.target}";"${l.user || ''}";"${l.details}";"${l.status}";"${l.source}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ndm-teams-journal-${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ndm-teams-journal-${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Journal des Opérations & Rapports
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Sections 36 & 51
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Traçabilité intégrale de tous les ajouts, retraits et créations d'équipes Teams. Exportable CSV et JSON.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium border border-slate-300 flex items-center gap-1.5 transition"
            title="Exporter en CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            Export CSV
          </button>
          <button
            onClick={exportJSON}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium border border-slate-300 flex items-center gap-1.5 transition"
            title="Exporter en JSON"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            JSON
          </button>
          <button
            onClick={onClearLogs}
            className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-300 transition"
            title="Purger le journal local"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub tabs: Journal vs Rapports */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeSubTab === 'logs'
              ? 'bg-blue-600 text-white'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Journal des Opérations ({logs.length})
        </button>
        <button
          onClick={() => setActiveSubTab('reports')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeSubTab === 'reports'
              ? 'bg-blue-600 text-white'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Rapports de Synchronisation ({reports.length})
        </button>
      </div>

      {activeSubTab === 'logs' ? (
        <>
          {/* Filter Bar */}
          <div className="bg-slate-50 border border-slate-300/80 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher cible, élève, détail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-300 text-xs w-full md:w-auto">
              {['all', 'AJOUT', 'RETRAIT', 'CRÉATION', 'SYNCHRONISATION', 'MODIFICATION'].map((a) => (
                <button
                  key={a}
                  onClick={() => setActionFilter(a)}
                  className={`px-3 py-1 rounded-md transition ${
                    actionFilter === a ? 'bg-blue-600 text-white font-medium' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {a === 'all' ? 'Toutes les actions' : a}
                </button>
              ))}
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-slate-50 border border-slate-300/80 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-white/80 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-300">
                  <tr>
                    <th className="py-3 px-4">Horodatage</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Cible Teams</th>
                    <th className="py-3 px-4">Utilisateur</th>
                    <th className="py-3 px-4">Détail Opération</th>
                    <th className="py-3 px-4">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300/50">
                  {filteredLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {l.timestamp}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.action === 'AJOUT'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : l.action === 'RETRAIT'
                            ? 'bg-amber-50 text-amber-600 border border-amber-200'
                            : l.action === 'CRÉATION'
                            ? 'bg-blue-50 text-blue-600 border border-blue-200'
                            : 'bg-blue-50 text-blue-600 border border-blue-200'
                        }`}>
                          {l.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {l.target}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                        {l.user || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {l.details}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Rapports de Synchronisation (Section 51) */
        <div className="space-y-4">
          {reports.map((rep) => (
            <div
              key={rep.id}
              className="bg-slate-50 border border-slate-300/80 rounded-xl p-5 space-y-4 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-300/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  <h3 className="text-sm font-bold text-slate-900">
                    RAPPORT DE SYNCHRONISATION DU {rep.date} ({rep.timestamp})
                  </h3>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                  Type : {rep.type} • Année {rep.schoolYear}
                </span>
              </div>

              {/* Metrics Grid conforming to Section 51 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-white/60 border border-slate-300/50">
                  <div className="text-slate-500">Utilisateurs analysés</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">{rep.totalUsers}</div>
                  <div className="text-[11px] text-slate-500">{rep.studentsCount} élèves • {rep.teachersCount} profs</div>
                </div>

                <div className="p-3 rounded-lg bg-white/60 border border-slate-300/50">
                  <div className="text-slate-500">Classes & Équipes</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">{rep.classesCount} classes</div>
                  <div className="text-[11px] text-slate-500">{rep.teamsAnalyzed} équipes contrôlées</div>
                </div>

                <div className="p-3 rounded-lg bg-white/60 border border-slate-300/50">
                  <div className="text-slate-500">Mouvements Membres</div>
                  <div className="text-lg font-bold text-emerald-600 mt-0.5">+{rep.studentsAdded} élèves</div>
                  <div className="text-[11px] text-amber-600">-{rep.studentsRemoved} retraits • {rep.classChanges} mutations</div>
                </div>

                <div className="p-3 rounded-lg bg-white/60 border border-slate-300/50">
                  <div className="text-slate-500">Équipes créées</div>
                  <div className="text-lg font-bold text-blue-600 mt-0.5">{rep.teamsCreated} créées</div>
                  <div className="text-[11px] text-slate-500">{rep.warnings} alertes • {rep.errors} erreurs</div>
                </div>
              </div>

              {/* Detail bullet points */}
              <div className="bg-white/80 rounded-lg p-3 border border-slate-200 space-y-1 text-xs">
                <div className="font-semibold text-slate-700 mb-1">Détails de l'exécution :</div>
                {rep.details.map((d, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
