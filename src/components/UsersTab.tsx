import React, { useState, useRef } from 'react';
import { 
  Users, 
  GraduationCap, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Edit3, 
  Mail, 
  Shield, 
  BookOpen, 
  X, 
  Layers, 
  Sparkles, 
  RefreshCw,
  Upload,
  UserPlus,
  Trash2,
  FileSpreadsheet,
  Download,
  Key
} from 'lucide-react';
import type { UserItem, ClassItem, SubjectItem, TeamItem } from '../types/index.ts';

interface UsersTabProps {
  users: UserItem[];
  classes: ClassItem[];
  subjects: SubjectItem[];
  teams: TeamItem[];
  onUpdateUser: (id: string, user: Partial<UserItem>) => void;
  onPullM365: () => void;
  isPullingM365: boolean;
  onNavigateTab?: (tab: string) => void;
  onDeleteUser: (id: string) => Promise<any>;
  onUsersChanged?: () => void | Promise<void>;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  users,
  classes,
  subjects,
  teams,
  onUpdateUser,
  onPullM365,
  isPullingM365,
  onNavigateTab,
  onDeleteUser,
  onUsersChanged,
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher' | 'anomaly'>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const classTeams = selectedUser?.classCode
    ? teams
        .filter((t) => t.classCode === selectedUser.classCode && t.status !== 'archived')
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    : [];

  const lyceeSpecialties = [
    'Mathématiques',
    'Physique-Chimie',
    'SVT',
    'SES',
    'HGGSP',
    'HLP',
    'NSI',
    'LLCER',
  ];

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.firstName.toLowerCase().includes(search.toLowerCase()) ||
      u.lastName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.upn.toLowerCase().includes(search.toLowerCase()) ||
      (u.classCode && u.classCode.toLowerCase().includes(search.toLowerCase()));

    const matchRole =
      roleFilter === 'all'
        ? true
        : roleFilter === 'anomaly'
        ? u.status === 'anomaly'
        : u.role === roleFilter;

    const matchClass = classFilter === 'all' || u.classCode === classFilter;

    return matchSearch && matchRole && matchClass;
  });

  const studentsCount = users.filter((u) => u.role === 'student').length;
  const teachersCount = users.filter((u) => u.role === 'teacher').length;
  const anomaliesCount = users.filter((u) => u.status === 'anomaly').length;

  const handleClassChange = (newClassCode: string) => {
    if (!selectedUser) return;
    onUpdateUser(selectedUser.id, { classCode: newClassCode });
    setSelectedUser({ ...selectedUser, classCode: newClassCode });
  };

  const handleToggleSpecialty = (speName: string) => {
    if (!selectedUser) return;
    const current = selectedUser.specialties || [];
    let updated: string[];
    if (current.includes(speName)) {
      updated = current.filter((s) => s !== speName);
    } else {
      updated = [...current, speName];
    }
    onUpdateUser(selectedUser.id, { specialties: updated });
    setSelectedUser({ ...selectedUser, specialties: updated });
  };

  // Suppression d'un compte : désactivation différée (recommandé) ou suppression immédiate
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [delMonths, setDelMonths] = useState(2);
  const [delConfirm, setDelConfirm] = useState('');
  const [delBusy, setDelBusy] = useState(false);
  const [delMsg, setDelMsg] = useState('');
  const [delError, setDelError] = useState('');
  const isRealAccount = (u: UserItem | null) => !!u && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u.m365Id || '');

  const openDelete = () => { setDelMsg(''); setDelError(''); setDelConfirm(''); setDelMonths(2); setDeleteOpen(true); };

  const callAccount = async (action: 'disable' | 'delete-now', body: object) => {
    if (!selectedUser) return;
    setDelBusy(true); setDelError(''); setDelMsg('');
    try {
      const r = await fetch(`/api/rentree/account/${selectedUser.m365Id}/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({ success: false, error: `Erreur ${r.status}` }));
      if (!r.ok || d.success === false) throw new Error(d.error || `Erreur ${r.status}`);
      setDelMsg(d.message);
      if (onUsersChanged) await onUsersChanged();
      setTimeout(() => { setDeleteOpen(false); setSelectedUser(null); }, 1800);
    } catch (e: any) { setDelError(e.message); }
    finally { setDelBusy(false); }
  };

  const deleteLocalOnly = async () => {
    if (!selectedUser) return;
    await onDeleteUser(selectedUser.id);
    setDeleteOpen(false);
    setSelectedUser(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Annuaire Utilisateurs & Synchronisation
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              100% Serveur & Réel
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Annuaire synchronisé depuis Microsoft Entra ID. Pour créer ou importer des élèves et professeurs, utilisez l'onglet « Rentrée & nouveaux comptes ».
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs text-slate-500 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-300">
            Total : <span className="font-bold text-slate-900">{users.length} comptes</span>
          </div>

          <button
            onClick={onPullM365}
            disabled={isPullingM365}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/25 transition active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPullingM365 ? 'animate-spin' : ''}`} />
            {isPullingM365 ? 'Synchronisation Entra ID...' : 'Synchroniser Entra ID'}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-50 border border-slate-300/80 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher élève, enseignant, UPN, classe..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <div className="bg-white p-1 rounded-lg border border-slate-300 flex text-xs">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1 rounded-md transition ${
                roleFilter === 'all' ? 'bg-blue-600 text-white font-medium' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Tous ({users.length})
            </button>
            <button
              onClick={() => setRoleFilter('student')}
              className={`px-3 py-1 rounded-md transition ${
                roleFilter === 'student' ? 'bg-blue-600 text-white font-medium' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Élèves ({studentsCount})
            </button>
            <button
              onClick={() => setRoleFilter('teacher')}
              className={`px-3 py-1 rounded-md transition ${
                roleFilter === 'teacher' ? 'bg-blue-600 text-white font-medium' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Enseignants ({teachersCount})
            </button>
            <button
              onClick={() => setRoleFilter('anomaly')}
              className={`px-3 py-1 rounded-md transition ${
                roleFilter === 'anomaly' ? 'bg-rose-600 text-white font-medium' : 'text-slate-500 hover:text-rose-700'
              }`}
            >
              Anomalies ({anomaliesCount})
            </button>
          </div>

          {/* Class Filter */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Toutes les classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.code}>
                {c.code} ({c.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Layout: List + Detail Drawer */}
      {filteredUsers.length === 0 ? (
        <div className="bg-slate-50 border border-slate-300/80 rounded-2xl p-10 text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
            <Users className="w-7 h-7" />
          </div>
          <div className="max-w-xl mx-auto space-y-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {users.length === 0 ? "Aucun compte dans l'annuaire" : 'Aucun utilisateur ne correspond à votre filtre'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              {users.length === 0
                ? 'Synchronisez l\'annuaire depuis Microsoft 365. Pour créer ou importer des élèves, utilisez l\'onglet « Rentrée & nouveaux comptes ».'
                : 'Modifiez vos critères de recherche ou réinitialisez le filtre ci-dessus.'}
            </p>
          </div>

          {users.length === 0 && (
            <div className="max-w-sm mx-auto pt-2 text-left space-y-3">
              <div className="p-4 rounded-xl bg-white/80 border border-slate-300 space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                  Microsoft Entra ID
                </div>
                <p className="text-[11px] text-slate-500">
                  Synchronisation directe depuis votre tenant Microsoft 365 (via Graph API).
                </p>
                <button
                  onClick={onPullM365}
                  disabled={isPullingM365}
                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition active:scale-95 text-center"
                >
                  {isPullingM365 ? 'Connexion en cours...' : 'Synchroniser Entra ID'}
                </button>
              </div>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('rentree')}
                  className="w-full py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold transition text-center"
                >
                  Créer ou importer des élèves et professeurs
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Users Table */}
          <div className={`${selectedUser ? 'lg:col-span-2' : 'lg:col-span-3'} bg-slate-50 border border-slate-300/80 rounded-xl overflow-hidden shadow-sm`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-white/80 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-300">
                  <tr>
                    <th className="py-3 px-4">Utilisateur</th>
                    <th className="py-3 px-4">Rôle</th>
                    <th className="py-3 px-4">Classe</th>
                    <th className="py-3 px-4">Spécialités / Affectations</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Fiche</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300/50">
                {filteredUsers.map((u) => {
                  const isSelected = selectedUser?.id === u.id;
                  return (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                            u.role === 'teacher' ? 'bg-blue-50 text-blue-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {(u.firstName[0] || 'U')}{(u.lastName[0] || '')}
                          </div>
                          <div>
                            <div>{u.firstName} {u.lastName}</div>
                            <div className="text-[11px] font-mono text-slate-500">{u.upn}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'teacher'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {u.role === 'teacher' ? 'Enseignant' : 'Élève'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {u.classCode ? (
                          <span className="px-2 py-0.5 rounded bg-white border border-slate-300">
                            {u.classCode}
                          </span>
                        ) : (
                          <span className="text-amber-600 italic">Non renseignée</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {u.role === 'teacher' ? (
                          <span className="text-[11px] text-blue-700">
                            {u.teachingSubjects?.length || 1} groupe(s)
                          </span>
                        ) : u.specialties && u.specialties.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.specialties.map((s) => (
                              <span key={s} className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700">
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Tronc commun standard</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {u.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
                            <AlertTriangle className="w-3.5 h-3.5" /> À vérifier
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(u);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-200 hover:bg-blue-600 text-slate-800 hover:text-slate-900 transition text-[11px]"
                        >
                          Détails
                        </button>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Details Drawer */}
          {selectedUser && (
            <div className="bg-slate-50 border border-slate-300/80 rounded-xl p-5 space-y-5 h-fit shadow-md">
              <div className="flex items-center justify-between border-b border-slate-300 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
                    {(selectedUser.firstName[0] || 'U')}{(selectedUser.lastName[0] || '')}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h3>
                    <span className="text-[11px] text-slate-500 font-mono">{selectedUser.upn}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={openDelete}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-200 rounded-lg transition"
                    title="Supprimer l'utilisateur"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Class Assignment */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Affectation de Classe (Section 17)
                </label>
                <select
                  value={selectedUser.classCode || ''}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                >
                  <option value="">-- Sans classe affectée --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.code}>
                      Classe {c.code} ({c.name})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">
                  Tout changement de classe déclenche le transfert automatique vers les équipes Teams associées.
                </p>
              </div>

              {/* Specialties for Lycée */}
              {selectedUser.role === 'student' && (
                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-slate-700">
                    Spécialités Lycée (Première & Terminale)
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {lyceeSpecialties.map((spe) => {
                      const isSelected = selectedUser.specialties?.includes(spe);
                      return (
                        <button
                          key={spe}
                          onClick={() => handleToggleSpecialty(spe)}
                          className={`px-2 py-1.5 rounded text-[11px] font-medium border text-left transition ${
                            isSelected
                              ? 'bg-blue-50 border-blue-200 text-blue-800'
                              : 'bg-white border-slate-300 text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}{spe}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Expected Teams */}
              <div className="space-y-2 pt-2 border-t border-slate-300/60">
                <span className="block text-xs font-semibold text-slate-700">
                  Équipes Teams associées
                </span>
                <div className="space-y-1 text-xs">
                  {selectedUser.classCode ? (
                    <>
                      {classTeams.length === 0 && (
                        <div className="text-slate-500 italic text-xs">
                          Aucune équipe Teams trouvée pour la classe {selectedUser.classCode}.
                        </div>
                      )}
                      {classTeams.map((t) => (
                        <div key={t.id} className="p-2 rounded bg-white/60 border border-slate-200 text-slate-700">
                          {t.name}
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="text-amber-600 italic text-xs">Veuillez affecter une classe.</div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* Suppression d'un compte */}
      {deleteOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Trash2 className="w-4 h-4 text-rose-600" /> Supprimer {selectedUser.firstName} {selectedUser.lastName}</h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">{selectedUser.upn} · {selectedUser.role === 'teacher' ? 'professeur' : selectedUser.role === 'student' ? 'élève' : 'administrateur'}</p>
              </div>
              <button onClick={() => setDeleteOpen(false)} className="p-1 text-slate-500 hover:text-slate-900"><X className="w-4 h-4" /></button>
            </div>

            {!isRealAccount(selectedUser) ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">Cette fiche n'est liée à aucun compte Microsoft 365 : seule la fiche de l'application sera retirée.</p>
                <button onClick={deleteLocalOnly} className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold">Retirer la fiche</button>
              </div>
            ) : (
              <>
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 space-y-2">
                  <div className="text-xs font-bold text-blue-800">Recommandé : désactiver puis supprimer plus tard</div>
                  <p className="text-[11px] text-slate-600">La connexion est coupée tout de suite, les équipes de classe sont quittées, et le compte est supprimé automatiquement à l'échéance. Il peut être restauré d'ici là (onglet « Rentrée & nouveaux comptes » puis « Comptes sortants »).</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
                    Supprimer dans <input type="number" min={1} max={12} value={delMonths} onChange={e => setDelMonths(Number(e.target.value) || 2)} className="w-14 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs" /> mois
                    <button disabled={delBusy} onClick={() => callAccount('disable', { months: delMonths })} className="ml-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold">Désactiver le compte</button>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 space-y-2">
                  <div className="text-xs font-bold text-rose-800">Supprimer maintenant</div>
                  <p className="text-[11px] text-slate-600">Le compte, sa messagerie et ses fichiers sont supprimés. Microsoft les garde 30 jours dans sa corbeille.</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input value={delConfirm} onChange={e => setDelConfirm(e.target.value)} placeholder="Tapez SUPPRIMER" className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-40" />
                    <button disabled={delBusy || delConfirm !== 'SUPPRIMER'} onClick={() => callAccount('delete-now', { confirm: delConfirm })} className="ml-auto px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-semibold">Supprimer définitivement</button>
                  </div>
                </div>
              </>
            )}

            {delMsg && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">{delMsg}</div>}
            {delError && <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">{delError}</div>}
          </div>
        </div>
      )}

    </div>
  );
};
