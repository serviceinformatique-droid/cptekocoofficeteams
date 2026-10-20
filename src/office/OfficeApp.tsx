import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ImportSyncView } from './components/ImportSyncView';
import { UserDirectoryView } from './components/UserDirectoryView';
import { AbsentUsersView } from './components/AbsentUsersView';
import { LicensesView } from './components/LicensesView';
import { AuditLogsView } from './components/AuditLogsView';
import { TenantConfigView } from './components/TenantConfigView';

import { 
  UserAccount, 
  M365License, 
  TenantConfig, 
  UserRole, 
  SynchronizationRecord,
  AbsentAccount
} from './types';
import { 
  INITIAL_ACCOUNTS, 
  INITIAL_LICENSES, 
  INITIAL_TENANT_CONFIG, 
  INITIAL_SYNC_HISTORY 
} from './data/officeData';

export interface OfficeIncomingImport {
  eleves: { csv: string; name: string } | null;
  profs: { csv: string; name: string } | null;
  nonce: number;
}

export default function OfficeApp({ incomingImport = null }: { incomingImport?: OfficeIncomingImport | null }) {
  const [currentView, setCurrentView] = useState<string>(incomingImport ? 'import' : 'dashboard');
  const [userRole, setUserRole] = useState<UserRole>('admin');

  // Application Data States
  const [accounts, setAccounts] = useState<UserAccount[]>(INITIAL_ACCOUNTS);
  const [licenses, setLicenses] = useState<M365License[]>(INITIAL_LICENSES);
  const [tenantConfig, setTenantConfig] = useState<TenantConfig>(INITIAL_TENANT_CONFIG);
  const [syncHistory, setSyncHistory] = useState<SynchronizationRecord[]>(INITIAL_SYNC_HISTORY);
  const [absentAccounts, setAbsentAccounts] = useState<AbsentAccount[]>([]);

  // Fetch server config on mount
  useEffect(() => {
    fetch('/api/office/tenant/config')
      .then((res) => res.json())
      .then((cfg) => {
        if (cfg && cfg.tenantId) {
          setTenantConfig((prev) => ({
            ...prev,
            tenantId: cfg.tenantId || prev.tenantId,
            clientId: cfg.clientId || prev.clientId,
            domain: cfg.domain || prev.domain,
            connectionStatus: cfg.connectionStatus || prev.connectionStatus,
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Calculate live count of absent accounts
  const absentCount = accounts.filter(
    (a) => a.email.includes('ancien') || a.nom.includes('ANCIEN')
  ).length;

  // Handlers
  const handleSyncComplete = (
    updatedAccounts: UserAccount[],
    updatedLicenses: M365License[],
    record: SynchronizationRecord
  ) => {
    setAccounts(updatedAccounts);
    setLicenses(updatedLicenses);
    setSyncHistory([record, ...syncHistory]);
  };

  const handleUpdateAccount = (updated: UserAccount) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === updated.id ? updated : acc))
    );
  };

  const handleDeleteAccount = (id: string) => {
    setAccounts((prev) => prev.filter((acc) => acc.id !== id));
  };

  const handleUpdateLicenses = (newLicenses: M365License[]) => {
    setLicenses(newLicenses);
  };

  const handleUpdateTenantConfig = (newConfig: TenantConfig) => {
    setTenantConfig(newConfig);
  };

  return (
    <div className="bg-slate-50 text-slate-900 flex flex-col rounded-xl overflow-hidden border border-slate-200">
      {/* Primary Navigation Bar */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        activeTab={currentView}
        setActiveTab={setCurrentView}
        tenantConfig={tenantConfig}
        userRole={userRole}
        setUserRole={setUserRole}
        onToggleRole={() =>
          setUserRole(userRole === 'admin' ? 'operateur' : 'admin')
        }
        absentCount={absentCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {currentView === 'dashboard' && (
          <DashboardView
            accounts={accounts}
            licenses={licenses}
            tenantConfig={tenantConfig}
            syncHistory={syncHistory}
            onNavigateToImport={() => setCurrentView('import')}
            onNavigateToLicenses={() => setCurrentView('licenses')}
          />
        )}

        {currentView === 'import' && (
          <ImportSyncView
            accounts={accounts}
            licenses={licenses}
            tenantConfig={tenantConfig}
            userRole={userRole}
            onSyncComplete={handleSyncComplete}
            onNavigateToLogs={() => setCurrentView('logs')}
            incomingImport={incomingImport}
          />
        )}

        {currentView === 'users' && (
          <UserDirectoryView
            accounts={accounts}
            licenses={licenses}
            userRole={userRole}
            onUpdateAccount={handleUpdateAccount}
            onDeleteAccount={handleDeleteAccount}
          />
        )}

        {currentView === 'absent' && (
          <AbsentUsersView
            accounts={accounts}
            absentAccounts={absentAccounts}
            userRole={userRole}
            onUpdateAccount={handleUpdateAccount}
            onDeleteAccount={handleDeleteAccount}
          />
        )}

        {currentView === 'licenses' && (
          <LicensesView
            licenses={licenses}
            tenantConfig={tenantConfig}
            userRole={userRole}
            onUpdateLicenses={handleUpdateLicenses}
            onUpdateTenantConfig={handleUpdateTenantConfig}
          />
        )}

        {currentView === 'logs' && (
          <AuditLogsView syncHistory={syncHistory} />
        )}

        {currentView === 'config' && (
          <TenantConfigView
            config={tenantConfig}
            userRole={userRole}
            onUpdateConfig={handleUpdateTenantConfig}
          />
        )}
      </main>

    </div>
  );
}
