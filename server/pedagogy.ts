/**
 * Lecture du PDF « Équipe pédagogique » exporté par UnDeuxTEMPS (Axess) :
 * pour chaque classe, la liste des matières et des professeurs qui les enseignent.
 *
 * Mise en page (une page A4, plusieurs blocs « Equipe pédagogique 601 ») :
 *  - 3 colonnes ; libellé de matière en début de colonne, nom du professeur 64 pt plus à droite ;
 *  - une ligne sans libellé (ou « avec ») prolonge la matière précédente, même d'une colonne à l'autre.
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { CLASS_REGEX, norm } from './rentreeLogic.ts';

export interface PdfItem { page: number; s: string; x: number; y: number; font: string }

export interface PersonName {
  raw: string;
  civilite: string;
  nom: string;
  prenom: string;
  /** Mots normalisés triés : insensible à l'ordre nom/prénom et à la casse. */
  key: string;
  /** Nom et prénom tous en majuscules avec plus de deux mots : la coupure nom / prénom est une estimation. */
  uncertain: boolean;
}

export interface RawAssignment { classCode: string; label: string; person: PersonName; bold: boolean }

/** Professeur principal d'une classe : le nom écrit en gras dans le bloc (et en général professeur de « Vie de classe »). */
export interface ClassPrincipal { classCode: string; principals: PersonName[]; vieDeClasse: PersonName[] }

export interface PedagogyParse {
  classes: string[];
  assignments: RawAssignment[];
  principals: ClassPrincipal[];
  /** Lignes ignorées (ex. « M. Aumônerie x » n'est pas une personne). */
  skipped: string[];
}

export async function extractPdfItems(data: Uint8Array): Promise<PdfItem[]> {
  const doc = await getDocument({ data, useSystemFonts: true, disableFontFace: true, verbosity: 0 }).promise;
  const out: PdfItem[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    for (const it of tc.items as any[]) {
      const s = (it.str || '').trim();
      if (s) out.push({ page: p, s, x: it.transform[4], y: vp.height - it.transform[5], font: it.fontName || '' });
    }
  }
  return out;
}

const CIVILITE = /^(Mme|Mlle|M\.|Mr|M)\s+/i;
const COL_LEFT = [30, 200, 370];

const isCaps = (t: string) => t === t.toUpperCase() && /[A-ZÀ-Ý]/.test(t);
const words = (s: string) => norm(s).replace(/['’`]/g, '').split(/[^a-z0-9]+/).filter(Boolean);

export function parsePersonName(raw: string): PersonName | null {
  const text = raw.replace(/\s+/g, ' ').trim();
  const m = text.match(CIVILITE);
  if (!m) return null;
  const rest = text.slice(m[0].length).trim();
  const tokens = rest.split(' ').filter(Boolean);
  // « M. Aumônerie x » : pas une personne
  if (tokens.length < 2 || /aum[oô]nerie/i.test(rest) || tokens[tokens.length - 1].toLowerCase() === 'x') return null;
  const allCaps = tokens.every(isCaps);
  let split = tokens.findIndex(t => !isCaps(t));
  if (allCaps || split < 0) split = 1;
  const nom = tokens.slice(0, split).join(' ');
  const prenom = tokens.slice(split).join(' ');
  return {
    raw: text,
    civilite: m[1].replace(/\.$/, ''),
    nom: nom.toUpperCase(),
    prenom: prenom.toLowerCase().replace(/(^|[\s'’-])([a-zà-ÿ])/g, (_x, p, c) => p + c.toUpperCase()),
    key: words(rest).sort().join('-'),
    uncertain: allCaps && tokens.length > 2,
  };
}

/** Police des libellés de matières (écrits en gras) : un nom écrit dans cette police est en gras. */
function detectBoldFont(items: PdfItem[]): string {
  const count = new Map<string, number>();
  for (const i of items) {
    const col = i.x < 170 ? 0 : i.x < 340 ? 1 : 2;
    if (i.x - COL_LEFT[col] <= 40 && /^[A-Za-zÀ-ÿ]/.test(i.s) && norm(i.s) !== 'avec' && !/equipe p/i.test(norm(i.s))) count.set(i.font, (count.get(i.font) || 0) + 1);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
}

export function parsePedagogyItems(items: PdfItem[]): PedagogyParse {
  const boldFont = detectBoldFont(items);
  const principals: ClassPrincipal[] = [];
  const assignments: RawAssignment[] = [];
  const skipped = new Set<string>();
  const classes: string[] = [];

  const pages = [...new Set(items.map(i => i.page))].sort((a, b) => a - b);
  for (const page of pages) {
    const its = items.filter(i => i.page === page);
    // titres de blocs : « Equipe pédagogique » suivi du code de classe sur la même ligne
    const heads = its
      .filter(i => /^equipe p[eé]dagogique$/i.test(i.s))
      .map(h => {
        const code = its.find(c => Math.abs(c.y - h.y) < 3 && c.x > h.x && CLASS_REGEX.test(c.s));
        return code ? { y: h.y, code: code.s } : null;
      })
      .filter((h): h is { y: number; code: string } => !!h)
      .sort((a, b) => a.y - b.y);

    heads.forEach((head, idx) => {
      const bottom = idx + 1 < heads.length ? heads[idx + 1].y - 5 : Infinity;
      const body = its.filter(i => i.y > head.y + 5 && i.y < bottom && !/^Page \d+\/\d+$/.test(i.s) && !/UnDeuxTEMPS/.test(i.s));
      classes.push(head.code);

      let current = '';
      const blockBold = new Map<string, PersonName>();
      const blockVie = new Map<string, PersonName>();
      for (let col = 0; col < 3; col++) {
        const left = COL_LEFT[col];
        const colItems = body.filter(i => (col === 0 ? i.x < 170 : col === 1 ? i.x >= 170 && i.x < 340 : i.x >= 340));
        // regroupement en lignes (tolérance 3 pt)
        const rows: { y: number; label: string; name: string; bold: boolean }[] = [];
        for (const it of colItems.sort((a, b) => a.y - b.y || a.x - b.x)) {
          let row = rows.find(r => Math.abs(r.y - it.y) < 3);
          if (!row) { row = { y: it.y, label: '', name: '', bold: false }; rows.push(row); }
          if (it.x - left > 40) { row.name = (row.name + ' ' + it.s).trim(); if (boldFont && it.font === boldFont) row.bold = true; }
          else row.label = (row.label + ' ' + it.s).trim();
        }
        for (const row of rows) {
          if (row.label && norm(row.label) !== 'avec') current = row.label;
          if (!row.name || !current) continue;
          const person = parsePersonName(row.name);
          if (!person) { skipped.add(row.name); continue; }
          assignments.push({ classCode: head.code, label: current, person, bold: row.bold });
          if (row.bold) blockBold.set(person.key, person);
          if (norm(current) === 'vie de classe') blockVie.set(person.key, person);
        }
      }
      principals.push({ classCode: head.code, principals: [...blockBold.values()], vieDeClasse: [...blockVie.values()] });
    });
  }
  return { classes, assignments, principals, skipped: [...skipped] };
}

/** Libellés du PDF → noms de matières des équipes Teams (premier nom existant retenu). */
export const DEFAULT_LABEL_SUBJECTS: Record<string, string[]> = {
  'a-pla': ['Arts Plastiques'],
  'agl1': ['Anglais LV1'],
  'allemand lv2': ['Allemand LV2'],
  'chorale': ['Chorale'],
  'culture religieuse': ['Culture religieuse'],
  'kt': ['Culture religieuse'],
  'devoirs faits': ['Devoirs faits'],
  'edmus': ['Éducation Musicale'],
  'emc': ['EMC'],
  'eps': ['EPS'],
  'francais': ['Français'],
  'hi-ge': ['Histoire-Géo'],
  'maths': ['Mathématiques', 'Mathématiques Spécialité'],
  'maths tronc commun': ['Mathématiques Tronc Commun'],
  'sc & tech': ['Sciences & Technologie'],
  'svt': ['SVT', 'SVT Spécialité'],
  'vie de classe': ['Vie de classe'],
  'espagnol lv2': ['Espagnol LV2'],
  'espagnol lvc': ['Espagnol LV2'],
  'lcala': ['Langues et Cultures Anciennes'],
  'ph-ch': ['Physique-Chimie', 'Physique-Chimie Spécialité'],
  'techn': ['Technologie'],
  'at theat': ['Atelier Théâtre', 'Théâtre'],
  'theat': ['Théâtre', 'Atelier Théâtre'],
  'ci-av': ['Cinéma-Audiovisuel'],
  'ses': ['SES', 'SES Spécialité'],
  'sntec': ['Sciences Numériques (SNT)'],
  'hggsp': ['HGGSP'],
  'hlphi': ['HLP'],
  'nsinf': ['NSI'],
  'matco': ['Maths Complémentaires'],
  'matex': ['Maths Expertes'],
  'philo': ['Philosophie'],
  'droit': ['Droit et Grands Enjeux'],
  'enseignement scientifique': ['Enseignement scientifique'],
};

export const labelKey = (label: string) => norm(label).replace(/\s+/g, ' ');
