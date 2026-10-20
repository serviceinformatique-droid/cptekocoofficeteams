import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Clipboard, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { decodeCsvBuffer } from '../utils/csvParser';

interface UploadSectionProps {
  onRawTextLoaded: (text: string, filename?: string) => void;
  currentFilename?: string;
  totalLines: number;
  headers: string[];
  detectedDelimiter: string;
  columnMapping: {
    nomIndex: number;
    prenomIndex: number;
    classeIndex: number;
    roleIndex: number;
    idIndex: number;
  };
  onUpdateColumnMapping: (mapping: {
    nomIndex: number;
    prenomIndex: number;
    classeIndex: number;
    roleIndex: number;
    idIndex: number;
  }) => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onRawTextLoaded,
  currentFilename,
  totalLines,
  headers,
  detectedDelimiter,
  columnMapping,
  onUpdateColumnMapping,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [detectedEncoding, setDetectedEncoding] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (buffer) {
        const { text, encoding } = decodeCsvBuffer(buffer);
        setDetectedEncoding(encoding);
        if (text) {
          onRawTextLoaded(text, file.name);
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handlePasteSubmit = () => {
    if (pastedText.trim()) {
      onRawTextLoaded(pastedText, 'copie_presse_papier.csv');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#D1CDC4] shadow-2xs overflow-hidden">
      {/* Header with tabs */}
      <div className="px-4 py-3 bg-[#F0EEEA] border-b border-[#D1CDC4] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-[#D1CDC4]/40 p-0.5 rounded-lg text-xs font-medium">
          <button
            id="tab-upload-file"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white text-[#42413C] shadow-2xs font-bold'
                : 'text-[#8C867A] hover:text-[#42413C]'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#5A5A40]" />
            <span>Fichier CSV / Excel</span>
          </button>
          <button
            id="tab-paste-text"
            onClick={() => setActiveTab('paste')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-white text-[#42413C] shadow-2xs font-bold'
                : 'text-[#8C867A] hover:text-[#42413C]'
            }`}
          >
            <Clipboard className="w-3.5 h-3.5 text-[#5A5A40]" />
            <span>Coller du texte</span>
          </button>
        </div>

        {totalLines > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 font-semibold text-[#5A5A40] bg-[#E2E8D5] px-2 py-0.5 rounded border border-[#C5CCB3]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#5A5A40]" />
              {currentFilename || 'Fichier'} ({totalLines} lignes)
            </span>
            {detectedEncoding && (
              <span className="bg-[#F0EEEA] text-[#42413C] px-2 py-0.5 rounded text-[11px] font-mono border border-[#D1CDC4]">
                Encodage : {detectedEncoding}
              </span>
            )}
            <span className="bg-[#F0EEEA] text-[#42413C] px-2 py-0.5 rounded text-[11px] font-mono border border-[#D1CDC4]">
              Séparateur : {detectedDelimiter === ';' ? 'Point-virgule (;)' : detectedDelimiter === '\t' ? 'Tabulation' : 'Virgule (,)'}
            </span>
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {activeTab === 'upload' ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#5A5A40] bg-[#F9FAF2]'
                : 'border-[#D1CDC4] hover:border-[#5A5A40] bg-[#F9F8F6]/70 hover:bg-[#F9FAF2]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.tsv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#E2E8D5] text-[#5A5A40] flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-[#42413C]">
              Glissez votre fichier CSV ici ou <span className="text-[#5A5A40] underline font-bold">parcourez vos dossiers</span>
            </p>
            <p className="text-xs text-[#8C867A] mt-1">
              Prend en charge les formats CSV exportés depuis SIECLE, Pronote, EDT, ENT ou Excel (séparateur point-virgule ou virgule)
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              id="textarea-raw-csv"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Collez ici les données CSV (ex: Nom;Prénom;Email;Rôle)..."
              rows={5}
              className="w-full text-xs font-mono p-3 rounded-lg border border-[#D1CDC4] focus:outline-hidden focus:ring-2 focus:ring-[#5A5A40]/30 focus:border-[#5A5A40] bg-[#F9F8F6] text-[#42413C]"
            />
            <div className="flex items-center justify-between">
              <button
                id="btn-load-pasted-data"
                onClick={handlePasteSubmit}
                disabled={!pastedText.trim()}
                className="px-4 py-2 bg-[#5A5A40] hover:bg-[#484833] disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Analyser ces données</span>
              </button>
            </div>
          </div>
        )}

        {/* Column mapping bar when data is loaded */}
        {headers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#F0EEEA]">
            <div className="text-xs font-bold uppercase tracking-wider text-[#42413C] mb-2.5 flex items-center gap-1.5">
              <span>Correspondance des colonnes détectées :</span>
              <span className="text-[#8C867A] font-normal lowercase tracking-normal">
                (vérifiez que chaque champ pointe vers la bonne colonne)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C867A] mb-1">
                  Colonne NOM <span className="text-[#D68F5A]">*</span>
                </label>
                <select
                  id="select-col-nom"
                  value={columnMapping.nomIndex}
                  onChange={(e) =>
                    onUpdateColumnMapping({
                      ...columnMapping,
                      nomIndex: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full text-xs py-1.5 px-2.5 bg-[#F9F8F6] border border-[#D1CDC4] text-[#42413C] rounded-lg focus:ring-1 focus:ring-[#5A5A40]"
                >
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      Col {i + 1}: {h || `Colonne ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C867A] mb-1">
                  Colonne PRÉNOM <span className="text-[#D68F5A]">*</span>
                </label>
                <select
                  id="select-col-prenom"
                  value={columnMapping.prenomIndex}
                  onChange={(e) =>
                    onUpdateColumnMapping({
                      ...columnMapping,
                      prenomIndex: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full text-xs py-1.5 px-2.5 bg-[#F9F8F6] border border-[#D1CDC4] text-[#42413C] rounded-lg focus:ring-1 focus:ring-[#5A5A40]"
                >
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      Col {i + 1}: {h || `Colonne ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C867A] mb-1">
                  Colonne CODE CLASSE
                </label>
                <select
                  id="select-col-classe"
                  value={columnMapping.classeIndex}
                  onChange={(e) =>
                    onUpdateColumnMapping({
                      ...columnMapping,
                      classeIndex: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full text-xs py-1.5 px-2.5 bg-[#F9F8F6] border border-[#D1CDC4] text-[#42413C] rounded-lg focus:ring-1 focus:ring-[#5A5A40]"
                >
                  <option value={-1}>-- Aucune --</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      Col {i + 1}: {h || `Colonne ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C867A] mb-1">
                  Colonne RÔLE (si présente)
                </label>
                <select
                  id="select-col-role"
                  value={columnMapping.roleIndex}
                  onChange={(e) =>
                    onUpdateColumnMapping({
                      ...columnMapping,
                      roleIndex: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full text-xs py-1.5 px-2.5 bg-[#F9F8F6] border border-[#D1CDC4] text-[#42413C] rounded-lg focus:ring-1 focus:ring-[#5A5A40]"
                >
                  <option value={-1}>-- Détection par ligne --</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      Col {i + 1}: {h || `Colonne ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
