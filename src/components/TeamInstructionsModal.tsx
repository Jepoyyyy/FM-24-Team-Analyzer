'use client';

import React, { useState } from 'react';
import { TeamInstructions, Mentality } from '../types';
import { MENTALITY_KNOWLEDGE } from '../data/guidetofootballKnowledge';
import {
  X,
  Sliders,
  ArrowRightLeft,
  ShieldAlert,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';

interface TeamInstructionsModalProps {
  instructions: TeamInstructions;
  onChange: (instructions: TeamInstructions) => void;
  onClose: () => void;
}

// -------------------------------------------------------------
// Interactive Slider Component (Draggable & Clickable)
// -------------------------------------------------------------
interface DraggableSliderProps {
  title: string;
  icon?: string;
  options: { key: string; label: string }[];
  currentKey: string;
  onChange: (key: string) => void;
}

function DraggableSlider({
  title,
  icon,
  options,
  currentKey,
  onChange,
}: DraggableSliderProps) {
  const currentIndex = Math.max(
    0,
    options.findIndex((o) => o.key === currentKey)
  );
  const currentOption = options[currentIndex] || options[0];
  const percent =
    options.length > 1 ? (currentIndex / (options.length - 1)) * 100 : 50;

  return (
    <div className="space-y-1.5 my-3">
      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
        <span className="uppercase tracking-wider text-[11px] text-emerald-300/90 font-semibold flex items-center gap-1.5">
          {icon && <span>{icon}</span>}
          {title}
        </span>
        <span className="text-white text-xs font-black bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
          {currentOption.label}
        </span>
      </div>

      <div className="relative pt-3 pb-2 select-none group">
        {/* Custom Track & Fill */}
        <div className="relative h-2 bg-slate-800/90 rounded-full border border-slate-700/60 overflow-hidden">
          <div
            className="absolute top-0 left-0 bottom-0 bg-emerald-400 transition-all duration-150"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Step ticks */}
        <div className="absolute top-3 left-0 right-0 h-2 flex justify-between pointer-events-none px-1">
          {options.map((_, idx) => (
            <div
              key={idx}
              className={`w-1 h-2 rounded-full ${
                idx <= currentIndex ? 'bg-emerald-950' : 'bg-slate-600'
              }`}
            />
          ))}
        </div>

        {/* Marker Indicator Arrow */}
        <div
          className="absolute -top-0.5 -translate-x-1/2 pointer-events-none transition-all duration-150 flex flex-col items-center"
          style={{ left: `${percent}%` }}
        >
          <span className="text-[10px] text-emerald-400 leading-none">▼</span>
          <div className="w-3.5 h-3.5 rounded-full bg-white shadow-md shadow-emerald-900 border-2 border-emerald-500" />
        </div>

        {/* Real HTML Range Input for true Draggable & Touch Slider */}
        <input
          type="range"
          min={0}
          max={options.length - 1}
          step={1}
          value={currentIndex}
          onChange={(e) => {
            const idx = parseInt(e.target.value, 10);
            if (options[idx]) onChange(options[idx].key);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
          title={`Geser untuk mengubah ${title}`}
        />
      </div>

      {/* Clickable Quick Step Labels */}
      <div className="flex justify-between text-[10px] text-slate-400 font-medium px-0.5">
        {options.map((opt, idx) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`hover:text-emerald-300 transition cursor-pointer truncate max-w-[70px] text-center ${
              idx === currentIndex
                ? 'text-emerald-400 font-bold underline underline-offset-2'
                : 'text-slate-500'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Interactive Box Button (Ruben Amorim FM24 Style)
// -------------------------------------------------------------
interface FMBoxButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  subtitle?: string;
  className?: string;
  variant?: 'green' | 'red' | 'dark' | 'head';
  title?: string;
}

function FMBoxButton({
  label,
  active,
  onClick,
  subtitle,
  className = '',
  variant = 'green',
  title,
}: FMBoxButtonProps) {
  // FM24 Palette: Active is vibrant FM Green (#3ddc73) with dark text
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer select-none border shadow-sm ${
        active
          ? 'bg-[#3ddc73] hover:bg-[#32c966] text-[#0a2814] border-[#3ddc73] shadow-md shadow-emerald-950 font-black ring-1 ring-emerald-300 scale-[1.01]'
          : 'bg-[#0e3a24]/80 hover:bg-[#14502f] text-emerald-100/90 border-[#1c6b45]/70 hover:border-emerald-500/80 hover:text-white'
      } ${className}`}
    >
      <div className="leading-tight">{label}</div>
      {subtitle && (
        <div
          className={`text-[10px] mt-0.5 leading-tight font-medium ${
            active ? 'text-[#0a2814]/80' : 'text-emerald-300/60'
          }`}
        >
          {subtitle}
        </div>
      )}
    </button>
  );
}

export function TeamInstructionsModal({
  instructions,
  onChange,
  onClose,
}: TeamInstructionsModalProps) {
  const [activeTab, setActiveTab] = useState<'possession' | 'transition' | 'defence'>('possession');

  const update = <K extends keyof TeamInstructions>(key: K, value: TeamInstructions[K]) => {
    onChange({
      ...instructions,
      [key]: value,
    });
  };

  const toggle = (key: keyof TeamInstructions) => {
    onChange({
      ...instructions,
      [key]: !instructions[key],
    });
  };

  // Helper widths for pitch visualization
  const widthPositions = {
    narrow: { wingLeft: 85, wingRight: 215, backLeft: 70, backRight: 230 },
    fairly_narrow: { wingLeft: 65, wingRight: 235, backLeft: 55, backRight: 245 },
    standard: { wingLeft: 45, wingRight: 255, backLeft: 40, backRight: 260 },
    fairly_wide: { wingLeft: 30, wingRight: 270, backLeft: 25, backRight: 275 },
    wide: { wingLeft: 18, wingRight: 282, backLeft: 15, backRight: 285 },
  }[instructions.attackingWidth] || { wingLeft: 45, wingRight: 255, backLeft: 40, backRight: 260 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#14502f] border border-[#2d8f5c] rounded-2xl w-full max-w-6xl max-h-[94vh] overflow-hidden flex flex-col shadow-2xl text-white font-sans">
        {/* Header Modal */}
        <div className="p-3.5 sm:p-4 border-b border-[#1c6b45] flex items-center justify-between bg-[#0d3b22]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#3ddc73] rounded-xl text-[#0a2814] shadow-md shadow-emerald-950 font-black">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2 tracking-tight">
                Instruksi Tim (Team Instructions)
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0a2814] text-[#3ddc73] border border-[#3ddc73]/60">
                  Ruben Amorim FM24 Engine
                </span>
              </h3>
              <p className="text-xs text-emerald-200/80">
                Klik tombol atau geser (drag) slider untuk mengatur instruksi taktik. Tombol <strong className="text-[#3ddc73]">Hijau Terang</strong> menandakan status aktif.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#0e3a24] hover:bg-[#14502f] text-emerald-200 hover:text-white transition cursor-pointer border border-[#1c6b45]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* TEAM MENTALITY BAR (KHAS FM24 & GUIDETOFOOTBALL)         */}
        {/* ======================================================== */}
        {(() => {
          const currentMentality = instructions.mentality || 'positive';
          const detail = MENTALITY_KNOWLEDGE[currentMentality] || MENTALITY_KNOWLEDGE.positive;
          const MENTALITY_KEYS: Mentality[] = [
            'very_defensive',
            'defensive',
            'cautious',
            'balanced',
            'positive',
            'attacking',
            'very_attacking',
          ];

          return (
            <div className="bg-[#0b311c] border-b border-[#1c6b45] px-4 py-2.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Team Mentality (Filosofi &amp; Toleransi Risiko):</span>
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${detail.badgeBg}`}>
                    {detail.name} ({detail.riskLevel})
                  </span>
                </div>
                <span className="text-[10px] text-emerald-300/70 hidden sm:inline">
                  GuideToFootball: Mengatur toleransi risiko &amp; urgensi seluruh lini
                </span>
              </div>

              {/* 7 Mentality Buttons */}
              <div className="grid grid-cols-7 gap-1">
                {MENTALITY_KEYS.map((m) => {
                  const mDetail = MENTALITY_KNOWLEDGE[m];
                  const isSelected = currentMentality === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => update('mentality', m)}
                      className={`py-1.5 px-1 rounded-lg text-center font-bold text-[11px] transition cursor-pointer border ${
                        isSelected
                          ? 'bg-[#3ddc73] text-[#0a2814] border-[#3ddc73] shadow-md shadow-emerald-950 font-black scale-[1.02]'
                          : 'bg-[#14502f] hover:bg-[#1a5f39] text-emerald-200 border-[#2d8f5c]/70 hover:text-white'
                      }`}
                      title={`${mDetail.name} (${mDetail.riskLevel}): ${mDetail.philosophy}`}
                    >
                      <span className="block truncate">{mDetail.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Mentality Description Callout */}
              <div className="p-2 rounded-lg bg-[#0e3a24]/90 border border-[#1c6b45] text-[11px] text-emerald-100 flex items-start justify-between gap-3">
                <div>
                  <span className="font-bold text-[#3ddc73] mr-1.5">{detail.name}:</span>
                  <span>{detail.philosophy}</span>
                  <div className="mt-0.5 text-[10px] text-emerald-300/80">
                    <strong>Rekomendasi GuideToFootball:</strong> {detail.recommendedWhen}
                  </div>
                </div>
                <div className="text-right shrink-0 hidden md:block">
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {detail.tacticalEffects.defensiveLineLoE}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Tab Navigation Khas FM24: In Possession, Transition, Out of Possession */}
        <div className="flex border-b border-[#1c6b45] bg-[#0d3b22]/90 px-4 text-xs font-bold gap-2">
          <button
            onClick={() => setActiveTab('possession')}
            className={`py-3 px-5 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'possession'
                ? 'border-[#3ddc73] text-[#3ddc73] bg-[#14502f]'
                : 'border-transparent text-emerald-200/70 hover:text-white hover:bg-[#14502f]/50'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>In Possession (Menguasai Bola)</span>
          </button>

          <button
            onClick={() => setActiveTab('transition')}
            className={`py-3 px-5 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'transition'
                ? 'border-[#3ddc73] text-[#3ddc73] bg-[#14502f]'
                : 'border-transparent text-emerald-200/70 hover:text-white hover:bg-[#14502f]/50'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>In Transition (Transisi)</span>
          </button>

          <button
            onClick={() => setActiveTab('defence')}
            className={`py-3 px-5 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'defence'
                ? 'border-[#3ddc73] text-[#3ddc73] bg-[#14502f]'
                : 'border-transparent text-emerald-200/70 hover:text-white hover:bg-[#14502f]/50'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Out of Possession (Bertahan)</span>
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-radial from-[#1c6b45] to-[#14502f]">
          {/* ======================================================== */}
          {/* TAB 1: IN POSSESSION                                     */}
          {/* ======================================================== */}
          {activeTab === 'possession' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
              {/* KOLOM 1: ATTACKING WIDTH */}
              <div className="bg-[#0e3a24]/90 border border-[#1c6b45] rounded-2xl p-4 space-y-3 shadow-lg">
                <DraggableSlider
                  title="Attacking Width"
                  icon="↔"
                  options={[
                    { key: 'narrow', label: 'Narrow' },
                    { key: 'fairly_narrow', label: 'Fairly Narrow' },
                    { key: 'standard', label: 'Standard' },
                    { key: 'fairly_wide', label: 'Fairly Wide' },
                    { key: 'wide', label: 'Wide' },
                  ]}
                  currentKey={instructions.attackingWidth}
                  onChange={(val) => update('attackingWidth', val as any)}
                />

                {/* Miniature Pitch Graphic with dynamic player spreading */}
                <div className="relative h-56 bg-[#14502f] border border-[#2d8f5c] rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                  <svg viewBox="0 0 300 220" className="w-full h-full" preserveAspectRatio="none">
                    {/* Pitch boundary and lines */}
                    <rect x="2" y="2" width="296" height="216" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                    <rect x="90" y="2" width="120" height="36" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                    <circle cx="150" cy="110" r="26" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                    <line x1="2" y1="110" x2="298" y2="110" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />

                    {/* Striker */}
                    <circle cx="150" cy="50" r="5" fill="#3ddc73" stroke="#fff" strokeWidth="1.5" />

                    {/* Wingers (Spread dynamically with width) */}
                    <circle cx={widthPositions.wingLeft} cy="70" r="5" fill="#3ddc73" stroke="#fff" strokeWidth="1.5" className="transition-all duration-300" />
                    <circle cx={widthPositions.wingRight} cy="70" r="5" fill="#3ddc73" stroke="#fff" strokeWidth="1.5" className="transition-all duration-300" />

                    {/* Midfielders */}
                    <circle cx="120" cy="115" r="4.5" fill="#0d3b22" stroke="#fff" strokeWidth="1.5" />
                    <circle cx="180" cy="115" r="4.5" fill="#0d3b22" stroke="#fff" strokeWidth="1.5" />

                    {/* Fullbacks (Spread dynamically with width) */}
                    <circle cx={widthPositions.backLeft} cy="140" r="4.5" fill="#0d3b22" stroke="#fff" strokeWidth="1.5" className="transition-all duration-300" />
                    <circle cx={widthPositions.backRight} cy="140" r="4.5" fill="#0d3b22" stroke="#fff" strokeWidth="1.5" className="transition-all duration-300" />

                    {/* Central Defenders */}
                    <circle cx="100" cy="165" r="4.5" fill="#0d3b22" stroke="#fff" strokeWidth="1.5" />
                    <circle cx="150" cy="165" r="4.5" fill="#0d3b22" stroke="#fff" strokeWidth="1.5" />
                    <circle cx="200" cy="165" r="4.5" fill="#0d3b22" stroke="#fff" strokeWidth="1.5" />

                    {/* Goalkeeper */}
                    <circle cx="150" cy="200" r="5" fill="#000" stroke="#fff" strokeWidth="1.5" />
                  </svg>

                  <div className="absolute bottom-2 text-[10px] text-emerald-200/80 font-bold bg-[#0d3b22]/80 px-2 py-0.5 rounded border border-emerald-700/60">
                    Lebar: {instructions.attackingWidth.toUpperCase().replace('_', ' ')}
                  </div>
                </div>

                <div className="text-[11px] text-emerald-100/70 leading-relaxed bg-[#0d3b22]/60 p-2.5 rounded-lg border border-[#1c6b45]">
                  Menentukan seberapa melebar pemain sayap dan bek sayap saat tim sedang menguasai bola untuk meregangkan blok lawan.
                </div>
              </div>

              {/* KOLOM 2: APPROACH PLAY (OPERAN, TEMPO, TIME WASTING) */}
              <div className="bg-[#0e3a24]/90 border border-[#1c6b45] rounded-2xl p-4 space-y-3.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs uppercase tracking-wider text-emerald-300">
                    Approach Play
                  </span>
                </div>

                {/* Pass Into Space Toggle */}
                <FMBoxButton
                  label="Pass Into Space (Umpan ke Ruang Kosong)"
                  subtitle="Umpan terobosan di belakang garis pertahanan lawan"
                  active={instructions.passIntoSpace}
                  onClick={() => toggle('passIntoSpace')}
                />

                {/* Overlap & Underlap Pitch Box */}
                <div className="p-3 bg-[#14502f] border border-[#2d8f5c] rounded-xl space-y-2">
                  <div className="text-[10px] text-emerald-200 font-bold text-center">
                    Gerakan Sayap (Overlap & Underlap)
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <FMBoxButton
                      label="Overlap Left"
                      subtitle="Bek naik sisi luar kiri"
                      active={instructions.overlapLeft}
                      onClick={() => toggle('overlapLeft')}
                    />
                    <FMBoxButton
                      label="Overlap Right"
                      subtitle="Bek naik sisi luar kanan"
                      active={instructions.overlapRight}
                      onClick={() => toggle('overlapRight')}
                    />
                    <FMBoxButton
                      label="Underlap Left"
                      subtitle="Bek menusuk ke dalam kiri"
                      active={instructions.underlapLeft}
                      onClick={() => toggle('underlapLeft')}
                    />
                    <FMBoxButton
                      label="Underlap Right"
                      subtitle="Bek menusuk ke dalam kanan"
                      active={instructions.underlapRight}
                      onClick={() => toggle('underlapRight')}
                    />
                  </div>
                </div>

                {/* Focus Play */}
                <div>
                  <div className="text-[11px] font-bold text-emerald-300 mb-1">Fokus Alur Serangan:</div>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { key: 'left', label: 'Down Left' },
                      { key: 'middle', label: 'Middle' },
                      { key: 'right', label: 'Down Right' },
                    ].map((f) => (
                      <FMBoxButton
                        key={f.key}
                        label={f.label}
                        active={instructions.focusPlay === f.key}
                        onClick={() => update('focusPlay', (instructions.focusPlay === f.key ? 'balanced' : f.key) as any)}
                        className="py-1.5 text-[11px]"
                      />
                    ))}
                  </div>
                </div>

                {/* Play Out Of Defence */}
                <FMBoxButton
                  label="Play Out Of Defence (Build-up dari Bawah)"
                  subtitle="Mewajibkan bek mengalirkan bola pendek ke gelandang"
                  active={instructions.playOutOfDefence}
                  onClick={() => toggle('playOutOfDefence')}
                />

                {/* Passing Directness Slider */}
                <DraggableSlider
                  title="Passing Directness"
                  icon="⚽"
                  options={[
                    { key: 'shorter', label: 'Shorter' },
                    { key: 'slightly_shorter', label: 'Slightly Shorter' },
                    { key: 'standard', label: 'Standard' },
                    { key: 'slightly_more_direct', label: 'More Direct' },
                    { key: 'direct', label: 'Direct' },
                  ]}
                  currentKey={instructions.passingDirectness}
                  onChange={(val) => update('passingDirectness', val as any)}
                />

                {/* Tempo Slider */}
                <DraggableSlider
                  title="Tempo"
                  icon="⏱"
                  options={[
                    { key: 'much_lower', label: 'Much Lower' },
                    { key: 'lower', label: 'Lower' },
                    { key: 'standard', label: 'Standard' },
                    { key: 'higher', label: 'Higher' },
                    { key: 'much_higher', label: 'Much Higher' },
                  ]}
                  currentKey={instructions.tempo}
                  onChange={(val) => update('tempo', val as any)}
                />
              </div>

              {/* KOLOM 3: FINAL THIRD & CREATIVE FREEDOM */}
              <div className="bg-[#0e3a24]/90 border border-[#1c6b45] rounded-2xl p-4 space-y-3.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs uppercase tracking-wider text-emerald-300">
                    Final Third (Sepertiga Akhir)
                  </span>
                </div>

                {/* Crossing Type Dropdown */}
                <div className="p-2.5 bg-[#0d3b22] border border-[#1c6b45] rounded-xl flex items-center justify-between text-xs">
                  <span className="text-emerald-300 font-bold">Tipe Crossing:</span>
                  <select
                    value={instructions.crossType}
                    onChange={(e) => update('crossType', e.target.value as any)}
                    className="bg-[#14502f] text-white font-bold rounded px-2 py-1 border border-emerald-600 focus:outline-none cursor-pointer"
                  >
                    <option value="whipped">Whipped Crosses (Tukik Cepat)</option>
                    <option value="low">Low Crosses (Umpan Datar)</option>
                    <option value="floated">Floated Crosses (Bola Lambung)</option>
                    <option value="mixed">Mixed Crosses (Variasi)</option>
                  </select>
                </div>

                {/* Box Area Mini Pitch Actions */}
                <div className="p-3 bg-[#14502f] border border-[#2d8f5c] rounded-xl space-y-2">
                  <FMBoxButton
                    label="Work Ball Into Box"
                    subtitle="Sabar mencari ruang tembak bersih di kotak penalti"
                    active={instructions.workBallIntoBox}
                    onClick={() => toggle('workBallIntoBox')}
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <FMBoxButton
                      label="Hit Early Crosses"
                      subtitle="Lepas umpan silang dini"
                      active={instructions.earlyCrosses}
                      onClick={() => toggle('earlyCrosses')}
                    />
                    <FMBoxButton
                      label="Play for Set Pieces"
                      subtitle="Cari peluang bola mati & corner"
                      active={instructions.playForSetPieces}
                      onClick={() => toggle('playForSetPieces')}
                      title="Pemain diinstruksikan memancing pelanggaran dan membelokkan bola ke sepak pojok untuk memaksimalkan gol dari skema bola mati (GuideToFootball)."
                    />
                  </div>
                </div>

                {/* Dribbling */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-emerald-300">Dribbling:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <FMBoxButton
                      label="Dribble Less"
                      subtitle="Utamakan passing"
                      active={instructions.dribbleMode === 'dribble_less'}
                      onClick={() => update('dribbleMode', instructions.dribbleMode === 'dribble_less' ? 'standard' : 'dribble_less')}
                    />
                    <FMBoxButton
                      label="Run At Defence"
                      subtitle="Bawa bola lewati lawan"
                      active={instructions.dribbleMode === 'run_at_defence'}
                      onClick={() => update('dribbleMode', instructions.dribbleMode === 'run_at_defence' ? 'standard' : 'run_at_defence')}
                    />
                  </div>
                </div>

                {/* Creative Freedom */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-emerald-300">Creative Freedom:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <FMBoxButton
                      label="Be More Expressive"
                      subtitle="Kebebasan berimprovisasi"
                      active={instructions.creativeFreedom === 'more_expressive'}
                      onClick={() => update('creativeFreedom', instructions.creativeFreedom === 'more_expressive' ? 'standard' : 'more_expressive')}
                    />
                    <FMBoxButton
                      label="Be More Disciplined"
                      subtitle="Disiplin ketat sesuai peran"
                      active={instructions.creativeFreedom === 'more_disciplined'}
                      onClick={() => update('creativeFreedom', instructions.creativeFreedom === 'more_disciplined' ? 'standard' : 'more_disciplined')}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: IN TRANSITION                                     */}
          {/* ======================================================== */}
          {activeTab === 'transition' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
              {/* KOLOM 1: WHEN POSSESSION HAS BEEN LOST */}
              <div className="bg-[#0e3a24]/90 border border-[#1c6b45] rounded-2xl p-4 space-y-3.5 shadow-lg">
                <span className="font-extrabold text-xs uppercase tracking-wider text-emerald-300 block">
                  Saat Kehilangan Bola (Lost Possession)
                </span>
                <FMBoxButton
                  label="Counter-Press (Gegenpress)"
                  subtitle="Segera tekan lawan detik-detik awal bola lepas"
                  active={instructions.whenLostPossession === 'counter_press'}
                  onClick={() => update('whenLostPossession', 'counter_press')}
                />
                <FMBoxButton
                  label="Regroup (Mundur Bertahan)"
                  subtitle="Cepat kembali ke bentuk formasi pertahanan"
                  active={instructions.whenLostPossession === 'regroup'}
                  onClick={() => update('whenLostPossession', 'regroup')}
                />

                {/* Transition Pitch Diagram */}
                <div className="relative h-56 bg-[#14502f] border border-[#2d8f5c] rounded-xl p-3 flex flex-col items-center justify-center shadow-inner">
                  <div className="text-xs font-black text-white text-center">
                    {instructions.whenLostPossession === 'counter_press' ? '⚡ REAKSI GEGENPRESS AKTIF' : '🛡️ REAKSI MUNDUR MEMBENTUK BLOK'}
                  </div>
                  <p className="text-[11px] text-emerald-200/80 text-center mt-2 px-3">
                    {instructions.whenLostPossession === 'counter_press'
                      ? 'Pemain terdekat langsung mengeroyok pembawa bola lawan untuk merebut transisi positif.'
                      : 'Pemain memprioritaskan menutup jalur operan dan mundur merapatkan garis pertahanan.'}
                  </p>
                </div>
              </div>

              {/* KOLOM 2: WHEN POSSESSION HAS BEEN WON */}
              <div className="bg-[#0e3a24]/90 border border-[#1c6b45] rounded-2xl p-4 space-y-3.5 shadow-lg">
                <span className="font-extrabold text-xs uppercase tracking-wider text-emerald-300 block">
                  Saat Merebut Bola (Won Possession)
                </span>
                <FMBoxButton
                  label="Counter (Serangan Balik Kilat)"
                  subtitle="Langsung oper vertikal ke depan eksploitasi ruang"
                  active={instructions.whenWonPossession === 'counter'}
                  onClick={() => update('whenWonPossession', 'counter')}
                />
                <FMBoxButton
                  label="Hold Shape (Tahan Ritme / Sirkulasi)"
                  subtitle="Amankan penguasaan bola dan bangun serangan sabar"
                  active={instructions.whenWonPossession === 'hold_shape'}
                  onClick={() => update('whenWonPossession', 'hold_shape')}
                />

                <div className="relative h-56 bg-[#14502f] border border-[#2d8f5c] rounded-xl p-3 flex flex-col items-center justify-center shadow-inner">
                  <div className="text-xs font-black text-white text-center">
                    {instructions.whenWonPossession === 'counter' ? '🚀 TRANSISI CEPAT KE DEPAN' : '⏳ KONTROL PENUH TEMPO'}
                  </div>
                  <p className="text-[11px] text-emerald-200/80 text-center mt-2 px-3">
                    {instructions.whenWonPossession === 'counter'
                      ? 'Penyerang dan winger langsung berlari ke ruang kosong begitu bola berhasil direbut.'
                      : 'Tim mendaur ulang bola ke gelandang untuk mengontrol sirkulasi.'}
                  </p>
                </div>
              </div>

              {/* KOLOM 3: GOALKEEPER IN POSSESSION */}
              <div className="bg-[#0e3a24]/90 border border-[#1c6b45] rounded-2xl p-4 space-y-3.5 shadow-lg">
                <span className="font-extrabold text-xs uppercase tracking-wider text-emerald-300 block">
                  Distribusi Kiper (Goalkeeper)
                </span>

                <div className="grid grid-cols-2 gap-1.5">
                  <FMBoxButton
                    label="Distribute Quickly"
                    subtitle="Kiper oper kilat"
                    active={instructions.gkDistributionPace === 'distribute_quickly'}
                    onClick={() => update('gkDistributionPace', 'distribute_quickly')}
                  />
                  <FMBoxButton
                    label="Slow Pace Down"
                    subtitle="Kiper tunda operan"
                    active={instructions.gkDistributionPace === 'distribute_slowly'}
                    onClick={() => update('gkDistributionPace', 'distribute_slowly')}
                  />
                </div>

                <div className="p-3 bg-[#14502f] border border-[#2d8f5c] rounded-xl space-y-2">
                  <div className="text-[11px] font-bold text-emerald-300">Tipe Distribusi Bola:</div>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { key: 'roll_out', label: 'Roll Out (Gelinding)' },
                      { key: 'short_kicks', label: 'Short Kicks (Tendangan Pendek)' },
                      { key: 'long_kicks', label: 'Long Kicks (Tendangan Jauh)' },
                      { key: 'throw_long', label: 'Throw Long (Lemparan Jauh)' },
                    ].map((d) => (
                      <FMBoxButton
                        key={d.key}
                        label={d.label}
                        active={instructions.gkDistributionType === d.key}
                        onClick={() => update('gkDistributionType', d.key as any)}
                        className="py-1.5 text-[11px]"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: OUT OF POSSESSION                                 */}
          {/* ======================================================== */}
          {activeTab === 'defence' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* KOLOM 1: DEFENSIVE SHAPE (VERTICAL PITCH) */}
              <div className="lg:col-span-5 bg-[#0e3a24]/90 border border-[#1c6b45] rounded-2xl p-4 space-y-3 shadow-lg">
                <span className="font-extrabold text-xs uppercase tracking-wider text-emerald-300 block text-center">
                  Bentuk Pertahanan (Defensive Shape)
                </span>

                <DraggableSlider
                  title="Line of Engagement (Garis Tekan)"
                  icon="⚽"
                  options={[
                    { key: 'low_block', label: 'Low Block' },
                    { key: 'mid_block', label: 'Mid Block' },
                    { key: 'high_press', label: 'High Press' },
                  ]}
                  currentKey={instructions.lineOfEngagement}
                  onChange={(val) => update('lineOfEngagement', val as any)}
                />

                <DraggableSlider
                  title="Defensive Line (Garis Pertahanan)"
                  icon="🛡️"
                  options={[
                    { key: 'much_lower', label: 'Deep' },
                    { key: 'lower', label: 'Lower' },
                    { key: 'standard', label: 'Standard' },
                    { key: 'higher', label: 'Higher' },
                    { key: 'much_higher', label: 'Much Higher' },
                  ]}
                  currentKey={instructions.defensiveLine}
                  onChange={(val) => update('defensiveLine', val as any)}
                />

                {/* Vertical Pitch Diagram (Khas Ruben Amorim Screen 3) */}
                <div className="relative h-64 bg-[#14502f] border border-[#2d8f5c] rounded-xl overflow-hidden shadow-inner flex flex-col justify-between p-2.5">
                  <div className="bg-[#0d3b22]/90 border border-emerald-700/80 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-200 flex items-center justify-between">
                    <span>Line of Engagement:</span>
                    <span className="text-[#3ddc73] font-black uppercase">
                      {instructions.lineOfEngagement === 'high_press'
                        ? 'High Press (Sepertiga Lawan)'
                        : instructions.lineOfEngagement === 'mid_block'
                        ? 'Mid Block (Garis Tengah)'
                        : 'Low Block (Dekat Kotak Penalti)'}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center border-y border-dashed border-white/30 my-2 px-2 text-center">
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#3ddc73]">
                      {instructions.lineOfEngagement === 'high_press'
                        ? 'ZONA PENETRASI & COUNTER-PRESS TINGGI'
                        : instructions.lineOfEngagement === 'mid_block'
                        ? 'ZONA KOMPAK MID-BLOCK & PERANGKAP TENGAH'
                        : 'ZONA PROTEKSI TOTAL KOTAK PENALTI'}
                    </span>
                    <span className="text-[10px] text-emerald-200/80 mt-1">
                      {instructions.lineOfEngagement === 'high_press'
                        ? 'Menekan sejak di kotak penalti lawan, menuntut Sweeper Keeper aktif.'
                        : instructions.lineOfEngagement === 'mid_block'
                        ? 'Menunggu lawan di garis tengah sebelum menyergap, menghemat stamina.'
                        : 'Membiarkan lawan menguasai bola di area steril, siap counter-attack.'}
                    </span>
                  </div>

                  <div className="bg-[#0d3b22]/90 border border-emerald-700/80 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-200 flex items-center justify-between">
                    <span>Garis Pertahanan:</span>
                    <span className="text-[#3ddc73] font-black uppercase">
                      {instructions.defensiveLine.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* KOLOM 2: TRIGGER PRESS, TACKLING & TRAPS */}
              <div className="lg:col-span-7 bg-[#0e3a24]/90 border border-[#1c6b45] rounded-2xl p-4 space-y-4 shadow-lg">
                <DraggableSlider
                  title="Trigger Press (Intensitas Pressing)"
                  icon="🏃"
                  options={[
                    { key: 'less_often', label: 'Less Often' },
                    { key: 'standard', label: 'Standard' },
                    { key: 'more_often', label: 'More Often' },
                    { key: 'much_more_often', label: 'Much More Often' },
                  ]}
                  currentKey={instructions.pressingIntensity}
                  onChange={(val) => update('pressingIntensity', val as any)}
                />

                <FMBoxButton
                  label="Prevent Short GK Distribution"
                  subtitle="Tutup operan pendek kiper lawan, paksa buang bola panjang"
                  active={instructions.preventShortGkDistribution}
                  onClick={() => toggle('preventShortGkDistribution')}
                />

                {/* Tackling */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-emerald-300">Tackling:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <FMBoxButton
                      label="Stay On Feet"
                      subtitle="Jangan sliding sembarangan"
                      active={instructions.tackling === 'stay_on_feet'}
                      onClick={() => update('tackling', instructions.tackling === 'stay_on_feet' ? 'standard' : 'stay_on_feet')}
                    />
                    <FMBoxButton
                      label="Get Stuck In"
                      subtitle="Tekel keras & agresif"
                      active={instructions.tackling === 'get_stuck_in'}
                      onClick={() => update('tackling', instructions.tackling === 'get_stuck_in' ? 'standard' : 'get_stuck_in')}
                    />
                  </div>
                </div>

                {/* Pressing Trap */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-emerald-300">Pressing Trap (Jebakan Tekanan):</span>
                  <div className="grid grid-cols-2 gap-2">
                    <FMBoxButton
                      label="Trap Inside"
                      subtitle="Arahkan lawan masuk ke tengah"
                      active={instructions.defensiveTraps === 'trap_inside'}
                      onClick={() => update('defensiveTraps', instructions.defensiveTraps === 'trap_inside' ? 'neutral' : 'trap_inside')}
                    />
                    <FMBoxButton
                      label="Trap Outside"
                      subtitle="Arahkan lawan melebar ke sayap"
                      active={instructions.defensiveTraps === 'trap_outside'}
                      onClick={() => update('defensiveTraps', instructions.defensiveTraps === 'trap_outside' ? 'neutral' : 'trap_outside')}
                    />
                  </div>
                </div>

                {/* Cross Prevention */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-emerald-300">Antisipasi Crossing Lawan:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <FMBoxButton
                      label="Stop Crosses"
                      subtitle="Tutup sayap agar lawan tak bisa crossing"
                      active={instructions.crossPrevention === 'stop_crosses'}
                      onClick={() => update('crossPrevention', instructions.crossPrevention === 'stop_crosses' ? 'neutral' : 'stop_crosses')}
                    />
                    <FMBoxButton
                      label="Invite Crosses"
                      subtitle="Biarkan crossing, dominasi udara di kotak"
                      active={instructions.crossPrevention === 'invite_crosses'}
                      onClick={() => update('crossPrevention', instructions.crossPrevention === 'invite_crosses' ? 'neutral' : 'invite_crosses')}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#1c6b45] bg-[#0d3b22] flex items-center justify-between">
          <div className="text-xs text-emerald-200">
            Perubahan instruksi tim tersimpan secara instan dan langsung mempengaruhi analisis taktik & pemain.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#3ddc73] hover:bg-[#32c966] text-[#0a2814] font-black text-xs transition cursor-pointer shadow-md shadow-emerald-950"
          >
            Selesai & Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
