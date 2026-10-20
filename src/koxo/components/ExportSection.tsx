import React, { useState, useMemo } from 'react';
import { Download, Copy, Check, FileText, CheckCircle2, Sliders, ExternalLink, RefreshCw, KeyRound } from 'lucide-react';
import { ProcessedRow, KoXoConfig } from '../types';
import { exportToCSV } from '../utils/csvParser';

interface ExportSectionProps {
  rows: ProcessedRow[];
  config: KoXoConfig;
  originalFilename?: string;
  onRegeneratePasswords?: () => void;
}

export const ExportSection: React.FC<ExportSectionProps> = ({
  rows,
  config,
  originalFilename,
  onRegeneratePasswords,
}) => {
  const [copied, setCopied] = useState(false);
  const [includeCodeClasse, setIncludeCodeClasse] = useState(true);
  const [includePassword, setIncludePassword] = useState(true);
  const [filename, setFilename] = useState(() => {
    if (originalFilename) {
      return originalFilename.replace(/\.[^/.]+$/, '') + '_koxo_prets.csv';
    }
    return 'import_koxo_utilisateurs.csv';
  });

  // Prepare CSV contents
  const { csvString, rowCount } = useMemo(() => {
    // Determine headers
    const headers = ['Nom', 'Prénom', 'Identifiant'];
    if (includeCodeClasse) {
      headers.push('Code Classe');
    }
    if (includePassword) {
      headers.push('Mot de passe');
    }

    const dataRows = rows.map((r) => {
      const row = [r.nom, r.prenom, r.identifiant];
      if (includeCodeClasse) {
        row.push(r.codeClasse || '');
      }
      if (includePassword) {
        row.push(r.password || '');
      }
      return row;
    });

    const output = exportToCSV(headers, dataRows, config.delimiter, config.includeBom);
    return { csvString: output, rowCount: dataRows.length };
  }, [rows, config.delimiter, config.includeBom, includeCodeClasse, includePassword]);

  const handleDownload = () => {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(csvString.replace(/^\uFEFF/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Preview first 10 lines
  const previewLines = useMemo(() => {
    const cleanStr = csvString.replace(/^\uFEFF/, '');
    return cleanStr.split('\r\n').slice(0, 12).join('\n');
  }, [csvString]);

  return (
    <div className="bg-white rounded-xl border border-[#D1CDC4] shadow-2xs p-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[#F0EEEA]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-serif italic text-[#5A5A40]">
              Export du fichier CSV pour KoXo
            </h2>
            <span className="bg-[#E2E8D5] text-[#5A5A40] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-[#C5CCB3]">
              Format Prêt pour Import
            </span>
          </div>
          <p className="text-xs text-[#8C867A] mt-1">
            Fichier contenant <strong className="text-[#42413C]">Nom, Prénom, Identifiant (tronqué ≤ {config.maxIdLength} car. avec chiffre incrémenté)</strong>
            {includeCodeClasse ? ', Code Classe' : ''}
            {includePassword ? ' et Mot de passe aléatoire' : ''}.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {onRegeneratePasswords && (
            <button
              id="btn-regenerate-passwords"
              onClick={onRegeneratePasswords}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F0EEEA] text-[#5A5A40] border border-[#C5CCB3] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              title="Générer un nouveau jeu de mots de passe aléatoires (sans 0 ni o)"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Régénérer mots de passe</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <label className="text-xs text-[#8C867A] font-bold uppercase tracking-wider hidden sm:inline">
              Fichier :
            </label>
            <input
              id="input-export-filename"
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="text-xs py-1.5 px-2.5 border border-[#D1CDC4] rounded-lg w-48 font-mono bg-[#F9F8F6] text-[#42413C]"
            />
          </div>

          <button
            id="btn-copy-csv"
            onClick={handleCopyClipboard}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#D1CDC4] hover:bg-[#c6c1b7] text-[#42413C] border border-[#BDB9B0] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            title="Copier le contenu CSV dans le presse-papier"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#5A5A40]" />
                <span>Copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copier</span>
              </>
            )}
          </button>

          <button
            id="btn-download-csv"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger le CSV ({rowCount} comptes)</span>
          </button>
        </div>
      </div>

      {/* Options and Preview */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Quick options */}
        <div className="bg-[#F9F8F6] p-3.5 rounded-lg border border-[#D1CDC4] space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-[#42413C]">Colonnes incluses dans le CSV :</div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs text-[#42413C]">
              <input type="checkbox" checked disabled className="accent-[#5A5A40] rounded opacity-60" />
              <span><strong>Nom</strong> (source d'origine)</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-[#42413C]">
              <input type="checkbox" checked disabled className="accent-[#5A5A40] rounded opacity-60" />
              <span><strong>Prénom</strong></span>
            </label>
            <label className="flex items-center gap-2 text-xs text-[#42413C]">
              <input type="checkbox" checked disabled className="accent-[#5A5A40] rounded opacity-60" />
              <span>
                <strong>Identifiant KoXo</strong> (Nom tronqué ≤ {config.maxIdLength} + chiffre)
              </span>
            </label>
            <label className="flex items-center gap-2 text-xs text-[#42413C] cursor-pointer">
              <input
                id="checkbox-include-classe"
                type="checkbox"
                checked={includeCodeClasse}
                onChange={(e) => setIncludeCodeClasse(e.target.checked)}
                className="accent-[#5A5A40] rounded"
              />
              <span><strong>Code Classe</strong> (classe / division / groupe)</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-[#42413C] cursor-pointer">
              <input
                id="checkbox-include-password"
                type="checkbox"
                checked={includePassword}
                onChange={(e) => setIncludePassword(e.target.checked)}
                className="accent-[#5A5A40] rounded"
              />
              <span className="flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-[#5A5A40]" />
                <strong>Mot de passe</strong> (aléatoire, 4 lettres + 4 chiffres, sans 0 ni o)
              </span>
            </label>
          </div>

          <div className="pt-2 border-t border-[#D1CDC4] text-[11px] text-[#8C867A] space-y-1">
            <div>Séparateur : <code className="bg-white px-1.5 py-0.5 rounded border border-[#D1CDC4] font-bold text-[#42413C]">{config.delimiter === ';' ? ';' : config.delimiter === ',' ? ',' : 'TAB'}</code></div>
            <div>Encodage : <span className="font-bold text-[#42413C]">UTF-8 {config.includeBom ? 'avec BOM (Excel ready)' : ''}</span></div>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-[#42413C] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#5A5A40]" />
              Aperçu du contenu CSV généré (premières lignes) :
            </span>
            <span className="text-[10px] text-[#8C867A] font-mono">
              Séparateur : {config.delimiter}
            </span>
          </div>

          <pre className="p-3 bg-[#2D2C28] text-[#E2E8D5] font-mono text-[11px] rounded-lg overflow-x-auto max-h-44 border border-[#42413C]/40 leading-relaxed select-all">
            {previewLines}
          </pre>
        </div>
      </div>
    </div>
  );
};
