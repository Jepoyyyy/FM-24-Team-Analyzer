'use client';

import React, { useState, useMemo } from 'react';
import { TacticalIssue, TacticSlot, TeamInstructions, Player, DEFAULT_TEAM_INSTRUCTIONS } from '../types';
import {
  TacticAnalysisV2,
  analyzeTacticV2,
  TacticalMetricsV2,
} from '../engine/v2';
import { evaluateFormationReasoningAndImpact } from '../engine/reasoning';
import { MENTALITY_KNOWLEDGE, DEFENSIVE_BLOCK_KNOWLEDGE } from '../data/guidetofootballKnowledge';
import {
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  CheckCircle2,
  Layers,
  Sparkles,
  Compass,
} from 'lucide-react';

interface GuidelineGuardPanelProps {
  issues: TacticalIssue[];
  slots?: TacticSlot[];
  teamInstructions?: TeamInstructions;
  playersMap?: Map<string, Player>;
  analysisV2?: TacticAnalysisV2;
  onSelectSlotPosition?: (pos: string) => void;
  onSelectSlot?: (slotId: string) => void;
}

export function GuidelineGuardPanel({
  issues,
  slots = [],
  teamInstructions = DEFAULT_TEAM_INSTRUCTIONS,
  playersMap = new Map(),
  analysisV2: propAnalysisV2,
  onSelectSlotPosition,
}: GuidelineGuardPanelProps) {
  // Sub-tab switcher: 'cohesion' (4-Fase & Metrik) vs 'audit' (Diagnosa & Temuan) vs 'reasoning' (Penalaran Pemain)
  const [viewMode, setViewMode] = useState<'cohesion' | 'audit' | 'reasoning'>('cohesion');
  const [findingFilter, setFindingFilter] = useState<string>('all');

  // Convert Map to Record for v2 engine
  const playersRecord = useMemo(() => {
    const rec: Record<string, Player> = {};
    playersMap.forEach((p, k) => {
      rec[k] = p;
    });
    return rec;
  }, [playersMap]);

  // LIVE V2 TACTICAL ANALYSIS
  const analysis: TacticAnalysisV2 = useMemo(() => {
    if (propAnalysisV2) return propAnalysisV2;
    return analyzeTacticV2(slots, teamInstructions, playersRecord);
  }, [propAnalysisV2, slots, teamInstructions, playersRecord]);

  // LIVE FORMATION REASONING & INDIVIDUAL PLAYER IMPACT EVALUATION
  const reasoningResult = useMemo(() => {
    return evaluateFormationReasoningAndImpact(slots, teamInstructions, playersMap, issues);
  }, [slots, teamInstructions, playersMap, issues]);

  // Mentality & Defensive Block Knowledge (GuideToFootball)
  const mentalityInfo = useMemo(() => {
    return MENTALITY_KNOWLEDGE[teamInstructions.mentality] || MENTALITY_KNOWLEDGE.positive;
  }, [teamInstructions.mentality]);

  const blockInfo = useMemo(() => {
    return DEFENSIVE_BLOCK_KNOWLEDGE[teamInstructions.lineOfEngagement] || DEFENSIVE_BLOCK_KNOWLEDGE.high_press;
  }, [teamInstructions.lineOfEngagement]);

  const getCohesionGradeStyle = (grade: string) => {
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

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'fatal_constraint':
        return { label: 'Batal Regulasi', bg: 'bg-rose-950 text-rose-300 border-rose-800' };
      case 'structural_weakness':
        return { label: 'Kelemahan Struktur', bg: 'bg-orange-950 text-orange-300 border-orange-800' };
      case 'conditional_risk':
        return { label: 'Risiko Bersyarat', bg: 'bg-amber-950 text-amber-300 border-amber-800' };
      case 'trade_off':
        return { label: 'Trade-Off Taktis', bg: 'bg-blue-950 text-blue-300 border-blue-800' };
      case 'synergy':
        return { label: 'Sinergi FM24', bg: 'bg-emerald-950 text-emerald-300 border-emerald-800' };
      case 'optimization':
        return { label: 'Saran Optimasi', bg: 'bg-purple-950 text-purple-300 border-purple-800' };
      default:
        return { label: 'Temuan', bg: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  const filteredFindings = useMemo(() => {
    if (findingFilter === 'all') return analysis.findings;
    return analysis.findings.filter(f => f.severity === findingFilter);
  }, [analysis.findings, findingFilter]);

  const metricsList: Array<{ key: keyof TacticalMetricsV2; label: string; desc: string }> = [
    { key: 'widthLeft', label: 'Width Kiri', desc: 'Penyedia lebar lapangan sayap kiri' },
    { key: 'widthRight', label: 'Width Kanan', desc: 'Penyedia lebar lapangan sayap kanan' },
    { key: 'depthAndRunners', label: 'Kedalaman & Pelari', desc: 'Pelari menusuk di belakang garis lawan' },
    { key: 'boxOccupation', label: 'Okupasi Kotak Penalti', desc: 'Pemain yang tiba di kotak penalti' },
    { key: 'centralHalfSpaceOccupation', label: 'Tengah & Half-Space', desc: 'Keseimbangan koridor tengah dan half-space' },
    { key: 'buildUpOutletsAndTriangles', label: 'Opsi Build-Up Awal', desc: 'Segitiga umpan dari lini belakang/DM' },
    { key: 'progressionAndPressResistance', label: 'Progresi & Press-Resistance', desc: 'Kemampuan mengalirkan bola di bawah tekanan' },
    { key: 'pressingAccessAndSupport', label: 'Akses Pressing Lini Depan', desc: 'Intensitas & sudut penekanan lini depan' },
    { key: 'blockCompactness', label: 'Kerapatan Blok (Compactness)', desc: 'Jarak vertikal antara LOE dan defensive line' },
    { key: 'defensiveLineProtection', label: 'Perlindungan Garis Belakang', desc: 'Penyaring gelandang bertahan di depan bek' },
    { key: 'restDefenceCoverage', label: 'Kekokohan Rest-Defence', desc: 'Jumlah & posisi pemain siaga saat menyerang' },
    { key: 'counterattackThreat', label: 'Ancaman Serangan Balik', desc: 'Kecepatan transisi menyerang ke ruang kosong' },
    { key: 'counterpressRegroupReadiness', label: 'Kesiapan Transisi Bertahan', desc: 'Kesiapan counter-press atau regroup cepat' },
    { key: 'aerialAttackDefence', label: 'Duel Udara (Aerial Threat)', desc: 'Dominasi sundulan bola mati & umpan silang' },
    { key: 'setPieceThreat', label: 'Ancaman Bola Mati (Set-Pieces)', desc: 'Eksekusi & ancaman situasi bola mati' },
    { key: 'physicalDemandFatigueRisk', label: 'Beban Fisik & Risiko Lelah', desc: 'Tingkat pengurasan stamina pemain di menit 70+' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col h-full overflow-hidden">
      {/* ======================================================== */}
      {/* HEADER PANEL: Tactical Cohesion & Data Confidence       */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 shrink-0 gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl text-white shadow-lg transition-all ${
              analysis.hasCriticalDanger || analysis.fatalErrors.length > 0
                ? 'bg-rose-600 shadow-rose-950/50 animate-pulse'
                : analysis.tacticalCohesion >= 80
                ? 'bg-gradient-to-tr from-cyan-600 to-emerald-500 shadow-cyan-900/30'
                : 'bg-amber-600 shadow-amber-950/40'
            }`}
          >
            {analysis.hasCriticalDanger || analysis.fatalErrors.length > 0 ? (
              <AlertOctagon className="w-5 h-5" />
            ) : analysis.tacticalCohesion >= 80 ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Tactical Cohesion &amp; Shape
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  analysis.fatalErrors.length > 0
                    ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                    : 'bg-cyan-950 text-cyan-300 border-cyan-800'
                }`}
              >
                {analysis.fatalErrors.length > 0 ? 'Batal Regulasi' : 'Engine v2.0'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">Audit bentuk 4-fase, metrik, &amp; kepercayaan data</p>
          </div>
        </div>

        {/* Tactical Cohesion Score & Data Confidence Displayed Side-by-Side */}
        <div className="flex items-center gap-4 self-end sm:self-auto">
          {/* Tactical Cohesion */}
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-medium">Tactical Cohesion</div>
            <div className="flex items-baseline justify-end gap-1.5">
              <span
                className={`text-xl font-black ${
                  analysis.fatalErrors.length > 0
                    ? 'text-rose-400 animate-pulse'
                    : analysis.tacticalCohesion >= 80
                    ? 'text-emerald-400'
                    : analysis.tacticalCohesion >= 60
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {analysis.tacticalCohesion}%
              </span>
            </div>
          </div>

          {/* Grade Badge */}
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-base border shadow-lg ${getCohesionGradeStyle(
              analysis.cohesionGrade
            )}`}
            title={`Kelayakan Taktik: Grade ${analysis.cohesionGrade}`}
          >
            {analysis.cohesionGrade}
          </div>

          <div className="w-[1px] h-8 bg-slate-800" />

          {/* Data Confidence */}
          <div className="text-left">
            <div className="text-[10px] text-slate-400 font-medium">Data Confidence</div>
            <div className="text-base font-black text-purple-400">
              {analysis.dataConfidence}%
            </div>
            <div className="text-[9px] text-slate-500">
              {analysis.dataCompleteness.completenessScore}% Atribut Lengkap
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB SWITCHER: Cohesion vs Audit vs Reasoning         */}
      {/* ======================================================== */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl my-3 shrink-0 text-xs">
        <button
          type="button"
          onClick={() => setViewMode('cohesion')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            viewMode === 'cohesion'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Bentuk 4-Fase &amp; Metrik</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('audit')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            viewMode === 'audit'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Diagnosa &amp; Temuan</span>
          {analysis.findings.length > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                analysis.hasCriticalDanger
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-slate-800 text-cyan-300'
              }`}
            >
              {analysis.findings.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setViewMode('reasoning')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            viewMode === 'reasoning'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Penalaran Pemain</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: COHESION, 4-PHASE SHAPES & 16 METRICS            */}
      {/* ======================================================== */}
      {viewMode === 'cohesion' && (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* 4-PHASE SHAPE CARDS */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Transformasi Bentuk Lapangan 4-Fase (Shape Architecture)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-500 font-semibold">1. Formasi Dasar</div>
                <div className="text-base font-black text-cyan-400 mt-0.5">
                  {analysis.phaseShape.baseShape}
                </div>
                <div className="text-[9px] text-slate-400 mt-1">Starting Lineup</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-500 font-semibold">2. In-Possession Shape</div>
                <div className="text-base font-black text-emerald-400 mt-0.5">
                  {analysis.phaseShape.inPossessionShape}
                </div>
                <div className="text-[9px] text-slate-400 mt-1">Struktur Fase Menyerang</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-500 font-semibold">3. Settled Defence Block</div>
                <div className="text-base font-black text-blue-400 mt-0.5">
                  {analysis.phaseShape.settledDefenceShape}
                </div>
                <div className="text-[9px] text-slate-400 mt-1">Blok Bertahan Siaga</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-500 font-semibold">4. Rest-Defence</div>
                <div className="text-base font-black text-purple-400 mt-0.5">
                  {analysis.phaseShape.restDefenceShape}
                </div>
                <div className="text-[9px] text-slate-400 mt-1">
                  {analysis.phaseShape.restDefenceCount} Pemain Outfield Siaga
                </div>
              </div>
            </div>
          </div>

          {/* 16 TACTICAL METRICS VISUAL BARS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                16 Indikator Metrik Taktis (Skala 0 - 100)
              </label>
              <span className="text-[10px] text-slate-500">Evaluasi Posisi, PI, TI &amp; Skuad</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {metricsList.map(m => {
                const val = analysis.metrics[m.key];
                const isFatigue = m.key === 'physicalDemandFatigueRisk';
                const isWarning = isFatigue ? val >= 80 : val < 35;
                const barColor = isFatigue
                  ? val >= 80
                    ? 'bg-rose-500'
                    : val >= 60
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                  : val >= 75
                  ? 'bg-emerald-500'
                  : val >= 50
                  ? 'bg-cyan-500'
                  : val >= 35
                  ? 'bg-amber-500'
                  : 'bg-rose-500';

                return (
                  <div key={m.key} className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-200">{m.label}</span>
                      <span className={`font-black ${isWarning ? 'text-rose-400' : 'text-slate-300'}`}>
                        {val}
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} transition-all duration-300`} style={{ width: `${val}%` }} />
                    </div>

                    <div className="text-[9px] text-slate-500 truncate">{m.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: CONTEXTUAL FINDINGS AUDIT                        */}
      {/* ======================================================== */}
      {viewMode === 'audit' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {/* Severity Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {['all', 'fatal_constraint', 'structural_weakness', 'conditional_risk', 'trade_off', 'synergy', 'optimization'].map(
              sev => (
                <button
                  key={sev}
                  onClick={() => setFindingFilter(sev)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition shrink-0 cursor-pointer ${
                    findingFilter === sev
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {sev === 'all' ? 'Semua Temuan' : getSeverityBadge(sev).label}
                </button>
              )
            )}
          </div>

          {/* Fatal Constraint Banner if any */}
          {analysis.fatalErrors.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600/80 text-rose-200 flex items-start gap-2.5 shadow-lg animate-pulse shrink-0">
              <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-black text-rose-300 uppercase tracking-wider text-[11px]">
                  Batal Regulasi Pertandingan
                </div>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px]">
                  {analysis.fatalErrors.map((err, i) => (
                    <li key={i} className="font-bold text-white">{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Findings List */}
          {filteredFindings.length === 0 ? (
            <div className="text-center py-10 bg-slate-950/30 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              <div className="font-bold text-slate-300 text-xs">Tidak ada temuan pada kategori ini</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Konfigurasi taktik berjalan selaras dan seimbang.</div>
            </div>
          ) : (
            filteredFindings.map(f => {
              const badge = getSeverityBadge(f.severity);
              return (
                <div
                  key={f.id}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-2 hover:border-slate-700 transition"
                >
                  {/* Top Bar: Title & Severity */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="text-[9px] text-slate-500 uppercase font-mono">
                          {f.sourceMetadata.ruleId}
                        </span>
                        <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded">
                          Fase: {f.phase}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-xs mt-1">{f.title}</h4>
                    </div>

                    <span className="text-[10px] font-bold text-slate-400 shrink-0">
                      {f.confidence}% Keyakinan
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-slate-300 leading-relaxed">{f.description}</p>

                  {/* Benefit / Downside for trade-offs & risks */}
                  {(f.benefit || f.downside) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[10px]">
                      {f.benefit && (
                        <div className="text-emerald-300">
                          <strong>Keuntungan:</strong> {f.benefit}
                        </div>
                      )}
                      {f.downside && (
                        <div className="text-amber-300">
                          <strong>Biaya Taktis:</strong> {f.downside}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Solutions & Expected Delta */}
                  {f.solutions.length > 0 && (
                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 text-[11px] space-y-1">
                      <div className="font-bold text-cyan-400 flex items-center gap-1 text-[10px]">
                        <Compass className="w-3 h-3" />
                        <span>Solusi &amp; Penyesuaian:</span>
                      </div>
                      <ul className="space-y-0.5 text-slate-300">
                        {f.solutions.map((sol, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-cyan-400">→</span>
                            <span>{sol}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 3: INDIVIDUAL PLAYER IMPACT & REASONING             */}
      {/* ======================================================== */}
      {viewMode === 'reasoning' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {/* Tactical Philosophy & Guide to Football Knowledge */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="font-bold text-white flex items-center gap-1.5 text-xs">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Filosofi Mentality &amp; Blok Pertahanan (Guide to Football)</span>
            </div>
            <div className="text-[11px] text-slate-400">
              <strong className="text-slate-200">{mentalityInfo.name} ({mentalityInfo.indonesianName}):</strong> {mentalityInfo.philosophy}
            </div>
            <div className="text-[11px] text-slate-400">
              <strong className="text-slate-200">{blockInfo.name} ({blockInfo.indonesianName}):</strong> {blockInfo.pitchZone} — {blockInfo.triggerPoint}
            </div>
          </div>

          {/* 11 Players Reasoning Cards */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Dampak Taktis 11 Pemain Starter
            </label>
            {reasoningResult.playerImpacts.map(impact => (
              <div
                key={impact.slotId}
                onClick={() => onSelectSlotPosition && onSelectSlotPosition(impact.position)}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-cyan-500/50 transition cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-cyan-400 text-xs">{impact.position}</span>
                    <span className="font-bold text-white">{impact.playerName}</span>
                    <span className="text-[10px] text-slate-400">
                      • {impact.roleName} ({impact.duty})
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 capitalize">
                    {impact.synergyStatus}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {impact.impactSummary}
                </p>

                {impact.synergyNote && (
                  <div className="text-[10px] text-cyan-300/90 bg-cyan-950/40 p-1.5 rounded border border-cyan-900/40">
                    {impact.synergyNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
