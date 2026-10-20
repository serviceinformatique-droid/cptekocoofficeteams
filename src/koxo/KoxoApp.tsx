import React, { useState, useMemo, useEffect } from 'react';
import { StatsBar } from './components/StatsBar';
import { UploadSection } from './components/UploadSection';
import { ConfigPanel } from './components/ConfigPanel';
import { DataTable } from './components/DataTable';
import { ExportSection } from './components/ExportSection';
import { KoXoGuide } from './components/KoXoGuide';
import { parseCSV } from './utils/csvParser';
import { detectColumnIndices, processKoXoData } from './utils/koxoProcessor';
import { KoXoConfig, KoxoOfficePayload } from './types';
import { OfficeSendPanel } from './components/OfficeSendPanel';

interface KoxoAppProps {
  onSendToOffice: (payload: KoxoOfficePayload) => void;
}

export default function KoxoApp({ onSendToOffice }: KoxoAppProps) {
  const [rawText, setRawText] = useState<string>('');
  const [currentFilename, setCurrentFilename] = useState<string>('');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'teachers' | 'students' | 'homonyms' | 'truncated'>('all');

  // Configuration state
  const [config, setConfig] = useState<KoXoConfig>({
    splitMode: 'lineCount',
    teacherLineCount: 0,
    roleColumnIndex: 3,
    teacherKeyword: 'enseignant',
    maxIdLength: 12, // Strict 12 chars as requested
    homonymStyle: 'startAt1', // DUPONT, DUPONT1, DUPONT2...
    casing: 'uppercase',
    removeAccents: true,
    removeSpacesAndSpecials: true,
    avoidTeacherCollisions: true,
    keepExistingIds: true,
    delimiter: ';',
    includeBom: true,
    columnsToExport: ['nom', 'prenom', 'identifiant', 'codeClasse', 'password'],
    customHeaders: {
      nom: 'Nom',
      prenom: 'Prénom',
      identifiant: 'Identifiant',
      codeClasse: 'Code Classe',
      password: 'Mot de passe',
      role: 'Rôle',
    },
  });

  const [passwordSalt, setPasswordSalt] = useState(0);

  const handleRegeneratePasswords = () => {
    setPasswordSalt((prev) => prev + 1);
  };

  // Parse raw text into headers and rows
  const parsedData = useMemo(() => {
    return parseCSV(rawText);
  }, [rawText]);

  // Detected column mapping
  const [columnMapping, setColumnMapping] = useState(() => {
    return detectColumnIndices(parsedData.headers);
  });

  // Update column mapping whenever headers change significantly
  useEffect(() => {
    if (parsedData.headers.length > 0) {
      const detected = detectColumnIndices(parsedData.headers);
      setColumnMapping(detected);

      // If a role column was detected, we can auto-suggest role detection
      if (detected.roleIndex !== -1) {
        setConfig((prev) => ({ ...prev, splitMode: 'roleColumn', roleColumnIndex: detected.roleIndex }));
      }
    }
  }, [parsedData.headers]);

  // Process rows with KoXo logic
  const { processedRows, stats } = useMemo(() => {
    if (!parsedData.rows.length) {
      return {
        processedRows: [],
        stats: {
          totalRows: 0,
          teacherCount: 0,
          studentCount: 0,
          homonymCount: 0,
          truncatedCount: 0,
          warningCount: 0,
        },
      };
    }

    return processKoXoData(
      parsedData.headers,
      parsedData.rows,
      config,
      columnMapping
    );
  }, [parsedData.headers, parsedData.rows, config, columnMapping, passwordSalt]);

  // Handlers
  const handleReset = () => {
    setRawText('');
    setCurrentFilename('');
  };

  const handleRawTextLoaded = (text: string, filename?: string) => {
    setRawText(text);
    if (filename) {
      setCurrentFilename(filename);
    }
  };

  return (
    <div className="bg-[#F9F8F6] rounded-xl text-[#42413C] flex flex-col font-sans selection:bg-[#E2E8D5] selection:text-[#5A5A40]">

      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 border-b border-[#D1CDC4]">
        <h2 className="text-xl font-serif italic text-[#5A5A40]">Préparateur KoXo → comptes Office 365</h2>
        <div className="flex gap-2">
          <button onClick={() => setIsGuideOpen(!isGuideOpen)} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#C5CCB3] text-[#5A5A40] bg-white hover:bg-[#F0EEEA] cursor-pointer">Guide d'import KoXo</button>
          <button onClick={handleReset} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#C5CCB3] text-[#5A5A40] bg-white hover:bg-[#F0EEEA] cursor-pointer">Réinitialiser</button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Stats Bar */}
        <StatsBar
          stats={stats}
          activeFilter={activeFilter}
          onSelectFilter={setActiveFilter}
        />

        {/* Data-quality warnings */}
        {stats.warningCount > 0 && (
          <div className="rounded-xl border border-[#E0D0C0] bg-[#FFF0E6] text-[#8A5A2B] px-4 py-3 text-xs">
            <strong>{stats.warningCount} ligne(s) à vérifier :</strong>
            {!!stats.ignoredCount && (
              <span className="ml-2">({stats.ignoredCount} ligne(s) d'en-tête répétée(s) ignorée(s))</span>
            )}
            <ul className="mt-1 list-disc pl-5 space-y-0.5">
              {processedRows
                .filter((r) => r.hasWarning)
                .slice(0, 8)
                .map((r) => (
                  <li key={r.index}>
                    Ligne {r.index} ({r.originalNom} {r.originalPrenom}) : {r.warningMessage}
                  </li>
                ))}
              {stats.warningCount > 8 && <li>… et {stats.warningCount - 8} autre(s)</li>}
            </ul>
          </div>
        )}

        {/* Upload & Source Data Section */}
        <UploadSection
          onRawTextLoaded={handleRawTextLoaded}
          currentFilename={currentFilename}
          totalLines={parsedData.rows.length}
          headers={parsedData.headers}
          detectedDelimiter={parsedData.detectedDelimiter}
          columnMapping={columnMapping}
          onUpdateColumnMapping={setColumnMapping}
        />

        {/* Transformation & KoXo Rule Settings */}
        <ConfigPanel
          config={config}
          onChangeConfig={setConfig}
          totalRows={parsedData.rows.length}
          hasRoleColumn={columnMapping.roleIndex !== -1}
        />

        {/* Interactive Data Table Preview with Homonyms & Truncation Highlights */}
        <DataTable
          rows={processedRows}
          activeFilter={activeFilter}
          onSelectFilter={setActiveFilter}
          maxIdLength={config.maxIdLength}
          onRegeneratePasswords={handleRegeneratePasswords}
        />

        <OfficeSendPanel rows={processedRows} filename={currentFilename} onSend={onSendToOffice} />

        {/* Export & Download Section */}
        <ExportSection
          rows={processedRows}
          config={config}
          originalFilename={currentFilename}
          onRegeneratePasswords={handleRegeneratePasswords}
        />
      </main>

      {/* Footer */}
      <footer className="bg-[#F0EEEA] border-t border-[#D1CDC4] py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-[#8C867A]">
          <p>
            Préparateur CSV pour <strong className="text-[#5A5A40]">KoXo Administrator</strong> &bull; Traitement 100% local et sécurisé dans le navigateur &bull; Aucune donnée scolaire n'est transmise à un serveur tiers.
          </p>
        </div>
      </footer>

      {/* KoXo Import Guide Modal */}
      <KoXoGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
