import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { SyncLogItem, SynchronizationRecord } from '../types';
import { triggerDownload } from '../utils/csvParser';

interface AuditLogsViewProps {
  syncHistory: SynchronizationRecord[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ syncHistory }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [selectedRecordId, setSelectedRecordId] = useState<string>('all');

  // Flatten all logs from sync history
  const allLogs: (SyncLogItem & { recordDate: string })[] = [];
  syncHistory.forEach((rec) => {
    rec.logs.forEach((log) => {
      allLogs.push({
        ...log,
        recordDate: rec.date,
      });
    });
  });

  const filteredLogs = allLogs.filter((log) => {
    const matchesSearch =
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesRecord =
      selectedRecordId === 'all' ||
      syncHistory.find((r) => r.id === selectedRecordId)?.logs.some((l) => l.id === log.id);

    return matchesSearch && matchesStatus && matchesAction && matchesRecord;
  });

  const exportAllLogsCsv = () => {
    let csv = 'timestamp;utilisateur;email;action;statut;message\r\n';
    filteredLogs.forEach((l) => {
      csv += `"${l.timestamp}";"${l.userName}";"${l.userEmail}";"${l.action}";"${l.status}";"${l.message.replace(/"/g, '""')}"\r\n`;
    });
    triggerDownload(csv, `journal_operations_m365_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Security Notice (Section 21) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <History className="w-3.5 h-3.5 text-blue-600" />
                Audit & Traçabilité
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Journal des opérations (Audit Logs)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Historique immuable de toutes les actions de création, modification et attribution de licences.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="btn-export-audit-logs"
              onClick={exportAllLogsCsv}
              className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-200 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Exporter les logs (CSV)</span>
            </button>
          </div>
        </div>

        {/* RGPD Compliance badge */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong className="text-slate-900 font-semibold">Conformité RGPD & Sécurité :</strong> Aucun mot de passe n'est enregistré dans les logs du système. Les identifiants sont temporaires et masqués.
          </span>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par utilisateur, email ou message..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
            >
              <option value="all">Tous les statuts</option>
              <option value="success">Succès uniquement</option>
              <option value="error">Erreurs uniquement</option>
            </select>
          </div>

          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
            >
              <option value="all">Toutes les actions</option>
              <option value="Création compte">Création compte</option>
              <option value="Modification compte">Modification compte</option>
              <option value="Changement de licence">Changement de licence</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table (Section 21 exact format) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-600">
            Affichage de <strong className="text-slate-900">{filteredLogs.length}</strong> événement(s)
          </span>
          <span className="text-[11px] text-slate-500">Horodatage officiel Entra ID</span>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date et heure</th>
                <th className="py-3 px-4">Utilisateur</th>
                <th className="py-3 px-4">Email (UPN)</th>
                <th className="py-3 px-4">Action effectuée</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4">Message / Détail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                    {log.userName}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{log.userEmail}</td>
                  <td className="py-3 px-4 font-sans">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-sans">
                    {log.status === 'success' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Succès
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        Échec
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-700">
                    {log.message}
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
