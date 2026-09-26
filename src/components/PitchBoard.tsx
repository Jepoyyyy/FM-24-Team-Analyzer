'use client';

import React, { useState, useRef } from 'react';
import { TacticSlot, Player, Duty, Position } from '../types';
import { getRoleById } from '../engine/roles';
import { calculateRoleSuitability } from '../engine/suitability';
import { User, AlertTriangle } from 'lucide-react';

export interface SkeletonPosition {
  id: string;
  label: string;
  position: Position;
  x: number;
  y: number;
}

// 24 Posisi Baku FM24 di Lapangan
export const FM_SKELETON_POSITIONS: SkeletonPosition[] = [
  // Lini Depan (Strikers - y: 14)
  { id: 'STCL', label: 'STCL', position: 'STC', x: 38, y: 14 },
  { id: 'STC', label: 'STC', position: 'STC', x: 50, y: 14 },
  { id: 'STCR', label: 'STCR', position: 'STC', x: 62, y: 14 },

  // Lini Gelandang Serang (Attacking Midfielders - y: 29)
  { id: 'AML', label: 'AML', position: 'AML', x: 16, y: 29 },
  { id: 'AMCL', label: 'AMCL', position: 'AMC', x: 38, y: 29 },
  { id: 'AMC', label: 'AMC', position: 'AMC', x: 50, y: 29 },
  { id: 'AMCR', label: 'AMCR', position: 'AMC', x: 62, y: 29 },
  { id: 'AMR', label: 'AMR', position: 'AMR', x: 84, y: 29 },

  // Lini Gelandang Tengah (Midfielders - y: 44)
  { id: 'ML', label: 'ML', position: 'ML', x: 14, y: 44 },
  { id: 'MCL', label: 'MCL', position: 'MC', x: 38, y: 44 },
  { id: 'MC', label: 'MC', position: 'MC', x: 50, y: 44 },
  { id: 'MCR', label: 'MCR', position: 'MC', x: 62, y: 44 },
  { id: 'MR', label: 'MR', position: 'MR', x: 86, y: 44 },

  // Lini Gelandang Bertahan & Wing-Back (DM & WB - y: 59)
  { id: 'WBL', label: 'WBL', position: 'WBL', x: 14, y: 59 },
  { id: 'DML', label: 'DML', position: 'DM', x: 38, y: 59 },
  { id: 'DM', label: 'DM', position: 'DM', x: 50, y: 59 },
  { id: 'DMR', label: 'DMR', position: 'DM', x: 62, y: 59 },
  { id: 'WBR', label: 'WBR', position: 'WBR', x: 86, y: 59 },

  // Lini Pertahanan (Defenders - y: 74)
  { id: 'DL', label: 'DL', position: 'DL', x: 16, y: 74 },
  { id: 'DCL', label: 'DCL', position: 'DC', x: 38, y: 74 },
  { id: 'DC', label: 'DC', position: 'DC', x: 50, y: 74 },
  { id: 'DCR', label: 'DCR', position: 'DC', x: 62, y: 74 },
  { id: 'DR', label: 'DR', position: 'DR', x: 84, y: 74 },

  // Kiper (Goalkeeper - y: 88)
  { id: 'GK', label: 'GK', position: 'GK', x: 50, y: 88 },
];

interface PitchBoardProps {
  slots: TacticSlot[];
  playersMap: Map<string, Player>;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  onSwapSlots: (sourceSlotId: string, targetSlotId: string) => void;
  onMoveSlot: (slotId: string, newX: number, newY: number, newPosition?: Position) => void;
  onAssignPlayerToSlot?: (slotId: string, playerId: string) => void;
  affectedPositions?: string[];
}

export function PitchBoard({
  slots,
  playersMap,
  selectedSlotId,
  onSelectSlot,
  onSwapSlots,
  onMoveSlot,
  onAssignPlayerToSlot,
  affectedPositions = [],
}: PitchBoardProps) {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [draggedSlotId, setDraggedSlotId] = useState<string | null>(null);
  const [hoveredSlotId, setHoveredSlotId] = useState<string | null>(null);
  const [hoveredSkeletonId, setHoveredSkeletonId] = useState<string | null>(null);
  const [isDraggingOverPitch, setIsDraggingOverPitch] = useState<boolean>(false);

  // Skeleton grid default OFF: hanya muncul saat state ngedrag slot atau pemain
  const isDragging = !!draggedSlotId || isDraggingOverPitch;

  const getDutyColor = (duty: Duty) => {
    switch (duty) {
      case 'Defend':
      case 'Stopper':
      case 'Cover':
        return 'bg-blue-600 text-blue-100 border-blue-400';
      case 'Support':
      case 'Automatic':
        return 'bg-amber-500 text-amber-950 border-amber-300 font-semibold';
      case 'Attack':
        return 'bg-rose-600 text-rose-100 border-rose-400';
      default:
        return 'bg-slate-600 text-slate-100';
    }
  };

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, slotId: string) => {
    e.dataTransfer.setData('text/slot-id', slotId);
    e.dataTransfer.setData('text/plain', slotId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedSlotId(slotId);
  };

  const handleDragOverPitch = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDraggingOverPitch) setIsDraggingOverPitch(true);
  };

  // Handle Drop di Skeleton Posisi
  const handleDropOnSkeleton = (e: React.DragEvent, skeleton: SkeletonPosition) => {
    e.preventDefault();
    e.stopPropagation();

    const sourceSlotId = e.dataTransfer.getData('text/slot-id') || draggedSlotId;
    const squadPlayerId = e.dataTransfer.getData('text/squad-player-id');

    // 1. Jika memindahkan slot yang sudah ada ke skeleton posisi baru
    if (sourceSlotId) {
      onMoveSlot(sourceSlotId, skeleton.x, skeleton.y, skeleton.position);
    }
    // 2. Jika drag pemain dari squad list ke skeleton yang sudah ada slotnya
    else if (squadPlayerId && onAssignPlayerToSlot) {
      const nearbySlot = slots.find(
        s => Math.abs(s.x - skeleton.x) <= 5 && Math.abs(s.y - skeleton.y) <= 5
      );
      if (nearbySlot) {
        onAssignPlayerToSlot(nearbySlot.slotId, squadPlayerId);
      }
    }

    setDraggedSlotId(null);
    setHoveredSlotId(null);
    setHoveredSkeletonId(null);
    setIsDraggingOverPitch(false);
  };

  // Handle Drop di Atas Slot Pemain
  const handleDropOnSlot = (e: React.DragEvent, targetSlotId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const sourceSlotId = e.dataTransfer.getData('text/slot-id') || draggedSlotId;
    const squadPlayerId = e.dataTransfer.getData('text/squad-player-id');

    if (sourceSlotId && sourceSlotId !== targetSlotId) {
      onSwapSlots(sourceSlotId, targetSlotId);
    } else if (squadPlayerId && onAssignPlayerToSlot) {
      onAssignPlayerToSlot(targetSlotId, squadPlayerId);
    }

    setDraggedSlotId(null);
    setHoveredSlotId(null);
    setHoveredSkeletonId(null);
    setIsDraggingOverPitch(false);
  };

  const handleDragEnd = () => {
    setDraggedSlotId(null);
    setHoveredSlotId(null);
    setHoveredSkeletonId(null);
    setIsDraggingOverPitch(false);
  };

  // Cek apakah koordinat skeleton ditempati oleh salah satu slot
  const isSkeletonOccupied = (sk: SkeletonPosition) => {
    return slots.some(s => Math.abs(s.x - sk.x) <= 4 && Math.abs(s.y - sk.y) <= 4);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* 2D Pitch Container */}
      <div
        ref={pitchRef}
        onDragOver={handleDragOverPitch}
        onDragLeave={() => setIsDraggingOverPitch(false)}
        className="relative w-full aspect-[3/4] max-w-[620px] mx-auto rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 select-none"
      >
        {/* Rumput Garis-Garis FM */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[repeating-linear-gradient(0deg,#000_0px,#000_30px,transparent_30px,transparent_60px)]" />

        {/* Garis-Garis Lapangan Sepak Bola */}
        <div className="absolute inset-4 border-2 border-white/25 rounded-lg pointer-events-none">
          {/* Garis Tengah & Lingkaran Tengah */}
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/25" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border-2 border-white/25 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/40 rounded-full" />

          {/* Kotak Penalti Atas (Gawang Lawan) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-28 border-b-2 border-x-2 border-white/25 rounded-b" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-12 border-b-2 border-x-2 border-white/25" />
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-20 h-10 border-b-2 border-white/25 rounded-b-full" />

          {/* Kotak Penalti Bawah (Gawang Kita) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-56 h-28 border-t-2 border-x-2 border-white/25 rounded-t" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-12 border-t-2 border-x-2 border-white/25" />
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-20 h-10 border-t-2 border-white/25 rounded-t-full" />
        </div>

        {/* Watermark FM Vibe */}
        <div className="absolute bottom-6 right-6 text-white/10 text-4xl font-black italic tracking-widest pointer-events-none">
          FM24 TACTICS
        </div>

        {/* ======================================================== */}
        {/* RENDER SKELETON DROPZONES (Hanya Muncul Saat Dragging)    */}
        {/* ======================================================== */}
        {isDragging &&
          FM_SKELETON_POSITIONS.map((skeleton) => {
            const occupied = isSkeletonOccupied(skeleton);
            const isHovered = hoveredSkeletonId === skeleton.id;

            // Jangan render skeleton jika posisinya sudah ditempati kartu pemain
            if (occupied) return null;

            return (
              <div
                key={skeleton.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setHoveredSkeletonId(skeleton.id);
                }}
                onDragLeave={() => {
                  if (hoveredSkeletonId === skeleton.id) setHoveredSkeletonId(null);
                }}
                onDrop={(e) => handleDropOnSkeleton(e, skeleton)}
                style={{
                  left: `${skeleton.x}%`,
                  top: `${skeleton.y}%`,
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex flex-col items-center justify-center transition-all duration-150 z-0 cursor-pointer ${
                  isHovered
                    ? 'w-14 h-14 bg-cyan-500/30 border-2 border-dashed border-cyan-300 scale-125 shadow-lg shadow-cyan-500/50 animate-pulse'
                    : 'w-11 h-11 bg-slate-950/40 border border-dashed border-cyan-400/50 hover:border-cyan-300 hover:bg-cyan-950/50 hover:scale-105'
                }`}
                title={`Drop di sini untuk mengubah posisi menjadi ${skeleton.label}`}
              >
                <span
                  className={`text-[9px] font-black tracking-wider ${
                    isHovered ? 'text-cyan-200' : 'text-cyan-300/80'
                  }`}
                >
                  {skeleton.label}
                </span>

                {/* Tooltip Keterangan Drop Target */}
                {isHovered && (
                  <div className="absolute -top-7 whitespace-nowrap bg-cyan-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full shadow-lg border border-cyan-300 pointer-events-none">
                    Pindah ke {skeleton.label}
                  </div>
                )}
              </div>
            );
          })}

        {/* ======================================================== */}
        {/* RENDER 11 PLAYER SLOTS                                   */}
        {/* ======================================================== */}
        {slots.map((slot) => {
          const role = getRoleById(slot.roleId);
          const player = slot.assignedPlayerId ? playersMap.get(slot.assignedPlayerId) : undefined;
          const isSelected = selectedSlotId === slot.slotId;
          const isBeingDragged = draggedSlotId === slot.slotId;
          const isHoveredTarget = hoveredSlotId === slot.slotId && draggedSlotId !== slot.slotId;
          const hasWarning = affectedPositions.includes(slot.position);

          let suitabilityScore = 0;
          if (player && role) {
            const res = calculateRoleSuitability(player, role, slot.position);
            suitabilityScore = res.score;
          }

          return (
            <div
              key={slot.slotId}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, slot.slotId)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => {
                e.preventDefault();
                setHoveredSlotId(slot.slotId);
              }}
              onDragLeave={() => {
                if (hoveredSlotId === slot.slotId) setHoveredSlotId(null);
              }}
              onDrop={(e) => handleDropOnSlot(e, slot.slotId)}
              style={{
                left: `${slot.x}%`,
                top: `${slot.y}%`,
              }}
              onClick={() => onSelectSlot(slot.slotId)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing transition-all duration-150 group z-10 ${
                isBeingDragged ? 'opacity-30 scale-90' : 'opacity-100'
              }`}
            >
              {/* Lingkaran Kaos / Kartu Slot */}
              <div className="flex flex-col items-center">
                {/* Badge Icon Slot */}
                <div
                  className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg border-2 transition-all ${
                    isHoveredTarget
                      ? 'ring-4 ring-purple-400 border-white bg-purple-950 scale-125 shadow-purple-500/80 animate-bounce'
                      : isSelected
                      ? 'ring-4 ring-cyan-400 border-white bg-slate-900 scale-110 shadow-cyan-500/50'
                      : hasWarning
                      ? 'border-rose-500 bg-slate-900 ring-2 ring-rose-400 animate-pulse'
                      : 'border-white/80 bg-slate-900/90 group-hover:scale-105 group-hover:border-cyan-300'
                  }`}
                >
                  {player ? (
                    <span className="font-extrabold text-xs sm:text-sm text-white tracking-tight">
                      {slot.position}
                    </span>
                  ) : (
                    <User className="w-5 h-5 text-slate-400" />
                  )}

                  {/* Duty Badge Bulat Kecil di Pojok Kanan Atas */}
                  <div
                    className={`absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border shadow uppercase ${getDutyColor(
                      slot.duty
                    )}`}
                  >
                    {slot.duty.slice(0, 2)}
                  </div>

                  {/* Warning Alert Icon jika ada clash */}
                  {hasWarning && (
                    <div className="absolute -bottom-1 -left-1 bg-rose-600 text-white rounded-full p-0.5 shadow">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {/* Hover Tag saat drag over untuk swap */}
                  {isHoveredTarget && (
                    <div className="absolute -top-6 whitespace-nowrap bg-purple-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full shadow-lg border border-purple-300 pointer-events-none">
                      Tukar / Pasang
                    </div>
                  )}
                </div>

                {/* Box Nama Pemain & Role */}
                <div className="mt-1 flex flex-col items-center pointer-events-none">
                  {/* Nama Pemain */}
                  <div className="bg-slate-950/90 text-white px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-700/60 shadow max-w-[95px] sm:max-w-[110px] truncate text-center">
                    {player ? player.name.split(' ').pop() : 'Empty'}
                  </div>

                  {/* Role Code & Suitability % */}
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] font-bold text-cyan-300 bg-slate-900/80 px-1 rounded border border-cyan-800">
                      {role?.code || slot.roleId.toUpperCase()}
                    </span>
                    {player && (
                      <span
                        className={`text-[9px] font-extrabold px-1 rounded ${
                          suitabilityScore >= 75
                            ? 'text-emerald-400 bg-emerald-950/80'
                            : suitabilityScore >= 60
                            ? 'text-amber-400 bg-amber-950/80'
                            : 'text-rose-400 bg-rose-950/80'
                        }`}
                      >
                        {suitabilityScore}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
