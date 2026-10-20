import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Tag, 
  Layers
} from 'lucide-react';
import type { SubjectItem, SubjectType } from '../types/index.ts';

interface SubjectsTabProps {
  subjects: SubjectItem[];
  onAddSubject: (subject: Partial<SubjectItem>) => void;
  onUpdateSubject: (id: string, subject: Partial<SubjectItem>) => void;
  onDeleteSubject: (id: string) => void;
}

export const SubjectsTab: React.FC<SubjectsTabProps> = ({
  subjects,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('Tous');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);

  // Form states
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formShortName, setFormShortName] = useState('');
  const [formType, setFormType] = useState<SubjectType>('Tronc commun');
  const [formSection, setFormSection] = useState<'Tous' | 'Collège' | 'Lycée'>('Tous');
  const [formPriority, setFormPriority] = useState(1);
  const [selectedLevels, setSelectedLevels] = useState<string[]>(['6e']);

  const allLevels = ['6e', '5e', '4e', '3e', '2nde', '1ère', 'Terminale'];

  const openAddModal = () => {
    setEditingSubject(null);
    setFormCode('');
    setFormName('');
    setFormShortName('');
    setFormType('Tronc commun');
    setFormSection('Tous');
    setFormPriority(10);
    setSelectedLevels(['6e', '5e', '4e', '3e']);
    setIsModalOpen(true);
  };

  const openEditModal = (s: SubjectItem) => {
    setEditingSubject(s);
    setFormCode(s.code);
    setFormName(s.name);
    setFormShortName(s.shortName);
    setFormType(s.type);
    setFormSection(s.section as any);
    setFormPriority(s.priority);
    setSelectedLevels(s.levels || []);
    setIsModalOpen(true);
  };

  const toggleLevel = (lvl: string) => {
    if (selectedLevels.includes(lvl)) {
      setSelectedLevels(selectedLevels.filter((x) => x !== lvl));
    } else {
      setSelectedLevels([...selectedLevels, lvl]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim()) return;

    if (editingSubject) {
      onUpdateSubject(editingSubject.id, {
        code: formCode.toUpperCase(),
        name: formName,
        shortName: formShortName || formName,
        type: formType,
        section: formSection,
        priority: formPriority,
        levels: selectedLevels as any,
      });
    } else {
      onAddSubject({
        code: formCode.toUpperCase(),
        name: formName,
        shortName: formShortName || formName,
        type: formType,
        section: formSection,
        priority: formPriority,
        levels: selectedLevels as any,
        active: true,
      });
    }
    setIsModalOpen(false);
  };

  const filteredSubjects = subjects.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.shortName.toLowerCase().includes(search.toLowerCase());

    const matchType = typeFilter === 'Tous' || s.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Référentiel des Matières ({subjects.length})
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Configurable sans modification du code
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Enseignements communs, spécialités de Première/Terminale, options et langues vivantes.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Ajouter une matière
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-50 border border-slate-300/80 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher matière ou code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-300 text-xs w-full md:w-auto">
          {['Tous', 'Tronc commun', 'Spécialité', 'Option', 'LV2'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-md transition ${
                typeFilter === t
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Subjects Table/Grid */}
      <div className="bg-slate-50 border border-slate-300/80 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-white/80 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-300">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Intitulé</th>
                <th className="py-3 px-4">Nom Court Teams</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Niveaux Concernés</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300/50">
              {filteredSubjects.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                    {s.code}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {s.name}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">
                    {s.shortName}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.type === 'Tronc commun'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : s.type === 'Spécialité'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : s.type === 'Option'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {s.type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {s.levels.map((lvl) => (
                        <span key={lvl} className="px-1.5 py-0.5 rounded bg-white text-slate-500 text-[10px] border border-slate-300">
                          {lvl}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onUpdateSubject(s.id, { active: !s.active })}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition ${
                        s.active
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {s.active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {s.active ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEditModal(s)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition mr-1"
                      title="Modifier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteSubject(s.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-200 transition"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Subject */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-md shadow-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingSubject ? `Modifier ${editingSubject.name}` : 'Ajouter une matière au référentiel'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Code (ex: HGGSP, MATH)</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="HGGSP"
                    className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Nom Court (dans Teams)</label>
                  <input
                    type="text"
                    value={formShortName}
                    onChange={(e) => setFormShortName(e.target.value)}
                    placeholder="HGGSP"
                    className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Intitulé complet</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Histoire-Géographie, Géopolitique et Sciences Politiques"
                  className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Type d'enseignement</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Tronc commun">Tronc commun</option>
                    <option value="Spécialité">Spécialité</option>
                    <option value="Option">Option</option>
                    <option value="LV2">LV2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-medium mb-1">Section</label>
                  <select
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value as any)}
                    className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Tous">Tous</option>
                    <option value="Collège">Collège uniquement</option>
                    <option value="Lycée">Lycée uniquement</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1.5">Niveaux concernés</label>
                <div className="flex flex-wrap gap-1.5">
                  {allLevels.map((lvl) => {
                    const isSelected = selectedLevels.includes(lvl);
                    return (
                      <button
                        type="button"
                        key={lvl}
                        onClick={() => toggleLevel(lvl)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-slate-100 text-slate-500 border-slate-300 hover:text-slate-900'
                        }`}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
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
                  {editingSubject ? 'Sauvegarder' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
