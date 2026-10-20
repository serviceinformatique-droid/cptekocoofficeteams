import React from 'react';
import { 
  Users, 
  Upload, 
  Search, 
  UserX, 
  Award, 
  History, 
  Settings, 
  Shield, 
  ShieldAlert, 
  CheckCircle2, 
  Building2,
  Lock
} from 'lucide-react';
import { UserRole, TenantConfig } from '../types';

interface NavbarProps {
  activeTab?: string;
  currentView?: string;
  setActiveTab?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
  userRole: UserRole;
  setUserRole?: (role: UserRole) => void;
  onToggleRole?: () => void;
  tenantConfig?: TenantConfig;
  hasPendingCsv?: boolean;
  absentCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  currentView,
  setActiveTab,
  onNavigate,
  userRole,
  setUserRole,
  onToggleRole,
  tenantConfig,
  hasPendingCsv,
  absentCount,
}) => {
  const current = currentView || activeTab || 'dashboard';

  const navigate = (view: string) => {
    if (onNavigate) {
      onNavigate(view);
    } else if (setActiveTab) {
      setActiveTab(view);
    }
  };

  const handleRoleChange = (newRole: UserRole) => {
    if (setUserRole) {
      setUserRole(newRole);
    } else if (onToggleRole) {
      onToggleRole();
    }
  };

  const domain = tenantConfig?.domain || 'Microsoft 365 Entra ID';

  return (
    <header className="bg-white border-b border-slate-200 relative shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & School context */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">SyncM365 Éducation</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 font-semibold">
                  M365 & Graph API
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Tenant : <strong className="text-slate-700 font-medium">{domain}</strong></span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">Microsoft Entra ID</span>
              </div>
            </div>
          </div>

          {/* Role switcher & quick status */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
              <button
                id="role-btn-admin"
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  userRole === 'admin'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Administrateur IT
              </button>
              <button
                id="role-btn-operateur"
                type="button"
                onClick={() => handleRoleChange('operateur')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  userRole === 'operateur'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Opérateur
              </button>
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Connecté à Microsoft 365</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-100">
          <button
            id="tab-dashboard"
            onClick={() => navigate('dashboard')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              current === 'dashboard'
                ? 'bg-slate-100 text-blue-600 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            Tableau de bord
          </button>

          <button
            id="tab-import"
            onClick={() => navigate('import')}
            className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              current === 'import'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-700 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Import & Synchronisation</span>
            {hasPendingCsv && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            )}
          </button>

          <button
            id="tab-directory"
            onClick={() => navigate('users')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              current === 'users' || current === 'directory'
                ? 'bg-slate-100 text-blue-600 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Search className="w-4 h-4" />
            Utilisateurs & Fiches M365
          </button>

          <button
            id="tab-absent"
            onClick={() => navigate('absent')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              current === 'absent'
                ? 'bg-amber-50 text-amber-700 font-semibold border border-amber-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <UserX className="w-4 h-4" />
            <span>Comptes absents</span>
            {absentCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                {absentCount}
              </span>
            )}
          </button>

          <button
            id="tab-licenses"
            onClick={() => navigate('licenses')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              current === 'licenses'
                ? 'bg-slate-100 text-blue-600 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Award className="w-4 h-4" />
            Licences (SKU)
          </button>

          <button
            id="tab-logs"
            onClick={() => navigate('logs')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              current === 'logs'
                ? 'bg-slate-100 text-blue-600 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4" />
            Journaux & Rapports
          </button>

          <button
            id="tab-settings"
            onClick={() => navigate('config')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              current === 'config' || current === 'settings'
                ? 'bg-slate-100 text-blue-600 font-semibold'
                : userRole === 'operateur'
                ? 'text-slate-400 hover:text-slate-500'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configuration Tenant</span>
            {userRole === 'operateur' && <Lock className="w-3 h-3 text-slate-400" />}
          </button>
        </nav>
      </div>
    </header>
  );
};
