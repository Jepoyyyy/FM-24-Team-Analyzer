'use client';

import React, { useState } from 'react';
import { Player } from '../types';
import { DEMO_SQUADS } from '../data/demoSquads';
import { parseFMHtml } from '../engine/parser';
import { X, UploadCloud, Users, CheckCircle2, AlertCircle } from 'lucide-react';

interface SquadImporterModalProps {
  currentSquadId: string;
  onSelectSquad: (squadName: string, players: Player[]) => void;
  onClose: () => void;
}

export function SquadImporterModal({
  currentSquadId,
  onSelectSquad,
  onClose,
}: SquadImporterModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsedPlayers = parseFMHtml(content);
        if (parsedPlayers.length === 0) {
          setErrorMsg('Tidak ditemukan data pemain yang valid pada file ini.');
          return;
        }

        const teamName = file.name.replace(/\.[^/.]+$/, '');
        onSelectSquad(teamName, parsedPlayers);
        setSuccessMsg(`Berhasil mengimpor ${parsedPlayers.length} pemain dari ${file.name}!`);
        setTimeout(() => onClose(), 1200);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gagal mem-parse file HTML FM24.';
        setErrorMsg(msg);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-emerald-500 rounded-xl text-white shadow">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Import Data Skuad Pemain</h3>
              <p className="text-xs text-slate-400">Pilih contoh tim demo atau upload file ekspor HTML dari FM24</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Status Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Pilih Demo Squads */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2.5">
              Pilihan Contoh Skuad Demo (Pre-loaded)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DEMO_SQUADS.map((squad) => (
                <button
                  key={squad.id}
                  onClick={() => {
                    onSelectSquad(squad.name, squad.players);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    currentSquadId === squad.id
                      ? 'bg-slate-800 border-cyan-400 shadow-md ring-1 ring-cyan-400/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                      {squad.league}
                    </span>
                    <h4 className="font-bold text-white text-xs sm:text-sm mt-0.5">
                      {squad.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                      {squad.description}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-bold text-slate-400">
                    {squad.players.length} Pemain Aktif
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Upload File Ekspor HTML FM24 */}
          <div className="pt-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Upload File Ekspor HTML dari FM24
            </label>
            <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-6 text-center bg-slate-950/40 transition flex flex-col items-center justify-center cursor-pointer relative group">
              <input
                type="file"
                accept=".html,.htm"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-cyan-400 transition mb-2" />
              <div className="font-bold text-white text-xs sm:text-sm">
                Klik atau Drag & Drop file .html di sini
              </div>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                Caranya di FM24: Buka layar <strong>Squad</strong>, tekan <strong>Ctrl + P</strong>, pilih <strong>Print / Save as Web Page (.html)</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
