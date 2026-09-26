'use client';

import React, { useState, useMemo } from 'react';
import { Player, TacticSlot, Position } from '../types';
import { getRoleById } from '../engine/roles';
import { calculateRoleSuitability } from '../engine/suitability';
import { Search, Eye, UserCheck, GripVertical } from 'lucide-react';

interface SquadListPanelProps {
  players: Player[];
  slots: TacticSlot[];
  onOpenPlayerAttributes: (player: Player) => void;
  onAssignPlayerToSlot: (slotId: string, playerId: string) => void;
  onSelectSlot: (slotId: string) => void;
}

export function SquadListPanel({
  players,
  slots,
  onOpenPlayerAttributes,
  onAssignPlayerToSlot,
  onSelectSlot,
}: SquadListPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'starter' | 'sub' | 'GK' | 'DEF' | 'MID' | 'ATT'>('all');

  // Map slot yang ditempati oleh setiap pemain
  const playerSlotMap = useMemo(() => {
    const map = new Map<string, TacticSlot>();
    slots.forEach(slot => {
      if (slot.assignedPlayerId) {
        map.set(slot.assignedPlayerId, slot);
      }
    });
    return map;
  }, [slots]);

  // Kategorisasi Posisi Pemain
  const isPositionInGroup = (pos: Position, group: 'GK' | 'DEF' | 'MID' | 'ATT') => {
    if (group === 'GK') return pos === 'GK';
    if (group === 'DEF') return ['DR', 'DL', 'DC', 'WBR', 'WBL'].includes(pos);
    if (group === 'MID') return ['DM', 'MC', 'MR', 'ML'].includes(pos);
    if (group === 'ATT') return ['AMR', 'AML', 'AMC', 'STC'].includes(pos);
    return false;
  };

  // Filter Pemain
  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      // 1. Filter Search
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = player.name.toLowerCase().includes(query);
        const matchesPos = player.positions.some(p => p.position.toLowerCase().includes(query));
        if (!matchesName && !matchesPos) return false;
      }

      // 2. Filter Kategori
      const assignedSlot = playerSlotMap.get(player.id);
      if (categoryFilter === 'starter') return !!assignedSlot;
      if (categoryFilter === 'sub') return !assignedSlot;
      if (categoryFilter === 'GK' || categoryFilter === 'DEF' || categoryFilter === 'MID' || categoryFilter === 'ATT') {
        return player.positions.some(p => isPositionInGroup(p.position, categoryFilter));
      }

      return true;
    });
  }, [players, searchTerm, categoryFilter, playerSlotMap]);

  const handleDragStart = (e: React.DragEvent, playerId: string) => {
    e.dataTransfer.setData('text/squad-player-id', playerId);
    e.dataTransfer.setData('text/plain', playerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden shadow-xl">
      {/* Header Panel */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/70 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <span className="font-extrabold text-sm text-white">Daftar Skuad Pemain</span>
          </div>
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
            {filteredPlayers.length} / {players.length} Pemain
          </span>
        </div>

        {/* Input Pencarian */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama atau posisi (contoh: Saka, DC, MC)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1 text-[11px]">
          {(
            [
              { key: 'all', label: 'Semua' },
              { key: 'starter', label: 'XI Starter' },
              { key: 'sub', label: 'Cadangan' },
              { key: 'GK', label: 'GK' },
              { key: 'DEF', label: 'DEF' },
              { key: 'MID', label: 'MID' },
              { key: 'ATT', label: 'ATT' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setCategoryFilter(tab.key)}
              className={`px-2 py-0.5 rounded-lg font-bold transition ${
                categoryFilter === tab.key
                  ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-950'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List Pemain */}
      <div className="p-3 overflow-y-auto flex-1 space-y-1.5">
        {filteredPlayers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Tidak ada pemain yang sesuai dengan filter pencarian.
          </div>
        ) : (
          filteredPlayers.map((player) => {
            const assignedSlot = playerSlotMap.get(player.id);
            const assignedRole = assignedSlot ? getRoleById(assignedSlot.roleId) : undefined;
            const suitability = assignedSlot && assignedRole
              ? calculateRoleSuitability(player, assignedRole, assignedSlot.position)
              : null;

            return (
              <div
                key={player.id}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, player.id)}
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing group ${
                  assignedSlot
                    ? 'bg-slate-900/90 border-slate-700/80 hover:border-cyan-500/60'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 opacity-80 hover:opacity-100'
                }`}
              >
                {/* Drag Handle & Info Pemain */}
                <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                  <GripVertical className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 shrink-0" />

                  {/* Status Starter / Cadangan Badge */}
                  {assignedSlot ? (
                    <button
                      onClick={() => onSelectSlot(assignedSlot.slotId)}
                      className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-black bg-cyan-950 text-cyan-300 border border-cyan-700 hover:bg-cyan-900 transition flex items-center gap-0.5"
                      title="Klik untuk buka slot di lapangan"
                    >
                      XI • {assignedSlot.position}
                    </button>
                  ) : (
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                      SUB
                    </span>
                  )}

                  <div className="truncate min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-xs font-bold text-white truncate">
                        {player.name}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        ({player.age} thn)
                      </span>
                    </div>

                    {/* Posisi Alami */}
                    <div className="flex items-center gap-1 mt-0.5 truncate text-[10px]">
                      {player.positions.slice(0, 2).map((pos) => (
                        <span
                          key={pos.position}
                          className={`font-semibold ${
                            pos.familiarity === 'Natural'
                              ? 'text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {pos.position}
                        </span>
                      ))}
                      {assignedRole && (
                        <span className="text-slate-500 ml-1">
                          • {assignedRole.code} ({assignedSlot?.duty.slice(0, 2)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bagian Kanan: Suitability & Action */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {suitability && (
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                        suitability.score >= 75
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : suitability.score >= 60
                          ? 'bg-amber-950 text-amber-300 border border-amber-700'
                          : 'bg-rose-950 text-rose-300 border border-rose-700'
                      }`}
                    >
                      {suitability.score}%
                    </span>
                  )}

                  {/* Tombol Lihat Atribut */}
                  <button
                    onClick={() => onOpenPlayerAttributes(player)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    title="Lihat seluruh atribut pemain FM24"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {/* Quick Slot Assign Selector */}
                  <select
                    value={assignedSlot?.slotId || 'bench'}
                    onChange={(e) => {
                      if (e.target.value !== 'bench') {
                        onAssignPlayerToSlot(e.target.value, player.id);
                      }
                    }}
                    className="bg-slate-950 border border-slate-700 text-[10px] text-slate-300 rounded px-1 py-1 focus:outline-none cursor-pointer"
                    title="Tugaskan pemain ke posisi di lapangan"
                  >
                    <option value="bench">Cadangan</option>
                    {slots.map((s) => (
                      <option key={s.slotId} value={s.slotId}>
                        {s.position} ({getRoleById(s.roleId)?.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span>💡 Tarik pemain ke lapangan untuk memasang langsung ke formasi</span>
      </div>
    </div>
  );
}
