'use client';

import React, { useState } from 'react';
import { TacticSlot, TeamInstructions, Player, SandboxSimulationResult } from '../types';
import { runSandboxSimulation, SANDBOX_OPPONENTS } from '../engine/sandbox';
import { X, Swords, ShieldAlert, CheckCircle2, AlertOctagon, TrendingUp, Zap, HelpCircle } from 'lucide-react';

interface SandboxModalProps {
  slots: TacticSlot[];
  teamInstructions: TeamInstructions;
  playersMap: Map<string, Player>;
  onClose: () => void;
}

export function SandboxModal({
  slots,
  teamInstructions,
  playersMap,
  onClose,
}: SandboxModalProps) {
  const simulationResults = runSandboxSimulation(slots, teamInstructions, playersMap);
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>(simulationResults[0]?.opponentId || '');

  const activeResult = simulationResults.find(r => r.opponentId === selectedOpponentId) || simulationResults[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-rose-600 to-amber-500 rounded-xl text-white shadow">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Sandbox Tactical Stress-Testing
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                  Adu 8 Formasi Lawan
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Uji ketahanan taktikmu melawan formasi arkais dengan kapasitas skuad seimbang (Matched 1:1 CA)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {/* Kolom Kiri: List 8 Lawan */}
          <div className="p-4 overflow-y-auto space-y-2 bg-slate-950/40">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Pilih Arketipe Lawan (Benchmark)
            </label>
            {simulationResults.map((res) => {
              const isSelected = res.opponentId === selectedOpponentId;
              return (
                <button
                  key={res.opponentId}
                  onClick={() => setSelectedOpponentId(res.opponentId)}
                  className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-slate-800 border-cyan-400 shadow-md ring-1 ring-cyan-400/50'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-white truncate max-w-[170px]">
                      {res.opponentName}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Formasi: {res.opponentFormation}
                    </div>
                  </div>

                  {/* Outcome Tag */}
                  <div
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 ${
                      res.dominantOutcome === 'win'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : res.dominantOutcome === 'loss'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {res.dominantOutcome === 'win' ? 'Unggul' : res.dominantOutcome === 'loss' ? 'Rentan Kalah' : 'Imbang'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Kolom Kanan: Detail Diagnosa & Enhancement */}
          <div className="md:col-span-2 p-5 overflow-y-auto space-y-5 bg-slate-900 text-xs">
            {activeResult && (
              <>
                {/* Result Card Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      {activeResult.opponentName}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Hasil Simulasi 100 Ronde Lawan Kapasitas Seimbang:
                    </p>
                  </div>

                  {/* Probability Bars */}
                  <div className="flex items-center gap-3 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800">
                    <div className="text-center">
                      <div className="text-[10px] text-emerald-400 font-bold uppercase">Menang</div>
                      <div className="text-sm font-black text-emerald-300">{activeResult.winProbability}%</div>
                    </div>
                    <div className="text-slate-700">|</div>
                    <div className="text-center">
                      <div className="text-[10px] text-amber-400 font-bold uppercase">Seri</div>
                      <div className="text-sm font-black text-amber-300">{activeResult.drawProbability}%</div>
                    </div>
                    <div className="text-slate-700">|</div>
                    <div className="text-center">
                      <div className="text-[10px] text-rose-400 font-bold uppercase">Kalah</div>
                      <div className="text-sm font-black text-rose-300">{activeResult.lossProbability}%</div>
                    </div>
                  </div>
                </div>

                {/* 5 Tactical Health Indices */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Evaluasi 5 Sektor Taktikal
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300">Stabilitas Rest Defence</span>
                      <span className={`font-bold ${activeResult.scores.restDefenceStability >= 60 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {activeResult.scores.restDefenceStability}%
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300">Dominasi Lini Tengah</span>
                      <span className={`font-bold ${activeResult.scores.centralDominance >= 60 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {activeResult.scores.centralDominance}%
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300">Pertahanan Koridor Sayap</span>
                      <span className={`font-bold ${activeResult.scores.flankVulnerability >= 60 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {activeResult.scores.flankVulnerability}%
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300">Kelolosan dari Pressing</span>
                      <span className={`font-bold ${activeResult.scores.pressingEscape >= 60 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {activeResult.scores.pressingEscape}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Root Causes / Titik Bocor */}
                {activeResult.rootCauses.length > 0 && (
                  <div>
                    <label className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                      <AlertOctagon className="w-4 h-4 text-rose-400" />
                      Diagnosa Titik Bocor (Kenapa Taktik Ini Menghadapi Masalah?)
                    </label>
                    <div className="space-y-2">
                      {activeResult.rootCauses.map((rc, idx) => (
                        <div key={idx} className="p-3 bg-rose-950/30 rounded-xl border border-rose-900/60 text-xs text-rose-200">
                          <div className="font-bold text-white mb-0.5">{rc.title}</div>
                          <p className="text-slate-300 leading-relaxed">{rc.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actionable Enhancements / Solusi Penambal */}
                {activeResult.actionableEnhancements.length > 0 && (
                  <div>
                    <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      Rekomendasi Enhancement (Solusi Penambal Taktis)
                    </label>
                    <div className="space-y-2">
                      {activeResult.actionableEnhancements.map((enh, idx) => (
                        <div key={idx} className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-900/60 text-xs">
                          <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            {enh.action}
                          </div>
                          <p className="text-slate-400 mt-1 pl-5">
                            <span className="text-slate-300 font-semibold">Dampak Taktikal:</span> {enh.expectedImpact}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
