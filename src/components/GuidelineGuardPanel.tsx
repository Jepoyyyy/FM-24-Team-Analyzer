'use client';

import React, { useState, useMemo } from 'react';
import { TacticalIssue, TacticSlot, TeamInstructions, Player, DEFAULT_TEAM_INSTRUCTIONS } from '../types';
import { detectFormationShape } from '../engine/formations';
import { calculateTacticalHealth } from '../engine/validator';
import { evaluateFormationReasoningAndImpact } from '../engine/reasoning';
import { MENTALITY_KNOWLEDGE, DEFENSIVE_BLOCK_KNOWLEDGE } from '../data/guidetofootballKnowledge';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  ChevronRight,
  Zap,
  Layers,
  Scale,
  Anchor,
  ArrowLeftRight,
  Sparkles,
  Award,
  Check,
  Activity,
  Sliders,
  User,
} from 'lucide-react';

interface GuidelineGuardPanelProps {
  issues: TacticalIssue[];
  slots?: TacticSlot[];
  teamInstructions?: TeamInstructions;
  playersMap?: Map<string, Player>;
  onSelectSlotPosition?: (pos: string) => void;
  onSelectSlot?: (slotId: string) => void;
}

export function GuidelineGuardPanel({
  issues,
  slots = [],
  teamInstructions = DEFAULT_TEAM_INSTRUCTIONS,
  playersMap = new Map(),
  onSelectSlotPosition,
  onSelectSlot,
}: GuidelineGuardPanelProps) {
  // Sub-tab switcher: 'audit' (Issue Audit) vs 'reasoning' (Penalaran & Dampak Pemain)
  const [viewMode, setViewMode] = useState<'audit' | 'reasoning'>('audit');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Deteksi live formasi & profil duty
  const detected = useMemo(() => detectFormationShape(slots), [slots]);

  // LIVE LAYERED TACTICAL HEALTH CALCULATION (Layer 1: Posisi Inti, Layer 2: Ruang, Layer 3: Duty, Layer 4: TI)
  const healthResult = useMemo(() => calculateTacticalHealth(slots, issues), [slots, issues]);
  const healthScore = healthResult.score;

  // Mentality & Defensive Block Knowledge (GuideToFootball)
  const mentalityInfo = useMemo(() => {
    return MENTALITY_KNOWLEDGE[teamInstructions.mentality] || MENTALITY_KNOWLEDGE.positive;
  }, [teamInstructions.mentality]);

  const blockInfo = useMemo(() => {
    return DEFENSIVE_BLOCK_KNOWLEDGE[teamInstructions.lineOfEngagement] || DEFENSIVE_BLOCK_KNOWLEDGE.high_press;
  }, [teamInstructions.lineOfEngagement]);

  // LIVE FORMATION REASONING & INDIVIDUAL PLAYER IMPACT EVALUATION
  const reasoningResult = useMemo(() => {
    return evaluateFormationReasoningAndImpact(slots, teamInstructions, playersMap, issues);
  }, [slots, teamInstructions, playersMap, issues]);

  const dangerCount = issues.filter((i) => i.severity === 'danger').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  const filteredIssues =
    selectedCategory === 'all'
      ? issues
      : issues.filter((i) => i.category === selectedCategory);

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'structure_integrity':
        return 'Posisi Inti';
      case 'space_clash':
        return 'Tabrakan Ruang';
      case 'duty_balance':
        return 'Keseimbangan Duty';
      case 'player_capacity':
        return 'Kapasitas Pemain';
      case 'instruction_conflict':
        return 'Konflik Instruksi';
      case 'pi_ti_clash':
        return 'Konflik PI vs TI';
      default:
        return cat;
    }
  };

  const getRestDefenceColor = (rating: string) => {
    switch (rating) {
      case 'solid':
        return 'text-emerald-400 bg-emerald-950/80 border-emerald-800';
      case 'stable':
        return 'text-cyan-400 bg-cyan-950/80 border-cyan-800';
      case 'vulnerable':
        return 'text-amber-400 bg-amber-950/80 border-amber-800';
      default:
        return 'text-rose-400 bg-rose-950/80 border-rose-800';
    }
  };

  const getDutyStatusBadge = (status: string) => {
    switch (status) {
      case 'balanced':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
            Ideal (Seimbang)
          </span>
        );
      case 'over_attacking':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
            Over-Attacking (&gt;4)
          </span>
        );
      case 'too_defensive':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
            Terlalu Defensif
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
            Minim Penghubung
          </span>
        );
    }
  };

  const getGradeBadgeStyle = (grade: string) => {
    switch (grade) {
      case 'S':
        return 'bg-gradient-to-tr from-purple-600 via-pink-600 to-emerald-400 text-white shadow-purple-900/60 border-purple-400';
      case 'A':
        return 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-950 border-emerald-400';
      case 'B':
        return 'bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-cyan-950 border-cyan-400';
      case 'C':
        return 'bg-amber-600 text-slate-950 font-black shadow-amber-950 border-amber-400';
      case 'D':
        return 'bg-orange-600 text-white shadow-orange-950 border-orange-400';
      default:
        return 'bg-rose-600 text-white shadow-rose-950 border-rose-400 animate-pulse';
    }
  };

  const getSynergyBadgeStyle = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'good':
        return 'bg-cyan-950 text-cyan-300 border-cyan-800';
      case 'strained':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      default:
        return 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse';
    }
  };

  const getSynergyLabel = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'Harmoni Optimal';
      case 'good':
        return 'Bekerja Baik';
      case 'strained':
        return 'Beban Taktis';
      default:
        return 'Konflik Peran';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col h-full overflow-hidden">
      {/* ======================================================== */}
      {/* HEADER PANEL: Guideline Guard & Tactical Health Score    */}
      {/* ======================================================== */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl text-white shadow-lg transition-all ${
              !healthResult.isLayer1Valid
                ? 'bg-rose-600 shadow-rose-950/50 animate-pulse'
                : healthScore >= 80
                ? 'bg-gradient-to-tr from-cyan-600 to-emerald-500 shadow-cyan-900/30'
                : 'bg-amber-600 shadow-amber-950/40'
            }`}
          >
            {!healthResult.isLayer1Valid ? (
              <AlertOctagon className="w-5 h-5" />
            ) : healthScore >= 80 ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Formation Analyzer
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  !healthResult.isLayer1Valid
                    ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                    : 'bg-cyan-950 text-cyan-300 border-cyan-800'
                }`}
              >
                {!healthResult.isLayer1Valid ? 'Kritis' : 'Live Engine'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">Audit & penalaran taktik real-time</p>
          </div>
        </div>

        {/* Tactical Health Score & Letter Grade */}
        <div className="text-right flex items-center gap-3">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Tactical Health</div>
            <div className="flex items-baseline justify-end gap-1">
              <span
                className={`text-2xl font-black ${
                  !healthResult.isLayer1Valid
                    ? 'text-rose-400 animate-pulse'
                    : healthScore >= 80
                    ? 'text-emerald-400'
                    : healthScore >= 60
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {healthScore}%
              </span>
            </div>
          </div>
          {/* Grade Badge */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg border shadow-lg ${getGradeBadgeStyle(
              reasoningResult.grade
            )}`}
            title={`Nilai Kelayakan Taktik: Grade ${reasoningResult.grade}`}
          >
            {reasoningResult.grade}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB SWITCHER: Audit Taktis vs Penalaran & Dampak     */}
      {/* ======================================================== */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl my-3 shrink-0">
        <button
          type="button"
          onClick={() => setViewMode('audit')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            viewMode === 'audit'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Audit Masalah</span>
          {issues.length > 0 ? (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                dangerCount > 0
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-amber-500 text-slate-950'
              }`}
            >
              {issues.length}
            </span>
          ) : (
            <span className="text-[10px] bg-emerald-800 text-emerald-200 px-1.5 py-0.2 rounded-full font-bold">
              ✓
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setViewMode('reasoning')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            viewMode === 'reasoning'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Penalaran &amp; Dampak</span>
          <span className="text-[10px] bg-slate-800 text-cyan-300 px-1.5 py-0.2 rounded-full font-bold">
            11 Pemain
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: AUDIT MASALAH TAKTIS                             */}
      {/* ======================================================== */}
      {viewMode === 'audit' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* FATAL STRUCTURAL ALERT BANNER (JIKA LAYER 1 POSISI INTI TIDAK TERPENUHI) */}
          {!healthResult.isLayer1Valid && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600/80 text-rose-200 flex items-start gap-2.5 shadow-lg animate-pulse shrink-0">
              <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-black text-rose-300 uppercase tracking-wider text-[11px]">
                  Pelanggaran Struktur Inti (Layer 1)
                </div>
                <div className="font-bold text-white mt-0.5 text-xs">
                  {healthResult.fatalError || 'Posisi inti wajib taktik belum terpenuhi!'}
                </div>
                <p className="text-rose-300/90 text-[11px] mt-1 leading-relaxed">
                  Taktik tidak dapat berfungsi dalam pertandingan resmi. Taktik sepak bola mutlak
                  memerlukan 1 penjaga gawang, minimal 3 bek, serta penghubung lini tengah dan
                  penyerang.
                </p>
              </div>
            </div>
          )}

          {/* LIVE FORMATION ARCHITECTURE & TACTICAL PILLARS (DYNAMIC) */}
          {slots.length > 0 && (
            <div className="p-3 bg-slate-950/90 border border-slate-800/90 rounded-xl space-y-2.5 shadow-inner">
              {/* Baris 1: Live Detected Formation Shape & Rest Defence */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{detected.name}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {detected.code}
                      </span>
                      {detected.isAsymmetric && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                          Asimetris
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">{detected.structure}</div>
                  </div>
                </div>

                {/* Mentality, Block & Rest Defence Badges */}
                <div className="text-right space-y-1">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-[10px] text-slate-400 font-semibold">Mentality:</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${mentalityInfo.badgeBg}`}>
                      {mentalityInfo.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-[10px] text-slate-400 font-medium">{blockInfo.name} •</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getRestDefenceColor(
                        detected.restDefenceRating
                      )}`}
                    >
                      {detected.restDefenceCount} Bek Rest Defence
                    </span>
                  </div>
                </div>
              </div>

              {/* Baris 2: 4 Pilar Posisi Inti (Layer 1: GK, DEF, MID, ATT) */}
              <div className="pt-2 border-t border-slate-800/60">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <span>Pilar Posisi Inti (Layer 1):</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                        healthResult.isLayer1Valid
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                      }`}
                    >
                      {healthResult.isLayer1Valid ? 'Lengkap (40/40)' : 'Tidak Lengkap'}
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-500">FM24 Core Rule</span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                  {/* Kiper */}
                  <div
                    className={`p-1.5 rounded border transition ${
                      healthResult.pillars.gk.status === 'ok'
                        ? 'bg-slate-900 border-slate-700/80 text-slate-300'
                        : 'bg-rose-950/80 border-rose-600 text-rose-200 ring-1 ring-rose-500 animate-pulse'
                    }`}
                  >
                    <div className="font-semibold text-slate-400 text-[10px]">🧤 Kiper</div>
                    <div
                      className={`text-xs font-black ${
                        healthResult.pillars.gk.status === 'ok' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {healthResult.pillars.gk.count} GK
                    </div>
                    <div className="text-[9px] text-slate-500">Wajib 1</div>
                  </div>

                  {/* Bek */}
                  <div
                    className={`p-1.5 rounded border transition ${
                      healthResult.pillars.def.status === 'ok'
                        ? 'bg-slate-900 border-slate-700/80 text-slate-300'
                        : 'bg-rose-950/80 border-rose-600 text-rose-200 ring-1 ring-rose-500 animate-pulse'
                    }`}
                  >
                    <div className="font-semibold text-slate-400 text-[10px]">🛡️ Bek</div>
                    <div
                      className={`text-xs font-black ${
                        healthResult.pillars.def.status === 'ok' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {healthResult.pillars.def.count} Bek
                    </div>
                    <div className="text-[9px] text-slate-500">Min 3 (Ada CB)</div>
                  </div>

                  {/* Tengah */}
                  <div
                    className={`p-1.5 rounded border transition ${
                      healthResult.pillars.mid.status === 'ok'
                        ? 'bg-slate-900 border-slate-700/80 text-slate-300'
                        : 'bg-rose-950/80 border-rose-600 text-rose-200 ring-1 ring-rose-500 animate-pulse'
                    }`}
                  >
                    <div className="font-semibold text-slate-400 text-[10px]">⚙️ Gelandang</div>
                    <div
                      className={`text-xs font-black ${
                        healthResult.pillars.mid.status === 'ok' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {healthResult.pillars.mid.count} Mid
                    </div>
                    <div className="text-[9px] text-slate-500">DM/M/AM (Min 2)</div>
                  </div>

                  {/* Striker */}
                  <div
                    className={`p-1.5 rounded border transition ${
                      healthResult.pillars.att.status === 'ok' ||
                      healthResult.pillars.att.status === 'strikerless_ok'
                        ? 'bg-slate-900 border-slate-700/80 text-slate-300'
                        : 'bg-rose-950/80 border-rose-600 text-rose-200 ring-1 ring-rose-500 animate-pulse'
                    }`}
                  >
                    <div className="font-semibold text-slate-400 text-[10px]">🎯 Striker</div>
                    <div
                      className={`text-xs font-black ${
                        healthResult.pillars.att.status === 'ok' ||
                        healthResult.pillars.att.status === 'strikerless_ok'
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {healthResult.pillars.att.count} STC
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {healthResult.pillars.att.status === 'strikerless_ok'
                        ? 'Strikerless'
                        : 'Ujung Tombak'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Baris 3: Duty Balance Distribution Meter */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1 font-semibold text-slate-300">
                    <Scale className="w-3.5 h-3.5 text-amber-400" />
                    <span>Distribusi Duty:</span>
                  </div>
                  {getDutyStatusBadge(detected.dutyDistribution.status)}
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
                  <div className="bg-blue-950/60 border border-blue-900/60 rounded px-2 py-1">
                    <span className="text-blue-300 font-semibold">Defend: </span>
                    <span className="font-black text-white">{detected.dutyDistribution.defend}</span>
                    <span className="text-[10px] text-blue-400/80 block">Target: 3-4</span>
                  </div>
                  <div className="bg-amber-950/60 border border-amber-900/60 rounded px-2 py-1">
                    <span className="text-amber-300 font-semibold">Support: </span>
                    <span className="font-black text-white">{detected.dutyDistribution.support}</span>
                    <span className="text-[10px] text-amber-400/80 block">Target: 3-4</span>
                  </div>
                  <div className="bg-emerald-950/60 border border-emerald-900/60 rounded px-2 py-1">
                    <span className="text-emerald-300 font-semibold">Attack: </span>
                    <span className="font-black text-white">{detected.dutyDistribution.attack}</span>
                    <span className="text-[10px] text-emerald-400/80 block">Target: 3-4</span>
                  </div>
                </div>
              </div>

              {/* Baris 4: Flank Dynamics */}
              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-800/60 text-slate-400">
                <div className="flex items-center gap-1">
                  <ArrowLeftRight className="w-3 h-3 text-cyan-400" />
                  <span>Flank Kiri:</span>
                  <span className="text-slate-200 font-medium">{detected.flankAnalysis.left}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>Flank Kanan:</span>
                  <span className="text-slate-200 font-medium">{detected.flankAnalysis.right}</span>
                </div>
              </div>
            </div>
          )}

          {/* Counter Badges & Category Filters */}
          <div className="flex items-center gap-1.5 py-1 overflow-x-auto text-xs no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-700 text-white shadow'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              Semua ({issues.length})
            </button>
            {issues.filter((i) => i.category === 'structure_integrity').length > 0 && (
              <button
                onClick={() => setSelectedCategory('structure_integrity')}
                className={`px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap animate-pulse cursor-pointer ${
                  selectedCategory === 'structure_integrity'
                    ? 'bg-rose-900 text-white border border-rose-600'
                    : 'bg-rose-950/80 text-rose-300 border border-rose-800 hover:text-white'
                }`}
              >
                Posisi Inti ({issues.filter((i) => i.category === 'structure_integrity').length})
              </button>
            )}
            <button
              onClick={() => setSelectedCategory('space_clash')}
              className={`px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
                selectedCategory === 'space_clash'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              Tabrakan Ruang ({issues.filter((i) => i.category === 'space_clash').length})
            </button>
            <button
              onClick={() => setSelectedCategory('duty_balance')}
              className={`px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
                selectedCategory === 'duty_balance'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              Duty Balance ({issues.filter((i) => i.category === 'duty_balance').length})
            </button>
            <button
              onClick={() => setSelectedCategory('player_capacity')}
              className={`px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
                selectedCategory === 'player_capacity'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              Kapasitas ({issues.filter((i) => i.category === 'player_capacity').length})
            </button>
            <button
              onClick={() => setSelectedCategory('instruction_conflict')}
              className={`px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
                selectedCategory === 'instruction_conflict'
                  ? 'bg-purple-950 text-purple-300 border border-purple-800'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              Instruksi ({issues.filter((i) => i.category === 'instruction_conflict').length})
            </button>
          </div>

          {/* Issue Cards List */}
          <div className="space-y-2.5">
            {filteredIssues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500">
                <CheckCircle2 className="w-12 h-12 text-emerald-400/80 mb-2 stroke-1" />
                <p className="text-sm font-semibold text-slate-300">Taktik Sangat Harmonis!</p>
                <p className="text-xs text-slate-500 max-w-[260px] mt-1">
                  Tidak ditemukan tabrakan peran, kerapuhan duty, atau benturan instruksi pada
                  kategori ini.
                </p>
              </div>
            ) : (
              filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    issue.severity === 'danger'
                      ? 'bg-rose-950/30 border-rose-900/60 hover:border-rose-700/80'
                      : issue.severity === 'warning'
                      ? 'bg-amber-950/30 border-amber-900/60 hover:border-amber-700/80'
                      : 'bg-slate-800/50 border-slate-700/60'
                  }`}
                >
                  {/* Header Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {issue.severity === 'danger' ? (
                        <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : issue.severity === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-white tracking-tight">
                        {issue.title}
                      </span>
                    </div>

                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                      {getCategoryLabel(issue.category)}
                    </span>
                  </div>

                  {/* Deskripsi Masalah */}
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {issue.description}
                  </p>

                  {/* Solusi Rekomendasi */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-start gap-1.5 text-xs text-emerald-300 bg-emerald-950/40 p-2 rounded-lg border border-emerald-900/40">
                    <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-emerald-400 mr-1">Rekomendasi Solusi:</span>
                      {issue.suggestedFix}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: PENALARAN FORMASI & DAMPAK PADA PEMAIN           */}
      {/* ======================================================== */}
      {viewMode === 'reasoning' && (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* SECTION A: FORMATION EVALUATION & VERDICT */}
          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3 shadow-inner">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Evaluasi &amp; Penilaian Formasi
                  </span>
                </div>
                <h3 className="text-sm font-black text-white mt-1">
                  {reasoningResult.formationName} ({reasoningResult.formationCode})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  {reasoningResult.verdict}
                </p>
              </div>

              <div className="text-center shrink-0">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl border shadow-xl ${getGradeBadgeStyle(
                    reasoningResult.grade
                  )}`}
                >
                  {reasoningResult.grade}
                </div>
                <div className="text-[10px] text-slate-400 font-bold mt-1">
                  Skor {reasoningResult.overallScore}%
                </div>
              </div>
            </div>

            {/* Strengths & Weaknesses Grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/80">
              {/* Strengths */}
              <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/50 space-y-1.5">
                <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <Check className="w-3.5 h-3.5" />
                  <span>Kelebihan Taktis ({reasoningResult.strengths.length})</span>
                </div>
                <ul className="space-y-1 text-[11px] text-slate-300">
                  {reasoningResult.strengths.map((str, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 leading-tight">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses / Vulnerabilities */}
              <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-900/50 space-y-1.5">
                <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Kelemahan &amp; Kerentanan ({reasoningResult.weaknesses.length})</span>
                </div>
                <ul className="space-y-1 text-[11px] text-slate-300">
                  {reasoningResult.weaknesses.map((weak, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 leading-tight">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{weak}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* SECTION B: 5 DYNAMIC REASONING PILLARS */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 px-0.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Penalaran Filosofi Taktik (Live Reasoning)
              </h4>
            </div>

            <div className="space-y-2">
              {reasoningResult.reasoning.map((reason, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-1 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-2 font-bold text-white text-xs">
                    {reason.category === 'flank' && <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />}
                    {reason.category === 'midfield' && <Layers className="w-3.5 h-3.5 text-blue-400" />}
                    {reason.category === 'attack' && <Zap className="w-3.5 h-3.5 text-emerald-400" />}
                    {reason.category === 'defence' && <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />}
                    {reason.category === 'transition' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                    <span>{reason.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed pl-5">
                    {reason.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION C: INDIVIDUAL PLAYER IMPACT CARDS (11 SLOTS) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Dampak Taktis 11 Pemain di Lapangan
                </h4>
              </div>
              <span className="text-[10px] text-slate-500">Klik kartu untuk edit slot</span>
            </div>

            <div className="space-y-2">
              {reasoningResult.playerImpacts.map((impact) => (
                <div
                  key={impact.slotId}
                  onClick={() => {
                    if (onSelectSlot) onSelectSlot(impact.slotId);
                    else if (onSelectSlotPosition) onSelectSlotPosition(impact.position);
                  }}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-600/70 transition cursor-pointer group shadow-sm"
                >
                  {/* Card Header: Position badge, Name, Role & Duty, Synergy Badge */}
                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-slate-800 group-hover:bg-cyan-950 text-cyan-300 font-mono font-black text-xs flex items-center justify-center border border-slate-700 group-hover:border-cyan-700 transition shrink-0">
                        {impact.position}
                      </span>
                      <div>
                        <div className="text-xs font-black text-white group-hover:text-cyan-200 transition">
                          {impact.playerName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {impact.roleName} •{' '}
                          <span
                            className={`font-semibold ${
                              impact.duty === 'Attack'
                                ? 'text-emerald-400'
                                : impact.duty === 'Support'
                                ? 'text-amber-400'
                                : 'text-blue-400'
                            }`}
                          >
                            {impact.duty}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getSynergyBadgeStyle(
                          impact.synergyStatus
                        )}`}
                      >
                        {getSynergyLabel(impact.synergyStatus)}
                      </span>
                    </div>
                  </div>

                  {/* Tactical Role Tag */}
                  <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                    <span className="font-semibold text-slate-400">Peran Taktis:</span>
                    <span className="font-bold text-cyan-300 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/60">
                      {impact.tacticalRole}
                    </span>
                  </div>

                  {/* Impact Summary */}
                  <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                    {impact.impactSummary}
                  </p>

                  {/* TI Impact */}
                  {impact.instructionsImpact && (
                    <div className="mt-1.5 p-1.5 rounded bg-slate-900/90 border border-slate-800 text-[10px] text-slate-400 flex items-start gap-1.5">
                      <Sliders className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-300 font-semibold mr-1">Pengaruh Instruksi Tim:</span>
                        {impact.instructionsImpact}
                      </div>
                    </div>
                  )}

                  {/* Key Attribute Demands */}
                  <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-medium text-slate-500">Tuntutan Atribut Utama:</span>
                    <div className="flex items-center gap-1">
                      {impact.demands.map((demand, dIdx) => (
                        <span
                          key={dIdx}
                          className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 border border-slate-700/80 font-mono text-[9px]"
                        >
                          {demand}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
