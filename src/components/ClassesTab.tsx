import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Users, 
  School,
  Sparkles
} from 'lucide-react';
import type { ClassItem } from '../types/index.ts';

interface ClassesTabProps {
  classes: ClassItem[];
  onAddClass: (classData: Partial<ClassItem>) => void;
  onUpdateClass: (id: string, classData: Partial<ClassItem>) => void;
  onDeleteClass: (id: string) => void;
  onSyncClass: (classItem: ClassItem) => void;
  isSyncing: boolean;
}

export const ClassesTab: React.FC<ClassesTabProps> = ({
  classes,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  onSyncClass,
  isSyncing,
}) => {
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState<'Tous' | 'Collège' | 'Lycée'>('Tous');
  const [levelFilter, setLevelFilter] = useState<string>('Tous');
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formLevel, setFormLevel] = useState<any>('6e');
  const [formSection, setFormSection] = useState<'Collège' | 'Lycée'>('Collège');
  const [formStudentCount, setFormStudentCount] = useState<number>(30);
  const [formMainTeacher, setFormMainTeacher] = useState('');
  const [formRoom, setFormRoom] = useState('');

  const openAddModal = () => {
    setEditingClass(null);
    setFormCode('');
    setFormName('');
    setFormLevel('6e');
    setFormSection('Collège');
    setFormStudentCount(30);
    setFormMainTeacher('');
    setFormRoom('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: ClassItem) => {
    setEditingClass(c);
    setFormCode(c.code);
    setFormName(c.name);
    setFormLevel(c.level);
    setFormSection(c.section);
    setFormStudentCount(c.studentCount);
    setFormMainTeacher(c.mainTeacher || '');
    setFormRoom(c.room || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) return;

    if (editingClass) {
      onUpdateClass(editingClass.id, {
        code: formCode,
        name: formName || formCode,
        level: formLevel,
        section: formSection,
        studentCount: formStudentCount,
        mainTeacher: formMainTeacher,
        room: formRoom,
      });
    } else {
      onAddClass({
        code: formCode,
        name: formName || formCode,
        level: formLevel,
        section: formSection,
        studentCount: formStudentCount,
        active: true,
        mainTeacher: formMainTeacher,
        room: formRoom,
      });
    }
    setIsModalOpen(false);
  };

  const filteredClasses = classes.filter((c) => {
    const matchSearch =
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.mainTeacher && c.mainTeacher.toLowerCase().includes(search.toLowerCase()));

    const matchSection = sectionFilter === 'Tous' || c.section === sectionFilter;
    const matchLevel = levelFilter === 'Tous' || c.level === levelFilter;

    return matchSearch && matchSection && matchLevel;
  });

  const collegeCount = classes.filter((c) => c.section === 'Collège').length;
  const lyceeCount = classes.filter((c) => c.section === 'Lycée').length;

  return (
    <div className="space-y-6">
      
      {/* Header and stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Gestion des Classes ({classes.length})
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              37 Prévues au Cahier des Charges
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Collège : 24 classes (6e à 3e) • Lycée : 13 classes (2nde, 1ère, Terminale)
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Ajouter une classe
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-50 border border-slate-300/80 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher code, nom, professeur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Section Filter Buttons */}
          <div className="bg-white p-1 rounded-lg border border-slate-300 flex text-xs">
            {(['Tous', 'Collège', 'Lycée'] as const).map((sec) => (
              <button
                key={sec}
                onClick={() => setSectionFilter(sec)}
                className={`px-3 py-1 rounded-md transition ${
                  sectionFilter === sec
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {sec} {sec === 'Collège' ? `(${collegeCount})` : sec === 'Lycée' ? `(${lyceeCount})` : `(${classes.length})`}
              </button>
            ))}
          </div>

          {/* Level selector */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="Tous">Tous les niveaux</option>
            <option value="6e">6ème (6 classes)</option>
            <option value="5e">5ème (6 classes)</option>
            <option value="4e">4ème (6 classes)</option>
            <option value="3e">3ème (6 classes)</option>
            <option value="2nde">Seconde (5 classes)</option>
            <option value="1ère">Première (4 classes)</option>
            <option value="Terminale">Terminale (4 classes)</option>
          </select>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {filteredClasses.map((c) => (
          <div
            key={c.id}
            className={`bg-slate-50 border rounded-xl p-4 flex flex-col justify-between transition group hover:shadow-md ${
              c.active ? 'border-slate-300/80 hover:border-blue-200' : 'border-slate-200 opacity-60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold font-mono text-slate-900 group-hover:text-blue-600 transition">
                  {c.code}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  c.section === 'Collège'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {c.level} • {c.section}
                </span>
              </div>

              <div className="mt-2 space-y-1 text-xs">
                <div className="text-slate-800 font-medium">{c.name}</div>
                <div className="text-slate-500 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>{c.studentCount} élèves inscrits</span>
                </div>
                {c.mainTeacher && (
                  <div className="text-slate-500 truncate">
                    PP : <span className="text-slate-700">{c.mainTeacher}</span>
                  </div>
                )}
                {c.room && (
                  <div className="text-slate-500 text-[11px]">Salle : {c.room}</div>
                )}
              </div>
            </div>

            {/* Action Bar per class */}
            <div className="mt-4 pt-3 border-t border-slate-300/60 flex items-center justify-between gap-2">
              <button
                onClick={() => onSyncClass(c)}
                disabled={isSyncing}
                title="Synchroniser uniquement cette classe (Section 54 Cahier des charges)"
                className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3 h-3 text-blue-600" />
                Sync Classe
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(c)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition"
                  title="Modifier la classe"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteClass(c.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-200 transition"
                  title="Supprimer la classe"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add / Edit Class */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-md shadow-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingClass ? `Modifier la classe ${editingClass.code}` : 'Ajouter une nouvelle classe'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Code de la classe (ex: 601, 201, T01)</label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="601"
                  className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Nom d'affichage</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="6ème 1"
                  className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Section</label>
                  <select
                    value={formSection}
                    onChange={(e) => {
                      const sec = e.target.value as 'Collège' | 'Lycée';
                      setFormSection(sec);
                      setFormLevel(sec === 'Collège' ? '6e' : '2nde');
                    }}
                    className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Collège">Collège</option>
                    <option value="Lycée">Lycée</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-medium mb-1">Niveau</label>
                  <select
                    value={formLevel}
                    onChange={(e) => setFormLevel(e.target.value as any)}
                    className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    {formSection === 'Collège' ? (
                      <>
                        <option value="6e">6ème</option>
                        <option value="5e">5ème</option>
                        <option value="4e">4ème</option>
                        <option value="3e">3ème</option>
                      </>
                    ) : (
                      <>
                        <option value="2nde">Seconde</option>
                        <option value="1ère">Première</option>
                        <option value="Terminale">Terminale</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Effectif estimé</label>
                  <input
                    type="number"
                    value={formStudentCount}
                    onChange={(e) => setFormStudentCount(Number(e.target.value))}
                    min={0}
                    max={50}
                    className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Salle attitrée</label>
                  <input
                    type="text"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    placeholder="B101"
                    className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Professeur Principal</label>
                <input
                  type="text"
                  value={formMainTeacher}
                  onChange={(e) => setFormMainTeacher(e.target.value)}
                  placeholder="Mme Dupont"
                  className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
                >
                  {editingClass ? 'Sauvegarder' : 'Créer la classe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
