import React from 'react';
import { Users, GraduationCap, School, Hash, Scissors } from 'lucide-react';
import { ProcessedStats } from '../types';

interface StatsBarProps {
  stats: ProcessedStats;
  activeFilter: 'all' | 'teachers' | 'students' | 'homonyms' | 'truncated';
  onSelectFilter: (filter: 'all' | 'teachers' | 'students' | 'homonyms' | 'truncated') => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({ stats, activeFilter, onSelectFilter }) => {
  const items = [
    {
      id: 'all' as const,
      label: 'Total Comptes',
      count: stats.totalRows,
      desc: 'Comptes dans le fichier',
      icon: Users,
      iconBg: 'bg-[#5A5A40] text-[#E2E8D5]',
    },
    {
      id: 'teachers' as const,
      label: 'Professeurs',
      count: stats.teacherCount,
      desc: 'Intacts & non modifiés',
      icon: School,
      iconBg: 'bg-[#E2E8D5] text-[#5A5A40]',
      tag: '100% Préservés',
      tagClass: 'bg-[#E2E8D5] text-[#5A5A40] border border-[#C5CCB3]',
    },
    {
      id: 'students' as const,
      label: 'Élèves',
      count: stats.studentCount,
      desc: 'Identifiants préparés',
      icon: GraduationCap,
      iconBg: 'bg-[#F0EEEA] text-[#42413C]',
    },
    {
      id: 'homonyms' as const,
      label: 'Homonymes Résolus',
      count: stats.homonymCount,
      desc: 'Avec numéro incrémenté',
      icon: Hash,
      iconBg: 'bg-[#F2E3D5] text-[#D68F5A]',
      tag: stats.homonymCount > 0 ? `+${stats.homonymCount} indexés` : undefined,
      tagClass: 'bg-[#F2E3D5] text-[#D68F5A] border border-[#E0D0C0]',
    },
    {
      id: 'truncated' as const,
      label: 'Noms Tronqués',
      count: stats.truncatedCount,
      desc: 'Sécurisés ≤ 12 car.',
      icon: Scissors,
      iconBg: 'bg-[#FFF0E6] text-[#D68F5A]',
      tag: 'KoXo Safe',
      tagClass: 'bg-[#FFF0E6] text-[#D68F5A] border border-[#E0D0C0]',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeFilter === item.id;

        return (
          <button
            key={item.id}
            id={`stat-card-${item.id}`}
            onClick={() => onSelectFilter(item.id)}
            className={`text-left p-3.5 rounded-xl border transition-all relative group cursor-pointer ${
              isActive
                ? 'border-[#5A5A40] ring-2 ring-[#5A5A40]/30 bg-[#F9FAF2] shadow-xs'
                : 'bg-white border-[#D1CDC4] hover:border-[#BDB9B0] hover:bg-[#F9F8F6]/60 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.iconBg}`}
              >
                <Icon className="w-4 h-4" />
              </div>

              {item.tag && (
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${item.tagClass}`}
                >
                  {item.tag}
                </span>
              )}
            </div>

            <div className="text-2xl font-serif italic text-[#42413C] tracking-tight">
              {item.count}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#42413C] mt-0.5">{item.label}</div>
            <div className="text-[11px] text-[#8C867A] mt-0.5">{item.desc}</div>
          </button>
        );
      })}
    </div>
  );
};
