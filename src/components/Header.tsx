import React from 'react';
import { 
  Building2, 
  RefreshCw, 
  Play, 
  ShieldCheck, 
  Menu, 
  X,
  Server,
  AlertTriangle,
  FolderGit2
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSimulation: () => void;
  onQuickSync: () => void;
  isSyncing: boolean;
  schoolYear: string;
  anomaliesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSimulation,
  onQuickSync,
  isSyncing,
  schoolYear,
  anomaliesCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord' },
    { id: 'classes', label: 'Classes (37)' },
    { id: 'subjects', label: 'Matières' },
    { id: 'users', label: 'Élèves & Profs' },
    { id: 'teams', label: 'Équipes Teams' },
    { id: 'koxo', label: 'Comptes KoXo' },
    { id: 'office', label: 'Comptes M365' },
    { id: 'rentree', label: 'Rentrée & nouveaux comptes' },
    { id: 'anomalies', label: 'Anomalies', badge: anomaliesCount > 0 ? anomaliesCount : null },
    { id: 'logs', label: 'Journal' },
    { id: 'settings', label: 'M365 & Config' },
    { id: 'deployment', label: 'Déploiement LXC / Git', highlight: true },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & School Name */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold text-lg">
              NDM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">Notre-Dame des Missions</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hidden sm:inline-block">
                  Teams Manager
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-blue-600" />
                Collège & Lycée • Année {schoolYear}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons (Desktop) */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={onOpenSimulation}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium border border-slate-300 transition"
              title="Lancer une simulation sans modifier Teams"
            >
              <Play className="w-3.5 h-3.5 text-amber-600" />
              Mode Simulation
            </button>

            <button
              onClick={onQuickSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold shadow-md shadow-blue-600/25 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Synchronisation...' : 'Synchroniser Teams'}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={onOpenSimulation}
              className="p-1.5 rounded-lg bg-slate-100 text-amber-600 border border-slate-300"
              title="Mode Simulation"
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Desktop) */}
        <nav className="hidden lg:flex space-x-1 overflow-x-auto py-1 border-t border-slate-200/60 no-scrollbar">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                    : item.highlight
                    ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {item.id === 'deployment' && <FolderGit2 className="w-3.5 h-3.5 text-emerald-600" />}
                {item.label}
                {item.badge && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          <div className="flex gap-2 py-2 mb-2 border-b border-slate-200">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenSimulation();
              }}
              className="flex-1 py-2 rounded-lg bg-slate-100 text-amber-600 text-xs font-semibold flex items-center justify-center gap-1 border border-slate-300"
            >
              <Play className="w-3.5 h-3.5" /> Simulation
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onQuickSync();
              }}
              disabled={isSyncing}
              className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} /> Sync Teams
            </button>
          </div>

          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                activeTab === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                {item.id === 'deployment' && <FolderGit2 className="w-4 h-4 text-emerald-600" />}
                {item.label}
              </span>
              {item.badge && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-400">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
