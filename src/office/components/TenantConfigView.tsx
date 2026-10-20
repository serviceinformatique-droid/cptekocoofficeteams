import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Key, 
  ShieldCheck, 
  Globe, 
  Check, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Server, 
  Lock, 
  ExternalLink,
  Shield,
  Eye,
  EyeOff,
  Building2
} from 'lucide-react';
import { TenantConfig, UserRole } from '../types';

interface TenantConfigViewProps {
  config: TenantConfig;
  userRole: UserRole;
  onUpdateConfig: (newConfig: TenantConfig) => void;
}

export const TenantConfigView: React.FC<TenantConfigViewProps> = ({
  config,
  userRole,
  onUpdateConfig,
}) => {
  const [formData, setFormData] = useState<TenantConfig>({
    ...config,
    clientSecret: config.clientSecret || '',
  });
  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'success' | 'error' | null;
    message: string;
  }>({ status: null, message: '' });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [organizationName, setOrganizationName] = useState<string>('');
  const [verifiedDomains, setVerifiedDomains] = useState<string[]>([]);

  // Load configuration from backend if available
  useEffect(() => {
    fetch('/api/office/tenant/config')
      .then((res) => res.json())
      .then((serverCfg) => {
        if (serverCfg && serverCfg.tenantId) {
          setFormData((prev) => ({
            ...prev,
            tenantId: serverCfg.tenantId || prev.tenantId,
            clientId: serverCfg.clientId || prev.clientId,
                        domain: serverCfg.domain || prev.domain,
          }));
          if (serverCfg.organizationName) {
            setOrganizationName(serverCfg.organizationName);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult({ status: null, message: '' });

    try {
      const res = await fetch('/api/office/graph/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: formData.tenantId,
          clientId: formData.clientId,
          clientSecret: formData.clientSecret,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Échec de connexion Microsoft Graph');
      }

      setTestResult({
        status: 'success',
        message: data.message,
      });

      if (data.organizationName) {
        setOrganizationName(data.organizationName);
      }

      if (data.verifiedDomains && data.verifiedDomains.length > 0) {
        const doms = data.verifiedDomains.map((d: any) => d.name);
        setVerifiedDomains(doms);
        if (!formData.domain && data.domain) {
          const updated = { ...formData, domain: data.domain };
          setFormData(updated);
          onUpdateConfig(updated);
        }
      }
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: err.message || 'Erreur lors du test de connexion Microsoft Graph',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig(formData);
    try {
      await fetch('/api/office/tenant/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
    } catch (err) {
      console.warn('Erreur sauvegarde serveur:', err);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Settings className="w-3.5 h-3.5 text-blue-600" />
            Configuration Graph API
          </span>
          {organizationName && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Building2 className="w-3 h-3" />
              Tenant réel : {organizationName}
            </span>
          )}
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Paramétrage Microsoft 365 & Entra ID
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Identifiants de l'application inscrite sur le portail Microsoft Entra ID (Azure AD) avec autorisations d'application Microsoft Graph.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn shadow-xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Configuration enregistrée avec succès sur le serveur !</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Credentials & Domain */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-600" />
              Identifiants de connexion Microsoft Graph
            </h3>

            <div className="space-y-3.5 text-xs">
              {/* Tenant ID */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  ID de l'annuaire (Tenant ID) :
                </label>
                <input
                  type="text"
                  value={formData.tenantId}
                  disabled={userRole === 'operateur'}
                  onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                  placeholder="ex: 55b01275-e53b-4146-94a3-cb58e71ec7bf"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Identifiant unique de votre organisation Microsoft 365 Éducation.
                </span>
              </div>

              {/* Client ID */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  ID d'application (Client ID) :
                </label>
                <input
                  type="text"
                  value={formData.clientId}
                  disabled={userRole === 'operateur'}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  placeholder="ex: 1b4e3135-da49-4e36-9d17-d15d3ab497d3"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Client Secret */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Valeur du secret client (Client Secret) :
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={formData.clientSecret || ''}
                    disabled={userRole === 'operateur'}
                    onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                    placeholder="Saisissez la valeur du secret client"
                    className="w-full p-2.5 pr-10 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Chiffré au repos sous Debian 12 / Docker. Utilisé pour les appels Microsoft Graph v1.0.
                </span>
              </div>

              {/* Domain */}
              <div className="pt-2">
                <label className="block text-slate-700 font-semibold mb-1">
                  Domaine de messagerie officiel de l'établissement :
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.domain || ''}
                    disabled={userRole === 'operateur'}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    placeholder="ex: votre-etablissement.fr"
                    className="w-full pl-9 p-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                {verifiedDomains.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span>Domaines vérifiés du tenant :</span>
                    {verifiedDomains.map((dom) => (
                      <button
                        key={dom}
                        type="button"
                        onClick={() => setFormData({ ...formData, domain: dom })}
                        className={`px-2 py-0.5 rounded border text-[11px] font-medium transition-colors ${
                          formData.domain === dom
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        @{dom}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Test Connection Button & Status */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <button
                type="button"
                id="btn-test-connection"
                disabled={isTesting}
                onClick={handleTestConnection}
                className="px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-200 shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Interrogation Microsoft Graph en cours...' : 'Tester la connexion Microsoft Graph'}</span>
              </button>

              {userRole === 'admin' && (
                <button
                  type="submit"
                  id="btn-save-config"
                  className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all"
                >
                  Enregistrer les paramètres
                </button>
              )}
            </div>

            {testResult.status && (
              <div
                className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
                  testResult.status === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {testResult.status === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Password Security Policies (Section 12 & 13) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              Politique des mots de passe temporaires
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.forcePasswordChangeOnFirstLogin}
                  disabled={userRole === 'operateur'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      forcePasswordChangeOnFirstLogin: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 border-slate-300"
                />
                <span className="font-semibold text-slate-700">
                  Forcer le changement de mot de passe à la première connexion (Recommandé)
                </span>
              </label>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 space-y-1">
                <div className="text-slate-900 font-semibold mb-1">
                  Règles de complexité imposées par Microsoft 365 :
                </div>
                <div>• Longueur minimale de 8 caractères</div>
                <div>• Au moins 3 types parmi : Majuscules (A-Z), Minuscules (a-z), Chiffres (0-9), Symboles</div>
                <div>• Le mot de passe temporaire doit figurer dans la colonne <code className="text-slate-800 font-mono bg-white px-1 py-0.5 rounded border border-slate-200">password</code> du CSV</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Microsoft Graph Permissions (Section 16) & Infrastructure (Section 29) */}
        <div className="space-y-6">
          {/* Permissions Entra ID */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">Autorisations Microsoft Graph</h3>
            </div>
            <p className="text-xs text-slate-500">
              Type : <strong className="text-slate-700">Autorisations d'application</strong> (Consentement accordé par l'administrateur général du tenant).
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-mono font-bold text-slate-900">User.ReadWrite.All</div>
                  <span className="text-slate-500 text-[11px]">Créer et mettre à jour les comptes utilisateurs</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-mono font-bold text-slate-900">Directory.ReadWrite.All</div>
                  <span className="text-slate-500 text-[11px]">Gestion des attributs d'annuaire et des licences</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-mono font-bold text-slate-900">Group.ReadWrite.All</div>
                  <span className="text-slate-500 text-[11px]">Affectation aux groupes ELEVE et PROFESSEURS</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-mono font-bold text-slate-900">Organization.Read.All</div>
                  <span className="text-slate-500 text-[11px]">Lecture des quotas de licences souscrites</span>
                </div>
              </div>
            </div>
          </div>

          {/* Infrastructure & Security (Section 29) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">Environnement & Déploiement</h3>
            </div>
            <div className="space-y-2 text-slate-700">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Système hôte :</span>
                <span className="font-semibold text-slate-800">Debian 12 Bookworm</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Conteneurisation :</span>
                <span className="font-semibold text-slate-800">Docker & Docker Compose</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Base de données :</span>
                <span className="font-semibold text-slate-800">PostgreSQL 16</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Chiffrement :</span>
                <span className="font-semibold text-emerald-700">TLS 1.3 / HTTPS obligatoire</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Protection :</span>
                <span className="font-semibold text-slate-800">Anti-CSRF & Rate Limiting</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
