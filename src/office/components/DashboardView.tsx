import React from 'react';
import { 
  GraduationCap, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  FileSpreadsheet, 
  RefreshCw, 
  Layers, 
  ShieldCheck,
  Server
} from 'lucide-react';
import { UserAccount, M365License, SynchronizationRecord, TenantConfig } from '../types';

interface DashboardViewProps {
  accounts: UserAccount[];
  licenses: M365License[];
  syncHistory: SynchronizationRecord[];
  tenantConfig: TenantConfig;
  onNavigateToImport: () => void;
  onNavigateToLicenses: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  accounts,
  licenses,
  syncHistory,
  tenantConfig,
  onNavigateToImport,
  onNavigateToLicenses,
}) => {
  const elevesCount = accounts.filter((a) => a.type === 'eleve').length;
  const profsCount = accounts.filter((a) => a.type === 'professeur').length;
  const activeCount = accounts.filter((a) => a.statut === 'actif').length;

  const eleveLicence = licenses.find((l) => l.skuId === tenantConfig.defaultEleveSkuId);
  const profLicence = licenses.find((l) => l.skuId === tenantConfig.defaultProfSkuId);

  const lastSync = syncHistory[0];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Welcome */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Microsoft 365 Connecté
              </span>
              <span className="text-xs text-slate-500">Tenant : <strong className="text-slate-700">{tenantConfig.domain || "non défini"}</strong></span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Gestion des comptes Microsoft 365
            </h1>
            <p className="text-slate-600 text-sm sm:text-base mt-1 max-w-2xl">
              Automatisation du cycle de vie des comptes élèves (A1) et enseignants (A3), attribution des licences et synchronisation Microsoft Graph API.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-dash-sync"
              onClick={onNavigateToImport}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Démarrer une synchronisation</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Stats Cards (Matching Clean Minimalism theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Élèves */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Élèves Actifs</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{elevesCount}</span>
            <span className="text-xs text-slate-400">comptes</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Licence :</span>
            <span className="font-semibold text-blue-600 truncate max-w-[140px]" title={eleveLicence?.displayName}>
              {eleveLicence?.displayName || 'M365 A1'}
            </span>
          </div>
        </div>

        {/* Professeurs */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Professeurs</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{profsCount}</span>
            <span className="text-xs text-slate-400">comptes</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Licence :</span>
            <span className="font-semibold text-blue-600 truncate max-w-[140px]" title={profLicence?.displayName}>
              {profLicence?.displayName || 'M365 A3'}
            </span>
          </div>
        </div>

        {/* Comptes Actifs */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Comptes Actifs</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{activeCount}</span>
            <span className="text-xs text-slate-400">/ {accounts.length}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Groupes Entra ID :</span>
            <span className="font-medium text-slate-600 truncate max-w-[140px]">
              {tenantConfig.groupEleve} • {tenantConfig.groupProf}
            </span>
          </div>
        </div>

        {/* Dernière synchronisation */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Synchronisation</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900">
              {lastSync ? lastSync.date.split(' ')[0] : 'Prêt'}
            </span>
            <span className="text-xs text-slate-400">{lastSync ? lastSync.date.split(' ')[1] : ''}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Anomalies :</span>
            <span className={`font-semibold ${lastSync && lastSync.stats.totalErrors > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
              {lastSync ? `${lastSync.stats.totalErrors} erreur(s)` : '0 anomalie'}
            </span>
          </div>
        </div>
      </div>

      {/* Licences Microsoft 365 Quotas */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Licences Microsoft 365 disponibles dans le tenant</h2>
              <p className="text-xs text-slate-500">
                État des stocks en temps réel extrait du centre d'administration Microsoft 365
              </p>
            </div>
          </div>
          <button
            id="btn-manage-licenses"
            onClick={onNavigateToLicenses}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            <span>Gérer les licences</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {licenses.slice(0, 6).map((lic) => {
            const isUnlimited = lic.totalUnits >= 999999;
            const percentage = isUnlimited ? 0 : Math.min(100, Math.round((lic.consumedUnits / lic.totalUnits) * 100));
            const isLowStock = !isUnlimited && lic.availableUnits < 20;

            return (
              <div
                key={lic.skuId}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-semibold text-sm text-slate-800 line-clamp-1" title={lic.displayName}>
                      {lic.displayName}
                    </span>
                    {isLowStock && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-red-50 text-red-600 border border-red-200">
                        Stock limité
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mb-3 font-mono">
                    <strong className="text-slate-800">{lic.availableUnits.toLocaleString('fr-FR')}</strong> disponible(s) sur{' '}
                    {isUnlimited ? 'Illimité' : lic.totalUnits.toLocaleString('fr-FR')}
                  </div>
                </div>

                {!isUnlimited && (
                  <div className="w-full">
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                      <span>{lic.consumedUnits} attribuée(s)</span>
                      <span className="font-medium">{percentage}%</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Synchronisation Workflow Card / Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-600" />
            Fonctionnement cible en 4 étapes
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Déposez simplement vos deux exports CSV scolaires. Le moteur contrôle les formats, prévisualise les actions et applique les licences A1/A3 via Graph API.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex gap-3.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 font-bold text-xs flex items-center justify-center shrink-0">
                1
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Import CSV Élèves & Profs</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Déposez <code className="text-blue-600 font-medium">eleves.csv</code> (A1) et <code className="text-blue-600 font-medium">professeurs.csv</code> (A3).
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex gap-3.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 font-bold text-xs flex items-center justify-center shrink-0">
                2
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Contrôle & Détection doublons</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Validation des emails, mots de passe de 8+ car., détection des doublons croisés.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex gap-3.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 font-bold text-xs flex items-center justify-center shrink-0">
                3
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Mode Simulation & Prévisualisation</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Aperçu clair : 🟢 Créations, 🟠 Modifications, 🟣 Changements de licences.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex gap-3.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 font-bold text-xs flex items-center justify-center shrink-0">
                4
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Synchronisation Graph & Rapport</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Création, licences, ajout aux groupes Entra ID et export du rapport CSV/Excel.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Security & GDPR Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 mb-2">
              <Server className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Sécurité & Conformité RGPD</h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Conçu pour les établissements scolaires avec une protection stricte des données personnelles :
            </p>
            <ul className="mt-3 space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Mots de passe jamais affichés en clair dans les logs</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Changement de mot de passe obligatoire à la 1ère connexion</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Permissions Graph API au strict minimum (Moindre privilège)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Aucune suppression automatique sans validation humaine</span>
              </li>
            </ul>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <button
              onClick={onNavigateToImport}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <span>Accéder à l'outil d'importation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
