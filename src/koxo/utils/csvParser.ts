/**
 * Robust RFC-4180 compliant CSV parser and serializer
 * Handles quotes, embedded delimiters, commas, semicolons, tabs, and BOM
 */

export interface ParsedCsvResult {
  headers: string[];
  rows: string[][];
  detectedDelimiter: ';' | ',' | '\t';
  totalLines: number;
}

/**
 * Decodes a file buffer, auto-detecting the encoding.
 * Excel / SIECLE exports are often Windows-1252: reading them as UTF-8 turns
 * "Chloé" into "Chlo�", which would later be stripped from identifiers.
 * Strict UTF-8 is tried first; on failure we fall back to Windows-1252.
 */
export function decodeCsvBuffer(buffer: ArrayBuffer): { text: string; encoding: 'UTF-8' | 'Windows-1252' } {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    return { text, encoding: 'UTF-8' };
  } catch {
    return { text: new TextDecoder('windows-1252').decode(buffer), encoding: 'Windows-1252' };
  }
}

export function detectDelimiter(rawText: string): ';' | ',' | '\t' {
  const sample = rawText.slice(0, 4000);
  const semicolons = (sample.match(/;/g) || []).length;
  const commas = (sample.match(/,/g) || []).length;
  const tabs = (sample.match(/\t/g) || []).length;

  if (semicolons >= commas && semicolons >= tabs && semicolons > 0) {
    return ';';
  }
  if (tabs > commas && tabs > semicolons) {
    return '\t';
  }
  return ',';
}

export function parseCSV(rawText: string, explicitDelimiter?: ';' | ',' | '\t'): ParsedCsvResult {
  // Strip UTF-8 BOM if present
  let cleanText = rawText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) {
    return { headers: [], rows: [], detectedDelimiter: ';', totalLines: 0 };
  }

  const delimiter = explicitDelimiter || detectDelimiter(cleanText);

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentField += '"';
          i++;
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        // Handle CRLF
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  // Push remainder
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  // Filter completely blank rows
  const filteredRows = rows.filter((r) => r.some((field) => field.length > 0));

  if (filteredRows.length === 0) {
    return { headers: [], rows: [], detectedDelimiter: delimiter, totalLines: 0 };
  }

  const headers = filteredRows[0].map((h) => h.replace(/^["']|["']$/g, '').trim());
  const dataRows = filteredRows.slice(1);

  return {
    headers,
    rows: dataRows,
    detectedDelimiter: delimiter,
    totalLines: dataRows.length,
  };
}

export function exportToCSV(
  headers: string[],
  rows: string[][],
  delimiter: ';' | ',' | '\t' = ';',
  includeBom = true
): string {
  const escapeField = (val: string | undefined | null) => {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeField).join(delimiter);
  const lines = rows.map((row) => row.map(escapeField).join(delimiter));
  const fullContent = [headerLine, ...lines].join('\r\n');

  return includeBom ? '\uFEFF' + fullContent : fullContent;
}
