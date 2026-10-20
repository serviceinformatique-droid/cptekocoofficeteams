import React, { useState } from 'react';
import { 
  Award, 
  Layers, 
  RefreshCw, 
  Check, 
  ShieldCheck, 
  Plus, 
  ExternalLink,
  GraduationCap,
  Users
} from 'lucide-react';
import { M365License, TenantConfig, UserRole } from '../types';

interface LicensesViewProps {
  licenses: M365License[];
  tenantConfig: TenantConfig;
  userRole: UserRole;
  onUpdateLicenses: (licenses: M365License[]) => void;
  onUpdateTenantConfig: (config: TenantConfig) => void;
}

export const LicensesView: React.FC<LicensesViewProps> = ({
  licenses,
  tenantConfig,
  userRole,
  onUpdateLicenses,
  onUpdateTenantConfig,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Sku selection state
  const [selectedEleveSku, setSelectedEleveSku] = useState(tenantConfig.defaultEleveSkuId);
  const [selectedProfSku, setSelectedProfSku] = useState(tenantConfig.defaultProfSkuId);

  // Modal new SKU
  const [showAddSkuModal, setShowAddSkuModal] = useState(false);
  const [newSkuName, setNewSkuName] = useState('');
  const [newSkuPartNumber, setNewSkuPartNumber] = useState('');
  const [newSkuTotalUnits, setNewSkuTotalUnits] = useState(100);

  const handleRefreshGraph = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setSaveMessage('Synchronisation des licences depuis Microsoft Graph effectuée.');
      setTimeout(() => setSaveMessage(''), 3000);
    }, 900);
  };

  const handleSaveMapping = () => {
    const updated = {
      ...tenantConfig,
      defaultEleveSkuId: selectedEleveSku,
      defaultProfSkuId: selectedProfSku,
    };
    onUpdateTenantConfig(updated);
    setSaveMessage('Associations de licences enregistrées avec succès !');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleCreateCustomSku = () => {
    if (!newSkuName) return;
    const newSku: M365License = {
      skuId: `sku-${Date.now()}`,
      skuPartNumber: newSkuPartNumber || newSkuName.toUpperCase().replace(/\s+/g, '_'),
      displayName: newSkuName,
      targetType: 'tous',
      totalUnits: Number(newSkuTotalUnits) || 100,
      consumedUnits: 0,
      availableUnits: Number(newSkuTotalUnits) || 100,
      active: true,
    };
    onUpdateLicenses([...licenses, newSku]);
    setShowAddSkuModal(false);
    setNewSkuName('');
    setNewSkuPartNumber('');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner Notice (Section 9 & 37) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Award className="w-3.5 h-3.5 text-blue-600" />
              Licences M365 (SKU)
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Gestion des licences Microsoft 365
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Les licences ne sont pas codées en dur : elles proviennent directement de votre tenant Microsoft 365 via Microsoft Graph API. Vous pouvez adapter les correspondances à tout moment.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            id="btn-refresh-licenses"
            onClick={handleRefreshGraph}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-200 shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Actualiser depuis Graph API</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {saveMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn shadow-xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Mapping Configuration Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          Attribution automatique des licences par fichier
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Définissez la référence SKU attribuée à chaque catégorie lors de l'import des fichiers CSV.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Élèves Mapping */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-700">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>Licence par défaut pour les ÉLÈVES</span>
            </div>
            <p className="text-xs text-slate-500">
              Appliquée automatiquement aux utilisateurs du fichier <code className="text-blue-700 font-semibold bg-blue-50 px-1 py-0.5 rounded">eleves.csv</code>
            </p>
            <select
              value={selectedEleveSku}
              disabled={userRole === 'operateur'}
              onChange={(e) => setSelectedEleveSku(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium shadow-xs"
            >
              {licenses.map((lic) => (
                <option key={lic.skuId} value={lic.skuId}>
                  {lic.displayName} ({lic.availableUnits.toLocaleString('fr-FR')} disponible(s))
                </option>
              ))}
            </select>
          </div>

          {/* Professeurs Mapping */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-700">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Licence par défaut pour les PROFESSEURS</span>
            </div>
            <p className="text-xs text-slate-500">
              Appliquée automatiquement aux utilisateurs du fichier <code className="text-indigo-700 font-semibold bg-indigo-50 px-1 py-0.5 rounded">professeurs.csv</code>
            </p>
            <select
              value={selectedProfSku}
              disabled={userRole === 'operateur'}
              onChange={(e) => setSelectedProfSku(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium shadow-xs"
            >
              {licenses.map((lic) => (
                <option key={lic.skuId} value={lic.skuId}>
                  {lic.displayName} ({lic.availableUnits.toLocaleString('fr-FR')} disponible(s))
                </option>
              ))}
            </select>
          </div>
        </div>

        {userRole === 'admin' && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              id="btn-save-license-mapping"
              onClick={handleSaveMapping}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all"
            >
              Enregistrer les correspondances
            </button>
          </div>
        )}
      </div>

      {/* Real-time Subscribed SKUs Table (Section 37 & Screenshot) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Abonnements & Licences actives dans le tenant Microsoft 365
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Source : Endpoint Microsoft Graph API <code className="text-slate-700 font-mono">/v1.0/subscribedSkus</code>
            </p>
          </div>

          {userRole === 'admin' && (
            <button
              type="button"
              onClick={() => setShowAddSkuModal(true)}
              className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200 shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              Ajouter SKU
            </button>
          )}
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Nom de la licence (Affichage)</th>
                <th className="py-3.5 px-4">Référence SKU Part Number</th>
                <th className="py-3.5 px-4 text-right">Unités attribuées</th>
                <th className="py-3.5 px-4 text-right">Disponibles</th>
                <th className="py-3.5 px-4 text-right">Total abonnement</th>
                <th className="py-3.5 px-4 text-center">Rôle attribué</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {licenses.map((lic) => {
                const isUnlimited = lic.totalUnits >= 999999;
                const isEleveDefault = lic.skuId === tenantConfig.defaultEleveSkuId;
                const isProfDefault = lic.skuId === tenantConfig.defaultProfSkuId;

                return (
                  <tr key={lic.skuId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{lic.displayName}</span>
                        {isEleveDefault && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Défaut Élèves
                          </span>
                        )}
                        {isProfDefault && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Défaut Professeurs
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {lic.skuPartNumber}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-700 font-mono">
                      {lic.consumedUnits.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                      {isUnlimited ? 'Illimité' : lic.availableUnits.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 font-mono">
                      {isUnlimited ? 'Illimité' : lic.totalUnits.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-[11px] font-medium text-slate-600">
                        {lic.targetType === 'eleve'
                          ? '👨‍🎓 Élèves'
                          : lic.targetType === 'professeur'
                          ? '👨‍🏫 Enseignants'
                          : 'Tous'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Custom SKU Modal */}
      {showAddSkuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Ajouter une référence de licence SKU</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Nom d'affichage (ex: Office 365 A5) :</label>
                <input
                  type="text"
                  value={newSkuName}
                  onChange={(e) => setNewSkuName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">SKU Part Number (optionnel) :</label>
                <input
                  type="text"
                  value={newSkuPartNumber}
                  placeholder="ex: ENTERPRISEPREMIUM_FACULTY"
                  onChange={(e) => setNewSkuPartNumber(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Nombre d'unités souscrites :</label>
                <input
                  type="number"
                  value={newSkuTotalUnits}
                  onChange={(e) => setNewSkuTotalUnits(Number(e.target.value))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddSkuModal(false)}
                className="px-4 py-2 rounded-lg text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCreateCustomSku}
                disabled={!newSkuName}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs"
              >
                Ajouter la licence
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
