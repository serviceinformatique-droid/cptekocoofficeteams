import React from 'react';
import { Settings, Shield, Sliders, Scissors, Hash, FileSpreadsheet, Info } from 'lucide-react';
import { KoXoConfig, HomonymStyle } from '../types';

interface ConfigPanelProps {
  config: KoXoConfig;
  onChangeConfig: (newConfig: KoXoConfig) => void;
  totalRows: number;
  hasRoleColumn: boolean;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  config,
  onChangeConfig,
  totalRows,
  hasRoleColumn,
}) => {
  return (
    <div className="bg-white rounded-xl border border-[#D1CDC4] shadow-2xs p-5">
      <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#F0EEEA]">
        <Sliders className="w-4 h-4 text-[#5A5A40]" />
        <h2 className="text-xs font-bold text-[#42413C] uppercase tracking-widest">
          Paramètres de transformation KoXo
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Section 1: Distinction Professeurs vs Élèves */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#42413C]">
            <span className="w-5 h-5 rounded-md bg-[#E2E8D5] text-[#5A5A40] flex items-center justify-center">
              <Shield className="w-3.5 h-3.5" />
            </span>
            <span>1. Professeurs (Intacts)</span>
          </div>
          <p className="text-[11px] text-[#8C867A] leading-relaxed">
            La première partie du fichier contient les professeurs. Leurs données ne seront pas altérées.
          </p>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-[#42413C] cursor-pointer">
              <input
                type="radio"
                name="splitMode"
                checked={config.splitMode === 'lineCount'}
                onChange={() => onChangeConfig({ ...config, splitMode: 'lineCount' })}
                className="accent-[#5A5A40]"
              />
              <span>Séparer par nombre de lignes au début</span>
            </label>

            {config.splitMode === 'lineCount' && (
              <div className="pl-5 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#8C867A]">Nombre de professeurs :</span>
                  <div className="flex items-center border border-[#D1CDC4] rounded-lg overflow-hidden bg-[#F9F8F6]">
                    <button
                      type="button"
                      onClick={() =>
                        onChangeConfig({
                          ...config,
                          teacherLineCount: Math.max(0, config.teacherLineCount - 1),
                        })
                      }
                      className="px-2.5 py-1 text-[#42413C] hover:bg-[#F0EEEA] text-xs font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      id="input-teacher-count"
                      type="number"
                      min={0}
                      max={totalRows}
                      value={config.teacherLineCount}
                      onChange={(e) =>
                        onChangeConfig({
                          ...config,
                          teacherLineCount: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="w-14 text-center text-xs py-1 font-bold text-[#5A5A40] bg-white border-x border-[#D1CDC4]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onChangeConfig({
                          ...config,
                          teacherLineCount: Math.min(totalRows, config.teacherLineCount + 1),
                        })
                      }
                      className="px-2.5 py-1 text-[#42413C] hover:bg-[#F0EEEA] text-xs font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-[#5A5A40] font-semibold mt-1">
                  Lignes 1 à {config.teacherLineCount} = Professeurs, Ligne {config.teacherLineCount + 1}+ = Élèves
                </div>
              </div>
            )}

            {hasRoleColumn && (
              <label className="flex items-center gap-2 text-xs text-[#42413C] cursor-pointer">
                <input
                  type="radio"
                  name="splitMode"
                  checked={config.splitMode === 'roleColumn'}
                  onChange={() => onChangeConfig({ ...config, splitMode: 'roleColumn' })}
                  className="accent-[#5A5A40]"
                />
                <span>Détecter via la colonne "Rôle" (Enseignant / Prof)</span>
              </label>
            )}

            <label className="flex items-center gap-2 text-xs text-[#42413C] cursor-pointer">
              <input
                type="radio"
                name="splitMode"
                checked={config.splitMode === 'allStudents'}
                onChange={() => onChangeConfig({ ...config, splitMode: 'allStudents' })}
                className="accent-[#5A5A40]"
              />
              <span>Tout le fichier contient des élèves (aucun professeur)</span>
            </label>
          </div>

          <div className="pt-2 border-t border-[#F0EEEA]">
            <label className="flex items-start gap-2 text-xs text-[#42413C] cursor-pointer">
              <input
                id="checkbox-avoid-teacher-collisions"
                type="checkbox"
                checked={config.avoidTeacherCollisions}
                onChange={(e) =>
                  onChangeConfig({ ...config, avoidTeacherCollisions: e.target.checked })
                }
                className="mt-0.5 accent-[#5A5A40] rounded"
              />
              <span>
                Éviter les collisions avec les professeurs (si un élève porte le nom d'un prof, lui attribuer un numéro)
              </span>
            </label>
            <label className="flex items-start gap-2 text-xs text-[#42413C] cursor-pointer mt-2">
              <input
                id="checkbox-keep-existing-ids"
                type="checkbox"
                checked={config.keepExistingIds}
                onChange={(e) => onChangeConfig({ ...config, keepExistingIds: e.target.checked })}
                className="mt-0.5 accent-[#5A5A40] rounded"
              />
              <span>
                Conserver les identifiants déjà présents dans le fichier (seuls les comptes sans identifiant sont générés)
              </span>
            </label>
          </div>
        </div>

        {/* Section 2: Règle des Homonymes & Longueur */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#42413C]">
            <span className="w-5 h-5 rounded-md bg-[#F2E3D5] text-[#D68F5A] flex items-center justify-center">
              <Scissors className="w-3.5 h-3.5" />
            </span>
            <span>2. Identifiants & Homonymes</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-[#42413C] font-semibold">
                Longueur max de l'identifiant :
              </label>
              <span className="text-xs font-bold text-[#D68F5A] bg-[#FFF0E6] px-2 py-0.5 rounded border border-[#E0D0C0]">
                {config.maxIdLength} caractères
              </span>
            </div>
            <input
              id="range-max-id-length"
              type="range"
              min={6}
              max={20}
              value={config.maxIdLength}
              onChange={(e) =>
                onChangeConfig({ ...config, maxIdLength: parseInt(e.target.value, 10) })
              }
              className="w-full accent-[#5A5A40]"
            />
            <div className="flex justify-between text-[10px] text-[#8C867A]">
              <span>6 car.</span>
              <span className="font-semibold text-[#5A5A40]">12 car. (Standard KoXo)</span>
              <span>20 car.</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#42413C] mb-1">
              Style de numérotation des homonymes :
            </label>
            <select
              id="select-homonym-style"
              value={config.homonymStyle}
              onChange={(e) =>
                onChangeConfig({ ...config, homonymStyle: e.target.value as HomonymStyle })
              }
              className="w-full text-xs py-1.5 px-2.5 bg-[#F9F8F6] border border-[#D1CDC4] text-[#42413C] rounded-lg focus:ring-1 focus:ring-[#5A5A40]"
            >
              <option value="startAt1">
                1er sans chiffre, puis 1, 2... (ex: MARTIN, MARTIN1, MARTIN2)
              </option>
              <option value="startAt2">
                1er sans chiffre, puis 2, 3... (ex: MARTIN, MARTIN2, MARTIN3)
              </option>
              <option value="allNumbered">
                Numéro dès le 1er homonyme (ex: MARTIN1, MARTIN2, MARTIN3)
              </option>
            </select>
          </div>

          <div className="p-2.5 bg-[#F9FAF2] rounded-lg border border-[#C5CCB3] text-[11px] text-[#5A5A40] space-y-1">
            <div className="flex items-center gap-1 font-bold text-[#5A5A40]">
              <Info className="w-3.5 h-3.5" />
              <span>Garantie anti-dépassement KoXo :</span>
            </div>
            <p className="leading-relaxed">
              Pour les noms longs homonymes, la base est automatiquement raccourcie pour que{' '}
              <strong>Nom + Chiffre reste toujours ≤ {config.maxIdLength} caractères</strong>.
            </p>
          </div>
        </div>

        {/* Section 3: Format Active Directory & Export */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#42413C]">
            <span className="w-5 h-5 rounded-md bg-[#E2E8D5] text-[#5A5A40] flex items-center justify-center">
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </span>
            <span>3. Export & Active Directory</span>
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-xs font-semibold text-[#42413C] mb-1">
                Séparateur CSV de sortie :
              </label>
              <select
                id="select-export-delimiter"
                value={config.delimiter}
                onChange={(e) =>
                  onChangeConfig({ ...config, delimiter: e.target.value as ';' | ',' | '\t' })
                }
                className="w-full text-xs py-1.5 px-2.5 bg-[#F9F8F6] border border-[#D1CDC4] text-[#42413C] rounded-lg font-mono"
              >
                <option value=";">Point-virgule (;) - Standard KoXo & Excel FR</option>
                <option value=",">Virgule (,) - Standard international</option>
                <option value="&#9;">Tabulation (\t) - TSV</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#42413C] mb-1">
                Casse de l'identifiant :
              </label>
              <select
                id="select-casing"
                value={config.casing}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    casing: e.target.value as 'uppercase' | 'lowercase' | 'preserve',
                  })
                }
                className="w-full text-xs py-1.5 px-2.5 bg-[#F9F8F6] border border-[#D1CDC4] text-[#42413C] rounded-lg"
              >
                <option value="uppercase">MAJUSCULES (ex: DUPONT1) - Recommandé AD</option>
                <option value="lowercase">minuscules (ex: dupont1)</option>
                <option value="preserve">Conserver la casse d'origine</option>
              </select>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="flex items-center gap-2 text-xs text-[#42413C] cursor-pointer">
                <input
                  id="checkbox-remove-accents"
                  type="checkbox"
                  checked={config.removeAccents}
                  onChange={(e) =>
                    onChangeConfig({ ...config, removeAccents: e.target.checked })
                  }
                  className="accent-[#5A5A40] rounded"
                />
                <span>Supprimer les accents (é, è, ê, ç → e, c)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[#42413C] cursor-pointer">
                <input
                  id="checkbox-remove-specials"
                  type="checkbox"
                  checked={config.removeSpacesAndSpecials}
                  onChange={(e) =>
                    onChangeConfig({ ...config, removeSpacesAndSpecials: e.target.checked })
                  }
                  className="accent-[#5A5A40] rounded"
                />
                <span>Nettoyer espaces et apostrophes (D'ALMEIDA → DALMEIDA)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[#42413C] cursor-pointer">
                <input
                  id="checkbox-include-bom"
                  type="checkbox"
                  checked={config.includeBom}
                  onChange={(e) =>
                    onChangeConfig({ ...config, includeBom: e.target.checked })
                  }
                  className="accent-[#5A5A40] rounded"
                />
                <span>Signature UTF-8 BOM (compatibilité Excel totale)</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
