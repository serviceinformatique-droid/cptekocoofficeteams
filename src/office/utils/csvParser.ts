import Papa from 'papaparse';
import { CsvAnalysisResult, CsvValidationItem, UserType, PreviewItem, SyncStats } from '../types';

export interface ParseOptions {
  delimiter?: string;
  ignoreErrors?: boolean;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const FORBIDDEN_CHARS_REGEX = /[;,"'\\\/<>#%*?[\]|]/;

export function parseAndValidateCsv(
  csvContent: string,
  fileName: string,
  userType: UserType,
  existingEmailsInOtherFile: Set<string> = new Set()
): CsvAnalysisResult {
  // Normalize line endings
  const cleanContent = csvContent.trim();
  if (!cleanContent) {
    return {
      fileName,
      userType,
      totalLines: 0,
      validCount: 0,
      errorCount: 0,
      warningCount: 0,
      items: [],
      hasBlockingErrors: false,
    };
  }

  // Use PapaParse to parse CSV with auto-detection of delimiter (; or ,)
  const parsed = Papa.parse<Record<string, string>>(cleanContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase().replace(/[\s_-]+/g, '_'),
  });

  const items: CsvValidationItem[] = [];
  const seenEmailsInThisFile = new Map<string, number>(); // email -> lineNumber

  parsed.data.forEach((row, index) => {
    const lineNumber = index + 2; // Line 1 is header
    const errors: string[] = [];

    // Header aliases matching
    const nom = (row.nom || row.last_name || row.lastname || row.name || '').trim();
    const prenom = (row.prenom || row.first_name || row.firstname || '').trim();
    const email = (row.adresse_mail || row.adresse_e_mail || row.email || row.mail || row.upn || '').trim();
    const password = (row.password || row.mot_de_passe || row.mdp || row.pass || '').trim();

    // 1. Checks: nom présent
    if (!nom) {
      errors.push('Le nom de famille est manquant.');
    } else if (nom.length < 2) {
      errors.push('Le nom de famille est trop court (min. 2 caractères).');
    }

    // 2. Checks: prénom présent
    if (!prenom) {
      errors.push('Le prénom est manquant.');
    }

    // 3. Checks: adresse e-mail présente & valide
    if (!email) {
      errors.push("L'adresse e-mail est manquante.");
    } else {
      const lowerEmail = email.toLowerCase();
      if (!EMAIL_REGEX.test(lowerEmail)) {
        errors.push(`Format d'e-mail invalide ("${email}").`);
      }

      // Check forbidden characters
      const localPart = lowerEmail.split('@')[0] || '';
      if (FORBIDDEN_CHARS_REGEX.test(localPart)) {
        errors.push("L'e-mail contient des caractères interdits par Microsoft Entra ID.");
      }

      // 4. Duplicate checks within this file
      if (seenEmailsInThisFile.has(lowerEmail)) {
        const previousLine = seenEmailsInThisFile.get(lowerEmail);
        errors.push(`Doublon dans le fichier : e-mail déjà présent à la ligne ${previousLine}.`);
      } else {
        seenEmailsInThisFile.set(lowerEmail, lineNumber);
      }

      // Duplicate across the other file (e.g. same student present in profs)
      if (existingEmailsInOtherFile.has(lowerEmail)) {
        errors.push(`Doublon croisé : e-mail également présent dans l'autre fichier importé.`);
      }
    }

    // 5. Checks: mot de passe présent & complexité de base
    if (!password) {
      errors.push('Le mot de passe temporaire est manquant.');
    } else if (password.length < 8) {
      errors.push('Le mot de passe doit comporter au moins 8 caractères selon les critères de sécurité Microsoft 365.');
    }

    const status = errors.length > 0 ? 'error' : 'ok';

    items.push({
      lineNumber,
      nom,
      prenom,
      email: email.toLowerCase(),
      hasPassword: Boolean(password),
      rawPassword: password,
      userType,
      status,
      errors,
      ignored: false,
    });
  });

  const errorCount = items.filter((i) => i.status === 'error').length;
  const validCount = items.filter((i) => i.status === 'ok').length;

  return {
    fileName,
    userType,
    totalLines: items.length,
    validCount,
    errorCount,
    warningCount: 0,
    items,
    hasBlockingErrors: errorCount > 0,
  };
}

// Generate template CSV for download
export function generateCsvTemplate(_type: UserType): string {
  return 'nom;prenom;adresse_mail;password' + String.fromCharCode(13, 10);
}

// Export Synchronization report to CSV
export function exportReportToCsv(
  items: PreviewItem[],
  stats: SyncStats,
  isSimulation: boolean
): string {
  const bom = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  let csv = bom;
  csv += `RAPPORT DE SYNCHRONISATION MICROSOFT 365\r\n`;
  csv += `Date d'export :;${new Date().toLocaleString('fr-FR')}\r\n`;
  csv += `Mode :;${isSimulation ? 'SIMULATION (Aucune modification effectuée)' : 'PRODUCTION (Modifications appliquées)'}\r\n`;
  csv += `Total traités :;${stats.totalProcessed}\r\n`;
  csv += `Créations :;${stats.totalCreated}\r\n`;
  csv += `Modifications :;${stats.totalModified}\r\n`;
  csv += `Sans modification :;${stats.totalUnchanged}\r\n`;
  csv += `Erreurs :;${stats.totalErrors}\r\n\r\n`;

  csv += `Nom;Prénom;Adresse e-mail (UPN);Catégorie;Action réalisée;Compte M365;Ancienne licence;Nouvelle licence;Groupe Entra ID;Résultat;Détails\r\n`;

  for (const item of items) {
    const actionLabel =
      item.action === 'creation'
        ? 'Création compte'
        : item.action === 'modification'
        ? 'Mise à jour compte & mot de passe'
        : item.action === 'licence_change'
        ? 'Changement de licence'
        : item.action === 'categorie_change'
        ? 'Changement de catégorie & licence'
        : 'Aucune modification';

    const cleanDesc = item.changesDescription.join(' | ').replace(/"/g, '""');

    csv += `"${item.nom}";"${item.prenom}";"${item.email}";"${
      item.userType === 'eleve' ? 'Élève' : 'Professeur'
    }";"${actionLabel}";"${item.statusInTenant}";"${item.oldLicenceName || '-'}";"${
      item.newLicenceName
    }";"${item.newGroup}";"${item.action === 'aucun' ? 'Conforme' : 'Succès'}";"${cleanDesc}"\r\n`;
  }

  return csv;
}

// Export to HTML / XML table easily opened by Microsoft Excel
export function exportReportToExcelXml(
  items: PreviewItem[],
  stats: SyncStats,
  isSimulation: boolean
): string {
  const rows = items
    .map(
      (item) => `
    <tr>
      <td>${escapeXml(item.nom)}</td>
      <td>${escapeXml(item.prenom)}</td>
      <td>${escapeXml(item.email)}</td>
      <td>${item.userType === 'eleve' ? 'Élève' : 'Professeur'}</td>
      <td>${
        item.action === 'creation'
          ? 'Création'
          : item.action === 'modification'
          ? 'Modification'
          : item.action === 'licence_change'
          ? 'Changement licence'
          : item.action === 'categorie_change'
          ? 'Changement catégorie'
          : 'Aucune'
      }</td>
      <td>${escapeXml(item.oldLicenceName || '-')}</td>
      <td>${escapeXml(item.newLicenceName)}</td>
      <td>${escapeXml(item.newGroup)}</td>
      <td>${item.action === 'aucun' ? 'Conforme' : 'Succès'}</td>
      <td>${escapeXml(item.changesDescription.join(' ; '))}</td>
    </tr>`
    )
    .join('');

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Rapport M365</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <style>
        th { background-color: #0f172a; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; }
        td { border: 1px solid #cbd5e1; padding: 6px; }
      </style>
    </head>
    <body>
      <h2>Rapport de synchronisation Microsoft 365 - Établissement Scolaire</h2>
      <p><b>Date :</b> ${new Date().toLocaleString('fr-FR')} | <b>Mode :</b> ${
    isSimulation ? 'SIMULATION' : 'PRODUCTION'
  }</p>
      <p><b>Statistiques :</b> Total: ${stats.totalProcessed} | Créations: ${
    stats.totalCreated
  } | Modifications: ${stats.totalModified} | Conformes: ${stats.totalUnchanged} | Erreurs: ${
    stats.totalErrors
  }</p>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prénom</th>
            <th>Email (UPN)</th>
            <th>Catégorie</th>
            <th>Action</th>
            <th>Ancienne Licence</th>
            <th>Nouvelle Licence</th>
            <th>Groupe Entra ID</th>
            <th>Statut</th>
            <th>Détails</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </body>
    </html>
  `;
}

function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
