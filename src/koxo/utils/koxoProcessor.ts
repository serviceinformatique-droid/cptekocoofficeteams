import { KoXoConfig, ProcessedRow, ProcessedStats, RoleType } from '../types';

/**
 * Mapping table ensuring all French & European accented letters are strictly
 * converted to their base ASCII letter, NEVER stripped or deleted!
 * (e.g. "Chloé" -> "Chloe", NEVER "Chlo")
 */
export const ACCENT_MAP: Record<string, string> = {
  'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
  'à': 'a', 'â': 'a', 'ä': 'a', 'á': 'a', 'ã': 'a', 'å': 'a',
  'À': 'A', 'Â': 'A', 'Ä': 'A', 'Á': 'A', 'Ã': 'A', 'Å': 'A',
  'î': 'i', 'ï': 'i', 'í': 'i', 'ì': 'i',
  'Î': 'I', 'Ï': 'I', 'Í': 'I', 'Ì': 'I',
  'ô': 'o', 'ö': 'o', 'ó': 'o', 'ò': 'o', 'õ': 'o',
  'Ô': 'O', 'Ö': 'O', 'Ó': 'O', 'Ò': 'O', 'Õ': 'O',
  'ù': 'u', 'û': 'u', 'ü': 'u', 'ú': 'u',
  'Ù': 'U', 'Û': 'U', 'Ü': 'U', 'Ú': 'U',
  'ç': 'c', 'Ç': 'C',
  'ñ': 'n', 'Ñ': 'N',
  'ÿ': 'y', 'Ÿ': 'Y', 'ý': 'y', 'Ý': 'Y',
  'œ': 'oe', 'Œ': 'OE',
  'æ': 'ae', 'Æ': 'AE',
  'ß': 'ss', 'ø': 'o', 'Ø': 'O', 'ł': 'l', 'Ł': 'L',
  'đ': 'd', 'Đ': 'D', 'ð': 'd', 'Ð': 'D', 'þ': 'th', 'Þ': 'TH',
};

/** Characters produced by a wrongly decoded file (e.g. Windows-1252 read as UTF-8) */
export const hasCorruptedChars = (s: string): boolean => s.includes('�');

/**
 * Strips accents while strictly preserving every single letter.
 * Example: "Chloé" -> "Chloe" (NOT "Chlo")
 */
export function stripAccentsKeepLetters(str: string): string {
  if (!str) return '';
  // 0. Compose decomposed accents (e + U+0301 -> é) so they are handled like any other letter
  // 1. Direct explicit replacement of all known European diacritics & ligatures
  let out = str.normalize('NFC').replace(/[éèêëÉÈÊËàâäáãåÀÂÄÁÃÅîïíìÎÏÍÌôöóòõÔÖÓÒÕùûüúÙÛÜÚçÇñÑÿŸýÝœŒæÆßøØłŁđĐðÐþÞ]/g, (ch) => ACCENT_MAP[ch] || ch);
  // 2. Unicode NFD normalization to catch any rare remaining combining diacritics
  out = out.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return out;
}

/**
 * Normalizes text for Active Directory / KoXo identifier compliance
 * Removes diacritics (accents converted to letters, e.g. Chloé -> Chloe), apostrophes, special characters, spaces.
 */
export function normalizeForIdentifier(
  text: string,
  options: {
    removeAccents?: boolean;
    removeSpacesAndSpecials?: boolean;
    casing?: 'uppercase' | 'lowercase' | 'preserve';
  } = {}
): string {
  if (!text) return '';

  // NFC keeps accented letters as single code points, so \p{L} never drops them
  let res = text.normalize('NFC').trim();

  // Strip accents: convert accented characters to their base ASCII equivalents (Chloé -> Chloe)
  if (options.removeAccents !== false) {
    res = stripAccentsKeepLetters(res);
  }

  // Remove spaces, apostrophes, hyphens, and non-identifier characters
  if (options.removeSpacesAndSpecials !== false) {
    // Replace apostrophes and common name separators: D'ALMEIDA -> DALMEIDA
    res = res.replace(/['’]/g, '');
    if (options.removeAccents !== false) {
      // Accents were normalized to base letters; strip remaining symbols
      res = res.replace(/[^a-zA-Z0-9_-]/g, '');
    } else {
      // Accents were preserved; use Unicode \p{L} so accented letters (é, è, ê...) are NEVER deleted!
      res = res.replace(/[^\p{L}\p{N}_-]/gu, '');
    }
  }

  // Apply casing
  if (options.casing === 'uppercase') {
    res = res.toUpperCase();
  } else if (options.casing === 'lowercase') {
    res = res.toLowerCase();
  }

  return res;
}

/**
 * Build an identifier truncated to maxLength, safely factoring in any number suffix
 */
export function buildTruncatedIdentifier(
  baseName: string,
  suffixNumber: number | null,
  maxLength = 12
): { identifiant: string; wasTruncated: boolean; originalLen: number } {
  const originalLen = baseName.length;
  const suffixStr = suffixNumber !== null && suffixNumber !== undefined ? String(suffixNumber) : '';

  // Max space available for the base name so that base + suffix <= maxLength
  const maxBaseLen = Math.max(1, maxLength - suffixStr.length);

  let truncatedBase = baseName;
  let wasTruncated = false;

  if (baseName.length > maxBaseLen) {
    truncatedBase = baseName.slice(0, maxBaseLen);
    wasTruncated = true;
  }

  const finalId = `${truncatedBase}${suffixStr}`;
  return {
    identifiant: finalId,
    wasTruncated: wasTruncated || originalLen > maxLength,
    originalLen,
  };
}

/**
 * Generate a random initial password conforming strictly to:
 * - 4 letters (1st letter uppercase, 3 lowercase, e.g. Tofu5212 style)
 * - 4 digits after (e.g. 5212)
 * - STRICTLY NO '0' (zero) and NO 'o' or 'O' (to avoid visual ambiguity)
 * - Resulting format: [A-Z without O][a-z without o]{3}[1-9]{4}
 */
export function generateKoXoPassword(): string {
  const UPPER = 'ABCDEFGHIJKLMNPQRSTUVWXYZ'; // 25 letters (no 'O')
  const LOWER = 'abcdefghijklmnpqrstuvwxyz'; // 25 letters (no 'o')
  const DIGITS = '123456789'; // 9 digits (no '0')

  // Curated list of friendly 4-letter French words containing strictly NO 'o', NO 'O', NO '0'
  const BASE_WORDS = [
    'Lune', 'Bleu', 'Chat', 'Vent', 'Dune', 'Miel', 'Kiwi', 'Cafe',
    'Bain', 'Pain', 'Vert', 'Gris', 'Brun', 'Parc', 'Mars', 'Rire',
    'Dent', 'Bras', 'Sage', 'Vrai', 'Banc', 'Film', 'Chef', 'Page',
    'Plan', 'Prix', 'Rang', 'Sens', 'Ciel', 'Faim', 'Zinc', 'Jura',
    'Nice', 'Metz', 'Pied', 'Plat', 'Main', 'Nuit', 'Cure', 'Drap',
    'Fete', 'Gare', 'Haie', 'Jupe', 'Lait', 'Mare', 'Murs', 'Nage',
    'Pape', 'Quai', 'Rame', 'Vase', 'Bete', 'Bise', 'Cage', 'Camp',
    'Cuir', 'Dame', 'Date', 'Feve', 'File', 'Fils', 'Gite', 'Lame',
    'Lien', 'Lira', 'Luge', 'Luxe', 'Male', 'Mina', 'Mule', 'Mure',
    'Pale', 'Pave', 'Peau', 'Pile', 'Pire',
  ].filter((w) => w.length === 4 && !/[oO0]/.test(w) && /^[A-Z][a-z]{3}$/.test(w));

  let letters = '';
  if (Math.random() < 0.75 && BASE_WORDS.length > 0) {
    letters = BASE_WORDS[Math.floor(Math.random() * BASE_WORDS.length)];
  } else {
    const first = UPPER[Math.floor(Math.random() * UPPER.length)];
    const rest = Array.from({ length: 3 }, () => LOWER[Math.floor(Math.random() * LOWER.length)]).join('');
    letters = first + rest;
  }

  // 4 digits strictly in range 1-9 (no 0)
  const digits = Array.from({ length: 4 }, () => DIGITS[Math.floor(Math.random() * DIGITS.length)]).join('');

  const password = `${letters}${digits}`;

  // Double-safety sanity check
  if (/[oO0]/.test(password) || password.length !== 8 || !/^[A-Z][a-z]{3}[1-9]{4}$/.test(password)) {
    const safeDigits = Array.from({ length: 4 }, () => DIGITS[Math.floor(Math.random() * DIGITS.length)]).join('');
    return `Lune${safeDigits}`;
  }

  return password;
}

export function detectColumnIndices(headers: string[]): {
  nomIndex: number;
  prenomIndex: number;
  classeIndex: number;
  roleIndex: number;
  idIndex: number;
} {
  const normalizedHeaders = headers.map((h) =>
    h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  );

  const findCol = (keywords: string[]): number => {
    // Exact match first
    for (const kw of keywords) {
      const idx = normalizedHeaders.findIndex((h) => h === kw);
      if (idx !== -1) return idx;
    }
    // Partial match
    for (const kw of keywords) {
      const idx = normalizedHeaders.findIndex((h) => h.includes(kw));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const nomIndex = findCol(['nom', 'name', 'last name', 'lastname', 'nom_de_famille']);
  const prenomIndex = findCol(['prenom', 'first name', 'firstname', 'prenoms']);
  const classeIndex = findCol([
    'code classe',
    'code_classe',
    'codeclasse',
    'classe',
    'division',
    'groupe secondaire',
    'groupe',
    'classe/groupe',
    'code',
  ]);
  const roleIndex = findCol(['role', 'statut', 'type', 'fonction', 'profil', 'categorie', 'groupe primaire']);
  // Bare "id" only matches exactly: as a substring it would hit "valide", "ID unique", etc.
  let idIndex = findCol(['identifiant', 'login', 'username', 'compte', 'samaccountname']);
  if (idIndex === -1) idIndex = normalizedHeaders.findIndex((h) => h === 'id');

  return {
    nomIndex: nomIndex !== -1 ? nomIndex : 0,
    prenomIndex: prenomIndex !== -1 ? prenomIndex : 1,
    classeIndex: classeIndex !== -1 ? classeIndex : (headers.length > 2 ? 2 : -1),
    roleIndex,
    idIndex,
  };
}

export function processKoXoData(
  headers: string[],
  rawRows: string[][],
  config: KoXoConfig,
  columnMapping?: {
    nomIndex: number;
    prenomIndex: number;
    classeIndex: number;
    roleIndex: number;
    idIndex: number;
  }
): {
  processedRows: ProcessedRow[];
  stats: ProcessedStats;
} {
  const mapping = columnMapping || detectColumnIndices(headers);

  // Drop header lines repeated in the middle of the file (e.g. after merging exports)
  const isRepeatedHeader = (row: string[]): boolean => {
    const nom = (row[mapping.nomIndex] || '').trim().toLowerCase();
    const prenom = (row[mapping.prenomIndex] || '').trim().toLowerCase();
    return (
      nom !== '' &&
      nom === (headers[mapping.nomIndex] || '').trim().toLowerCase() &&
      prenom === (headers[mapping.prenomIndex] || '').trim().toLowerCase()
    );
  };
  const ignoredCount = rawRows.filter(isRepeatedHeader).length;
  rawRows = rawRows.filter((row) => !isRepeatedHeader(row));

  // 1. Identify which rows are Teachers vs Students
  const rowRoles: RoleType[] = [];

  rawRows.forEach((row, i) => {
    let role: RoleType = 'student';

    if (config.splitMode === 'lineCount') {
      if (i < config.teacherLineCount) {
        role = 'teacher';
      } else {
        role = 'student';
      }
    } else if (config.splitMode === 'roleColumn' && mapping.roleIndex !== -1) {
      const roleVal = (row[mapping.roleIndex] || '').toLowerCase();
      const kw = (config.teacherKeyword || 'prof').toLowerCase();
      if (roleVal.includes(kw) || roleVal.includes('prof') || roleVal.includes('enseignant')) {
        role = 'teacher';
      } else {
        role = 'student';
      }
    } else if (config.splitMode === 'allStudents') {
      role = 'student';
    }

    rowRoles.push(role);
  });

  // Track existing identifiers for collision detection
  // If avoidTeacherCollisions is true, we register teachers' normalized base names
  const baseCountMap = new Map<string, number>();
  const teacherBases = new Set<string>();

  // First pass: register teachers if collision avoidance is active
  if (config.avoidTeacherCollisions) {
    rawRows.forEach((row, i) => {
      if (rowRoles[i] === 'teacher') {
        const rawNom = row[mapping.nomIndex] || '';
        const normBase = normalizeForIdentifier(rawNom, {
          removeAccents: config.removeAccents,
          removeSpacesAndSpecials: config.removeSpacesAndSpecials,
          casing: config.casing,
        }).slice(0, config.maxIdLength);

        if (normBase) {
          teacherBases.add(normBase);
          // Pre-populate count to 1 so students with same name start numbering directly!
          baseCountMap.set(normBase, (baseCountMap.get(normBase) || 0) + 1);
        }
      }
    });
  }

  // Count total occurrences among students to know in advance if a student name is a homonym
  const studentNomFrequency = new Map<string, number>();
  rawRows.forEach((row, i) => {
    if (rowRoles[i] === 'student') {
      const rawNom = row[mapping.nomIndex] || '';
      const normBase = normalizeForIdentifier(rawNom, {
        removeAccents: config.removeAccents,
        removeSpacesAndSpecials: config.removeSpacesAndSpecials,
        casing: config.casing,
      });
      studentNomFrequency.set(normBase, (studentNomFrequency.get(normBase) || 0) + 1);
    }
  });

  const idOpts = {
    removeAccents: config.removeAccents,
    removeSpacesAndSpecials: config.removeSpacesAndSpecials,
    casing: config.casing,
  };

  // Existing identifiers to keep as-is (so re-importing an export never renames/swaps accounts).
  // Teachers' identifiers always win; among students the first occurrence wins.
  const keptIds = new Map<number, string>();
  if (config.keepExistingIds && mapping.idIndex !== -1) {
    const reserved = new Set<string>();
    rawRows.forEach((row, i) => {
      if (rowRoles[i] !== 'teacher') return;
      const rawId = (row[mapping.idIndex] || '').trim();
      reserved.add((rawId || (row[mapping.nomIndex] || '').trim()).toLowerCase());
    });
    rawRows.forEach((row, i) => {
      if (rowRoles[i] !== 'student') return;
      const kept = normalizeForIdentifier(row[mapping.idIndex] || '', idOpts);
      if (kept && kept.length <= config.maxIdLength && !reserved.has(kept.toLowerCase())) {
        reserved.add(kept.toLowerCase());
        keptIds.set(i, kept);
      }
    });
  }

  let teacherCount = 0;
  let studentCount = 0;
  let homonymCount = 0;
  let truncatedCount = 0;

  const processedRows: ProcessedRow[] = [];

  // Second pass: process each row
  rawRows.forEach((row, index) => {
    const role = rowRoles[index];
    const rawNom = row[mapping.nomIndex] || '';
    const rawPrenom = row[mapping.prenomIndex] || '';
    const rawClasse = mapping.classeIndex !== -1 ? (row[mapping.classeIndex] || '') : '';
    const rawId = mapping.idIndex !== -1 ? row[mapping.idIndex] : undefined;

    // Extra columns dictionary
    const extraColumns: Record<string, string> = {};
    headers.forEach((h, colIdx) => {
      if (
        colIdx !== mapping.nomIndex &&
        colIdx !== mapping.prenomIndex &&
        colIdx !== mapping.classeIndex &&
        colIdx !== mapping.roleIndex &&
        colIdx !== mapping.idIndex
      ) {
        extraColumns[h] = row[colIdx] || '';
      }
    });

    if (role === 'teacher') {
      teacherCount++;
      // "la première partie du fichier contient les noms de professeurs et je ne veux pas y toucher"
      // Teachers: Keep exact raw nom and prénom, identifier is rawId or rawNom without student alterations
      const teacherIdentifiant = rawId && rawId.trim() ? rawId.trim() : rawNom.trim();

      processedRows.push({
        index: index + 1,
        role: 'teacher',
        nom: rawNom,
        prenom: rawPrenom,
        codeClasse: rawClasse,
        password: generateKoXoPassword(),
        originalNom: rawNom,
        originalPrenom: rawPrenom,
        originalIdentifiant: rawId,
        identifiant: teacherIdentifiant,
        isHomonym: false,
        homonymNumber: 0,
        homonymBase: rawNom,
        isTruncated: false,
        truncatedFromLength: rawNom.length,
        extraColumns,
      });
    } else {
      studentCount++;

      // Clean base name for identifier creation
      const cleanBase = normalizeForIdentifier(rawNom, {
        removeAccents: config.removeAccents,
        removeSpacesAndSpecials: config.removeSpacesAndSpecials,
        casing: config.casing,
      });

      const keptId = keptIds.get(index);
      if (keptId !== undefined) {
        const m = keptId.match(/^(.*?)(\d+)$/);
        const keptNumber =
          m && m[1] && cleanBase.toLowerCase().startsWith(m[1].toLowerCase()) ? parseInt(m[2], 10) : 0;
        const keptTruncated = cleanBase.length > config.maxIdLength;
        if (keptNumber > 0) homonymCount++;
        if (keptTruncated) truncatedCount++;
        processedRows.push({
          index: index + 1,
          role: 'student',
          nom: rawNom,
          prenom: rawPrenom,
          codeClasse: rawClasse,
          password: generateKoXoPassword(),
          originalNom: rawNom,
          originalPrenom: rawPrenom,
          originalIdentifiant: rawId,
          identifiant: keptId,
          isHomonym: keptNumber > 0,
          homonymNumber: keptNumber,
          homonymBase: cleanBase,
          isTruncated: keptTruncated,
          truncatedFromLength: cleanBase.length,
          extraColumns,
          keptExisting: true,
        });
        return;
      }

      // Current occurrence count for this base
      const priorCount = baseCountMap.get(cleanBase) || 0;
      const currentOccurrence = priorCount + 1;
      baseCountMap.set(cleanBase, currentOccurrence);

      const totalStudentsWithSameName = studentNomFrequency.get(cleanBase) || 1;
      const collidedWithTeacher = teacherBases.has(cleanBase.slice(0, config.maxIdLength));

      // Is this student a homonym?
      // Yes if there are multiple students with this base OR collided with a teacher
      const isHomonym = totalStudentsWithSameName > 1 || (collidedWithTeacher && currentOccurrence > 0);

      let suffixNumber: number | null = null;

      if (config.homonymStyle === 'startAt1') {
        // DUPONT, DUPONT1, DUPONT2...
        if (currentOccurrence > 1) {
          suffixNumber = currentOccurrence - 1; // 2nd occurrence gets 1, 3rd gets 2
        } else if (collidedWithTeacher && config.avoidTeacherCollisions) {
          suffixNumber = 1; // First student gets 1 because teacher has base
        }
      } else if (config.homonymStyle === 'startAt2') {
        // DUPONT, DUPONT2, DUPONT3...
        if (currentOccurrence > 1) {
          suffixNumber = currentOccurrence; // 2nd occurrence gets 2, 3rd gets 3
        } else if (collidedWithTeacher && config.avoidTeacherCollisions) {
          suffixNumber = 2;
        }
      } else if (config.homonymStyle === 'allNumbered') {
        // DUPONT1, DUPONT2, DUPONT3...
        suffixNumber = currentOccurrence;
      }

      // Build truncated identifier to guarantee strictly <= maxIdLength (12)
      const { identifiant, wasTruncated, originalLen } = buildTruncatedIdentifier(
        cleanBase,
        suffixNumber,
        config.maxIdLength
      );

      if (suffixNumber !== null) {
        homonymCount++;
      }
      if (wasTruncated) {
        truncatedCount++;
      }

      processedRows.push({
        index: index + 1,
        role: 'student',
        nom: rawNom,
        prenom: rawPrenom,
        codeClasse: rawClasse,
        password: generateKoXoPassword(),
        originalNom: rawNom,
        originalPrenom: rawPrenom,
        originalIdentifiant: rawId,
        identifiant,
        isHomonym: isHomonym && suffixNumber !== null,
        homonymNumber: suffixNumber || 0,
        homonymBase: cleanBase,
        isTruncated: wasTruncated,
        truncatedFromLength: originalLen,
        extraColumns,
      });
    }
  });

  // Final pass: guarantee global uniqueness (case-insensitive) of identifiers.
  // Two different long names can truncate to the same 12 chars, which the
  // per-name homonym counter cannot see.
  const usedIds = new Set<string>();
  processedRows.forEach((r) => {
    if (r.role === 'teacher' || r.keptExisting) usedIds.add(r.identifiant.toLowerCase());
  });
  processedRows.forEach((r) => {
    if (r.role !== 'student' || r.keptExisting) return;
    let candidate = r.identifiant;
    if (usedIds.has(candidate.toLowerCase())) {
      const base = r.homonymBase;
      let n = Math.max(r.homonymNumber, 0) + 1;
      do {
        candidate = buildTruncatedIdentifier(base, n, config.maxIdLength).identifiant;
        n++;
      } while (usedIds.has(candidate.toLowerCase()));
      r.identifiant = candidate;
      r.isHomonym = true;
      r.homonymNumber = n - 1;
      r.hasWarning = true;
      r.warningMessage = 'Identifiant en collision après troncature : numéro ajouté automatiquement';
    }
    usedIds.add(r.identifiant.toLowerCase());
  });

  // Data-quality warnings
  processedRows.forEach((r) => {
    const msgs: string[] = [];
    if (hasCorruptedChars(r.originalNom) || hasCorruptedChars(r.originalPrenom)) {
      msgs.push('Caractère illisible (encodage du fichier ?)');
    }
    if (!r.originalNom.trim()) msgs.push('Nom vide');
    if (!r.originalPrenom.trim()) msgs.push('Prénom vide');
    if (r.role === 'student' && !r.identifiant) msgs.push('Identifiant vide');
    if (/^(m|mme|mlle|mr|m\.|mme\.)$/i.test(r.originalPrenom.trim())) {
      msgs.push('Prénom ressemble à un titre (colonnes inversées ?)');
    }
    const classeVal = r.codeClasse.trim().toLowerCase();
    if (classeVal && (classeVal === 'code classe' || headers.some((h) => h.trim().toLowerCase() === classeVal))) {
      msgs.push('Code classe invalide (nom de colonne)');
    }
    if (r.role === 'teacher' && /[^A-Za-z0-9_.-]/.test(r.identifiant)) {
      msgs.push('Identifiant professeur avec caractères non valides (espace, accent…)');
    }
    if (msgs.length) {
      r.hasWarning = true;
      r.warningMessage = [r.warningMessage, ...msgs].filter(Boolean).join(' · ');
    }
  });

  return {
    processedRows,
    stats: {
      totalRows: rawRows.length,
      teacherCount,
      studentCount,
      homonymCount,
      truncatedCount,
      warningCount: processedRows.filter((r) => r.hasWarning).length,
      ignoredCount,
    },
  };
}
