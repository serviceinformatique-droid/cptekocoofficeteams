import React, { useState } from 'react';
import { Search, Copy, Check, Filter, Scissors, Hash, Shield, GraduationCap, ArrowRight, Eye, EyeOff, KeyRound, RefreshCw, LayoutGrid, List } from 'lucide-react';
import { ProcessedRow } from '../types';

interface DataTableProps {
  rows: ProcessedRow[];
  activeFilter: 'all' | 'teachers' | 'students' | 'homonyms' | 'truncated';
  onSelectFilter: (filter: 'all' | 'teachers' | 'students' | 'homonyms' | 'truncated') => void;
  maxIdLength: number;
  onRegeneratePasswords?: () => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  rows,
  activeFilter,
  onSelectFilter,
  maxIdLength,
  onRegeneratePasswords,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Filter rows based on filter tab and search query
  const filteredRows = rows.filter((row) => {
    // 1. Tab filter
    if (activeFilter === 'teachers' && row.role !== 'teacher') return false;
    if (activeFilter === 'students' && row.role !== 'student') return false;
    if (activeFilter === 'homonyms' && !row.isHomonym) return false;
    if (activeFilter === 'truncated' && !row.isTruncated) return false;

    // 2. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNom = row.nom.toLowerCase().includes(q);
      const matchPrenom = row.prenom.toLowerCase().includes(q);
      const matchId = row.identifiant.toLowerCase().includes(q);
      const matchClasse = (row.codeClasse || '').toLowerCase().includes(q);
      const matchPassword = (row.password || '').toLowerCase().includes(q);
      return matchNom || matchPrenom || matchId || matchClasse || matchPassword;
    }

    return true;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="bg-white rounded-xl border border-[#D1CDC4] shadow-2xs overflow-hidden">
      {/* Table toolbar */}
      <div className="p-4 border-b border-[#D1CDC4] bg-[#F0EEEA]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8C867A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-table"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, prénom, identifiant, classe..."
            className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-[#D1CDC4] text-[#42413C] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#5A5A40]/30 focus:border-[#5A5A40]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8C867A] hover:text-[#42413C] cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter pill tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
          <span className="text-[11px] text-[#8C867A] font-bold uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filtrer :
          </span>
          <button
            onClick={() => onSelectFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#5A5A40] text-white shadow-2xs'
                : 'bg-white border border-[#D1CDC4] text-[#42413C] hover:bg-[#F0EEEA]'
            }`}
          >
            Tous ({rows.length})
          </button>
          <button
            onClick={() => onSelectFilter('teachers')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer ${
              activeFilter === 'teachers'
                ? 'bg-[#5A5A40] text-white shadow-2xs'
                : 'bg-white border border-[#D1CDC4] text-[#42413C] hover:bg-[#F0EEEA]'
            }`}
          >
            <Shield className="w-3 h-3 text-[#5A5A40]" />
            Professeurs ({rows.filter((r) => r.role === 'teacher').length})
          </button>
          <button
            onClick={() => onSelectFilter('students')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer ${
              activeFilter === 'students'
                ? 'bg-[#5A5A40] text-white shadow-2xs'
                : 'bg-white border border-[#D1CDC4] text-[#42413C] hover:bg-[#F0EEEA]'
            }`}
          >
            <GraduationCap className="w-3 h-3" />
            Élèves ({rows.filter((r) => r.role === 'student').length})
          </button>
          <button
            onClick={() => onSelectFilter('homonyms')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer ${
              activeFilter === 'homonyms'
                ? 'bg-[#D68F5A] text-white shadow-2xs'
                : 'bg-white border border-[#D1CDC4] text-[#42413C] hover:bg-[#F0EEEA]'
            }`}
          >
            <Hash className="w-3 h-3 text-[#D68F5A]" />
            Homonymes ({rows.filter((r) => r.isHomonym).length})
          </button>
          <button
            onClick={() => onSelectFilter('truncated')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer ${
              activeFilter === 'truncated'
                ? 'bg-[#D68F5A] text-white shadow-2xs'
                : 'bg-white border border-[#D1CDC4] text-[#42413C] hover:bg-[#F0EEEA]'
            }`}
          >
            <Scissors className="w-3 h-3 text-[#D68F5A]" />
            Tronqués ({rows.filter((r) => r.isTruncated).length})
          </button>

          {/* Mobile view toggle */}
          <div className="flex sm:hidden ml-auto items-center bg-white border border-[#D1CDC4] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1 rounded ${viewMode === 'table' ? 'bg-[#5A5A40] text-white' : 'text-[#8C867A]'}`}
              title="Vue tableau"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1 rounded ${viewMode === 'cards' ? 'bg-[#5A5A40] text-white' : 'text-[#8C867A]'}`}
              title="Vue cartes mobiles"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Cards View (displayed when viewMode === 'cards' on mobile) */}
      {viewMode === 'cards' ? (
        <div className="p-3 sm:hidden space-y-2.5 max-h-[520px] overflow-y-auto bg-[#F9F8F6]">
          {filteredRows.length === 0 ? (
            <div className="py-8 text-center text-[#8C867A] text-xs">
              Aucun résultat correspondant.
            </div>
          ) : (
            filteredRows.map((row) => {
              const isTeacher = row.role === 'teacher';
              const isCopied = copiedId === `row-${row.index}`;
              const isPwdCopied = copiedId === `pwd-${row.index}`;

              return (
                <div
                  key={row.index}
                  className="bg-white rounded-lg p-3.5 border border-[#D1CDC4] shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#8C867A] font-mono">#{row.index}</span>
                      <span className="font-bold text-sm text-[#42413C]">
                        {row.nom} {row.prenom}
                      </span>
                    </div>
                    {isTeacher ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E2E8D5] text-[#5A5A40] border border-[#C5CCB3]">
                        Prof
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F0EEEA] text-[#42413C] border border-[#D1CDC4]">
                        {row.codeClasse || 'Élève'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#F0EEEA]">
                    <div>
                      <div className="text-[10px] text-[#8C867A] uppercase font-bold tracking-wider">Identifiant KoXo</div>
                      <div className="font-mono text-xs font-bold text-[#5A5A40] bg-[#F9FAF2] px-2 py-1 rounded border border-[#C5CCB3] inline-block mt-0.5">
                        {row.identifiant}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(row.identifiant, `row-${row.index}`)}
                      className="px-2.5 py-1.5 bg-[#F0EEEA] hover:bg-[#E2E8D5] text-[#42413C] text-xs rounded border border-[#D1CDC4] flex items-center gap-1 cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-[#5A5A40]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="text-[11px] font-semibold">{isCopied ? 'Copié' : 'Copier ID'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div>
                      <div className="text-[10px] text-[#8C867A] uppercase font-bold tracking-wider">Mot de passe</div>
                      <div className="font-mono text-xs font-bold text-[#42413C] bg-[#F0EEEA] px-2 py-1 rounded border border-[#D1CDC4] inline-block mt-0.5">
                        {showPasswords ? row.password : '••••••••'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(row.password, `pwd-${row.index}`)}
                      className="px-2.5 py-1.5 bg-[#E2E8D5] hover:bg-[#d5ddc4] text-[#5A5A40] text-xs rounded border border-[#C5CCB3] flex items-center gap-1 cursor-pointer"
                    >
                      {isPwdCopied ? <Check className="w-3.5 h-3.5 text-[#5A5A40]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="text-[11px] font-semibold">{isPwdCopied ? 'Copié' : 'Copier Pwd'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Standard Table container */
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#F0EEEA] sticky top-0 z-10 text-[#42413C] font-bold text-[11px] uppercase tracking-wider border-b border-[#D1CDC4]">
            <tr>
              <th className="py-2.5 px-3 w-12 text-center text-[#8C867A]">#</th>
              <th className="py-2.5 px-3 w-28">Statut</th>
              <th className="py-2.5 px-3">Nom source</th>
              <th className="py-2.5 px-3">Prénom</th>
              <th className="py-2.5 px-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#5A5A40] font-bold">Identifiant KoXo</span>
                  <span className="text-[10px] text-[#8C867A] font-normal lowercase tracking-normal">
                    (max {maxIdLength} car.)
                  </span>
                </div>
              </th>
              <th className="py-2.5 px-3">Longueur</th>
              <th className="py-2.5 px-3">Détail transformation</th>
              <th className="py-2.5 px-3">Code Classe</th>
              <th className="py-2.5 px-3">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="flex items-center gap-1 text-[#5A5A40]">
                    <KeyRound className="w-3 h-3" />
                    Mot de passe
                  </span>
                  <button
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="text-[#8C867A] hover:text-[#42413C] p-0.5 rounded cursor-pointer transition-colors"
                    title={showPasswords ? "Masquer les mots de passe" : "Afficher les mots de passe"}
                  >
                    {showPasswords ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </th>
              <th className="py-2.5 px-3 text-right">Identifiant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EEEA]">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-[#8C867A] text-xs">
                  Aucun résultat correspondant aux critères de recherche ou de filtre.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const isTeacher = row.role === 'teacher';
                const idLength = row.identifiant.length;
                const isCopied = copiedId === `row-${row.index}`;
                const isPwdCopied = copiedId === `pwd-${row.index}`;

                return (
                  <tr
                    key={row.index}
                    className={`hover:bg-[#F9FAF2] transition-colors ${
                      isTeacher ? 'bg-[#F0EEEA]/30' : ''
                    }`}
                  >
                    {/* Index */}
                    <td className="py-2 px-3 text-center text-[#8C867A] font-mono text-[11px]">
                      {row.index}
                    </td>

                    {/* Role badge */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      {isTeacher ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E2E8D5] text-[#5A5A40] border border-[#C5CCB3]">
                          <Shield className="w-3 h-3" />
                          Professeur
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F0EEEA] text-[#42413C] border border-[#D1CDC4]">
                          <GraduationCap className="w-3 h-3" />
                          Élève
                        </span>
                      )}
                    </td>

                    {/* Nom source */}
                    <td className="py-2 px-3 font-semibold text-[#42413C]">
                      {row.originalNom}
                    </td>

                    {/* Prénom */}
                    <td className="py-2 px-3 text-[#42413C]">
                      {row.prenom}
                    </td>

                    {/* Identifiant KoXo */}
                    <td className="py-2 px-3 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold tracking-wider ${
                            isTeacher
                              ? 'bg-[#E2E8D5] text-[#5A5A40] border border-[#C5CCB3]'
                              : row.isHomonym
                              ? 'bg-[#F2E3D5] text-[#D68F5A] border border-[#E0D0C0]'
                              : row.isTruncated
                              ? 'bg-[#FFF0E6] text-[#D68F5A] border border-[#E0D0C0]'
                              : 'bg-[#F0EEEA] text-[#42413C] border border-[#D1CDC4]'
                          }`}
                        >
                          {row.identifiant}
                        </span>

                        {row.isHomonym && (
                          <span className="text-[10px] font-bold text-[#D68F5A] bg-[#FFF0E6] px-1.5 py-0.5 rounded border border-[#E0D0C0]">
                            +{row.homonymNumber}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Length indicator */}
                    <td className="py-2 px-3">
                      <span
                        className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${
                          idLength === maxIdLength
                            ? 'bg-[#FFF0E6] text-[#D68F5A] font-bold border border-[#E0D0C0]'
                            : 'bg-[#F0EEEA] text-[#8C867A]'
                        }`}
                        title={`Longueur actuelle : ${idLength} sur ${maxIdLength} caractères autorisés`}
                      >
                        {idLength}/{maxIdLength}
                      </span>
                    </td>

                    {/* Transformation details / badges */}
                    <td className="py-2 px-3">
                      {isTeacher ? (
                        <span className="text-[11px] text-[#5A5A40] font-semibold">
                          Intact (non modifié)
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {row.isHomonym && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-[#F2E3D5] text-[#D68F5A] px-1.5 py-0.5 rounded border border-[#E0D0C0]">
                              <Hash className="w-2.5 h-2.5" />
                              Homonyme (#{row.homonymNumber})
                            </span>
                          )}

                          {row.isTruncated && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-[#FFF0E6] text-[#D68F5A] px-1.5 py-0.5 rounded border border-[#E0D0C0]">
                              <Scissors className="w-2.5 h-2.5" />
                              Tronqué ({row.truncatedFromLength} → {idLength})
                            </span>
                          )}

                          {!row.isHomonym && !row.isTruncated && (
                            <span className="text-[11px] text-[#8C867A]">
                              Standard (sans homonyme)
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Code Classe */}
                    <td className="py-2 px-3">
                      {row.codeClasse ? (
                        <span className="inline-block font-mono text-[11px] font-semibold bg-[#F0EEEA] text-[#42413C] px-2 py-0.5 rounded border border-[#D1CDC4]">
                          {row.codeClasse}
                        </span>
                      ) : (
                        <span className="text-[#8C867A] text-[11px]">-</span>
                      )}
                    </td>

                    {/* Mot de passe aléatoire */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-[#5A5A40] bg-[#E2E8D5]/60 px-2 py-0.5 rounded border border-[#C5CCB3]">
                          {showPasswords ? row.password : '••••••••'}
                        </span>
                        <button
                          onClick={() => handleCopy(row.password, `pwd-${row.index}`)}
                          className="p-1 rounded text-[#8C867A] hover:text-[#5A5A40] hover:bg-[#F0EEEA] transition-colors cursor-pointer"
                          title="Copier le mot de passe"
                        >
                          {isPwdCopied ? (
                            <Check className="w-3.5 h-3.5 text-[#5A5A40]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Copy Identifiant action */}
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => handleCopy(row.identifiant, `row-${row.index}`)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-[#8C867A] hover:text-[#5A5A40] hover:bg-[#F0EEEA] border border-transparent hover:border-[#D1CDC4] transition-colors cursor-pointer"
                        title="Copier l'identifiant KoXo"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#5A5A40]" />
                            <span className="text-[10px] text-[#5A5A40] font-bold">Copié</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Copier ID</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* Footer info */}
      <div className="px-4 py-2.5 bg-[#F0EEEA]/60 border-t border-[#D1CDC4] text-xs text-[#8C867A] flex items-center justify-between">
        <span>
          Affichage de <strong className="text-[#42413C]">{filteredRows.length}</strong> sur <strong className="text-[#42413C]">{rows.length}</strong> comptes
        </span>
        <span className="text-[11px] text-[#8C867A]">
          Astuce : cliquez sur les statistiques pour filtrer la liste
        </span>
      </div>
    </div>
  );
};
