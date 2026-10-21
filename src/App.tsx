/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NDM Teams Manager - Application Racine
 * Ensemble Scolaire Notre-Dame des Missions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { DashboardTab } from './components/DashboardTab.tsx';
import { ClassesTab } from './components/ClassesTab.tsx';
import { SubjectsTab } from './components/SubjectsTab.tsx';
import { UsersTab } from './components/UsersTab.tsx';
import { TeamsTab } from './components/TeamsTab.tsx';
import { AnomaliesTab } from './components/AnomaliesTab.tsx';
import { LogsTab } from './components/LogsTab.tsx';
import { SettingsTab } from './components/SettingsTab.tsx';
import { DeploymentTab } from './components/DeploymentTab.tsx';
import OfficeApp from './office/OfficeApp.tsx';
import KoxoApp from './koxo/KoxoApp.tsx';
import type { KoxoOfficePayload } from './koxo/types.ts';
import { RentreeTab } from './components/RentreeTab.tsx';
import { SimulationModal } from './components/SimulationModal.tsx';
import { api } from './services/api.ts';
import type { 
  ClassItem, 
  SubjectItem, 
  UserItem, 
  TeamItem, 
  AnomalyItem, 
  LogItem, 
  SyncReport, 
  M365Config,
  SimulationResult
} from './types/index.ts';
import { CheckCircle2, AlertTriangle, X, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [officeImport, setOfficeImport] = useState<(KoxoOfficePayload & { nonce: number }) | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Data States
  const [stats, setStats] = useState<any>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [reports, setReports] = useState<SyncReport[]>([]);
  const [config, setConfig] = useState<M365Config | null>(null);

  // Sync & Simulation States
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [simulationData, setSimulationData] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPullingM365, setIsPullingM365] = useState(false);

  const handlePullM365 = async () => {
    setIsPullingM365(true);
    try {
      const res = await api.pullM365();
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.error || 'Erreur importation M365', 'warning');
      }
      await loadData();
    } catch (err: any) {
      showToast('Impossible de contacter Microsoft Graph', 'warning');
    } finally {
      setIsPullingM365(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await api.deleteUser(id);
      showToast('Compte supprimé avec succès', 'success');
      await loadData();
    } catch (err) {
      showToast('Erreur suppression compte', 'error');
    }
  };

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Load all initial data from server
  const loadData = useCallback(async () => {
    try {
      const [
        statsRes,
        classesRes,
        subjectsRes,
        usersRes,
        teamsRes,
        anomaliesRes,
        logsRes,
        reportsRes,
        configRes,
      ] = await Promise.all([
        api.getStats(),
        api.getClasses(),
        api.getSubjects(),
        api.getUsers(),
        api.getTeams(),
        api.getAnomalies(),
        api.getLogs(),
        api.getReports(),
        api.getConfig(),
      ]);

      setStats(statsRes);
      setClasses(classesRes);
      setSubjects(subjectsRes);
      setUsers(usersRes);
      setTeams(teamsRes);
      setAnomalies(anomaliesRes);
      setLogs(logsRes);
      setReports(reportsRes);
      setConfig(configRes);
    } catch (err) {
      console.error('Erreur chargement données', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers for Simulation
  const handleOpenSimulation = async () => {
    setIsSimulationOpen(true);
    setIsSimulating(true);
    try {
      const res = await api.runSimulation();
      setSimulationData(res);
      const updatedLogs = await api.getLogs();
      setLogs(updatedLogs);
    } catch (err) {
      showToast('Erreur lors du calcul de la simulation', 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  // Execute full sync
  const handleExecuteFullSync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.executeSync({ type: 'FULL' });
      showToast(res.message, 'success');
      await loadData();
    } catch (err) {
      showToast('Erreur lors de la synchronisation Teams', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Execute single class sync (Section 54)
  const handleSyncClass = async (classItem: ClassItem) => {
    setIsSyncing(true);
    try {
      const res = await api.executeSync({
        type: 'CLASS',
        targetId: classItem.id,
        targetName: classItem.code,
      });
      showToast(`Classe ${classItem.code} synchronisée avec succès !`, 'success');
      await loadData();
    } catch (err) {
      showToast(`Erreur synchronisation classe ${classItem.code}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Execute single team sync (Section 55)
  const handleSyncTeam = async (team: TeamItem) => {
    setIsSyncing(true);
    try {
      const res = await api.executeSync({
        type: 'TEAM',
        targetId: team.id,
        targetName: team.name,
      });
      showToast(`Équipe ${team.name} synchronisée !`, 'success');
      await loadData();
    } catch (err) {
      showToast(`Erreur synchronisation équipe ${team.name}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGenerateCatalog = async () => {
    try {
      const res = await api.generateTeamsCatalog();
      if (res.success) {
        showToast(res.message, 'success');
        await loadData();
      }
    } catch (err) {
      showToast('Erreur génération catalogue équipes', 'error');
    }
  };

  const handleApplyOfficialAssignments = async () => {
    setIsSyncing(true);
    try {
      const res = await api.applyOfficialAssignments();
      if (res.success) {
        showToast(res.message, 'success');
        await loadData();
      } else {
        showToast('Erreur application des affectations officielles', 'error');
      }
    } catch (err) {
      showToast('Erreur application affectations officielles', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAssignTeacher = async (teamId: string, teacherIds: string[]) => {
    try {
      const res = await api.assignTeacherToTeam(teamId, teacherIds);
      if (res.success) {
        showToast('Enseignant(s) assigné(s) avec succès à l\'équipe', 'success');
        await loadData();
      }
    } catch (err) {
      showToast('Erreur assignation enseignant', 'error');
    }
  };

  const handleBulkAddAdminOwners = async (adminEmails?: string[], teamIds?: string[]) => {
    setIsSyncing(true);
    try {
      const res = await api.bulkAddAdminOwners(adminEmails, teamIds);
      if (res.success) {
        showToast(res.message, 'success');
        await loadData();
      } else {
        showToast(res.error || 'Erreur ajout des administrateurs', 'error');
      }
    } catch (err) {
      showToast('Erreur ajout co-propriété administrateurs', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleProvisionTeam = async (teamId: string) => {
    setIsSyncing(true);
    try {
      const res = await api.provisionTeamM365(teamId);
      if (res.success) {
        showToast(res.message || 'Équipe créée avec succès sur Microsoft Teams !', 'success');
        await loadData();
      } else {
        showToast(res.error || 'Erreur création Teams', 'error');
      }
    } catch (err: any) {
      showToast('Erreur communication Microsoft Graph', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportAssignmentsCsv = async (csvContent: string) => {
    try {
      const res = await api.importTeacherAssignmentsCsv(csvContent);
      if (res.success) {
        showToast(res.message, 'success');
        await loadData();
      } else {
        showToast(res.error || 'Erreur import affectations', 'error');
      }
    } catch (err) {
      showToast('Erreur traitement fichier affectations', 'error');
    }
  };

  // Classes Handlers
  const handleAddClass = async (classData: Partial<ClassItem>) => {
    try {
      await api.createClass(classData);
      showToast(`Classe ${classData.code} créée`, 'success');
      await loadData();
    } catch (err) {
      showToast('Erreur création classe', 'error');
    }
  };

  const handleUpdateClass = async (id: string, classData: Partial<ClassItem>) => {
    try {
      await api.updateClass(id, classData);
      showToast('Classe mise à jour', 'success');
      await loadData();
    } catch (err) {
      showToast('Erreur mise à jour classe', 'error');
    }
  };

  const handleDeleteClass = async (id: string) => {
    try {
      await api.deleteClass(id);
      showToast('Classe supprimée', 'success');
      await loadData();
    } catch (err) {
      showToast('Erreur suppression classe', 'error');
    }
  };

  // Subjects Handlers
  const handleAddSubject = async (subjectData: Partial<SubjectItem>) => {
    try {
      await api.createSubject(subjectData);
      showToast(`Matière ${subjectData.name} ajoutée au référentiel`, 'success');
      await loadData();
    } catch (err) {
      showToast('Erreur ajout matière', 'error');
    }
  };

  const handleUpdateSubject = async (id: string, subjectData: Partial<SubjectItem>) => {
    try {
      await api.updateSubject(id, subjectData);
      showToast('Matière mise à jour', 'success');
      await loadData();
    } catch (err) {
      showToast('Erreur mise à jour matière', 'error');
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      await api.deleteSubject(id);
      showToast('Matière retirée', 'success');
      await loadData();
    } catch (err) {
      showToast('Erreur suppression matière', 'error');
    }
  };

  // Users Handlers
  const handleUpdateUser = async (id: string, userData: Partial<UserItem>) => {
    try {
      await api.updateUser(id, userData);
      showToast('Fiche utilisateur enregistrée', 'success');
      await loadData();
    } catch (err) {
      showToast('Erreur enregistrement utilisateur', 'error');
    }
  };

  // Teams Handlers
  const handleUpdateTeam = async (id: string, teamData: Partial<TeamItem>) => {
    try {
      await api.updateTeam(id, teamData);
      showToast('Équipe mise à jour avec succès', 'success');
      await loadData();
    } catch (err) {
      showToast('Erreur mise à jour équipe', 'error');
    }
  };

  const handleDeleteTeam = async (id: string) => {
    try {
      const res = await api.deleteTeam(id);
      if (res.success) {
        showToast(res.message || 'Équipe supprimée avec succès', 'success');
        await loadData();
      } else {
        showToast(res.error || 'Erreur suppression équipe', 'error');
      }
    } catch (err) {
      showToast('Erreur suppression équipe', 'error');
    }
  };

  const handleDeleteAllTeams = async (deleteFromM365: boolean = false) => {
    try {
      const res = await api.deleteAllTeams(deleteFromM365);
      if (res.success) {
        showToast(res.message || 'Toutes les équipes ont été supprimées', 'success');
        await loadData();
      } else {
        showToast(res.error || 'Erreur suppression globale', 'error');
      }
    } catch (err) {
      showToast('Erreur suppression globale des équipes', 'error');
    }
  };

  const handleAddUserToAllTeams = async (params: { userId?: string; userEmail?: string; roleInTeam?: 'owner' | 'member'; teamIds?: string[] }) => {
    try {
      const res = await api.addUserToAllTeams(params);
      if (res.success) {
        showToast(res.message, 'success');
        await loadData();
      } else {
        showToast(res.error || 'Erreur ajout utilisateur', 'error');
      }
    } catch (err) {
      showToast('Erreur rattachement utilisateur aux équipes', 'error');
    }
  };

  // Anomalies Handlers
  const handleResolveAnomaly = async (id: string) => {
    try {
      await api.resolveAnomaly(id);
      showToast('Anomalie marquée comme résolue', 'success');
      await loadData();
    } catch (err) {
      showToast('Erreur résolution anomalie', 'error');
    }
  };

  // Config Handlers
  const handleUpdateConfig = async (newConfig: Partial<M365Config>) => {
    try {
      await api.updateConfig(newConfig);
      showToast('Paramètres M365 sauvegardés', 'success');
      await loadData();
    } catch (err) {
      showToast('Erreur sauvegarde paramètres', 'error');
    }
  };

  const handleRunDiagnostic = async () => {
    try {
      const res = await api.testConnection();
      showToast('Diagnostic 7 points Microsoft Graph validé !', 'success');
      const updatedLogs = await api.getLogs();
      setLogs(updatedLogs);
      return { steps: res.steps, totalLatencyMs: res.totalLatencyMs };
    } catch (err) {
      showToast('Erreur diagnostic Microsoft 365', 'error');
      throw err;
    }
  };

  const handleArchiveYear = async () => {
    try {
      const res = await api.archiveSchoolYear();
      showToast(res.message, 'success');
      await loadData();
    } catch (err) {
      showToast('Erreur archivage année', 'error');
    }
  };

  const handlePrepareNewYear = async (year: string) => {
    try {
      const res = await api.prepareNewSchoolYear(year);
      showToast(res.message, 'success');
      await loadData();
    } catch (err) {
      showToast('Erreur préparation rentrée', 'error');
    }
  };

  // Après une rentrée ou une création de compte : recharge l'annuaire Microsoft 365
  const handleRentreeDone = async () => {
    try { await api.pullM365(); } catch { /* l'annuaire sera resynchronisé plus tard */ }
    await loadData();
  };

  const handleClearLogs = async () => {
    try {
      await api.clearLogs();
      setLogs([]);
      showToast('Journal local purgé', 'success');
    } catch (err) {
      showToast('Erreur purge journal', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-500 selection:text-slate-900">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div className={`p-4 rounded-xl shadow-2xl flex items-center gap-3 border text-xs font-semibold ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : toast.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            )}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-slate-500 hover:text-slate-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Header Component */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSimulation={handleOpenSimulation}
        onQuickSync={handleExecuteFullSync}
        isSyncing={isSyncing}
        schoolYear={config?.currentSchoolYear || '2026-2027'}
        anomaliesCount={anomalies.filter((a) => !a.resolved).length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
            <div className="text-sm font-semibold text-slate-800">
              Chargement des données Notre-Dame des Missions...
            </div>
            <p className="text-xs text-slate-500">Initialisation Microsoft Graph & 37 classes</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardTab
                stats={stats}
                anomalies={anomalies}
                logs={logs}
                onOpenSimulation={handleOpenSimulation}
                onQuickSync={handleExecuteFullSync}
                onNavigateTab={setActiveTab}
                onResolveAnomaly={handleResolveAnomaly}
              />
            )}

            {activeTab === 'classes' && (
              <ClassesTab
                classes={classes}
                onAddClass={handleAddClass}
                onUpdateClass={handleUpdateClass}
                onDeleteClass={handleDeleteClass}
                onSyncClass={handleSyncClass}
                isSyncing={isSyncing}
              />
            )}

            {activeTab === 'subjects' && (
              <SubjectsTab
                subjects={subjects}
                onAddSubject={handleAddSubject}
                onUpdateSubject={handleUpdateSubject}
                onDeleteSubject={handleDeleteSubject}
              />
            )}

            {activeTab === 'users' && (
              <UsersTab
                users={users}
                classes={classes}
                subjects={subjects}
                teams={teams}
                onUpdateUser={handleUpdateUser}
                onPullM365={handlePullM365}
                isPullingM365={isPullingM365}
                onNavigateTab={setActiveTab}
                onDeleteUser={handleDeleteUser}
                onUsersChanged={handleRentreeDone}
              />
            )}

            {activeTab === 'teams' && (
              <TeamsTab
                teams={teams}
                classes={classes}
                users={users}
                onSyncTeam={handleSyncTeam}
                onUpdateTeam={handleUpdateTeam}
                onGenerateCatalog={handleGenerateCatalog}
                onApplyOfficialAssignments={handleApplyOfficialAssignments}
                onAssignTeacher={handleAssignTeacher}
                onBulkAddAdminOwners={handleBulkAddAdminOwners}
                onProvisionTeam={handleProvisionTeam}
                onImportAssignmentsCsv={handleImportAssignmentsCsv}
                onDeleteTeam={handleDeleteTeam}
                onDeleteAllTeams={handleDeleteAllTeams}
                onAddUserToAllTeams={handleAddUserToAllTeams}
                isSyncing={isSyncing}
              />
            )}

            {activeTab === 'koxo' && (
              <KoxoApp
                onSendToOffice={(payload) => {
                  setOfficeImport({ ...payload, nonce: Date.now() });
                  setActiveTab('office');
                }}
              />
            )}

            {activeTab === 'office' && <OfficeApp incomingImport={officeImport} />}

            {activeTab === 'rentree' && (
              <RentreeTab classes={classes} subjects={subjects} onDone={handleRentreeDone} />
            )}

            {activeTab === 'anomalies' && (
              <AnomaliesTab
                anomalies={anomalies}
                onResolveAnomaly={handleResolveAnomaly}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'logs' && (
              <LogsTab
                logs={logs}
                reports={reports}
                onClearLogs={handleClearLogs}
              />
            )}

            {activeTab === 'settings' && config && (
              <SettingsTab
                config={config}
                onUpdateConfig={handleUpdateConfig}
                onRunDiagnostic={handleRunDiagnostic}
                onArchiveYear={handleArchiveYear}
                onPrepareNewYear={handlePrepareNewYear}
              />
            )}

            {activeTab === 'deployment' && (
              <DeploymentTab />
            )}
          </>
        )}
      </main>

      {/* Simulation Modal (Section 22) */}
      <SimulationModal
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
        simulation={simulationData}
        loading={isSimulating}
        onExecuteSync={handleExecuteFullSync}
        isExecuting={isSyncing}
      />

      {/* Responsive Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>NDM Teams Manager • Ensemble Scolaire Notre-Dame des Missions</span>
          <span className="font-mono text-[11px] text-slate-500">
            Source : Microsoft 365 Entra ID • Cible : Microsoft Teams Education • GitHub : serviceinformatique-droid
          </span>
        </div>
      </footer>

    </div>
  );
}
