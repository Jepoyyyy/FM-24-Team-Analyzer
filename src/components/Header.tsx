'use client';

import React from 'react';
import { Sparkles, Swords, Upload, Layers, Compass, BarChart3 } from 'lucide-react';

interface HeaderProps {
  activeStage?: 'build' | 'diagnose' | 'improve' | 'compare';
  onSelectStage?: (stage: 'build' | 'diagnose' | 'improve' | 'compare') => void;
  onOpenRecommender: () => void;
  onOpenSandbox: () => void;
  onOpenImporter: () => void;
}

export function Header({
  activeStage = 'build',
  onSelectStage,
  onOpenRecommender,
  onOpenSandbox,
  onOpenImporter,
}: HeaderProps) {
  return (
    <header className="bg-slate-900/95 border-b border-slate-800 backdrop-blur sticky top-0 z-40 px-3 sm:px-6 py-2.5 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
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
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Alur Build • Diagnose • Improve • Compare
              </p>
            </div>
          </div>

          {/* Quick Import Mobile */}
          <button
            onClick={onOpenImporter}
            className="md:hidden px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
        </div>

        {/* 4-Stage Workflow Tabs (Build -> Diagnose -> Improve -> Compare) */}
        {onSelectStage && (
          <nav aria-label="Alur Taktis" className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-bold text-slate-400">
            <button
              onClick={() => onSelectStage('build')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeStage === 'build'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>1. Build</span>
            </button>
            <button
              onClick={() => onSelectStage('diagnose')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeStage === 'diagnose'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>2. Diagnose</span>
            </button>
            <button
              onClick={() => {
                onSelectStage('improve');
                onOpenRecommender();
              }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeStage === 'improve'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>3. Improve</span>
            </button>
            <button
              onClick={() => {
                onSelectStage('compare');
                onOpenSandbox();
              }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeStage === 'compare'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'hover:text-slate-200'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>4. Compare</span>
            </button>
          </nav>
        )}

        {/* Action Buttons: Import Skuad, Kecocokan Skuad, Sandbox */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenImporter}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-950 flex items-center gap-1.5 shrink-0 transition border border-emerald-400/40 cursor-pointer"
            title="Impor data skuad pemain FM24 (HTML)"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-100" />
            <span>Import Skuad</span>
          </button>

          <button
            onClick={onOpenRecommender}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-950 flex items-center gap-1.5 shrink-0 transition cursor-pointer"
            title="Dapatkan rekomendasi 3 formasi terbaik sesuai kecocokan skuad"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
            <span>Kecocokan Skuad</span>
          </button>

          <button
            onClick={onOpenSandbox}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-md shadow-rose-950 flex items-center gap-1.5 shrink-0 transition cursor-pointer"
            title="Stress-test taktik Anda melawan 8 lawan pada 3 kapasitas berbeda"
          >
            <Swords className="w-3.5 h-3.5 text-rose-200" />
            <span>Sandbox Tanding</span>
          </button>
        </div>
      </div>
    </header>
  );
}
