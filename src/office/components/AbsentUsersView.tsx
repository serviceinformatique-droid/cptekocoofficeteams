import React, { useState } from 'react';
import { 
  UserX, 
  AlertTriangle, 
  CheckCircle, 
  Trash2, 
  ShieldAlert, 
  Info,
  Download,
  GraduationCap,
  Users
} from 'lucide-react';
import { UserAccount, UserRole, AbsentAccount } from '../types';
import { triggerDownload } from '../utils/csvParser';

interface AbsentUsersViewProps {
  accounts: UserAccount[];
  absentAccounts: AbsentAccount[];
  userRole: UserRole;
  onUpdateAccount: (account: UserAccount) => void;
  onDeleteAccount: (id: string) => void;
}

export const AbsentUsersView: React.FC<AbsentUsersViewProps> = ({
  accounts,
  absentAccounts: initialAbsent,
  userRole,
  onUpdateAccount,
  onDeleteAccount,
}) => {
  // Pre-seed absent accounts from accounts if none provided by import yet
  const [absentList, setAbsentList] = useState<AbsentAccount[]>(() => {
    if (initialAbsent.length > 0) return initialAbsent;
    // Default detector: accounts containing "ancien" or inactive or marked
    return accounts
      .filter((a) => a.email.includes('ancien') || a.nom.includes('ANCIEN'))
      .map((a) => ({
        account: a,
        missingFrom: a.type === 'eleve' ? 'eleves' : 'professeurs',
        detectionDate: '01/09/2026',
        potentialStatus:
          a.type === 'eleve'
            ? 'Ancien élève ayant quitté l’établissement scolaire'
            : 'Enseignant non reconduit ou muté',
      }));
  });

  const [keptIds, setKeptIds] = useState<Set<string>>(new Set());

  const handleDeactivate = (acc: UserAccount) => {
    const updated: UserAccount = {
      ...acc,
      statut: 'inactif',
      updatedAt: new Date().toLocaleString('fr-FR'),
    };
    onUpdateAccount(updated);
    setAbsentList(absentList.map((item) => (item.account.id === acc.id ? { ...item, account: updated } : item)));
  };

  const handleKeep = (id: string) => {
    const newSet = new Set(keptIds);
    newSet.add(id);
    setKeptIds(newSet);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer définitivement ce compte de Microsoft 365 ?')) {
      onDeleteAccount(id);
      setAbsentList(absentList.filter((item) => item.account.id !== id));
    }
  };

  const handleExportAbsent = () => {
    let csv = 'nom;prenom;email;type;statut;date_detection;motif\r\n';
    for (const item of absentList) {
      csv += `${item.account.nom};${item.account.prenom};${item.account.email};${item.account.type};${item.account.statut};${item.detectionDate};"${item.potentialStatus}"\r\n`;
    }
    triggerDownload(csv, 'comptes_absents_m365.csv', 'text/csv');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner Notice (Section 25) */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Gestion des utilisateurs absents des fichiers CSV
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  Section 25
                </span>
              </div>
              <p className="text-xs text-amber-900/80 mt-1 max-w-2xl leading-relaxed">
                Ces comptes existent dans votre tenant Microsoft 365 mais ne figurent plus dans les derniers fichiers CSV importés. 
                <strong className="text-slate-900 font-semibold"> Important : le logiciel ne supprime jamais automatiquement ces comptes</strong> pour éviter toute perte accidentelle de données d'anciens élèves ou professeurs.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportAbsent}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 shadow-xs transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            Exporter la liste
          </button>
        </div>
      </div>

      {/* Absent Accounts List */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <h3 className="text-base font-bold text-slate-900">
            Comptes non référencés ({absentList.length})
          </h3>
          <span className="text-xs text-slate-500">
            Actions d'administration : Désactiver (recommandé), Conserver ou Supprimer
          </span>
        </div>

        {absentList.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">
              Aucun compte absent détecté
            </p>
            <p className="text-xs text-slate-500">
              Tous les comptes de votre tenant Microsoft 365 sont conformes aux listes scolaires.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {absentList.map(({ account, missingFrom, potentialStatus }) => {
              const isKept = keptIds.has(account.id);

              return (
                <div
                  key={account.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    account.statut === 'inactif'
                      ? 'bg-slate-50 border-slate-200 opacity-75'
                      : isKept
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shadow-xs ${
                        account.type === 'eleve'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {account.type === 'eleve' ? (
                        <GraduationCap className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Users className="w-5 h-5 text-indigo-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{account.displayName}</span>
                        <span className="text-xs font-mono text-slate-500">({account.email})</span>
                        {account.statut === 'inactif' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Désactivé
                          </span>
                        )}
                        {isKept && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Conservé volontairement
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-amber-800 mt-1 flex-wrap">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Absent du fichier {missingFrom === 'eleves' ? 'Élèves' : 'Professeurs'}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500">{potentialStatus}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for this absent account */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {account.statut === 'actif' && (
                      <button
                        type="button"
                        disabled={userRole === 'operateur'}
                        onClick={() => handleDeactivate(account)}
                        className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                        title="Bloque la connexion au compte tout en conservant les données"
                      >
                        <UserX className="w-3.5 h-3.5 text-amber-600" />
                        Désactiver
                      </button>
                    )}

                    {!isKept && (
                      <button
                        type="button"
                        onClick={() => handleKeep(account.id)}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 shadow-xs transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Conserver
                      </button>
                    )}

                    {userRole === 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleDelete(account.id)}
                        className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 shadow-xs transition-colors"
                        title="Supprimer définitivement le compte Microsoft 365"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
