import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Play, 
  RefreshCw, 
  Download, 
  Eye, 
  ShieldAlert, 
  Sparkles, 
  Info,
  ArrowRight,
  Filter,
  CheckSquare,
  Square,
  FileCheck2,
  Trash2
} from 'lucide-react';
import { 
  UserAccount, 
  M365License, 
  TenantConfig, 
  UserRole, 
  CsvAnalysisResult, 
  PreviewItem, 
  SynchronizationRecord,
  SyncStats
} from '../types';
import { 
  parseAndValidateCsv, 
  generateCsvTemplate, 
  exportReportToCsv, 
  exportReportToExcelXml, 
  triggerDownload 
} from '../utils/csvParser';
import { generatePreview, executeSynchronization } from '../utils/syncEngine';

interface ImportSyncViewProps {
  accounts: UserAccount[];
  licenses: M365License[];
  tenantConfig: TenantConfig;
  userRole: UserRole;
  onSyncComplete: (
    updatedAccounts: UserAccount[],
    updatedLicenses: M365License[],
    record: SynchronizationRecord
  ) => void;
  onNavigateToLogs: () => void;
  incomingImport?: {
    eleves: { csv: string; name: string } | null;
    profs: { csv: string; name: string } | null;
    nonce: number;
  } | null;
}

type Step = 'upload' | 'validation' | 'preview' | 'executing' | 'report';

export const ImportSyncView: React.FC<ImportSyncViewProps> = ({
  accounts,
  licenses,
  tenantConfig,
  userRole,
  onSyncComplete,
  onNavigateToLogs,
  incomingImport,
}) => {
  const [step, setStep] = useState<Step>('upload');

  // CSV States
  const [elevesCsvContent, setElevesCsvContent] = useState<string>('');
  const [elevesFileName, setElevesFileName] = useState<string>('');
  const [profsCsvContent, setProfsCsvContent] = useState<string>('');
  const [profsFileName, setProfsFileName] = useState<string>('');
  const [delimiter, setDelimiter] = useState<string>('auto');

  // Analysis & Validation States
  const [elevesAnalysis, setElevesAnalysis] = useState<CsvAnalysisResult | null>(null);
  const [profsAnalysis, setProfsAnalysis] = useState<CsvAnalysisResult | null>(null);
  const [ignoreErrors, setIgnoreErrors] = useState<boolean>(false);
  const [validationFilter, setValidationFilter] = useState<'all' | 'errors' | 'valid'>('all');

  // Preview States
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [previewFilter, setPreviewFilter] = useState<string>('all');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Execution Progress
  const [executionProgress, setExecutionProgress] = useState<number>(0);
  const [executionStepLabel, setExecutionStepLabel] = useState<string>('');

  // Result & Report States
  const [finalReport, setFinalReport] = useState<{
    stats: SyncStats;
    record: SynchronizationRecord;
  } | null>(null);

  // File Inputs
  const elevesInputRef = useRef<HTMLInputElement | null>(null);
  const profsInputRef = useRef<HTMLInputElement | null>(null);

  // Licenses Display
  const eleveLicence = licenses.find((l) => l.skuId === tenantConfig.defaultEleveSkuId);
  const profLicence = licenses.find((l) => l.skuId === tenantConfig.defaultProfSkuId);

  // Handle Drag & Drop / File selection
  const handleFileDrop = (
    e: React.DragEvent<HTMLDivElement>,
    type: 'eleve' | 'professeur'
  ) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) readFile(file, type);
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'eleve' | 'professeur'
  ) => {
    const file = e.target.files?.[0];
    if (file) readFile(file, type);
  };

  const readFile = (file: File, type: 'eleve' | 'professeur') => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (type === 'eleve') {
        setElevesCsvContent(text);
        setElevesFileName(file.name);
      } else {
        setProfsCsvContent(text);
        setProfsFileName(file.name);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Comptes générés par KoXo : préchargés comme fichiers élèves / professeurs
  useEffect(() => {
    if (!incomingImport) return;
    setElevesCsvContent(incomingImport.eleves?.csv ?? '');
    setElevesFileName(incomingImport.eleves?.name ?? '');
    setProfsCsvContent(incomingImport.profs?.csv ?? '');
    setProfsFileName(incomingImport.profs?.name ?? '');
    setElevesAnalysis(null);
    setProfsAnalysis(null);
    setPreviewItems([]);
    setStep('upload');
  }, [incomingImport?.nonce]);

  const clearFiles = () => {
    setElevesCsvContent('');
    setElevesFileName('');
    setProfsCsvContent('');
    setProfsFileName('');
    setElevesAnalysis(null);
    setProfsAnalysis(null);
    setPreviewItems([]);
    setStep('upload');
  };

  // Step 1 -> Step 2: Run Analysis & Validation
  const handleRunAnalysis = () => {
    if (!elevesCsvContent && !profsCsvContent) return;

    // Cross-file email duplicate tracking
    const eleveEmails = new Set<string>();
    const profEmails = new Set<string>();

    const tempEleveAnalysis = elevesCsvContent
      ? parseAndValidateCsv(elevesCsvContent, elevesFileName || 'eleves.csv', 'eleve')
      : null;

    if (tempEleveAnalysis) {
      tempEleveAnalysis.items.forEach((item) => {
        if (item.email) eleveEmails.add(item.email.toLowerCase());
      });
    }

    const tempProfAnalysis = profsCsvContent
      ? parseAndValidateCsv(
          profsCsvContent,
          profsFileName || 'professeurs.csv',
          'professeur',
          eleveEmails
        )
      : null;

    setElevesAnalysis(tempEleveAnalysis);
    setProfsAnalysis(tempProfAnalysis);
    setStep('validation');
  };

  // Step 2 -> Step 3: Generate Preview
  const handleProceedToPreview = () => {
    const elevesValidItems = (elevesAnalysis?.items || []).filter(
      (item) => item.status === 'ok' || (ignoreErrors && item.status === 'error')
    );
    const profsValidItems = (profsAnalysis?.items || []).filter(
      (item) => item.status === 'ok' || (ignoreErrors && item.status === 'error')
    );

    const { previewItems: generated } = generatePreview(
      elevesValidItems,
      profsValidItems,
      accounts,
      licenses,
      tenantConfig
    );

    setPreviewItems(generated);
    setStep('preview');
  };

  // Item Selection in Preview
  const toggleSelectAll = () => {
    const allSelected = previewItems.every((i) => i.selected);
    setPreviewItems(previewItems.map((i) => ({ ...i, selected: !allSelected })));
  };

  const toggleSelectItem = (id: string) => {
    setPreviewItems(
      previewItems.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i))
    );
  };

  // Step 3 -> Step 4 & 5: Execute Synchronization
  const handleStartSynchronization = async () => {
    setShowConfirmModal(false);
    setStep('executing');
    setExecutionProgress(10);
    setExecutionStepLabel('Connexion au point de terminaison Microsoft Graph v1.0...');

    const fileNames: string[] = [];
    if (elevesFileName) fileNames.push(elevesFileName);
    if (profsFileName) fileNames.push(profsFileName);

    const selectedItems = previewItems.filter((i) => i.selected);
    const totalSelected = selectedItems.length;

    // Run synchronization engine to build baseline records and logs
    const result = executeSynchronization(
      previewItems,
      accounts,
      licenses,
      tenantConfig,
      userRole,
      fileNames
    );

    // Appels Microsoft Graph pour chaque compte
    if (totalSelected > 0) {
      let processedCount = 0;
      for (const item of selectedItems) {
        if (
          item.action === 'creation' ||
          item.action === 'modification' ||
          item.action === 'licence_change' ||
          item.action === 'categorie_change'
        ) {
          setExecutionStepLabel(`Traitement Microsoft Entra ID : ${item.email}...`);
          try {
            const apiRes = await fetch('/api/office/graph/user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nom: item.nom,
                prenom: item.prenom,
                email: item.email,
                password: item.rawPassword,
                forcePasswordChange: tenantConfig.forcePasswordChangeOnFirstLogin,
                skuId: item.newLicenceSku,
                groupName: item.newGroup,
              }),
            });

            const apiData = await apiRes.json();
            if (!apiRes.ok || !apiData.success) {
              const errMsg = apiData.message || 'Erreur Microsoft Graph';
              console.error(`Erreur création Graph pour ${item.email}:`, errMsg);
              const logEntry = result.syncRecord.logs.find(
                (l) => l.userEmail.toLowerCase() === item.email.toLowerCase()
              );
              if (logEntry) {
                logEntry.status = 'error';
                logEntry.message = `[Échec Microsoft Graph] ${errMsg}`;
              }
              if (item.userType === 'eleve') {
                result.syncRecord.stats.eleves.errors++;
                result.syncRecord.stats.totalErrors++;
                if (result.syncRecord.stats.eleves.created > 0) {
                  result.syncRecord.stats.eleves.created--;
                  result.syncRecord.stats.totalCreated--;
                }
              } else {
                result.syncRecord.stats.profs.errors++;
                result.syncRecord.stats.totalErrors++;
                if (result.syncRecord.stats.profs.created > 0) {
                  result.syncRecord.stats.profs.created--;
                  result.syncRecord.stats.totalCreated--;
                }
              }
            } else {
              const logEntry = result.syncRecord.logs.find(
                (l) => l.userEmail.toLowerCase() === item.email.toLowerCase()
              );
              if (logEntry) {
                logEntry.message = `[Entra ID Réel] ${apiData.message || 'Créé avec succès'}`;
              }
            }
          } catch (netErr: any) {
            console.warn(`Erreur réseau Graph API pour ${item.email}:`, netErr);
          }
        }
        processedCount++;
        setExecutionProgress(Math.round(15 + (processedCount / totalSelected) * 80));
      }
    }

    setExecutionProgress(100);
    setExecutionStepLabel('Finalisation et génération du rapport...');
    await new Promise((r) => setTimeout(r, 300));

    onSyncComplete(result.updatedAccounts, result.updatedLicenses, result.syncRecord);

    setFinalReport({
      stats: result.syncRecord.stats,
      record: result.syncRecord,
    });

    setStep('report');
  };

  // Filtering Preview Items
  const filteredPreview = previewItems.filter((item) => {
    if (previewFilter === 'all') return true;
    if (previewFilter === 'creation') return item.action === 'creation';
    if (previewFilter === 'modification') return item.action === 'modification';
    if (previewFilter === 'licence_change') return item.action === 'licence_change';
    if (previewFilter === 'categorie_change') return item.action === 'categorie_change';
    if (previewFilter === 'aucun') return item.action === 'aucun';
    return true;
  });

  const hasBlockingErrors =
    Boolean(elevesAnalysis?.hasBlockingErrors) || Boolean(profsAnalysis?.hasBlockingErrors);
  const totalErrorsCount =
    (elevesAnalysis?.errorCount || 0) + (profsAnalysis?.errorCount || 0);
  const totalLinesCount =
    (elevesAnalysis?.totalLines || 0) + (profsAnalysis?.totalLines || 0);
  const totalValidCount =
    (elevesAnalysis?.validCount || 0) + (profsAnalysis?.validCount || 0);

  return (
    <div className="space-y-6">
      {/* Wizard Step Indicator */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {/* Step 1 */}
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                step === 'upload'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              1
            </div>
            <span
              className={`text-xs font-semibold hidden sm:inline ${
                step === 'upload' ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              Dépôt des CSV
            </span>
          </div>
          <div className="h-0.5 w-8 sm:w-16 bg-slate-200"></div>

          {/* Step 2 */}
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                step === 'validation'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : step === 'preview' || step === 'executing' || step === 'report'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}
            >
              2
            </div>
            <span
              className={`text-xs font-semibold hidden sm:inline ${
                step === 'validation' ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              Contrôle CSV
            </span>
          </div>
          <div className="h-0.5 w-8 sm:w-16 bg-slate-200"></div>

          {/* Step 3 */}
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                step === 'preview'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : step === 'executing' || step === 'report'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}
            >
              3
            </div>
            <span
              className={`text-xs font-semibold hidden sm:inline ${
                step === 'preview' ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              Prévisualisation
            </span>
          </div>
          <div className="h-0.5 w-8 sm:w-16 bg-slate-200"></div>

          {/* Step 4 */}
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                step === 'executing'
                  ? 'bg-amber-500 text-white animate-pulse'
                  : step === 'report'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}
            >
              4
            </div>
            <span
              className={`text-xs font-semibold hidden sm:inline ${
                step === 'report' ? 'text-emerald-600' : 'text-slate-500'
              }`}
            >
              Synchronisation & Rapport
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ÉTAPE 1 : DÉPÔT DES FICHIERS CSV (Section 4 & 18)                         */}
      {/* ========================================================================= */}
      {step === 'upload' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Info Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Importer des professeurs en lot</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Glissez-déposez votre fichier CSV des professeurs : chaque compte recevra automatiquement la licence enseignant. Les élèves s'importent depuis l'onglet « Rentrée & nouveaux comptes ».
              </p>
            </div>
          </div>

          {/* Zone de dépôt : professeurs (les élèves passent par « Rentrée & nouveaux comptes ») */}
          <div className="grid grid-cols-1 gap-6 max-w-2xl">
            {/* ZONE PROFESSEURS */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between shadow-sm hover:border-blue-300 transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">👨‍🏫</span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Professeurs</h3>
                      <span className="text-xs text-slate-500">Fichier CSV des enseignants</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      triggerDownload(
                        generateCsvTemplate('professeur'),
                        'modele_professeurs.csv',
                        'text/csv'
                      )
                    }
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold"
                    title="Télécharger un modèle CSV vierge"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Gabarit CSV
                  </button>
                </div>

                {/* Dropzone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleFileDrop(e, 'professeur')}
                  onClick={() => profsInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                    profsCsvContent
                      ? 'border-emerald-400 bg-emerald-50/50'
                      : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="file"
                    ref={profsInputRef}
                    onChange={(e) => handleFileSelect(e, 'professeur')}
                    accept=".csv,text/csv"
                    className="hidden"
                  />
                  {profsCsvContent ? (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div className="font-semibold text-sm text-emerald-800">
                        {profsFileName || 'professeurs.csv'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {profsCsvContent.split('\n').filter((l) => l.trim()).length - 1} professeurs détectés
                      </div>
                      <span className="text-[11px] text-blue-600 underline font-medium">Cliquer pour remplacer</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="font-semibold text-sm text-slate-800">
                        Déposer le fichier CSV Professeurs ici
                      </div>
                      <div className="text-xs text-slate-500">ou cliquez pour parcourir vos fichiers</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Automatic License attribution notice */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Licence appliquée automatiquement :</span>
                <span className="font-semibold text-purple-700 px-2.5 py-1 rounded-md bg-purple-50 border border-purple-200">
                  {profLicence?.displayName || 'Microsoft 365 A3 pour les enseignants'}
                </span>
              </div>
            </div>
          </div>

          {/* Formats & Separator Options */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-600 shadow-sm">
            <div className="flex items-center gap-3">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Formats acceptés : <strong className="text-slate-800">.csv</strong> encodé en UTF-8 avec colonnes :{' '}
                <code className="text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded font-mono">nom;prenom;adresse_mail;password</code>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="csv-delimiter" className="text-slate-600 font-medium">Séparateur :</label>
              <select
                id="csv-delimiter"
                value={delimiter}
                onChange={(e) => setDelimiter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value="auto">Détection automatique</option>
                <option value=";">Point-virgule (;)</option>
                <option value=",">Virgule (,)</option>
              </select>
            </div>
          </div>

          {/* Big CTA: ANALYSER LES FICHIERS */}
          <div className="flex justify-end gap-3 pt-2">
            {(elevesCsvContent || profsCsvContent) && (
              <button
                type="button"
                onClick={clearFiles}
                className="px-4 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-slate-400" />
                Vider
              </button>
            )}
            <button
              type="button"
              id="btn-analyze-csv"
              disabled={!elevesCsvContent && !profsCsvContent}
              onClick={handleRunAnalysis}
              className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-sm flex items-center gap-2 transition-all"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Analyser le fichier</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ÉTAPE 2 : CONTRÔLE DU FICHIER CSV (Section 5 du cahier des charges)      */}
      {/* ========================================================================= */}
      {step === 'validation' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Analysis Header */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Contrôle et validation des fichiers CSV
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Vérification de la présence des champs obligatoires, syntaxe des emails, doublons et complexité des mots de passe.
                </p>
              </div>

              {/* Status Chips */}
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-500">Total : </span>
                  <strong className="text-slate-900 font-mono">{totalLinesCount} lignes</strong>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                  <span className="text-emerald-700">Valides : </span>
                  <strong className="text-emerald-700 font-mono">{totalValidCount}</strong>
                </div>
                {totalErrorsCount > 0 && (
                  <div className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-xs">
                    <span className="text-red-700">Erreurs : </span>
                    <strong className="text-red-700 font-mono">{totalErrorsCount}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Blocking Error Alert */}
            {hasBlockingErrors && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-red-900">
                      Synchronisation bloquée : {totalErrorsCount} anomalie(s) détectée(s)
                    </h3>
                    <p className="text-xs text-red-700 mt-0.5">
                      Conformément au cahier des charges, toute erreur bloquante doit être corrigée, ou ignorée via l'option ci-contre.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 rounded-lg bg-white border border-red-200 text-xs font-semibold text-slate-800 shadow-xs">
                  <input
                    type="checkbox"
                    checked={ignoreErrors}
                    onChange={(e) => setIgnoreErrors(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 focus:outline-none"
                  />
                  <span>Ignorer les lignes erronées</span>
                </label>
              </div>
            )}

            {/* Validation Table Filter */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">Filtrer :</span>
                <button
                  type="button"
                  onClick={() => setValidationFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    validationFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Toutes ({totalLinesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setValidationFilter('errors')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    validationFilter === 'errors'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Erreurs uniquement ({totalErrorsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setValidationFilter('valid')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    validationFilter === 'valid'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Valides ({totalValidCount})
                </button>
              </div>
            </div>

            {/* Table of validated lines (Section 5 example) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-right">Ligne</th>
                      <th className="py-2.5 px-3">Fichier / Rôle</th>
                      <th className="py-2.5 px-3">Nom</th>
                      <th className="py-2.5 px-3">Prénom</th>
                      <th className="py-2.5 px-3">Email (UPN)</th>
                      <th className="py-2.5 px-3 text-center">Mot de passe</th>
                      <th className="py-2.5 px-3">Résultat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...(elevesAnalysis?.items || []), ...(profsAnalysis?.items || [])]
                      .filter((item) => {
                        if (validationFilter === 'errors') return item.status === 'error';
                        if (validationFilter === 'valid') return item.status === 'ok';
                        return true;
                      })
                      .map((item, idx) => (
                        <tr
                          key={`${item.userType}-${item.lineNumber}-${idx}`}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            item.status === 'error' ? 'bg-red-50/40' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-right text-slate-400 font-mono">
                            {item.lineNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                item.userType === 'eleve'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-purple-50 text-purple-700 border-purple-200'
                              }`}
                            >
                              {item.userType === 'eleve' ? 'Élève' : 'Professeur'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {item.nom || <span className="text-red-500 italic">Vide</span>}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {item.prenom || <span className="text-red-500 italic">Vide</span>}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">
                            {item.email || <span className="text-red-500 italic">Vide</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {item.hasPassword ? (
                              <span className="text-emerald-600 font-bold" title="Mot de passe temporaire présent">✓</span>
                            ) : (
                              <span className="text-red-500 font-bold" title="Mot de passe manquant">✗</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {item.status === 'ok' ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                OK
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                {item.errors.map((err, eIdx) => (
                                  <div
                                    key={eIdx}
                                    className="flex items-center gap-1 text-red-600 font-medium"
                                  >
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{err}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="px-4 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
            >
              ← Retour aux fichiers
            </button>

            <button
              type="button"
              id="btn-goto-preview"
              disabled={hasBlockingErrors && !ignoreErrors}
              onClick={handleProceedToPreview}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-sm flex items-center gap-2 transition-all"
            >
              <span>Passer à la prévisualisation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ÉTAPE 3 : PRÉVISUALISATION AVANT SYNCHRONISATION (Section 6 & 30)        */}
      {/* ========================================================================= */}
      {step === 'preview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Preview Counts Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div
              onClick={() => setPreviewFilter('creation')}
              className={`p-3 rounded-xl border cursor-pointer transition-all shadow-xs ${
                previewFilter === 'creation'
                  ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="text-xs text-emerald-700 font-semibold">🟢 À Créer</div>
              <div className="text-2xl font-bold text-slate-900">
                {previewItems.filter((i) => i.action === 'creation').length}
              </div>
            </div>

            <div
              onClick={() => setPreviewFilter('modification')}
              className={`p-3 rounded-xl border cursor-pointer transition-all shadow-xs ${
                previewFilter === 'modification'
                  ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="text-xs text-amber-700 font-semibold">🟠 À Modifier</div>
              <div className="text-2xl font-bold text-slate-900">
                {previewItems.filter((i) => i.action === 'modification').length}
              </div>
            </div>

            <div
              onClick={() => setPreviewFilter('licence_change')}
              className={`p-3 rounded-xl border cursor-pointer transition-all shadow-xs ${
                previewFilter === 'licence_change'
                  ? 'border-purple-500 bg-purple-50/80 ring-2 ring-purple-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="text-xs text-purple-700 font-semibold">🟣 Chgt Licence</div>
              <div className="text-2xl font-bold text-slate-900">
                {previewItems.filter((i) => i.action === 'licence_change').length}
              </div>
            </div>

            <div
              onClick={() => setPreviewFilter('categorie_change')}
              className={`p-3 rounded-xl border cursor-pointer transition-all shadow-xs ${
                previewFilter === 'categorie_change'
                  ? 'border-red-500 bg-red-50/80 ring-2 ring-red-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="text-xs text-red-700 font-semibold">⚠️ Chgt Catégorie</div>
              <div className="text-2xl font-bold text-slate-900">
                {previewItems.filter((i) => i.action === 'categorie_change').length}
              </div>
            </div>

            <div
              onClick={() => setPreviewFilter('aucun')}
              className={`p-3 rounded-xl border cursor-pointer transition-all shadow-xs ${
                previewFilter === 'aucun'
                  ? 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="text-xs text-blue-700 font-semibold">🔵 Conformes</div>
              <div className="text-2xl font-bold text-slate-900">
                {previewItems.filter((i) => i.action === 'aucun').length}
              </div>
            </div>
          </div>

          {/* Action Table (Cahier des charges - Section 6) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Détail des opérations prévues ({filteredPreview.length} utilisateurs)
                </h3>
                <p className="text-xs text-slate-500">
                  Vérifiez chaque action avant d'exécuter la synchronisation avec le tenant Microsoft 365.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
                >
                  {previewItems.every((i) => i.selected) ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                      Tout désélectionner
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5" />
                      Tout sélectionner
                    </>
                  )}
                </button>
                {previewFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('all')}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200"
                  >
                    Réinitialiser filtre
                  </button>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-8"></th>
                      <th className="py-2.5 px-3">Utilisateur</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Compte M365</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Licence appliquée</th>
                      <th className="py-2.5 px-3">Groupe</th>
                      <th className="py-2.5 px-3">Détails</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPreview.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          !item.selected ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleSelectItem(item.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800">{item.displayName}</div>
                          <div className="text-[11px] font-mono text-slate-500">{item.email}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              item.userType === 'eleve'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}
                          >
                            {item.userType === 'eleve' ? 'Élève' : 'Professeur'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`font-medium ${
                              item.statusInTenant === 'Existe'
                                ? 'text-slate-600'
                                : 'text-emerald-700 font-semibold'
                            }`}
                          >
                            {item.statusInTenant}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {item.action === 'creation' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              🟢 Création
                            </span>
                          )}
                          {item.action === 'modification' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              🟠 Modification
                            </span>
                          )}
                          {item.action === 'licence_change' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                              🟣 Chgt Licence
                            </span>
                          )}
                          {item.action === 'categorie_change' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                              ⚠️ Chgt Catégorie
                            </span>
                          )}
                          {item.action === 'aucun' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200">
                              🔵 Conforme
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800">
                            {item.newLicenceName.includes('A1') ? 'A1' : item.newLicenceName.includes('A3') ? 'A3' : item.newLicenceName}
                          </div>
                          {item.oldLicenceName && item.oldLicenceName !== item.newLicenceName && (
                            <div className="text-[10px] text-slate-400 line-through">
                              anc. {item.oldLicenceName.includes('A1') ? 'A1' : 'A3'}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          {item.newGroup}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {item.changesDescription.map((desc, dIdx) => (
                            <div key={dIdx} className="text-[11px] leading-tight">
                              • {desc}
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Navigation & Launch */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep('validation')}
              className="px-4 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
            >
              ← Retour au contrôle
            </button>

            <button
              type="button"
              id="btn-launch-sync"
              onClick={() => setShowConfirmModal(true)}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                Lancer la synchronisation
              </span>
            </button>
          </div>

          {/* Confirmation Modal */}
          {showConfirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Confirmation de synchronisation
                    </h3>
                    <span className="text-xs text-slate-500">
                      Mode production Microsoft 365
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p>
                    Vous allez traiter <strong>{previewItems.filter((i) => i.selected).length} compte(s)</strong> :
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    <li>
                      <strong>{previewItems.filter((i) => i.selected && i.action === 'creation').length}</strong> compte(s) à créer
                    </li>
                    <li>
                      <strong>{previewItems.filter((i) => i.selected && i.action === 'modification').length}</strong> compte(s) à mettre à jour
                    </li>
                    <li>
                      Attribution des licences A1 / A3 correspondantes
                    </li>
                  </ul>
                  <p className="text-amber-800 font-semibold pt-1">
                    ⚠️ Les modifications seront directement appliquées dans votre tenant Microsoft 365.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    id="btn-confirm-execute"
                    onClick={handleStartSynchronization}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm bg-emerald-600 hover:bg-emerald-700"
                  >
                    Confirmer et exécuter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ÉTAPE 4 : EXÉCUTION EN COURS                                              */}
      {/* ========================================================================= */}
      {step === 'executing' && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-6 animate-fadeIn shadow-sm">
          <div className="w-16 h-16 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto animate-spin">
            <RefreshCw className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-slate-900">
              Synchronisation Microsoft 365 en cours...
            </h3>
            <p className="text-xs text-slate-500">{executionStepLabel}</p>
          </div>

          <div className="max-w-md mx-auto w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${executionProgress}%` }}
            ></div>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            {executionProgress}% complété
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ÉTAPE 5 : RAPPORT DE SYNCHRONISATION (Section 19 du cahier des charges)   */}
      {/* ========================================================================= */}
      {step === 'report' && finalReport && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Success Banner */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Synchronisation terminée
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  Traitement des comptes terminé avec succès
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {finalReport.stats.totalProcessed} comptes analysés • {finalReport.stats.totalErrors} erreur(s) •{' '}
                  {finalReport.record.date}
                </p>
              </div>
            </div>

            {/* Export Buttons (Section 22) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                id="btn-export-csv"
                onClick={() =>
                  triggerDownload(
                    exportReportToCsv(previewItems, finalReport.stats),
                    `rapport_m365_${Date.now()}.csv`,
                    'text/csv;charset=utf-8;'
                  )
                }
                className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Download className="w-4 h-4 text-blue-600" />
                Télécharger CSV
              </button>
              <button
                type="button"
                id="btn-export-excel"
                onClick={() =>
                  triggerDownload(
                    exportReportToExcelXml(previewItems, finalReport.stats),
                    `rapport_m365_${Date.now()}.xls`,
                    'application/vnd.ms-excel'
                  )
                }
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" />
                Télécharger Excel
              </button>
            </div>
          </div>

          {/* Exact Report Layout (Section 19 du cahier des charges) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-6 uppercase tracking-wider pb-3 border-b border-slate-200">
              SYNCHRONISATION TERMINÉE — BILAN OFFICIEL
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Professeurs Breakdown */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between font-bold text-sm text-purple-700 pb-2 border-b border-slate-200">
                  <span>👨‍🏫 Professeurs</span>
                  <span className="text-xs text-slate-500 font-normal">Licence A3</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Créés :</span>
                    <strong className="text-emerald-700">{finalReport.stats.profs.created}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Modifiés :</span>
                    <strong className="text-amber-700">{finalReport.stats.profs.modified}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Sans modification :</span>
                    <strong className="text-slate-800">{finalReport.stats.profs.unchanged}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-200">
                    <span>Erreurs :</span>
                    <strong className={finalReport.stats.profs.errors > 0 ? 'text-red-600' : 'text-slate-500'}>
                      {finalReport.stats.profs.errors}
                    </strong>
                  </div>
                </div>
              </div>

              {/* TOTAL Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between font-bold text-sm text-slate-900 pb-2 border-b border-slate-200">
                  <span>TOTAL ÉTABLISSEMENT</span>
                  <span className="text-xs text-blue-600 font-mono font-semibold">
                    {finalReport.stats.totalProcessed} comptes
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Comptes traités :</span>
                    <strong className="text-slate-900">{finalReport.stats.totalProcessed}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Créations totales :</span>
                    <strong className="text-emerald-700">{finalReport.stats.totalCreated}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Modifications totales :</span>
                    <strong className="text-amber-700">{finalReport.stats.totalModified}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-200">
                    <span>Erreurs totales :</span>
                    <strong className={finalReport.stats.totalErrors > 0 ? 'text-red-600' : 'text-slate-500'}>
                      {finalReport.stats.totalErrors}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions list & Logs */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-slate-900">Journal d'exécution de la session</h4>
                <button
                  type="button"
                  onClick={onNavigateToLogs}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Voir l'historique complet des journaux →
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Utilisateur</th>
                      <th className="py-2 px-3">Action</th>
                      <th className="py-2 px-3">Résultat</th>
                      <th className="py-2 px-3">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {finalReport.record.logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 text-slate-500">{log.timestamp.split(' ')[1]}</td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800">
                          {log.userName}
                        </td>
                        <td className="py-2 px-3 text-slate-700">{log.action}</td>
                        <td className="py-2 px-3">
                          {log.status === 'success' ? (
                            <span className="text-emerald-600 font-sans font-semibold">✅ Succès</span>
                          ) : (
                            <span className="text-red-600 font-sans font-semibold">❌ Erreur</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-600 font-sans">{log.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* New Sync CTA */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              id="btn-new-sync"
              onClick={clearFiles}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-sm"
            >
              Nouvelle synchronisation
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
