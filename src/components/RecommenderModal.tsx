'use client';

import React, { useState } from 'react';
import { Player, TacticSlot, TeamInstructions } from '../types';
import {
  recommendSquadFitV2,
  createAtomicApplyPayload,
  SquadRecommendationV2,
  AtomicApplyPayloadV2,
} from '../engine/v2';
import {
  X,
  Compass,
  ArrowRight,
  Users,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Layers,
} from 'lucide-react';

interface RecommenderModalProps {
  players: Player[];
  currentSlots: TacticSlot[];
  currentFormationId: string;
  currentInstructions: TeamInstructions;
  onApplyAtomic: (payload: AtomicApplyPayloadV2) => void;
  onUndoAtomic?: (payload: AtomicApplyPayloadV2) => void;
  lastAppliedPayload?: AtomicApplyPayloadV2 | null;
  onClose: () => void;
}

export function RecommenderModal({
  players,
  currentSlots,
  currentFormationId,
  currentInstructions,
  onApplyAtomic,
  onUndoAtomic,
  lastAppliedPayload,
  onClose,
}: RecommenderModalProps) {
  const recommendations: SquadRecommendationV2[] = recommendSquadFitV2(
    players,
    currentSlots,
    currentFormationId,
    currentInstructions
  );

  const [selectedRecId, setSelectedRecId] = useState<string>(recommendations[0]?.id || '');

  const activeRec = recommendations.find(r => r.id === selectedRecId) || recommendations[0];

  const handleApply = (rec: SquadRecommendationV2) => {
    const payload = createAtomicApplyPayload(
      currentSlots,
      currentFormationId,
      currentInstructions,
      rec
    );
    onApplyAtomic(payload);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recommender-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-emerald-500 rounded-xl text-white shadow-lg shadow-cyan-950/40">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 id="recommender-modal-title" className="text-base font-black text-white flex items-center gap-2">
                Rekomendasi Kecocokan Skuad (Tactical Fit Engine v2)
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Global Munkres Assignment
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Optimasi global berbasis kecocokan atribut, kestabilan 4 fase, mitigasi risiko taktis, dan kelengkapan data
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lastAppliedPayload && onUndoAtomic && (
              <button
                onClick={() => onUndoAtomic(lastAppliedPayload)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-800/60 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Batalkan perubahan taktik terakhir"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo Taktik</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {/* Kolom Kiri: Top 3 Pilihan */}
          <div className="p-4 overflow-y-auto space-y-3 bg-slate-950/40">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Top 3 Preset Rekomendasi
            </label>

            {recommendations.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                Minimal 11 pemain diperlukan untuk kalkulasi kecocokan skuad.
              </div>
            ) : (
              recommendations.map((rec, idx) => {
                const isSelected = rec.id === activeRec?.id;
                return (
                  <button
                    key={rec.id}
                    onClick={() => setSelectedRecId(rec.id)}
                    className={`w-full p-3.5 rounded-xl border text-left transition flex flex-col gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-cyan-400 shadow-md ring-1 ring-cyan-400/50'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-5 h-5 rounded-full bg-cyan-600 text-white font-black flex items-center justify-center text-[10px]">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                        {rec.compositeScore}% Skor
                      </span>
                    </div>

                    <div>
                      <div className="font-bold text-xs text-white">
                        {rec.presetName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Bentuk: {rec.formationShape}
                      </div>
                    </div>

                    {/* Breakdown meters */}
                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-800 text-[10px] text-slate-300">
                      <div>
                        <span className="text-[9px] text-slate-500 block">Peran</span>
                        <span className="font-bold">{rec.roleFitScore}%</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">Kohesi</span>
                        <span className="font-bold">{rec.tacticalCohesionScore}%</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">Data</span>
                        <span className="font-bold">{rec.dataConfidenceScore}%</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Kolom Kanan: Detail & Diff Preview */}
          <div className="md:col-span-2 p-5 overflow-y-auto space-y-5 bg-slate-900 text-xs">
            {activeRec ? (
              <>
                {/* Title & Apply Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <h4 className="text-base font-black text-white flex items-center gap-2">
                      {activeRec.presetName}
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {activeRec.formationShape}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Struktur Fase: In-Possession ({activeRec.analysis.phaseShape.inPossessionShape}), Blok Bertahan ({activeRec.analysis.phaseShape.settledDefenceShape}), Rest Defence ({activeRec.analysis.phaseShape.restDefenceShape})
                    </p>
                  </div>

                  <button
                    onClick={() => handleApply(activeRec)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-cyan-950 flex items-center gap-2 transition cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    <span>Terapkan Taktik Secara Atomik</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Score Summary Metrics */}
                <div className="grid grid-cols-4 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-400">Skor Komposit</div>
                    <div className="text-lg font-black text-cyan-400">{activeRec.compositeScore}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Kecocokan Skuad</div>
                    <div className="text-lg font-black text-emerald-400">{activeRec.roleFitScore}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Tactical Cohesion</div>
                    <div className="text-lg font-black text-blue-400">
                      Grade {activeRec.analysis.cohesionGrade} ({activeRec.tacticalCohesionScore}%)
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Confidence Data</div>
                    <div className="text-lg font-black text-purple-400">{activeRec.dataConfidenceScore}%</div>
                  </div>
                </div>

                {/* Key Players */}
                <div>
                  <h5 className="font-bold text-white mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    Pemain Kunci Starter
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {activeRec.keyPlayers.map(p => (
                      <div key={p.playerId} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
                        <div>
                          <div className="font-bold text-white truncate">{p.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {p.position} • {p.roleName} ({p.duty})
                          </div>
                        </div>
                        <div className="text-[11px] font-bold text-emerald-400 mt-1">
                          Fit {p.fitScore}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
                    <h6 className="font-bold text-emerald-300 mb-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Kekuatan & Sinergi
                    </h6>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      {activeRec.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-400">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40">
                    <h6 className="font-bold text-amber-300 mb-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Risiko & Catatan Taktis
                    </h6>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      {activeRec.weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-400">•</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Diff Preview Before Applying */}
                <div>
                  <h5 className="font-bold text-white mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Preview Perubahan Sebelum Diterapkan (Diff)
                  </h5>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1.5 text-slate-300">
                    <div className="flex gap-4 text-xs font-bold text-slate-200 pb-1 border-b border-slate-800">
                      <span>Peran Berubah: {activeRec.diff.roleChangesCount}</span>
                      <span>Rotasi Starter: {activeRec.diff.playerSwapsCount}</span>
                      <span>Instruksi Berubah: {activeRec.diff.instructionChangesCount}</span>
                    </div>
                    {activeRec.diff.details.length === 0 ? (
                      <div className="text-slate-500 py-1">Taktik aktif sudah identik dengan konfigurasi preset ini.</div>
                    ) : (
                      activeRec.diff.details.slice(0, 6).map((det, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-slate-400">
                          <span className="text-cyan-400">→</span>
                          <span>{det}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
