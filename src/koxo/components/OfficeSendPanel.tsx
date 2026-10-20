import React, { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { ProcessedRow, KoxoOfficePayload } from '../types';

interface OfficeSendPanelProps {
  rows: ProcessedRow[];
  filename: string;
  onSend: (payload: KoxoOfficePayload) => void;
}

const csvField = (v: string) => (/[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

const buildOfficeCsv = (rows: ProcessedRow[], domain: string) =>
  ['nom;prenom;adresse_mail;password']
    .concat(
      rows.map((r) => {
        const id = r.identifiant.trim();
        const mail = id.includes('@') ? id.toLowerCase() : `${id.toLowerCase()}@${domain}`;
        return [r.nom, r.prenom, mail, r.password].map(csvField).join(';');
      })
    )
    .join('\r\n');

export const OfficeSendPanel: React.FC<OfficeSendPanelProps> = ({ rows, filename, onSend }) => {
  const [domain, setDomain] = useState('');

  useEffect(() => {
    fetch('/api/office/tenant/config')
      .then((r) => r.json())
      .then((c) => c?.domain && setDomain((d) => d || c.domain))
      .catch(() => {});
  }, []);

  const { students, teachers } = useMemo(
    () => ({
      students: rows.filter((r) => r.role === 'student' && r.identifiant),
      teachers: rows.filter((r) => r.role === 'teacher' && r.identifiant),
    }),
    [rows]
  );

  const base = filename ? filename.replace(/\.[^/.]+$/, '') : 'koxo';
  const cleanDomain = domain.trim().replace(/^@/, '');
  const disabled = !cleanDomain || (!students.length && !teachers.length);

  const send = () =>
    onSend({
      domain: cleanDomain,
      eleves: students.length
        ? { csv: buildOfficeCsv(students, cleanDomain), name: `${base}_eleves_office.csv`, count: students.length }
        : null,
      profs: teachers.length
        ? { csv: buildOfficeCsv(teachers, cleanDomain), name: `${base}_profs_office.csv`, count: teachers.length }
        : null,
    });

  return (
    <div className="bg-white rounded-xl border border-[#C5CCB3] shadow-2xs p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h3 className="text-lg font-serif italic text-[#5A5A40]">Créer les comptes Office 365</h3>
        <p className="text-xs text-[#8C867A] mt-1">
          Les identifiants et mots de passe générés ci-dessus sont transmis à l'import Office 365 :
          adresse = <strong>identifiant@{cleanDomain || 'domaine'}</strong>.
          {' '}{students.length} élève(s), {teachers.length} professeur(s).
        </p>
      </div>
      <div className="flex items-center gap-2.5 flex-wrap">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="domaine (ex. ecole.fr)"
          className="text-xs py-2 px-2.5 border border-[#D1CDC4] rounded-lg w-48 font-mono bg-[#F9F8F6] text-[#42413C]"
        />
        <button
          onClick={send}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5A5A40] hover:bg-[#484833] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>Envoyer vers Office 365</span>
        </button>
      </div>
    </div>
  );
};
