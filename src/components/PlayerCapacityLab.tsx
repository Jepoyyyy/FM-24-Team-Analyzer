'use client';

import React, { useMemo, useState } from 'react';
import { Activity, ArrowRight, BadgeCheck, CircleAlert, Gauge, Shield, Sparkles } from 'lucide-react';
import { Player, Position } from '../types';
import {
  calculatePlayerCapacityProfile,
  getCapacityBandLabel,
  PLAYER_CAPACITY_MODEL_VERSION,
  PlayerCapacityResult,
} from '../engine/v2/playerCapacity';

interface PlayerCapacityLabProps {
  players: Player[];
  squadName: string;
}

const BAND_STYLE: Record<string, string> = {
  elite: 'text-violet-200 bg-violet-500/15 border-violet-500/40',
  strong: 'text-cyan-200 bg-cyan-500/15 border-cyan-500/40',
  competent: 'text-emerald-200 bg-emerald-500/15 border-emerald-500/40',
  basic: 'text-amber-200 bg-amber-500/15 border-amber-500/40',
  unknown: 'text-slate-300 bg-slate-800 border-slate-700',
};

function FunctionStrip({ result, selected, onSelect }: {
  result: PlayerCapacityResult;
  selected: boolean;
  onSelect: () => void;
}) {
  const capacity = result.capacity ?? 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-xl border p-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
        selected ? 'bg-slate-800/90 border-cyan-500/60 shadow-lg shadow-cyan-950/30' : 'bg-slate-950/65 border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{result.phase}</p>
          <p className="font-bold text-sm text-slate-100 truncate">{result.label}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="font-mono text-xl font-black text-white">{result.capacity ?? '—'}</span>
          <span className="block text-[9px] uppercase tracking-wider text-slate-500">capacity</span>
        </div>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-slate-800 overflow-hidden" aria-label={`${result.label}: ${result.capacity ?? 'unknown'}`}>
        <div
          className={`h-full rounded-full ${result.capacity === null ? 'bg-slate-700' : capacity >= 70 ? 'bg-cyan-400' : capacity >= 55 ? 'bg-emerald-400' : 'bg-amber-400'}`}
          style={{ width: `${capacity}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${BAND_STYLE[result.band]}`}>
          {getCapacityBandLabel(result.band)}
        </span>
        <span className="text-[10px] text-slate-500">Data {result.dataConfidence}%</span>
      </div>
    </button>
  );
}

export function PlayerCapacityLab({ players, squadName }: PlayerCapacityLabProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id ?? '');
  const selectedPlayer = players.find(player => player.id === selectedPlayerId) ?? players[0];
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(selectedPlayer?.positions[0]?.position ?? null);
  const [selectedFunctionId, setSelectedFunctionId] = useState('cross_delivery');

  const profile = useMemo(() => selectedPlayer
    ? calculatePlayerCapacityProfile(selectedPlayer, selectedPosition)
    : null, [selectedPlayer, selectedPosition]);

  const selectedFunction = profile?.functions.find(result => result.functionId === selectedFunctionId)
    ?? profile?.functions[0];

  if (!selectedPlayer || !profile || !selectedFunction) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-300">Import skuad untuk mulai mengevaluasi capacity pemain.</div>;
  }

  const handlePlayerChange = (playerId: string) => {
    const player = players.find(item => item.id === playerId);
    setSelectedPlayerId(playerId);
    setSelectedPosition(player?.positions[0]?.position ?? null);
  };

  const crossing = profile.functions.find(item => item.functionId === 'cross_delivery');
  const overlap = profile.functions.find(item => item.functionId === 'overlap_arrival');
  const recovery = profile.functions.find(item => item.functionId === 'recovery_run');
  const cover = profile.functions.find(item => item.functionId === 'rest_defence_cover');
  const attackingGap = (crossing?.capacity ?? 0) < 55 || (overlap?.capacity ?? 0) < 55;
  const transitionGap = (recovery?.capacity ?? 0) < 55 || (cover?.capacity ?? 0) < 55;

  return (
    <section className="w-full space-y-5" aria-labelledby="capacity-lab-title">
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[linear-gradient(120deg,#0f172a_0%,#111827_55%,#172554_140%)] p-5 sm:p-7 shadow-2xl">
        <div className="absolute right-0 top-0 h-full w-2/5 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(115deg, transparent 0 18px, #22d3ee 19px 20px)' }} />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-cyan-300">
              <Activity className="w-4 h-4" />
              <span className="text-[11px] font-black uppercase tracking-[0.22em]">Independent analysis workspace</span>
            </div>
            <h1 id="capacity-lab-title" className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-white">
              Player Capacity Lab
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 max-w-xl">
              Ukur fungsi yang mampu dijalankan pemain dari data atribut yang tersedia. Hasil ini belum terhubung ke formation dan tidak mengubah taktik aktif.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 min-w-[260px]">
            <div className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2.5 backdrop-blur">
              <p className="text-[9px] uppercase tracking-widest text-slate-500">Squad source</p>
              <p className="mt-1 text-xs font-bold text-slate-200 truncate">{squadName}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2.5 backdrop-blur">
              <p className="text-[9px] uppercase tracking-widest text-slate-500">Model</p>
              <p className="mt-1 text-xs font-mono font-bold text-cyan-300">{PLAYER_CAPACITY_MODEL_VERSION}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <aside className="xl:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/85 p-4 shadow-xl">
          <div className="grid sm:grid-cols-2 xl:grid-cols-1 gap-3 mb-4">
            <label className="block">
              <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Pemain</span>
              <select
                value={selectedPlayer.id}
                onChange={event => handlePlayerChange(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {players.map(player => <option key={player.id} value={player.id}>{player.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Posisi evaluasi</span>
              <select
                value={selectedPosition ?? ''}
                onChange={event => setSelectedPosition(event.target.value as Position)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {selectedPlayer.positions.map(position => <option key={position.position} value={position.position}>{position.position} · {position.familiarity}</option>)}
              </select>
            </label>
          </div>

          <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2.5">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Positional availability</p>
              <p className="text-xs font-bold text-slate-200">{profile.positionalFamiliarity}</p>
            </div>
            <span className="font-mono text-2xl font-black text-cyan-300">{profile.positionalAvailability}</span>
          </div>

          <div className="space-y-2">
            {profile.functions.map(result => (
              <FunctionStrip
                key={result.functionId}
                result={result}
                selected={selectedFunction.functionId === result.functionId}
                onSelect={() => setSelectedFunctionId(result.functionId)}
              />
            ))}
          </div>
        </aside>

        <div className="xl:col-span-8 space-y-5">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/85 p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400">Function breakdown</p>
                <h2 className="mt-1 text-2xl font-black text-white">{selectedFunction.label}</h2>
                <p className="mt-1 text-sm text-slate-400">{selectedFunction.purpose}</p>
              </div>
              <div className="flex gap-2">
                <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-center min-w-[92px]">
                  <p className="font-mono text-2xl font-black text-white">{selectedFunction.capacity ?? '—'}</p>
                  <p className="text-[9px] uppercase tracking-widest text-slate-500">Capacity</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-center min-w-[92px]">
                  <p className="font-mono text-2xl font-black text-emerald-300">{selectedFunction.dataConfidence}%</p>
                  <p className="text-[9px] uppercase tracking-widest text-slate-500">Data confidence</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid sm:grid-cols-3 gap-3">
              {selectedFunction.components.map(component => (
                <div key={component.id} className="rounded-xl border border-slate-800 bg-slate-950/65 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-300">{component.label}</span>
                    <span className="font-mono text-lg font-black text-white">{component.score ?? '—'}</span>
                  </div>
                  <div className="mt-2 h-1 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-cyan-400" style={{ width: `${component.score ?? 0}%` }} />
                  </div>
                  <div className="mt-3 space-y-1">
                    {component.knownAttributes.map(attribute => (
                      <div key={attribute.attribute} className="flex justify-between text-[10px]">
                        <span className="text-slate-500">{attribute.attribute}</span>
                        <span className="font-mono font-bold text-slate-300">{attribute.value}/20</span>
                      </div>
                    ))}
                    {component.missingAttributes.length > 0 && (
                      <p className="pt-1 text-[9px] leading-relaxed text-amber-400">Missing: {component.missingAttributes.join(', ')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-900/70 bg-emerald-950/25 p-3.5">
                <div className="flex items-center gap-2 text-emerald-300"><BadgeCheck className="w-4 h-4" /><span className="text-xs font-black">Pendukung capacity</span></div>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">{selectedFunction.strengths.join(' · ') || 'Belum ada atribut unggul yang teridentifikasi dari data saat ini.'}</p>
              </div>
              <div className="rounded-xl border border-amber-900/70 bg-amber-950/25 p-3.5">
                <div className="flex items-center gap-2 text-amber-300"><CircleAlert className="w-4 h-4" /><span className="text-xs font-black">Bottleneck / uncertainty</span></div>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  {selectedFunction.limitations.join(' · ') || (selectedFunction.missingInputs.length ? `Data belum lengkap: ${selectedFunction.missingInputs.join(', ')}` : 'Tidak ada bottleneck besar dari atribut yang tersedia.')}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/85 p-5 shadow-xl">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-violet-300" />
              <h2 className="font-black text-white">Capacity reading</h2>
              <span className="ml-auto text-[10px] rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 font-bold text-violet-200">Belum terhubung ke formation</span>
            </div>
            <div className="mt-4 grid md:grid-cols-2 gap-3">
              <div className={`rounded-xl border p-4 ${attackingGap ? 'border-amber-800 bg-amber-950/20' : 'border-emerald-900 bg-emerald-950/20'}`}>
                <div className="flex items-center gap-2 text-sm font-black text-white"><Sparkles className="w-4 h-4 text-amber-300" />Kontribusi menyerang sisi luar</div>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  {attackingGap
                    ? 'Ada gap pada overlap atau final delivery. Defensive support tidak memperbaiki gap ini; pindahkan tanggung jawab width/delivery atau kurangi demand.'
                    : 'Overlap dan delivery melewati baseline competent. Struktur formation nantinya tetap harus memastikan ruang serta target tersedia.'}
                </p>
              </div>
              <div className={`rounded-xl border p-4 ${transitionGap ? 'border-rose-900 bg-rose-950/20' : 'border-cyan-900 bg-cyan-950/20'}`}>
                <div className="flex items-center gap-2 text-sm font-black text-white"><Shield className="w-4 h-4 text-cyan-300" />Perlindungan transisi</div>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  {transitionGap
                    ? 'Recovery atau cover berada di bawah baseline competent. Ini dapat dikompensasi pemain lain, tetapi hanya jika ia benar-benar menjaga channel yang ditinggalkan.'
                    : 'Recovery dan cover melewati baseline competent. Nilai ini menunjukkan capacity individual, bukan jaminan struktur rest-defence.'}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-950/75 border border-slate-800 p-3 text-[11px] leading-relaxed text-slate-400">
              <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0" />
              <p>Model confidence tetap 65% karena bobot saat ini adalah hipotesis produk. Capacity memakai atribut yang tersedia; observed match performance belum tersedia.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
