import React, { useState } from 'react';
import { 
  MessagesSquare, 
  Search, 
  RefreshCw, 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Unlock, 
  X,
  PlusCircle,
  FileSpreadsheet,
  Upload,
  UserCheck,
  Send,
  Sparkles,
  Info,
  ExternalLink,
  Shield,
  Trash2,
  Plus,
  Check,
  UserPlus,
  Rocket,
  ShieldCheck,
  CheckSquare,
  Square,
  Zap,
  Sliders,
  Edit3,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import type { TeamItem, ClassItem, UserItem, MemberRestrictionsSettings } from '../types/index.ts';
import { api } from '../services/api.ts';

interface TeamsTabProps {
  teams: TeamItem[];
  classes: ClassItem[];
  users: UserItem[];
  onSyncTeam: (team: TeamItem) => void;
  onUpdateTeam: (id: string, teamData: Partial<TeamItem>) => void;
  onGenerateCatalog: () => void;
  onApplyOfficialAssignments: () => void;
  onAssignTeacher: (teamId: string, teacherIds: string[]) => void;
  onBulkAddAdminOwners?: (adminEmails?: string[], teamIds?: string[]) => void;
  onProvisionTeam: (teamId: string) => void;
  onImportAssignmentsCsv: (csvContent: string) => void;
  onDeleteTeam?: (id: string) => void;
  onDeleteAllTeams?: (deleteFromM365: boolean) => void;
  onAddUserToAllTeams?: (params: { userId?: string; userEmail?: string; roleInTeam?: 'owner' | 'member'; teamIds?: string[] }) => void;
  isSyncing: boolean;
}

export const TeamsTab: React.FC<TeamsTabProps> = ({
  teams,
  classes,
  users,
  onSyncTeam,
  onUpdateTeam,
  onGenerateCatalog,
  onApplyOfficialAssignments,
  onAssignTeacher,
  onBulkAddAdminOwners,
  onProvisionTeam,
  onImportAssignmentsCsv,
  onDeleteTeam,
  onDeleteAllTeams,
  onAddUserToAllTeams,
  isSyncing,
}) => {
  const [search, setSearch] = useState('');
  const [managedFilter, setManagedFilter] = useState<'all' | 'auto' | 'manual' | 'm365_ready' | 'm365_pending'>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<TeamItem | null>(null);
  
  // Multi-teacher assignment modal state
  const [assigningTeam, setAssigningTeam] = useState<TeamItem | null>(null);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState<'all' | 'teachers' | 'admins'>('all');

  // Admin Co-ownership Global Modal
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [selectedAdminEmails, setSelectedAdminEmails] = useState<string[]>([
    'mjoubin@notredamedesmissions.com',
    'admin@notredamedesmissions.com',
    'admin@notredamedesmissions.onmicrosoft.com'
  ]);
  const [adminScope, setAdminScope] = useState<'all' | 'filtered'>('all');

  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [provisioningTeamId, setProvisioningTeamId] = useState<string | null>(null);

  // Batch Provisioning Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchScope, setBatchScope] = useState<'class' | 'pending' | 'filtered'>('class');
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; teamName: string; successCount: number; failedCount: number } | null>(null);

  // Security Restrictions Modal State
  const [isRestrictionsModalOpen, setIsRestrictionsModalOpen] = useState(false);
  const [isEnforcingRestrictions, setIsEnforcingRestrictions] = useState(false);
  const [enforceResult, setEnforceResult] = useState<string | null>(null);

  const handleStartBatchProvision = async () => {
    setIsBatchRunning(true);
    let targetTeams: TeamItem[] = [];

    if (batchScope === 'class') {
      const targetClass = classFilter !== 'all' ? classFilter : '101';
      targetTeams = teams.filter(t => t.classCode === targetClass && (!t.m365TeamId || t.status !== 'synced'));
    } else if (batchScope === 'filtered') {
      targetTeams = filteredTeams.filter(t => !t.m365TeamId || t.status !== 'synced');
    } else {
      targetTeams = teams.filter(t => !t.m365TeamId || t.status !== 'synced');
    }

    if (targetTeams.length === 0) {
      alert('Aucune équipe en attente de création trouvée pour ce périmètre.');
      setIsBatchRunning(false);
      return;
    }

    setBatchProgress({
      current: 0,
      total: targetTeams.length,
      teamName: targetTeams[0].name,
      successCount: 0,
      failedCount: 0,
    });

    let successAcc = 0;
    let failedAcc = 0;

    for (let i = 0; i < targetTeams.length; i++) {
      const currentTeam = targetTeams[i];
      setBatchProgress({
        current: i + 1,
        total: targetTeams.length,
        teamName: currentTeam.name,
        successCount: successAcc,
        failedCount: failedAcc,
      });

      try {
        const res = await api.provisionTeamM365(currentTeam.id);
        if (res.success) {
          successAcc++;
        } else {
          failedAcc++;
        }
      } catch (e) {
        failedAcc++;
      }

      setBatchProgress({
        current: i + 1,
        total: targetTeams.length,
        teamName: currentTeam.name,
        successCount: successAcc,
        failedCount: failedAcc,
      });

      // Pause to avoid Graph throttling
      await new Promise(r => setTimeout(r, 1200));
    }

    setIsBatchRunning(false);
    onGenerateCatalog(); // refresh data
  };

  // Security Restrictions Modal State (Configurable for single or all teams, with default saving)
  const [restrictionsScope, setRestrictionsScope] = useState<'single' | 'all'>('all');
  const [targetTeamIdForRestrictions, setTargetTeamIdForRestrictions] = useState<string>('');
  const [saveAsDefaultOption, setSaveAsDefaultOption] = useState<boolean>(true);
  const [customRestrictions, setCustomRestrictions] = useState<MemberRestrictionsSettings>({
    generalChannelModeration: 'ownersOnly',
    allowCreateUpdateChannels: false,
    allowCreatePrivateChannels: false,
    allowDeleteChannels: false,
    allowAddRemoveApps: false,
    allowCustomApps: false,
    allowCreateUpdateRemoveTabs: false,
    allowOwnerDeleteMessages: true,
    allowCreateUpdateRemoveConnectors: false,
    allowUserCreateUpdateTags: true,
    allowUserDeleteMessages: true,
    allowUserEditMessages: true,
  });

  const handleOpenRestrictionsModal = (targetTeam?: TeamItem) => {
    if (targetTeam) {
      setRestrictionsScope('single');
      setTargetTeamIdForRestrictions(targetTeam.id);
      if (targetTeam.memberRestrictions) {
        setCustomRestrictions({
          generalChannelModeration: 'ownersOnly',
          ...targetTeam.memberRestrictions
        });
      } else {
        setCustomRestrictions(prev => ({
          ...prev,
          generalChannelModeration: 'ownersOnly'
        }));
      }
    } else {
      setRestrictionsScope('all');
      if (filteredTeams.length > 0 && !targetTeamIdForRestrictions) {
        setTargetTeamIdForRestrictions(filteredTeams[0].id);
      }
    }
    setEnforceResult(null);
    setIsRestrictionsModalOpen(true);
  };

  const handleToggleRestriction = (key: keyof MemberRestrictionsSettings) => {
    setCustomRestrictions(prev => {
      const next = { ...prev, [key]: !prev[key] };
      // MS Graph dependency: allowCreatePrivateChannels requires allowCreateUpdateChannels to be true
      if (key === 'allowCreateUpdateChannels' && !next.allowCreateUpdateChannels) {
        next.allowCreatePrivateChannels = false;
      }
      return next;
    });
  };

  const handleResetToStrictPreset = () => {
    setCustomRestrictions({
      generalChannelModeration: 'ownersOnly',
      allowCreateUpdateChannels: false,
      allowCreatePrivateChannels: false,
      allowDeleteChannels: false,
      allowAddRemoveApps: false,
      allowCustomApps: false,
      allowCreateUpdateRemoveTabs: false,
      allowOwnerDeleteMessages: true,
      allowCreateUpdateRemoveConnectors: false,
      allowUserCreateUpdateTags: true,
      allowUserDeleteMessages: true,
      allowUserEditMessages: true,
    });
  };

  const handleApplyRestrictions = async () => {
    setIsEnforcingRestrictions(true);
    setEnforceResult(null);
    try {
      const res = await api.enforceTeamRestrictions({
        teamId: restrictionsScope === 'single' ? targetTeamIdForRestrictions : undefined,
        all: restrictionsScope === 'all',
        saveAsDefault: saveAsDefaultOption,
        settings: customRestrictions,
      });

      if (res.success) {
        setEnforceResult(res.message);
        onGenerateCatalog();
      } else {
        setEnforceResult(`Erreur: ${res.error}`);
      }
    } catch (err: any) {
      setEnforceResult(`Erreur lors de l'application: ${err.message}`);
    } finally {
      setIsEnforcingRestrictions(false);
    }
  };

  // Edit Team Modal State
  const [editingTeam, setEditingTeam] = useState<TeamItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editClassCode, setEditClassCode] = useState('');
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editAutoManaged, setEditAutoManaged] = useState(true);

  // Single Team Deletion State
  const [teamToDelete, setTeamToDelete] = useState<TeamItem | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

  // Delete All Teams Modal State
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [confirmDeleteAllInput, setConfirmDeleteAllInput] = useState('');
  const [deleteFromM365Option, setDeleteFromM365Option] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Add User to ALL Teams Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [selectedUserForAdd, setSelectedUserForAdd] = useState<string>('');
  const [customEmailForAdd, setCustomEmailForAdd] = useState('');
  const [addUserRole, setAddUserRole] = useState<'owner' | 'member'>('owner');
  const [addUserScope, setAddUserScope] = useState<'all' | 'filtered'>('all');
  const [userSearchText, setUserSearchText] = useState('');
  const [isSubmittingAddUser, setIsSubmittingAddUser] = useState(false);
  const [addUserSuccessMsg, setAddUserSuccessMsg] = useState<string | null>(null);

  const handleOpenEditModal = (t: TeamItem) => {
    setEditingTeam(t);
    setEditName(t.name);
    setEditClassCode(t.classCode);
    setEditSubjectName(t.subjectName);
    setEditAutoManaged(t.autoManaged);
  };

  const handleSaveEditTeam = async () => {
    if (!editingTeam) return;
    onUpdateTeam(editingTeam.id, {
      name: editName,
      classCode: editClassCode,
      subjectName: editSubjectName,
      autoManaged: editAutoManaged,
    });
    setEditingTeam(null);
  };

  const handleExecuteDeleteSingle = async () => {
    if (!teamToDelete) return;
    setIsDeletingSingle(true);
    try {
      if (onDeleteTeam) {
        await onDeleteTeam(teamToDelete.id);
      } else {
        await api.deleteTeam(teamToDelete.id);
        onGenerateCatalog();
      }
    } finally {
      setIsDeletingSingle(false);
      setTeamToDelete(null);
    }
  };

  const handleExecuteDeleteAll = async () => {
    if (confirmDeleteAllInput.trim().toUpperCase() !== 'SUPPRIMER') return;
    setIsDeletingAll(true);
    try {
      if (onDeleteAllTeams) {
        await onDeleteAllTeams(deleteFromM365Option);
      } else {
        await api.deleteAllTeams(deleteFromM365Option);
      }
    } finally {
      setIsDeletingAll(false);
      setIsDeleteAllModalOpen(false);
      setConfirmDeleteAllInput('');
    }
  };

  const handleExecuteAddUserToAll = async () => {
    setIsSubmittingAddUser(true);
    setAddUserSuccessMsg(null);
    try {
      const targetTeamIds = addUserScope === 'filtered' ? filteredTeams.map(t => t.id) : undefined;
      const params = {
        userId: selectedUserForAdd || undefined,
        userEmail: customEmailForAdd.trim() || undefined,
        roleInTeam: addUserRole,
        teamIds: targetTeamIds,
      };

      if (onAddUserToAllTeams) {
        await onAddUserToAllTeams(params);
        setAddUserSuccessMsg('Utilisateur ajouté avec succès à toutes les équipes !');
      } else {
        const res = await api.addUserToAllTeams(params);
        if (res.success) {
          setAddUserSuccessMsg(res.message);
          onGenerateCatalog();
        }
      }
    } catch (e: any) {
      alert(`Erreur: ${e.message}`);
    } finally {
      setIsSubmittingAddUser(false);
    }
  };

  // Assignable staff (teachers and administrators)
  const assignableStaff = users.filter((u) => (u.role === 'teacher' || u.role === 'admin') && u.status === 'active');
  const adminStaff = users.filter((u) => u.role === 'admin' || (u.email && (u.email.toLowerCase().includes('mjoubin') || u.email.toLowerCase().includes('admin@'))));

  const filteredTeams = teams.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.classCode.toLowerCase().includes(search.toLowerCase()) ||
      t.subjectName.toLowerCase().includes(search.toLowerCase()) ||
      (t.assignedTeachers && t.assignedTeachers.some(at => at.name.toLowerCase().includes(search.toLowerCase()) || at.email.toLowerCase().includes(search.toLowerCase())));

    let matchManaged = true;
    if (managedFilter === 'auto') matchManaged = t.autoManaged;
    else if (managedFilter === 'manual') matchManaged = !t.autoManaged;
    else if (managedFilter === 'm365_ready') matchManaged = Boolean(t.m365TeamId);
    else if (managedFilter === 'm365_pending') matchManaged = !t.m365TeamId;

    const matchClass = classFilter === 'all' || t.classCode === classFilter;

    return matchSearch && matchManaged && matchClass;
  });

  const autoManagedCount = teams.filter((t) => t.autoManaged).length;
  const m365RealCount = teams.filter((t) => t.m365TeamId).length;
  const withTeachersCount = teams.filter((t) => (t.teacherCount || 0) > 0).length;

  const handleExecuteProvision = async (teamId: string) => {
    setProvisioningTeamId(teamId);
    try {
      await onProvisionTeam(teamId);
    } finally {
      setProvisioningTeamId(null);
    }
  };

  const openAssignModal = (team: TeamItem) => {
    setAssigningTeam(team);
    setSelectedTeacherIds(team.assignedTeacherIds ? [...team.assignedTeacherIds] : []);
    setTeacherSearch('');
    setStaffRoleFilter('all');
  };

  const toggleTeacherSelection = (userId: string) => {
    setSelectedTeacherIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSaveAssignments = () => {
    if (!assigningTeam) return;
    onAssignTeacher(assigningTeam.id, selectedTeacherIds);
    setAssigningTeam(null);
  };

  const handleAddAllAdminsToCurrentTeam = () => {
    const adminIds = adminStaff.map(a => a.id);
    setSelectedTeacherIds(prev => Array.from(new Set([...prev, ...adminIds])));
  };

  const handleAddMjoubinToCurrentTeam = () => {
    const mjoubin = users.find(u => u.email.toLowerCase() === 'mjoubin@notredamedesmissions.com' || u.upn.toLowerCase() === 'mjoubin@notredamedesmissions.com');
    if (mjoubin) {
      setSelectedTeacherIds(prev => Array.from(new Set([...prev, mjoubin.id])));
    }
  };

  const handleExecuteBulkAdmins = () => {
    if (onBulkAddAdminOwners) {
      const targetTeamIds = adminScope === 'filtered' ? filteredTeams.map(t => t.id) : undefined;
      onBulkAddAdminOwners(selectedAdminEmails, targetTeamIds);
    }
    setIsAdminModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Équipes Microsoft Teams ({teams.length})
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Format : [CLASSE]-[MATIÈRE]
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {m365RealCount} créées sur M365
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Multi-propriétaires actif
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Génération, assignation de plusieurs enseignants (co-propriétaires, suppléants) et comptes administrateurs Office (<code className="text-amber-600">mjoubin</code> & Admins).
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition active:scale-95 border border-emerald-200"
            title="Créer automatiquement toutes les équipes en masse sans devoir cliquer une par une"
          >
            <Rocket className="w-4 h-4 text-emerald-800 animate-pulse" />
            Tout créer sur Teams (En masse)
          </button>

          <button
            onClick={() => handleOpenRestrictionsModal()}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition active:scale-95 border border-blue-200"
            title="Choisir et appliquer les préférences de modération du canal Général et restrictions membres (pour un groupe ou pour l'ensemble)"
          >
            <ShieldCheck className="w-4 h-4 text-blue-800" />
            Paramètres & Modération
          </button>

          <button
            onClick={() => setIsAdminModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition active:scale-95"
            title="Associer mjoubin@notredamedesmissions.com et les administrateurs Office en co-propriétaires de toutes les équipes"
          >
            <Shield className="w-4 h-4 text-amber-800" />
            Co-propriété Admins
          </button>

          <button
            onClick={onApplyOfficialAssignments}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            title="Applique la grille officielle des équipes et professeurs par matière pour l'ensemble des 37 classes (document officiel UnDeuxTEMPS / Axess)"
          >
            <UserCheck className="w-4 h-4 text-emerald-600" />
            Affecter Profs Officiels
          </button>

          <button
            onClick={onGenerateCatalog}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1.5 border border-blue-200 transition active:scale-95"
            title="Régénérer ou compléter le catalogue d'équipes pour chacune des 37 classes"
          >
            <Sparkles className="w-4 h-4 text-blue-700" />
            Catalogue 37 Classes
          </button>

          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition active:scale-95 border border-blue-200"
            title="Ajouter un utilisateur (professeur, remplaçant, intervenant, admin) dans toutes les équipes Teams"
          >
            <UserPlus className="w-4 h-4 text-blue-800" />
            Ajouter à toutes les équipes
          </button>

          <button
            onClick={() => setIsDeleteAllModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            title="Supprimer toutes les équipes (base locale et facultativement Cloud M365)"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            Supprimer tout
          </button>

          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            title="Importer une grille personnalisée de professeurs par classe et par matière (CSV/Excel)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Importer CSV
          </button>
        </div>
      </div>

      {/* Guide Banner for multi-teachers & admin co-ownership */}
      <div className="bg-slate-50 border border-slate-300/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="text-xs text-slate-700 space-y-1">
            <div className="font-semibold text-slate-900 text-sm">
              Attribution de plusieurs professeurs et des administrateurs Office
            </div>
            <p>
              1. <strong>Multi-propriétaires par équipe :</strong> Chaque équipe Teams accepte plusieurs propriétaires (professeur principal, co-enseignants, suppléants et administrateurs Office). Cliquez sur <strong>« Assigner »</strong> pour cocher autant de personnes que souhaité.
            </p>
            <p>
              2. <strong>Compte <code className="text-amber-700 font-mono">mjoubin@notredamedesmissions.com</code> & Administrateurs :</strong> Utilisez le bouton orange <strong>« Co-propriété Admins Office »</strong> ci-dessus pour ajouter en 1 clic l'équipe informatique en co-propriétaire sur l'ensemble des 565 équipes Teams.
            </p>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 text-xs gap-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-300">
          <span className="text-slate-500">Équipes avec propriétaires :</span>
          <span className="font-bold text-emerald-600 text-sm">{withTeachersCount} / {teams.length}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-50 border border-slate-300/80 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher équipe, matière, professeur ou mjoubin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <div className="bg-white p-1 rounded-lg border border-slate-300 flex text-xs overflow-x-auto max-w-full">
            <button
              onClick={() => setManagedFilter('all')}
              className={`px-3 py-1 rounded-md transition whitespace-nowrap ${
                managedFilter === 'all' ? 'bg-blue-600 text-white font-medium' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Toutes ({teams.length})
            </button>
            <button
              onClick={() => setManagedFilter('m365_ready')}
              className={`px-3 py-1 rounded-md transition whitespace-nowrap ${
                managedFilter === 'm365_ready' ? 'bg-emerald-600 text-white font-medium' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sur M365 ({m365RealCount})
            </button>
            <button
              onClick={() => setManagedFilter('m365_pending')}
              className={`px-3 py-1 rounded-md transition whitespace-nowrap ${
                managedFilter === 'm365_pending' ? 'bg-amber-600 text-white font-medium' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              À Créer ({teams.length - m365RealCount})
            </button>
          </div>

          {/* Class Filter */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Toutes les 37 Classes</option>
            <optgroup label="Collège (24 classes)">
              {classes.filter(c => c.section === 'Collège').map(c => (
                <option key={c.id} value={c.code}>Classe {c.code} ({c.studentCount} élèves)</option>
              ))}
            </optgroup>
            <optgroup label="Lycée (13 classes)">
              {classes.filter(c => c.section === 'Lycée').map(c => (
                <option key={c.id} value={c.code}>Classe {c.code} ({c.studentCount} élèves)</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeams.map((t) => {
          const isRealOnM365 = Boolean(t.m365TeamId);
          const isCurrentProvisioning = provisioningTeamId === t.id;
          const assignedCount = t.assignedTeachers?.length || 0;

          return (
            <div
              key={t.id}
              className={`bg-slate-50 border rounded-2xl p-4 flex flex-col justify-between transition shadow-sm hover:shadow-md ${
                isRealOnM365 ? 'border-emerald-200 bg-emerald-50' : 'border-slate-300/80 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Team Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                        {t.classCode}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200/60 text-slate-700">
                        {t.subjectCode || 'TRONC'}
                      </span>
                      {isRealOnM365 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          M365 Cloud
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200">
                          Prêt à créer
                        </span>
                      )}

                      {/* Badge Modération Canal Général */}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 cursor-pointer transition ${
                          t.memberRestrictions?.generalChannelModeration === 'everyone'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50'
                            : t.memberRestrictions?.generalChannelModeration === 'everyoneWithAlert'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50'
                            : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50'
                        }`}
                        title="Préférence de modération du canal Général (cliquez pour configurer)"
                        onClick={() => handleOpenRestrictionsModal(t)}
                      >
                        <MessageSquare className="w-2.5 h-2.5" />
                        {t.memberRestrictions?.generalChannelModeration === 'everyone'
                          ? 'Général : Tous'
                          : t.memberRestrictions?.generalChannelModeration === 'everyoneWithAlert'
                          ? 'Général : Alerte'
                          : 'Général : Propriétaires'}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base mt-1.5 truncate" title={t.name}>
                      {t.name}
                    </h3>
                    <p className="text-xs text-slate-500 truncate">
                      {t.subjectName}
                    </p>
                  </div>

                  <div className="w-8 h-8 rounded-xl bg-slate-200/50 flex items-center justify-center shrink-0 text-slate-500">
                    <MessagesSquare className="w-4 h-4 text-blue-600" />
                  </div>
                </div>

                {/* Team Stats */}
                <div className="mt-3.5 pt-3 border-t border-slate-300/60 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/60 rounded-xl p-2 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Élèves (Membres)</span>
                    <span className="font-bold text-slate-900 text-sm font-mono">{t.memberCount} élèves</span>
                  </div>
                  <div className="bg-white/60 rounded-xl p-2 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Propriétaires (Owners)</span>
                    <span className="font-bold text-blue-700 text-sm font-mono">{assignedCount} assigné(s)</span>
                  </div>
                </div>

                {/* Assigned Teachers / Admins list */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                      Propriétaire(s) Teams :
                    </span>
                    <button
                      onClick={() => openAssignModal(t)}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {assignedCount > 0 ? 'Gérer' : 'Assigner'}
                    </button>
                  </div>

                  {t.assignedTeachers && t.assignedTeachers.length > 0 ? (
                    <div className="bg-white/90 rounded-xl p-2 border border-slate-300 space-y-1.5">
                      {t.assignedTeachers.map((prof, idx) => {
                        const isAdmin = prof.email.toLowerCase().includes('mjoubin') || prof.email.toLowerCase().includes('admin');
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs gap-1.5 bg-slate-50 px-2 py-1 rounded-lg">
                            <div className="flex items-center gap-1.5 truncate">
                              {isAdmin ? (
                                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Admin Office" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" title="Enseignant" />
                              )}
                              <span className="font-medium text-slate-900 truncate text-[11px]">{prof.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 truncate max-w-[120px] font-mono">
                              {prof.email.split('@')[0]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-[11px] text-amber-700 flex items-center justify-between">
                      <span>Aucun propriétaire assigné</span>
                      <button
                        onClick={() => openAssignModal(t)}
                        className="font-bold underline text-amber-800 hover:text-slate-900"
                      >
                        + Assigner
                      </button>
                    </div>
                  )}

                  {/* M365 ID if exists */}
                  {t.m365TeamId && (
                    <div className="pt-1 text-[10px] text-slate-500 font-mono truncate">
                      ID M365 : {t.m365TeamId}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 border-t border-slate-300/60 flex items-center justify-between gap-2">
                {!isRealOnM365 ? (
                  <button
                    onClick={() => handleExecuteProvision(t.id)}
                    disabled={isSyncing || isCurrentProvisioning}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-600/20"
                    title="Crée le groupe et active Teams réellement sur Microsoft 365"
                  >
                    {isCurrentProvisioning ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Création Teams...
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3" />
                        Créer sur Teams
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => onSyncTeam(t)}
                    disabled={isSyncing}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center gap-1.5 transition"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Sync Membres
                  </button>
                )}

                <button
                  onClick={() => setSelectedTeam(t)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-medium transition"
                  title="Voir la fiche détaillée"
                >
                  Fiche
                </button>

                <button
                  onClick={() => handleOpenEditModal(t)}
                  className="p-1.5 rounded-lg bg-slate-200 hover:bg-blue-600 text-slate-700 hover:text-slate-900 transition"
                  title="Modifier cette équipe"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleOpenRestrictionsModal(t)}
                  className="p-1.5 rounded-lg bg-slate-200 hover:bg-blue-600 text-slate-700 hover:text-slate-900 transition"
                  title="Gérer les autorisations / restrictions de cette équipe"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setTeamToDelete(t)}
                  className="p-1.5 rounded-lg bg-slate-200 hover:bg-rose-600 text-slate-700 hover:text-slate-900 transition"
                  title="Supprimer cette équipe"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Multi-Assignation d'Enseignants et Administrateurs Office */}
      {assigningTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between shrink-0">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  Affectation Multi-Propriétaires
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1 font-mono">
                  {assigningTeam.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cochez les professeurs et administrateurs Office qui seront propriétaires (owners) de cette équipe sur Teams.
                </p>
              </div>
              <button
                onClick={() => setAssigningTeam(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick 1-click add buttons for Admins & mjoubin */}
            <div className="shrink-0 flex flex-wrap items-center gap-2 bg-slate-50/60 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">Ajouts rapides :</span>
              <button
                onClick={handleAddMjoubinToCurrentTeam}
                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium flex items-center gap-1 transition"
              >
                <Shield className="w-3 h-3 text-amber-600" />
                + Mikael JOUBIN (mjoubin@...)
              </button>
              <button
                onClick={handleAddAllAdminsToCurrentTeam}
                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium flex items-center gap-1 transition"
              >
                <UserPlus className="w-3 h-3 text-blue-600" />
                + Tous les Admins Office
              </button>
            </div>

            {/* Currently Selected Badges */}
            <div className="shrink-0">
              <span className="text-xs text-slate-500 font-medium block mb-1.5">
                Propriétaires sélectionnés ({selectedTeacherIds.length}) :
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50/80 rounded-xl border border-slate-200">
                {selectedTeacherIds.length === 0 ? (
                  <span className="text-xs text-slate-500 italic">Aucun propriétaire sélectionné</span>
                ) : (
                  selectedTeacherIds.map(id => {
                    const u = users.find(user => user.id === id);
                    if (!u) return null;
                    const isAdmin = u.role === 'admin' || (u.email && (u.email.toLowerCase().includes('mjoubin') || u.email.toLowerCase().includes('admin@')));
                    return (
                      <span
                        key={id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          isAdmin
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {isAdmin && <Shield className="w-3 h-3 text-amber-600" />}
                        {u.firstName} {u.lastName}
                        <button
                          onClick={() => toggleTeacherSelection(id)}
                          className="hover:text-red-600 ml-1 p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })
                )}
              </div>
            </div>

            {/* Search & Tabs */}
            <div className="shrink-0 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, prénom ou email (ex: joubin, lestang, admin)..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs bg-slate-50 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setStaffRoleFilter('all')}
                  className={`px-3 py-1 rounded-md transition ${staffRoleFilter === 'all' ? 'bg-blue-600 text-white font-medium' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Tous ({assignableStaff.length})
                </button>
                <button
                  onClick={() => setStaffRoleFilter('teachers')}
                  className={`px-3 py-1 rounded-md transition ${staffRoleFilter === 'teachers' ? 'bg-blue-600 text-white font-medium' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Enseignants ({assignableStaff.filter(u => u.role === 'teacher').length})
                </button>
                <button
                  onClick={() => setStaffRoleFilter('admins')}
                  className={`px-3 py-1 rounded-md transition ${staffRoleFilter === 'admins' ? 'bg-amber-600 text-white font-medium' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Admins Office ({adminStaff.length})
                </button>
              </div>
            </div>

            {/* Staff Checkbox List */}
            <div className="overflow-y-auto space-y-1 pr-1 flex-1 min-h-[160px]">
              {assignableStaff
                .filter((t) => {
                  if (staffRoleFilter === 'teachers' && t.role !== 'teacher') return false;
                  if (staffRoleFilter === 'admins' && !(t.role === 'admin' || t.email.toLowerCase().includes('mjoubin') || t.email.toLowerCase().includes('admin@'))) return false;

                  const q = teacherSearch.toLowerCase();
                  return (
                    t.lastName.toLowerCase().includes(q) ||
                    t.firstName.toLowerCase().includes(q) ||
                    t.email.toLowerCase().includes(q) ||
                    t.upn.toLowerCase().includes(q)
                  );
                })
                .slice(0, 50)
                .map((prof) => {
                  const isChecked = selectedTeacherIds.includes(prof.id);
                  const isAdmin = prof.role === 'admin' || prof.email.toLowerCase().includes('mjoubin') || prof.email.toLowerCase().includes('admin@');

                  return (
                    <div
                      key={prof.id}
                      onClick={() => toggleTeacherSelection(prof.id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition select-none ${
                        isChecked
                          ? 'bg-blue-50 border-blue-500 text-slate-900'
                          : 'bg-slate-50 border-slate-300/60 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent onClick
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0 focus:ring-offset-0 bg-white cursor-pointer"
                        />
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            {prof.firstName} {prof.lastName}
                            {isAdmin ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Admin Office
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-700">
                                Enseignant
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">{prof.email || prof.upn}</div>
                        </div>
                      </div>

                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${isChecked ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {isChecked ? '✓ Sélectionné' : 'Ajouter'}
                      </span>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-300/60 flex items-center justify-between shrink-0">
              <button
                onClick={() => setAssigningTeam(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Annuler
              </button>

              <button
                onClick={handleSaveAssignments}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-600/25 transition active:scale-95"
              >
                <Check className="w-4 h-4" />
                Enregistrer ({selectedTeacherIds.length} propriétaire{selectedTeacherIds.length > 1 ? 's' : ''})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Co-propriété Globale Admins Office */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit">
                  <Shield className="w-3 h-3 text-amber-600" />
                  Supervision & Co-propriété Office 365
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1.5">
                  Ajouter les Administrateurs en Co-propriétaires
                </h3>
              </div>
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Cette opération ajoute les comptes administrateurs Office sélectionnés comme <strong>co-propriétaires (co-owners)</strong> sur les équipes Microsoft Teams, <strong>sans supprimer les professeurs actuels</strong>. Cela permet au service informatique d'assurer le support, la supervision et la maintenance des classes.
            </p>

            {/* Admin Accounts Checkboxes */}
            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-500 block mb-1">
                Comptes Administrateurs à associer :
              </span>
              {[
                { email: 'mjoubin@notredamedesmissions.com', label: 'Mikael JOUBIN (Responsable informatique)' },
                { email: 'admin@notredamedesmissions.com', label: 'Service Informatique NDM (Admin)' },
                { email: 'admin@notredamedesmissions.onmicrosoft.com', label: 'Admin Global Microsoft 365' },
              ].map(admin => {
                const isSelected = selectedAdminEmails.includes(admin.email);
                return (
                  <label key={admin.email} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedAdminEmails(prev =>
                          isSelected ? prev.filter(e => e !== admin.email) : [...prev, admin.email]
                        );
                      }}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-amber-600 bg-white focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">{admin.label}</div>
                      <div className="text-[11px] text-amber-700/80 font-mono">{admin.email}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Scope Selection */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
              <span className="font-medium text-slate-500 block">Périmètre d'application :</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="adminScope"
                  checked={adminScope === 'all'}
                  onChange={() => setAdminScope('all')}
                  className="w-4 h-4 text-amber-600 bg-white border-slate-300"
                />
                <span className="text-slate-900">Toutes les équipes de l'établissement (<strong>{teams.length} équipes</strong>)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="adminScope"
                  checked={adminScope === 'filtered'}
                  onChange={() => setAdminScope('filtered')}
                  className="w-4 h-4 text-amber-600 bg-white border-slate-300"
                />
                <span className="text-slate-700">Uniquement les équipes filtrées ({filteredTeams.length} équipes)</span>
              </label>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleExecuteBulkAdmins}
                disabled={selectedAdminEmails.length === 0}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-amber-600/25 transition active:scale-95"
              >
                <Shield className="w-4 h-4" />
                Appliquer la Co-propriété
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import CSV Affectations (Classe;Matiere;Professeur) */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-xl shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Import Grille Pronote / KoXo
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Affectation des Professeurs par Fichier (CSV)
                </h3>
              </div>
              <button
                onClick={() => setIsCsvModalOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-700">
              Collez un export CSV contenant les colonnes : <code className="text-emerald-600 font-mono">Classe;Matière;EmailProfesseur</code> (séparateur point-virgule ou virgule).
            </p>

            <textarea
              rows={6}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder={`Classe;Matiere;Professeur\n601;Français;marie.lestang@notredamedesmissions.com\n601;Mathématiques;guillaume.guedj@notredamedesmissions.com\nT01;Philosophie;gilles.eslinger@notredamedesmissions.com`}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-mono text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setIsCsvModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (csvContent.trim()) {
                    onImportAssignmentsCsv(csvContent);
                    setIsCsvModalOpen(false);
                    setCsvContent('');
                  }
                }}
                disabled={!csvContent.trim()}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 transition"
              >
                <Upload className="w-4 h-4" />
                Appliquer les affectations
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fiche Équipe */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  Fiche Équipe Teams
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1 font-mono">
                  {selectedTeam.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Classe :</span>
                <span className="font-bold text-slate-900 font-mono">{selectedTeam.classCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Matière :</span>
                <span className="font-semibold text-slate-800">{selectedTeam.subjectName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Statut M365 :</span>
                <span className={`font-bold ${selectedTeam.m365TeamId ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {selectedTeam.m365TeamId ? `Créée sur M365 (${selectedTeam.m365TeamId})` : 'En attente de création'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Élèves (Membres) :</span>
                <span className="font-semibold text-emerald-700">{selectedTeam.memberCount} élèves</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-slate-500">Propriétaire(s) (Owners) :</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedTeam.assignedTeachers && selectedTeam.assignedTeachers.length > 0 ? (
                    selectedTeam.assignedTeachers.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-blue-700 border border-slate-300">
                        {t.name} ({t.email})
                      </span>
                    ))
                  ) : (
                    <span className="text-amber-600 italic">Aucun propriétaire</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dernière synchronisation :</span>
                <span className="text-slate-700">{selectedTeam.lastSync ? new Date(selectedTeam.lastSync).toLocaleString('fr-FR') : 'Jamais'}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  const t = selectedTeam;
                  setSelectedTeam(null);
                  openAssignModal(t);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
              >
                Gérer les propriétaires
              </button>

              {!selectedTeam.m365TeamId ? (
                <button
                  onClick={async () => {
                    await handleExecuteProvision(selectedTeam.id);
                    setSelectedTeam(null);
                  }}
                  disabled={isSyncing}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  Créer sur Teams maintenant
                </button>
              ) : (
                <button
                  onClick={() => {
                    onSyncTeam(selectedTeam);
                    setSelectedTeam(null);
                  }}
                  disabled={isSyncing}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sync Membres
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Création en Masse */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Création en masse Microsoft Teams</h3>
                  <p className="text-xs text-slate-500">Automatisation complète sans devoir créer les équipes une par une</p>
                </div>
              </div>
              <button
                onClick={() => !isBatchRunning && setIsBatchModalOpen(false)}
                disabled={isBatchRunning}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-300/60 rounded-xl p-3.5 text-xs text-slate-700 space-y-2">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" /> Traitement 100% automatisé inclus :
              </div>
              <ul className="list-disc pl-4 space-y-1 text-slate-700">
                <li>Création du groupe unifié Microsoft 365 (`POST /groups`)</li>
                <li><strong>Activation de l'équipe Teams (`PUT /groups/team`)</strong> pour visibilité immédiate dans Teams</li>
                <li><strong>Application des restrictions membres strictes</strong> (aucun canal/app créé par les élèves)</li>
                <li>Ajout de tous les élèves de la classe (`PATCH /groups`)</li>
                <li>Attribution des co-propriétaires enseignants et administrateurs Office</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Périmètre de création :</label>
              <div className="space-y-1.5 text-xs">
                <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-300 cursor-pointer hover:border-slate-300">
                  <input
                    type="radio"
                    name="batchScope"
                    value="class"
                    checked={batchScope === 'class'}
                    onChange={() => setBatchScope('class')}
                    disabled={isBatchRunning}
                    className="text-emerald-600"
                  />
                  <span>
                    <strong>Classe sélectionnée uniquement</strong> ({classFilter !== 'all' ? `Classe ${classFilter}` : 'Classe 101 par défaut'})
                  </span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-300 cursor-pointer hover:border-slate-300">
                  <input
                    type="radio"
                    name="batchScope"
                    value="pending"
                    checked={batchScope === 'pending'}
                    onChange={() => setBatchScope('pending')}
                    disabled={isBatchRunning}
                    className="text-emerald-600"
                  />
                  <span>
                    <strong>Toutes les équipes en attente</strong> ({teams.filter(t => !t.m365TeamId).length} équipes non encore créées)
                  </span>
                </label>
              </div>
            </div>

            {batchProgress && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-700">Progression : {batchProgress.current} / {batchProgress.total}</span>
                  <span className="text-emerald-600 font-bold">{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                  />
                </div>
                <div className="text-slate-500 truncate">
                  En cours : <span className="text-slate-900 font-mono">{batchProgress.teamName}</span>
                </div>
                <div className="flex gap-3 text-[11px] pt-1 border-t border-slate-200">
                  <span className="text-emerald-600 font-semibold">{batchProgress.successCount} réussies</span>
                  {batchProgress.failedCount > 0 && (
                    <span className="text-rose-600 font-semibold">{batchProgress.failedCount} échecs</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsBatchModalOpen(false)}
                disabled={isBatchRunning}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Fermer
              </button>
              <button
                onClick={handleStartBatchProvision}
                disabled={isBatchRunning}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition"
              >
                {isBatchRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    Lancer la création en masse
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Autorisations des Membres & Restrictions Teams */}
      {isRestrictionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Autorisations des membres (Paramètres Teams)</h3>
                  <p className="text-xs text-slate-500">Activer la création de canal, l'ajout d'applications et plus encore</p>
                </div>
              </div>
              <button
                onClick={() => setIsRestrictionsModalOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope Selection: une équipe OU toutes les équipes */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-xs">
              <label className="font-semibold text-slate-900 block">Périmètre d'application :</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-300 cursor-pointer hover:border-slate-300">
                  <input
                    type="radio"
                    name="restrictionsScope"
                    value="single"
                    checked={restrictionsScope === 'single'}
                    onChange={() => setRestrictionsScope('single')}
                    className="text-blue-600"
                  />
                  <span><strong>Une équipe spécifique</strong></span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-300 cursor-pointer hover:border-slate-300">
                  <input
                    type="radio"
                    name="restrictionsScope"
                    value="all"
                    checked={restrictionsScope === 'all'}
                    onChange={() => setRestrictionsScope('all')}
                    className="text-blue-600"
                  />
                  <span><strong>Toutes les équipes ({teams.length})</strong></span>
                </label>
              </div>

              {restrictionsScope === 'single' && (
                <div className="pt-1">
                  <label className="text-[11px] text-slate-500 block mb-1">Choisir l'équipe cible :</label>
                  <select
                    value={targetTeamIdForRestrictions}
                    onChange={(e) => {
                      setTargetTeamIdForRestrictions(e.target.value);
                      const t = teams.find(item => item.id === e.target.value);
                      if (t?.memberRestrictions) {
                        setCustomRestrictions({ ...t.memberRestrictions });
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.classCode}) {t.m365TeamId ? '• Sur M365 Cloud' : '• Local'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Checkbox: Appliquer sur toutes les NOUVELLES équipes */}
              <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={saveAsDefaultOption}
                    onChange={(e) => setSaveAsDefaultOption(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0 bg-white border-slate-300"
                  />
                  <span>
                    <strong>Appliquer par défaut sur TOUTES les NOUVELLES équipes</strong>
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleResetToStrictPreset}
                  className="text-[11px] text-blue-600 hover:text-blue-700 underline font-medium self-start sm:self-auto"
                >
                  Profil strict recommandé
                </button>
              </div>
            </div>

            {/* Section Modération du Canal Général — Conforme à la capture d'écran Microsoft Teams */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs text-slate-800">
              <div className="flex items-start justify-between pb-2 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-1.5 text-blue-600 font-bold uppercase tracking-wider text-[11px]">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Modération — Définir les préférences de modération de canal
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Contrôle des autorisations de publication sur le canal principal « Général » de l'équipe
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-blue-700 border border-slate-300">
                  Canal Général
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-900 block">Canal général :</span>

                {/* Option 1: Tout le monde peut publier des messages */}
                <label className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                  customRestrictions.generalChannelModeration === 'everyone'
                    ? 'bg-blue-50 border-blue-200 text-slate-900'
                    : 'bg-white/60 border-slate-200 hover:border-slate-300 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="generalChannelModeration"
                    value="everyone"
                    checked={customRestrictions.generalChannelModeration === 'everyone'}
                    onChange={() => setCustomRestrictions(prev => ({ ...prev, generalChannelModeration: 'everyone' }))}
                    className="mt-0.5 text-blue-600 focus:ring-0 bg-white border-slate-300 cursor-pointer"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">Tout le monde peut publier des messages</div>
                    <div className="text-[11px] text-slate-500">Tous les membres (élèves et professeurs) peuvent publier librement dans le canal général.</div>
                  </div>
                </label>

                {/* Option 2: Tout le monde peut publier dans le canal ; afficher l'alerte */}
                <label className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                  customRestrictions.generalChannelModeration === 'everyoneWithAlert'
                    ? 'bg-blue-50 border-blue-200 text-slate-900'
                    : 'bg-white/60 border-slate-200 hover:border-slate-300 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="generalChannelModeration"
                    value="everyoneWithAlert"
                    checked={customRestrictions.generalChannelModeration === 'everyoneWithAlert'}
                    onChange={() => setCustomRestrictions(prev => ({ ...prev, generalChannelModeration: 'everyoneWithAlert' }))}
                    className="mt-0.5 text-blue-600 focus:ring-0 bg-white border-slate-300 cursor-pointer"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">
                      Tout le monde peut publier dans le canal ; afficher l'alerte indiquant que tous les membres seront avertis des publications (recommandé pour les équipes de grande taille)
                    </div>
                    <div className="text-[11px] text-slate-500">Avertit chaque membre qu'une notification générale sera envoyée à toute l'équipe.</div>
                  </div>
                </label>

                {/* Option 3: Seuls les propriétaires peuvent publier des messages */}
                <label className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                  (customRestrictions.generalChannelModeration || 'ownersOnly') === 'ownersOnly'
                    ? 'bg-blue-50 border-blue-200 text-slate-900'
                    : 'bg-white/60 border-slate-200 hover:border-slate-300 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="generalChannelModeration"
                    value="ownersOnly"
                    checked={(customRestrictions.generalChannelModeration || 'ownersOnly') === 'ownersOnly'}
                    onChange={() => setCustomRestrictions(prev => ({ ...prev, generalChannelModeration: 'ownersOnly' }))}
                    className="mt-0.5 text-blue-600 focus:ring-0 bg-white border-slate-300 cursor-pointer"
                  />
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                      <span>Seuls les propriétaires peuvent publier des messages</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Recommandé en Milieu Scolaire
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Canal dédié aux annonces et aux cours : seuls les professeurs et administrateurs peuvent initier des messages. Les élèves ne peuvent pas polluer le fil.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Checklist exactly matching user screenshot with interactive checkboxes */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs text-slate-800">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-200 flex items-center justify-between">
                <span>Autorisations des membres</span>
                <span className="text-[10px] lowercase text-slate-500 font-normal">Cochez pour autoriser</span>
              </div>

              {/* 1. allowCreateUpdateChannels */}
              <label className="flex items-center gap-2.5 cursor-pointer hover:text-slate-900 transition">
                <input
                  type="checkbox"
                  checked={customRestrictions.allowCreateUpdateChannels}
                  onChange={() => handleToggleRestriction('allowCreateUpdateChannels')}
                  className="rounded text-blue-600 focus:ring-0 bg-white border-slate-300"
                />
                <span>Autoriser les membres à créer et mettre à jour des canaux</span>
              </label>

              {/* 2. allowCreatePrivateChannels (indented) */}
              <div className="pl-6">
                <label className={`flex items-center gap-2.5 transition ${
                  customRestrictions.allowCreateUpdateChannels ? 'cursor-pointer hover:text-slate-900' : 'opacity-40 cursor-not-allowed'
                }`}>
                  <input
                    type="checkbox"
                    disabled={!customRestrictions.allowCreateUpdateChannels}
                    checked={customRestrictions.allowCreatePrivateChannels && customRestrictions.allowCreateUpdateChannels}
                    onChange={() => handleToggleRestriction('allowCreatePrivateChannels')}
                    className="rounded text-blue-600 focus:ring-0 bg-white border-slate-300"
                  />
                  <span>Autoriser les membres à créer des canaux privés</span>
                </label>
                <div className="text-[11px] text-slate-500 italic mt-0.5">
                  Les autorisations de création des canaux privés nécessitent également l'activation de la création des canaux.
                </div>
              </div>

              {/* 3. allowDeleteChannels */}
              <label className="flex items-center gap-2.5 cursor-pointer hover:text-slate-900 transition">
                <input
                  type="checkbox"
                  checked={customRestrictions.allowDeleteChannels}
                  onChange={() => handleToggleRestriction('allowDeleteChannels')}
                  className="rounded text-blue-600 focus:ring-0 bg-white border-slate-300"
                />
                <span>Autoriser les membres à supprimer et restaurer des canaux</span>
              </label>

              {/* 4. allowAddRemoveApps */}
              <label className="flex items-center gap-2.5 cursor-pointer hover:text-slate-900 transition">
                <input
                  type="checkbox"
                  checked={customRestrictions.allowAddRemoveApps}
                  onChange={() => handleToggleRestriction('allowAddRemoveApps')}
                  className="rounded text-blue-600 focus:ring-0 bg-white border-slate-300"
                />
                <span>Autoriser les membres à ajouter et supprimer des applications</span>
              </label>

              {/* 5. allowCustomApps */}
              <label className="flex items-center gap-2.5 cursor-pointer hover:text-slate-900 transition">
                <input
                  type="checkbox"
                  checked={customRestrictions.allowCustomApps}
                  onChange={() => handleToggleRestriction('allowCustomApps')}
                  className="rounded text-blue-600 focus:ring-0 bg-white border-slate-300"
                />
                <span>Autoriser les membres à charger des applications personnalisées</span>
              </label>

              {/* 6. allowCreateUpdateRemoveTabs */}
              <label className="flex items-center gap-2.5 cursor-pointer hover:text-slate-900 transition">
                <input
                  type="checkbox"
                  checked={customRestrictions.allowCreateUpdateRemoveTabs}
                  onChange={() => handleToggleRestriction('allowCreateUpdateRemoveTabs')}
                  className="rounded text-blue-600 focus:ring-0 bg-white border-slate-300"
                />
                <span>Autoriser les membres à créer, mettre à jour et supprimer des onglets</span>
              </label>

              {/* 7. allowOwnerDeleteMessages */}
              <label className="flex items-center gap-2.5 cursor-pointer text-emerald-600 font-semibold hover:text-emerald-700 transition">
                <input
                  type="checkbox"
                  checked={customRestrictions.allowOwnerDeleteMessages}
                  onChange={() => handleToggleRestriction('allowOwnerDeleteMessages')}
                  className="rounded text-emerald-600 focus:ring-0 bg-white border-slate-300"
                />
                <span>Les propriétaires peuvent supprimer tous les messages</span>
              </label>

              {/* 8. allowCreateUpdateRemoveConnectors */}
              <label className="flex items-center gap-2.5 cursor-pointer hover:text-slate-900 transition">
                <input
                  type="checkbox"
                  checked={customRestrictions.allowCreateUpdateRemoveConnectors}
                  onChange={() => handleToggleRestriction('allowCreateUpdateRemoveConnectors')}
                  className="rounded text-blue-600 focus:ring-0 bg-white border-slate-300"
                />
                <span>Autoriser les membres à créer, mettre à jour et supprimer des connecteurs</span>
              </label>

              {/* 9. allowUserCreateUpdateTags */}
              <label className="flex items-center gap-2.5 cursor-pointer hover:text-slate-900 transition">
                <input
                  type="checkbox"
                  checked={customRestrictions.allowUserCreateUpdateTags}
                  onChange={() => handleToggleRestriction('allowUserCreateUpdateTags')}
                  className="rounded text-blue-600 focus:ring-0 bg-white border-slate-300"
                />
                <span>Autoriser les membres à créer, modifier et supprimer des balises</span>
              </label>

              {/* 10. allowUserDeleteMessages */}
              <label className="flex items-center gap-2.5 cursor-pointer hover:text-slate-900 transition">
                <input
                  type="checkbox"
                  checked={customRestrictions.allowUserDeleteMessages}
                  onChange={() => handleToggleRestriction('allowUserDeleteMessages')}
                  className="rounded text-blue-600 focus:ring-0 bg-white border-slate-300"
                />
                <span>Autoriser les membres à supprimer leurs messages</span>
              </label>

              {/* 11. allowUserEditMessages */}
              <label className="flex items-center gap-2.5 cursor-pointer hover:text-slate-900 transition">
                <input
                  type="checkbox"
                  checked={customRestrictions.allowUserEditMessages}
                  onChange={() => handleToggleRestriction('allowUserEditMessages')}
                  className="rounded text-blue-600 focus:ring-0 bg-white border-slate-300"
                />
                <span>Autoriser les membres à modifier leurs messages</span>
              </label>
            </div>

            {enforceResult && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
                {enforceResult}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsRestrictionsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Fermer
              </button>
              <button
                onClick={handleApplyRestrictions}
                disabled={isEnforcingRestrictions}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition"
              >
                {isEnforcingRestrictions ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Application en cours...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    {restrictionsScope === 'single' ? 'Appliquer à cette équipe' : 'Appliquer à TOUTES les équipes'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifier l'Équipe */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-md shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Modifier l'équipe</h3>
                  <p className="text-xs text-slate-500 font-mono">{editingTeam.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingTeam(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nom de l'équipe :</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Code Classe :</label>
                  <input
                    type="text"
                    value={editClassCode}
                    onChange={(e) => setEditClassCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Matière / Cours :</label>
                  <input
                    type="text"
                    value={editSubjectName}
                    onChange={(e) => setEditSubjectName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="editAutoManaged"
                  checked={editAutoManaged}
                  onChange={(e) => setEditAutoManaged(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 bg-slate-50 border-slate-300"
                />
                <label htmlFor="editAutoManaged" className="text-slate-700 cursor-pointer">
                  Gestion automatique (synchronisation par script)
                </label>
              </div>

              {editingTeam.m365TeamId && (
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-700">
                  ℹ️ Cette équipe est active sur Microsoft 365 Cloud. Son nom sera également mis à jour sur Microsoft Teams.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingTeam(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEditTeam}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-lg shadow-blue-600/25"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation Suppression Unitaire */}
      {teamToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-md shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Supprimer l'équipe ?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Êtes-vous sûr de vouloir supprimer l'équipe <strong className="text-slate-900">"{teamToDelete.name}"</strong> ({teamToDelete.classCode}) ?
                </p>
              </div>
            </div>

            {teamToDelete.m365TeamId && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                ⚠️ Cette équipe est active sur Microsoft 365 Cloud. Elle sera également <strong>définitivement supprimée du Cloud Microsoft Teams</strong>.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setTeamToDelete(null)}
                disabled={isDeletingSingle}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleExecuteDeleteSingle}
                disabled={isDeletingSingle}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-rose-600/25"
              >
                {isDeletingSingle ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer l'équipe
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Suppression de TOUTES les Équipes */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-rose-200 rounded-2xl w-full max-w-lg shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Supprimer TOUTES les équipes ({teams.length})</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Attention : cette action va purger la totalité des {teams.length} équipes du système.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-2 text-xs text-rose-800">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteFromM365Option}
                  onChange={(e) => setDeleteFromM365Option(e.target.checked)}
                  className="rounded text-rose-600 mt-0.5"
                />
                <span>
                  <strong>Supprimer également les équipes créées sur Microsoft Teams Cloud</strong> ({m365RealCount} équipes actives sur votre tenant)
                </span>
              </label>
              <p className="text-[11px] text-rose-700/80 pl-5">
                Si non coché, seules les équipes locales seront réinitialisées. Vous pourrez régénérer le catalogue propre à tout moment en cliquant sur « Catalogue 37 Classes ».
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="text-slate-700 font-semibold">
                Pour confirmer la suppression totale, tapez <span className="font-mono text-rose-600 font-bold">SUPPRIMER</span> :
              </label>
              <input
                type="text"
                placeholder="SUPPRIMER"
                value={confirmDeleteAllInput}
                onChange={(e) => setConfirmDeleteAllInput(e.target.value)}
                className="w-full bg-slate-50 border border-rose-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setIsDeleteAllModalOpen(false);
                  setConfirmDeleteAllInput('');
                }}
                disabled={isDeletingAll}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleExecuteDeleteAll}
                disabled={confirmDeleteAllInput.trim().toUpperCase() !== 'SUPPRIMER' || isDeletingAll}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-rose-600/25"
              >
                {isDeletingAll ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Suppression globale en cours...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Confirmer la suppression totale
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajouter un Utilisateur à TOUTES les Équipes */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Ajouter un utilisateur à toutes les équipes</h3>
                  <p className="text-xs text-slate-500">Rattachement global immédiat (serveur local + Microsoft Teams Cloud)</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddUserModalOpen(false);
                  setAddUserSuccessMsg(null);
                }}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  1. Sélectionner un compte existant de l'annuaire :
                </label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrer parmi les enseignants, personnels, admins..."
                    value={userSearchText}
                    onChange={(e) => setUserSearchText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-slate-900 text-xs"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-1.5 space-y-1">
                  {users
                    .filter(u => 
                      !userSearchText || 
                      `${u.firstName} ${u.lastName}`.toLowerCase().includes(userSearchText.toLowerCase()) || 
                      (u.email || '').toLowerCase().includes(userSearchText.toLowerCase())
                    )
                    .slice(0, 30)
                    .map(u => (
                      <div
                        key={u.id}
                        onClick={() => {
                          setSelectedUserForAdd(u.id);
                          setCustomEmailForAdd('');
                        }}
                        className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition ${
                          selectedUserForAdd === u.id ? 'bg-blue-600 text-white font-medium' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="truncate">
                          <span className="font-semibold">{u.firstName} {u.lastName}</span>
                          <span className="text-[10px] text-slate-500 block truncate">{u.email || u.upn}</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {u.role}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Ou saisir une adresse email directement :
                </label>
                <input
                  type="email"
                  placeholder="ex: mjoubin@notredamedesmissions.com ou direction@..."
                  value={customEmailForAdd}
                  onChange={(e) => {
                    setCustomEmailForAdd(e.target.value);
                    setSelectedUserForAdd('');
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">2. Rôle dans les équipes :</label>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="addUserRole"
                        value="owner"
                        checked={addUserRole === 'owner'}
                        onChange={() => setAddUserRole('owner')}
                        className="text-blue-600"
                      />
                      <span><strong>Propriétaire (Owner)</strong></span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="addUserRole"
                        value="member"
                        checked={addUserRole === 'member'}
                        onChange={() => setAddUserRole('member')}
                        className="text-blue-600"
                      />
                      <span><strong>Membre (Member)</strong></span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">3. Périmètre d'équipes :</label>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="addUserScope"
                        value="all"
                        checked={addUserScope === 'all'}
                        onChange={() => setAddUserScope('all')}
                        className="text-blue-600"
                      />
                      <span><strong>Toutes ({teams.length})</strong></span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="addUserScope"
                        value="filtered"
                        checked={addUserScope === 'filtered'}
                        onChange={() => setAddUserScope('filtered')}
                        className="text-blue-600"
                      />
                      <span><strong>Filtrées ({filteredTeams.length})</strong></span>
                    </label>
                  </div>
                </div>
              </div>

              {addUserSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  {addUserSuccessMsg}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 shrink-0 border-t border-slate-200">
              <button
                onClick={() => {
                  setIsAddUserModalOpen(false);
                  setAddUserSuccessMsg(null);
                }}
                disabled={isSubmittingAddUser}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Fermer
              </button>
              <button
                onClick={handleExecuteAddUserToAll}
                disabled={(!selectedUserForAdd && !customEmailForAdd.trim()) || isSubmittingAddUser}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition"
              >
                {isSubmittingAddUser ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Ajout en cours...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Valider l'ajout global
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
