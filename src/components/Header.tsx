'use client';

import React from 'react';
import { Sparkles, Swords, Upload } from 'lucide-react';

interface HeaderProps {
  onOpenRecommender: () => void;
  onOpenSandbox: () => void;
  onOpenImporter: () => void;
}

export function Header({
  onOpenRecommender,
  onOpenSandbox,
  onOpenImporter,
}: HeaderProps) {
  return (
    <header className="bg-slate-900/95 border-b border-slate-800 backdrop-blur sticky top-0 z-40 px-3 sm:px-6 py-2.5 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center text-white font-black text-base shadow-lg shadow-cyan-900/40">
            FM
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm sm:text-base text-white tracking-tight">
                Tactical Builder & Squad Analyzer
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                FM24
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Analisis Keseimbangan Taktik, Rekomendasi Peran & Simulasi Sandbox
            </p>
          </div>
        </div>

        {/* Action Buttons: Import Skuad, Rekomendasi AI, Sandbox Tanding */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* PROMINENT IMPORT SQUAD BUTTON */}
          <button
            onClick={onOpenImporter}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-950 flex items-center gap-1.5 shrink-0 transition border border-emerald-400/40 cursor-pointer"
            title="Impor data skuad pemain FM24 (File HTML Ctrl+P) atau pilih skuad demo"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-100" />
            <span>Import Skuad</span>
            <span className="text-[9px] bg-black/30 px-1 py-0.2 rounded text-emerald-200 uppercase font-extrabold">
              HTML
            </span>
          </button>

          {/* AI Recommender Button */}
          <button
            onClick={onOpenRecommender}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-950 flex items-center gap-1.5 shrink-0 transition cursor-pointer"
            title="Dapatkan rekomendasi 3 formasi terbaik sesuai kedalaman skuad"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
            <span className="hidden sm:inline">Rekomendasi AI</span>
            <span className="sm:hidden">AI</span>
          </button>

          {/* Sandbox Simulation Button */}
          <button
            onClick={onOpenSandbox}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-md shadow-rose-950 flex items-center gap-1.5 shrink-0 transition cursor-pointer"
            title="Adu formasi Anda melawan 8 lawan seimbang dengan taktik berbeda"
          >
            <Swords className="w-3.5 h-3.5 text-rose-200" />
            <span className="hidden sm:inline">Sandbox Tanding</span>
            <span className="sm:hidden">Sandbox</span>
          </button>
        </div>
      </div>
    </header>
  );
}
