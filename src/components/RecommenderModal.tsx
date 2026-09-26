'use client';

import React from 'react';
import { Player, TacticSlot } from '../types';
import { recommendFormations } from '../engine/recommender';
import {
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  Compass,
} from 'lucide-react';

interface RecommenderModalProps {
  players: Player[];
  onApplyFormation: (slots: TacticSlot[]) => void;
  onClose: () => void;
}

export function RecommenderModal({
  players,
  onApplyFormation,
  onClose,
}: RecommenderModalProps) {
  const recommendations = recommendFormations(players);

  const getReasoningBadge = (type: string) => {
    switch (type) {
      case 'flank':
        return { label: 'Dinamika Sayap', bg: 'bg-cyan-950 text-cyan-300 border-cyan-700' };
      case 'midfield':
        return { label: 'Poros Lini Tengah', bg: 'bg-emerald-950 text-emerald-300 border-emerald-700' };
      case 'defence':
        return { label: 'Rest Defence', bg: 'bg-blue-950 text-blue-300 border-blue-700' };
      case 'attack':
        return { label: 'Penetrasi Gol', bg: 'bg-rose-950 text-rose-300 border-rose-700' };
      case 'risk':
        return { label: 'Titik Risiko Waspada', bg: 'bg-amber-950 text-amber-300 border-amber-700' };
      default:
        return { label: 'Analisis Taktis', bg: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-emerald-500 rounded-xl text-white shadow-lg shadow-cyan-950/40">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Rekomendasi Formasi AI (Tactical Reasoning)
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Top 3 Terbaik
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Sistem menganalisis kedalaman skuad, profil unik pemain, dan kestabilan rest defence untuk memberikan reasoning taktis komprehensif
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List Formasi */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs bg-slate-950/30">
          {recommendations.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              Jumlah pemain kurang untuk menganalisis rekomendasi (minimal 11 pemain).
            </div>
          ) : (
            recommendations.map((rec, idx) => (
              <div
                key={rec.template.id}
                className="p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-cyan-500/50 transition-all flex flex-col space-y-4 shadow-lg"
              >
                {/* Header Kartu Formasi */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-cyan-600 text-white font-black flex items-center justify-center text-xs shadow">
                      #{idx + 1}
                    </span>
                    <h4 className="text-base font-black text-white">
                      {rec.template.name}
                    </h4>
                    {rec.isAsymmetric ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                        Asimetris Dinamis
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        Simetris Baku
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded text-xs font-black bg-emerald-950 text-emerald-300 border border-emerald-700">
                      Match: {rec.matchScore}%
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onApplyFormation(rec.suggestedSlots);
                      onClose();
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-black text-xs shadow-md shadow-cyan-950 flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
                  >
                    <span>Terapkan Formasi Ini</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Deskripsi & Ringkasan Taktis */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {rec.template.description}
                </p>

                {/* Tactical Meta Pills */}
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <div className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Flank: <strong>{rec.squadSummary.flankBalance}</strong></span>
                  </div>
                  <div className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Rest Defence: <strong>{rec.squadSummary.restDefenceStructure}</strong></span>
                  </div>
                  <div className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pilar Utama: <strong>{rec.squadSummary.keyPlayers.join(', ')}</strong></span>
                  </div>
                </div>

                {/* AI Reasoning Points (Detail Analisis Mendalam) */}
                <div className="pt-2 space-y-2">
                  <div className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Alasan & Penjelasan Taktis AI:</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {rec.reasoning.map((item, rIdx) => {
                      const badge = getReasoningBadge(item.type);
                      return (
                        <div
                          key={rIdx}
                          className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${badge.bg}`}>
                              {badge.label}
                            </span>
                            <span className="font-bold text-xs text-white truncate">
                              {item.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
