'use client';

import React, { useState } from 'react';
import { Player, Position } from '../types';
import { ALL_ROLES, getRoleById } from '../engine/roles';
import { calculateRoleSuitability } from '../engine/suitability';
import { X, Sparkles } from 'lucide-react';

interface PlayerAttributesModalProps {
  player: Player;
  currentPosition?: Position;
  currentRoleId?: string;
  onClose: () => void;
  onAssignToSlot?: (slotId: string, playerId: string) => void;
}

export function PlayerAttributesModal({
  player,
  currentPosition,
  currentRoleId,
  onClose,
}: PlayerAttributesModalProps) {
  // Pilihan role untuk highlighting atribut
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    currentRoleId || ALL_ROLES[0].id
  );

  const selectedRole = getRoleById(selectedRoleId) || ALL_ROLES[0];

  // Hitung suitability untuk role terpilih
  const activePosition = currentPosition || player.positions[0]?.position || 'MC';
  const suitability = calculateRoleSuitability(player, selectedRole, activePosition);

  // Helper untuk styling skor atribut (1-20) khas Football Manager
  const getAttrBadgeClass = (val?: number) => {
    if (!val) return 'bg-slate-800/80 text-slate-500 border-slate-700/60';
    if (val >= 16) return 'bg-emerald-950 text-emerald-300 border-emerald-600 font-extrabold shadow-sm shadow-emerald-950';
    if (val >= 11) return 'bg-cyan-950 text-cyan-300 border-cyan-700 font-bold';
    if (val >= 6) return 'bg-slate-800 text-slate-300 border-slate-700';
    return 'bg-rose-950/60 text-rose-400 border-rose-800/60';
  };

  // Helper untuk cek apakah atribut merupakan Key atau Desirable untuk role terpilih
  const getHighlightStatus = (attrName: string) => {
    if (selectedRole.keyAttributes.includes(attrName)) return 'key';
    if (selectedRole.desirableAttributes.includes(attrName)) return 'desirable';
    return 'none';
  };

  const isGK = player.positions.some(p => p.position === 'GK');

  // Daftar atribut FM24
  const technicalAttrs = [
    { key: 'corners', label: 'Corners' },
    { key: 'crossing', label: 'Crossing' },
    { key: 'dribbling', label: 'Dribbling' },
    { key: 'finishing', label: 'Finishing' },
    { key: 'firstTouch', label: 'First Touch' },
    { key: 'freeKicks', label: 'Free Kick Taking' },
    { key: 'heading', label: 'Heading' },
    { key: 'longShots', label: 'Long Shots' },
    { key: 'longThrows', label: 'Long Throws' },
    { key: 'marking', label: 'Marking' },
    { key: 'passing', label: 'Passing' },
    { key: 'penaltyTaking', label: 'Penalty Taking' },
    { key: 'tackling', label: 'Tackling' },
    { key: 'technique', label: 'Technique' },
  ];

  const mentalAttrs = [
    { key: 'aggression', label: 'Aggression' },
    { key: 'anticipation', label: 'Anticipation' },
    { key: 'bravery', label: 'Bravery' },
    { key: 'composure', label: 'Composure' },
    { key: 'concentration', label: 'Concentration' },
    { key: 'decisions', label: 'Decisions' },
    { key: 'determination', label: 'Determination' },
    { key: 'flair', label: 'Flair' },
    { key: 'leadership', label: 'Leadership' },
    { key: 'offTheBall', label: 'Off the Ball' },
    { key: 'positioning', label: 'Positioning' },
    { key: 'teamwork', label: 'Teamwork' },
    { key: 'vision', label: 'Vision' },
    { key: 'workRate', label: 'Work Rate' },
  ];

  const physicalAttrs = [
    { key: 'acceleration', label: 'Acceleration' },
    { key: 'agility', label: 'Agility' },
    { key: 'balance', label: 'Balance' },
    { key: 'jumpingReach', label: 'Jumping Reach' },
    { key: 'naturalFitness', label: 'Natural Fitness' },
    { key: 'pace', label: 'Pace' },
    { key: 'stamina', label: 'Stamina' },
    { key: 'strength', label: 'Strength' },
  ];

  const goalkeepingAttrs = [
    { key: 'aerialReach', label: 'Aerial Reach' },
    { key: 'commandOfArea', label: 'Command of Area' },
    { key: 'communication', label: 'Communication' },
    { key: 'eccentricity', label: 'Eccentricity' },
    { key: 'handling', label: 'Handling' },
    { key: 'kicking', label: 'Kicking' },
    { key: 'oneOnOnes', label: 'One on Ones' },
    { key: 'punching', label: 'Punching' },
    { key: 'reflexes', label: 'Reflexes' },
    { key: 'rushingOut', label: 'Rushing Out' },
    { key: 'throwing', label: 'Throwing' },
  ];

  const renderAttrRow = (item: { key: string; label: string }) => {
    const val = player.attributes[item.key];
    const status = getHighlightStatus(item.key);

    return (
      <div
        key={item.key}
        className={`flex items-center justify-between py-1 px-2 rounded-lg transition-all ${
          status === 'key'
            ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-200'
            : status === 'desirable'
            ? 'bg-cyan-950/30 border border-cyan-500/30 text-cyan-200'
            : 'hover:bg-slate-800/40 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate pr-2">
          {status === 'key' && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Key Attribute (Bobot x3)" />
          )}
          {status === 'desirable' && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" title="Desirable Attribute (Bobot x1)" />
          )}
          <span className="text-[12px] truncate">{item.label}</span>
        </div>
        <span
          className={`w-7 h-6 flex items-center justify-center rounded border text-xs text-center shrink-0 ${getAttrBadgeClass(
            val
          )}`}
        >
          {val !== undefined ? val : '-'}
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header Profil Pemain */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-cyan-900/40">
              {player.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">{player.name}</h3>
                <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-bold">
                  {player.age} thn
                </span>
                {player.nationality && (
                  <span className="text-xs text-slate-400">{player.nationality}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-[11px] text-slate-400 font-semibold mr-1">Posisi:</span>
                {player.positions.map((pos) => (
                  <span
                    key={pos.position}
                    className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${
                      pos.familiarity === 'Natural'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : pos.familiarity === 'Accomplished'
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {pos.position} ({pos.familiarity})
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Penyorot Role & Kecocokan */}
        <div className="px-4 py-3 bg-slate-950/50 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-bold text-slate-300">Sorot Atribut Peran:</span>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 font-bold text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
            >
              {ALL_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>

          {/* Skor Kecocokan Role Terpilih */}
          <div className="flex items-center gap-3 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400">Kecocokan Role:</span>
            <span
              className={`font-black text-sm ${
                suitability.score >= 75
                  ? 'text-emerald-400'
                  : suitability.score >= 60
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {suitability.score}%
            </span>
            <span className="text-amber-400 text-xs font-bold">
              {'★'.repeat(Math.floor(suitability.stars))}
              {suitability.stars % 1 !== 0 ? '½' : ''}
            </span>
            <span className="text-slate-500 text-[11px]">
              (Key: <strong className="text-emerald-300">{suitability.keyScoreAvg}</strong> / Des: <strong className="text-cyan-300">{suitability.desirableScoreAvg}</strong>)
            </span>
          </div>

          {/* Legenda Atribut */}
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Key (Bobot x3)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Desirable (Bobot x1)</span>
            </div>
          </div>
        </div>

        {/* Kolom Atribut FM (Teknik, Mental, Fisik / Kiper) */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/20">
          {/* 1. Kolom Teknik / Goalkeeping */}
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-3 flex flex-col">
            <div className="font-extrabold text-xs text-cyan-400 uppercase tracking-wider mb-2 pb-1.5 border-b border-slate-800 flex items-center justify-between">
              <span>{isGK ? 'Goalkeeping' : 'Teknik (Technical)'}</span>
              <span className="text-[10px] text-slate-500 font-normal">1 - 20</span>
            </div>
            <div className="space-y-0.5 flex-1">
              {isGK
                ? goalkeepingAttrs.map(renderAttrRow)
                : technicalAttrs.map(renderAttrRow)}
            </div>
          </div>

          {/* 2. Kolom Mental */}
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-3 flex flex-col">
            <div className="font-extrabold text-xs text-amber-400 uppercase tracking-wider mb-2 pb-1.5 border-b border-slate-800 flex items-center justify-between">
              <span>Mental</span>
              <span className="text-[10px] text-slate-500 font-normal">1 - 20</span>
            </div>
            <div className="space-y-0.5 flex-1">
              {mentalAttrs.map(renderAttrRow)}
            </div>
          </div>

          {/* 3. Kolom Fisik & Traits */}
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-3 flex flex-col space-y-4">
            <div>
              <div className="font-extrabold text-xs text-rose-400 uppercase tracking-wider mb-2 pb-1.5 border-b border-slate-800 flex items-center justify-between">
                <span>Fisik (Physical)</span>
                <span className="text-[10px] text-slate-500 font-normal">1 - 20</span>
              </div>
              <div className="space-y-0.5">
                {physicalAttrs.map(renderAttrRow)}
              </div>
            </div>

            {/* Traits Pemain */}
            {player.traits && player.traits.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <div className="font-extrabold text-xs text-slate-300 uppercase tracking-wider mb-1.5">
                  Player Traits
                </div>
                <div className="flex flex-wrap gap-1">
                  {player.traits.map((trait) => (
                    <span
                      key={trait}
                      className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Warna Atribut: <span className="text-emerald-400 font-bold">16-20 Elite</span> |{' '}
            <span className="text-cyan-400 font-bold">11-15 Bagus</span> |{' '}
            <span className="text-slate-300">6-10 Rata-rata</span> |{' '}
            <span className="text-rose-400">1-5 Buruk</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
