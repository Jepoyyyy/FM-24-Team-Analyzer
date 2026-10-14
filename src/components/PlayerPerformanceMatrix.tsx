'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CircleAlert, Clock3, FlaskConical, ShieldCheck, Target } from 'lucide-react';
import { PERFORMANCE_METRICS_BY_ROLE, PLAYER_PERFORMANCE_MOCK } from '../data/playerPerformanceMock';
import { PLAYER_PERFORMANCE_MODEL_VERSION, rankComparableSamples, ReliabilityBand, RolePerformanceResult } from '../engine/v2/playerPerformance';

const ROLE_OPTIONS = [...new Set(PLAYER_PERFORMANCE_MOCK.map(sample => `${sample.position}:${sample.role}:${sample.duty}`))];
const BAND_LABEL: Record<ReliabilityBand, string> = {
  insufficient: 'Insufficient', low: 'Low evidence', usable: 'Usable', strong: 'Strong evidence',
};
const BAND_STYLE: Record<ReliabilityBand, string> = {
  insufficient: 'border-rose-400/40 bg-rose-400/10 text-rose-200',
  low: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  usable: 'border-sky-400/40 bg-sky-400/10 text-sky-200',
  strong: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
};

function formatRole(key: string) {
  const [position, role, duty] = key.split(':');
  return `${position} · ${role} (${duty})`;
}

function ScoreTrack({ raw, adjusted }: { raw: number; adjusted: number }) {
  return (
    <div className="relative mt-3 h-7" aria-label={`Raw ${raw}, adjusted ${adjusted}`}>
      <div className="absolute inset-x-0 top-3 h-px bg-slate-700" />
      <div className="absolute top-1.5 h-3 w-3 -translate-x-1/2 rotate-45 border-2 border-fuchsia-300 bg-slate-950" style={{ left: `${raw}%` }} title={`Raw ${raw}`} />
      <div className="absolute top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_12px_#67e8f9]" style={{ left: `${adjusted}%` }} title={`Adjusted ${adjusted}`} />
      <span className="absolute left-0 top-5 text-[8px] text-slate-600">0</span>
      <span className="absolute right-0 top-5 text-[8px] text-slate-600">100</span>
    </div>
  );
}

function PlayerRow({ result, selected, rank, onSelect }: { result: RolePerformanceResult; selected: boolean; rank: number; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={`grid w-full grid-cols-[32px_minmax(160px,1.5fr)_90px_90px_90px_100px] items-center gap-3 border-t px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300 ${selected ? 'border-cyan-400/30 bg-cyan-400/[0.07]' : 'border-slate-800 hover:bg-white/[0.03]'}`}>
      <span className="font-mono text-sm text-slate-500">{String(rank).padStart(2, '0')}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-white">{result.playerName}</span>
        <span className="block text-[10px] text-slate-500">{result.roleMinutes.toLocaleString()} role-min · {result.starts} starts</span>
      </span>
      <span className="font-mono text-sm text-fuchsia-200">{result.rawPerformance}</span>
      <span className="font-mono text-sm font-black text-cyan-200">{result.adjustedPerformance}</span>
      <span className="font-mono text-sm font-black text-white">{result.evidenceScore}</span>
      <span className={`w-fit rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wide ${BAND_STYLE[result.reliabilityBand]}`}>{BAND_LABEL[result.reliabilityBand]}</span>
    </button>
  );
}

export function PlayerPerformanceMatrix() {
  const [roleKey, setRoleKey] = useState(ROLE_OPTIONS[0]);
  const roleSamples = useMemo(() => PLAYER_PERFORMANCE_MOCK.filter(sample => `${sample.position}:${sample.role}:${sample.duty}` === roleKey), [roleKey]);
  const results = useMemo(() => rankComparableSamples(roleSamples, PERFORMANCE_METRICS_BY_ROLE), [roleSamples]);
  const [selectedSampleId, setSelectedSampleId] = useState('');
  const selected = results.find(result => result.sampleId === selectedSampleId) ?? results[0];

  return (
    <div className="min-h-screen bg-[#070c16] text-slate-100">
      <header className="border-b border-slate-800 bg-[#090f1c]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-xs font-bold text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            <ArrowLeft className="h-4 w-4" /> Tactical builder
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{PLAYER_PERFORMANCE_MODEL_VERSION}</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-4 py-7 sm:px-6 lg:py-10">
        <section className="grid gap-8 border-b border-slate-800 pb-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="mb-4 flex items-center gap-2 text-cyan-300"><FlaskConical className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-[0.24em]">Role evidence laboratory</span></div>
            <h1 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.04em] text-white sm:text-6xl">Angka bagus belum tentu bukti yang kuat.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-400">Matrix memisahkan capacity atribut, performa mentah, dan performa setelah penyesuaian sampel. Minutes dan opportunity memperkuat evidence—tidak membeli poin kualitas.</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Cara membaca marker</p>
            <div className="mt-4 flex items-center gap-5 text-xs text-slate-300">
              <span className="flex items-center gap-2"><i className="h-3 w-3 rotate-45 border-2 border-fuchsia-300" /> Raw statistic</span>
              <span className="flex items-center gap-2"><i className="h-4 w-1 rounded-full bg-cyan-300" /> Reliability-adjusted</span>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-slate-500">Jarak besar antar-marker berarti hasil mentah masih banyak dipengaruhi ketidakpastian sampel.</p>
          </div>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.55fr)]">
          <div className="min-w-0 space-y-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <label>
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Comparable role cohort</span>
                <select value={roleKey} onChange={event => { setRoleKey(event.target.value); setSelectedSampleId(''); }} className="min-w-[280px] rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-cyan-300">
                  {ROLE_OPTIONS.map(option => <option key={option} value={option}>{formatRole(option)}</option>)}
                </select>
              </label>
              <p className="text-[11px] text-slate-500">Ranking: adjusted performance − uncertainty penalty</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50 shadow-2xl shadow-black/20">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[32px_minmax(160px,1.5fr)_90px_90px_90px_100px] gap-3 px-4 py-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                  <span>#</span><span>Player / sample</span><span>Raw</span><span>Adjusted</span><span>Evidence</span><span>Reliability</span>
                </div>
                {results.map((result, index) => <PlayerRow key={result.sampleId} result={result} selected={selected.sampleId === result.sampleId} rank={index + 1} onSelect={() => setSelectedSampleId(result.sampleId)} />)}
              </div>
            </div>

            {selected && <div className="grid gap-3 md:grid-cols-3">
              {selected.metrics.map(metric => (
                <article key={metric.metricId} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                  <div className="flex items-start justify-between gap-3"><h3 className="text-xs font-bold text-slate-200">{metric.label}</h3><span className="font-mono text-[10px] text-slate-500">n={metric.opportunities}</span></div>
                  <ScoreTrack raw={metric.rawScore} adjusted={metric.adjustedScore} />
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-800 pt-3 text-center">
                    <div><p className="font-mono text-sm font-bold text-fuchsia-200">{metric.rawValue}{metric.unit}</p><p className="text-[8px] uppercase text-slate-600">Raw</p></div>
                    <div><p className="font-mono text-sm font-bold text-cyan-200">{metric.adjustedValue}{metric.unit}</p><p className="text-[8px] uppercase text-slate-600">Adjusted</p></div>
                    <div><p className="font-mono text-sm font-bold text-white">{Math.round(metric.reliability * 100)}%</p><p className="text-[8px] uppercase text-slate-600">Trust</p></div>
                  </div>
                  <p className="mt-3 text-[10px] leading-4 text-slate-500">{metric.explanation}</p>
                </article>
              ))}
            </div>}
          </div>

          {selected && <aside className="space-y-4 xl:sticky xl:top-5 xl:self-start">
            <article className="overflow-hidden rounded-2xl border border-slate-700 bg-[#101827]">
              <div className="border-b border-slate-700 bg-[linear-gradient(115deg,rgba(34,211,238,.12),transparent_55%)] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Evidence inspector</p>
                <h2 className="mt-2 text-2xl font-black text-white">{selected.playerName}</h2>
                <p className="mt-1 text-xs text-slate-400">{selected.roleLabel}</p>
              </div>
              <div className="grid grid-cols-2 gap-px bg-slate-700">
                <div className="bg-[#101827] p-4"><p className="text-[9px] uppercase tracking-wider text-slate-500">Role-minutes</p><p className="mt-1 font-mono text-2xl font-black text-white">{selected.roleMinutes.toLocaleString()}</p></div>
                <div className="bg-[#101827] p-4"><p className="text-[9px] uppercase tracking-wider text-slate-500">Reliability</p><p className="mt-1 font-mono text-2xl font-black text-cyan-200">{Math.round(selected.reliability * 100)}%</p></div>
                <div className="bg-[#101827] p-4"><p className="text-[9px] uppercase tracking-wider text-slate-500">Attribute capacity</p><p className="mt-1 font-mono text-2xl font-black text-violet-200">{selected.attributeCapacity}</p></div>
                <div className="bg-[#101827] p-4"><p className="text-[9px] uppercase tracking-wider text-slate-500">Evidence score</p><p className="mt-1 font-mono text-2xl font-black text-emerald-200">{selected.evidenceScore}</p></div>
              </div>
              <div className="p-5">
                <div className="flex items-start gap-3"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><p className="text-xs leading-5 text-slate-300">{selected.diagnosis}</p></div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                  <span className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 p-2"><Clock3 className="h-3.5 w-3.5 text-cyan-300" />{selected.starts} starts + {selected.substituteSegments} sub segments</span>
                  <span className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 p-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />Stability {Math.round(selected.stability * 100)}%</span>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="flex items-center gap-2 text-xs font-black text-white"><Target className="h-4 w-4 text-fuchsia-300" />Engine behavior</div>
              <p className="mt-3 text-[11px] leading-5 text-slate-400">Role-minutes dan event count meningkatkan trust. Stability hanya memperhalus confidence. Total minutes dari role lain tidak ikut dihitung.</p>
            </article>
          </aside>}
        </section>
      </main>
    </div>
  );
}
