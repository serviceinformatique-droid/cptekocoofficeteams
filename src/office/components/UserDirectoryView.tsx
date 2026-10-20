import React, { useState } from 'react';
import { 
  Search, 
  UserCheck, 
  UserX, 
  Key, 
  Award, 
  Edit3, 
  X, 
  Check, 
  Lock, 
  ShieldAlert,
  GraduationCap,
  Users
} from 'lucide-react';
import { UserAccount, M365License, UserRole } from '../types';

interface UserDirectoryViewProps {
  accounts: UserAccount[];
  licenses: M365License[];
  userRole: UserRole;
  onUpdateAccount: (updatedAccount: UserAccount) => void;
  onDeleteAccount?: (id: string) => void;
}

export const UserDirectoryView: React.FC<UserDirectoryViewProps> = ({
  accounts,
  licenses,
  userRole,
  onUpdateAccount,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'tous' | 'eleve' | 'professeur'>('tous');
  const [statusFilter, setStatusFilter] = useState<'tous' | 'actif' | 'inactif'>('tous');
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);

  // User Sheet Edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editNom, setEditNom] = useState('');
  const [editPrenom, setEditPrenom] = useState('');
  const [editType, setEditType] = useState<'eleve' | 'professeur'>('eleve');

  // Password reset modal state
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [forcePasswordChange, setForcePasswordChange] = useState(true);
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  // Licence change state
  const [showLicenseChange, setShowLicenseChange] = useState(false);
  const [selectedLicenseSku, setSelectedLicenseSku] = useState('');

  // Open User Sheet
  const openUserSheet = (user: UserAccount) => {
    setSelectedUser(user);
    setEditNom(user.nom);
    setEditPrenom(user.prenom);
    setEditType(user.type);
    setSelectedLicenseSku(user.licenceSkuId);
    setIsEditingProfile(false);
    setShowPasswordReset(false);
    setShowLicenseChange(false);
    setResetSuccessMessage('');
  };

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.licenceName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'tous' || acc.type === typeFilter;
    const matchesStatus = statusFilter === 'tous' || acc.statut === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Actions
  const handleSaveProfile = () => {
    if (!selectedUser) return;
    const updated: UserAccount = {
      ...selectedUser,
      nom: editNom.toUpperCase(),
      prenom: editPrenom,
      displayName: `${editPrenom} ${editNom.toUpperCase()}`,
      type: editType,
      updatedAt: new Date().toLocaleString('fr-FR'),
    };
    onUpdateAccount(updated);
    setSelectedUser(updated);
    setIsEditingProfile(false);
  };

  const handleToggleStatus = () => {
    if (!selectedUser) return;
    const newStatus = selectedUser.statut === 'actif' ? 'inactif' : 'actif';
    const updated: UserAccount = {
      ...selectedUser,
      statut: newStatus,
      updatedAt: new Date().toLocaleString('fr-FR'),
    };
    onUpdateAccount(updated);
    setSelectedUser(updated);
  };

  const handleApplyNewPassword = () => {
    if (!selectedUser || !newPassword) return;
    const updated: UserAccount = {
      ...selectedUser,
      mustChangePasswordOnNextLogin: forcePasswordChange,
      updatedAt: new Date().toLocaleString('fr-FR'),
    };
    onUpdateAccount(updated);
    setSelectedUser(updated);
    setResetSuccessMessage('Mot de passe réinitialisé avec succès dans Microsoft 365.');
    setNewPassword('');
    setTimeout(() => {
      setShowPasswordReset(false);
      setResetSuccessMessage('');
    }, 1800);
  };

  const handleApplyNewLicense = () => {
    if (!selectedUser || !selectedLicenseSku) return;
    const lic = licenses.find((l) => l.skuId === selectedLicenseSku);
    if (!lic) return;
    const updated: UserAccount = {
      ...selectedUser,
      licenceSkuId: lic.skuId,
      licenceName: lic.displayName,
      updatedAt: new Date().toLocaleString('fr-FR'),
    };
    onUpdateAccount(updated);
    setSelectedUser(updated);
    setShowLicenseChange(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Search Bar (Section 23) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Search className="w-3.5 h-3.5 text-blue-600" />
                Annuaire M365
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Recherche des utilisateurs Microsoft 365
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Consultez l'annuaire synchronisé de l'établissement, inspectez les fiches et gérez les licences.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              <strong className="text-slate-900 font-semibold">{filteredAccounts.length}</strong> compte(s) trouvé(s)
            </span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par nom, prénom, adresse e-mail ou licence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
            />
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
            >
              <option value="tous">Tous les profils (Élèves & Profs)</option>
              <option value="eleve">Élèves uniquement</option>
              <option value="professeur">Professeurs uniquement</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
            >
              <option value="tous">Tous les statuts</option>
              <option value="actif">Comptes actifs</option>
              <option value="inactif">Comptes désactivés</option>
            </select>
          </div>
        </div>
      </div>

      {/* Accounts List Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Utilisateur</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Licence Microsoft 365</th>
                <th className="py-3.5 px-4">Groupe Entra ID</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4">Dernière sync</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.map((acc) => (
                <tr
                  key={acc.id}
                  onClick={() => openUserSheet(acc)}
                  className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 text-sm">{acc.displayName}</div>
                    <div className="font-mono text-[11px] text-slate-500">{acc.email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        acc.type === 'eleve'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {acc.type === 'eleve' ? (
                        <>
                          <GraduationCap className="w-3 h-3 text-blue-600" /> Élève
                        </>
                      ) : (
                        <>
                          <Users className="w-3 h-3 text-indigo-600" /> Professeur
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-medium text-slate-800 truncate max-w-[200px] block" title={acc.licenceName}>
                      {acc.licenceName}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">
                    {acc.groups.join(', ') || '-'}
                  </td>
                  <td className="py-3.5 px-4">
                    {acc.statut === 'actif' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        Inactif
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">{acc.lastSyncDate}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openUserSheet(acc);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors border border-slate-200 shadow-xs"
                    >
                      Fiche
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FICHE UTILISATEUR MODALE / TIROIR (Section 24 du cahier des charges)      */}
      {/* ========================================================================= */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-slate-50/80 border-b border-slate-200 flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-11 h-11 rounded-lg flex items-center justify-center font-bold text-base text-white shadow-xs ${
                    selectedUser.type === 'eleve'
                      ? 'bg-blue-600'
                      : 'bg-indigo-600'
                  }`}
                >
                  {selectedUser.prenom[0]}
                  {selectedUser.nom[0]}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                    {selectedUser.displayName}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs text-slate-500">{selectedUser.email}</span>
                    <span className="text-slate-300">•</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        selectedUser.statut === 'actif'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {selectedUser.statut === 'actif' ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs">
              {/* Profile Details or Edit Form */}
              {!isEditingProfile ? (
                <div className="grid grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block mb-1">Email / UPN :</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {selectedUser.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Type d'utilisateur :</span>
                    <span className="font-semibold text-slate-900">
                      {selectedUser.type === 'eleve' ? 'Élève' : 'Professeur'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Licence Microsoft 365 :</span>
                    <span className="font-semibold text-blue-600">
                      {selectedUser.licenceName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Dernière synchronisation :</span>
                    <span className="font-semibold text-slate-900">
                      {selectedUser.lastSyncDate}
                    </span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-500 block mb-1">Groupe Entra ID :</span>
                    <span className="font-mono text-slate-700">
                      {selectedUser.groups.join(', ') || 'Aucun'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-900 mb-2">Modifier l'identité</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Nom :</label>
                      <input
                        type="text"
                        value={editNom}
                        onChange={(e) => setEditNom(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Prénom :</label>
                      <input
                        type="text"
                        value={editPrenom}
                        onChange={(e) => setEditPrenom(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-slate-600 font-medium mb-1">Catégorie :</label>
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value as any)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="eleve">Élève</option>
                        <option value="professeur">Professeur</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              )}

              {/* Password Reset Sub-panel */}
              {showPasswordReset && (
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-600" />
                    Réinitialiser le mot de passe Microsoft 365
                  </h4>

                  {resetSuccessMessage ? (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      {resetSuccessMessage}
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-slate-600 font-medium mb-1">Nouveau mot de passe temporaire :</label>
                        <input
                          type="password"
                          value={newPassword}
                          placeholder="Min. 8 caractères (ex: Temp9876!)"
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-slate-700">
                        <input
                          type="checkbox"
                          checked={forcePasswordChange}
                          onChange={(e) => setForcePasswordChange(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-0"
                        />
                        <span>Forcer le changement de mot de passe à la première connexion</span>
                      </label>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowPasswordReset(false)}
                          className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          disabled={!newPassword || newPassword.length < 8}
                          onClick={handleApplyNewPassword}
                          className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold shadow-xs transition-colors"
                        >
                          Appliquer
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* License Change Sub-panel */}
              {showLicenseChange && (
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-600" />
                    Modifier la licence Microsoft 365
                  </h4>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Choisir une nouvelle licence SKU :</label>
                    <select
                      value={selectedLicenseSku}
                      onChange={(e) => setSelectedLicenseSku(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      {licenses.map((lic) => (
                        <option key={lic.skuId} value={lic.skuId}>
                          {lic.displayName} ({lic.availableUnits} dispos)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowLicenseChange(false)}
                      className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyNewLicense}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                    >
                      Changer la licence
                    </button>
                  </div>
                </div>
              )}

              {/* Operator restriction notice */}
              {userRole === 'operateur' && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Profil Opérateur : modifications restreintes conformément aux droits d'accès.</span>
                </div>
              )}

              {/* Action Buttons (Section 24: [ Modifier ] [ Réinitialiser ] [ Modifier licence ] [ Désactiver ]) */}
              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={userRole === 'operateur'}
                  onClick={() => {
                    setIsEditingProfile(!isEditingProfile);
                    setShowPasswordReset(false);
                    setShowLicenseChange(false);
                  }}
                  className="py-2.5 px-3 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-semibold flex items-center justify-center gap-1.5 border border-slate-200 shadow-xs transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Modifier profil
                </button>

                <button
                  type="button"
                  disabled={userRole === 'operateur'}
                  onClick={() => {
                    setShowPasswordReset(!showPasswordReset);
                    setIsEditingProfile(false);
                    setShowLicenseChange(false);
                  }}
                  className="py-2.5 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed text-amber-800 font-semibold flex items-center justify-center gap-1.5 border border-amber-200 shadow-xs transition-colors"
                >
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  Réinitialiser mot de passe
                </button>

                <button
                  type="button"
                  disabled={userRole === 'operateur'}
                  onClick={() => {
                    setShowLicenseChange(!showLicenseChange);
                    setIsEditingProfile(false);
                    setShowPasswordReset(false);
                  }}
                  className="py-2.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed text-blue-800 font-semibold flex items-center justify-center gap-1.5 border border-blue-200 shadow-xs transition-colors"
                >
                  <Award className="w-3.5 h-3.5 text-blue-600" />
                  Modifier la licence
                </button>

                <button
                  type="button"
                  disabled={userRole === 'operateur'}
                  onClick={handleToggleStatus}
                  className={`py-2.5 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 border shadow-xs transition-colors ${
                    selectedUser.statut === 'actif'
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {selectedUser.statut === 'actif' ? (
                    <>
                      <UserX className="w-3.5 h-3.5 text-rose-600" />
                      Désactiver
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Activer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
