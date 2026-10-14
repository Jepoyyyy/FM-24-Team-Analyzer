'use client';

import React, { useMemo, useState } from 'react';
import { Player, TacticSlot, TeamInstructions } from '../types';
import {
  analyzeTacticalMatchupV2, createSimulationSnapshot, executeSimulationWithFallback,
  getOpponentProfileV2, isSnapshotStale, MatchupPhaseScoreV2, ScenarioResultV2,
  SimulationResultV2, SimulationSnapshotV2, TacticalMatchupV2,
} from '../engine/v2';
import { SANDBOX_OPPONENTS } from '../engine/sandbox';
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, FlaskConical, Play, RotateCcw, Shield, Swords, X, Zap } from 'lucide-react';

interface SandboxModalProps {
  slots: TacticSlot[];
  teamInstructions: TeamInstructions;
  formationId: string;
  players: Player[];
  savedResult?: SimulationResultV2 | null;
  savedSnapshot?: SimulationSnapshotV2 | null;
  onSaveSimulation?: (result: SimulationResultV2, snapshot: SimulationSnapshotV2) => void;
  onClose: () => void;
}

const verdictLabels: Record<TacticalMatchupV2['verdict'], string> = {
  favourable: 'Menguntungkan', slight_edge: 'Unggul tipis', balanced: 'Berimbang',
  unfavourable: 'Tidak menguntungkan', severe_risk: 'Risiko berat',
};

function scoreTone(score: number) {
  if (score >= 65) return 'text-emerald-300 border-emerald-800/70 bg-emerald-950/35';
  if (score >= 45) return 'text-amber-300 border-amber-800/70 bg-amber-950/30';
  return 'text-rose-300 border-rose-800/70 bg-rose-950/35';
}

function phaseBar(score: number) {
  if (score >= 65) return 'bg-emerald-400';
  if (score >= 45) return 'bg-amber-400';
  return 'bg-rose-500';
}

function PhaseCard({ phase }: { phase: MatchupPhaseScoreV2 }) {
  return (
    <article className={`rounded-xl border p-3 ${scoreTone(phase.score)}`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div><div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">{phase.verdict}</div><h5 className="mt-0.5 text-xs font-black text-white">{phase.label}</h5></div>
        <div className="font-mono text-lg font-black">{phase.score}</div>
      </div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-950/70"><div className={`h-full ${phaseBar(phase.score)}`} style={{ width: `${phase.score}%` }} /></div>
      <p className="text-[10px] leading-relaxed text-slate-300">{phase.summary}</p>
      <div className="mt-2 space-y-1 border-t border-white/10 pt-2 text-[9px] leading-relaxed text-slate-400">
        <p><span className="text-slate-200">Struktur kita:</span> {phase.userEdge}</p>
        <p><span className="text-slate-200">Tekanan lawan:</span> {phase.opponentThreat}</p>
      </div>
    </article>
  );
}

export function SandboxModal({ slots, teamInstructions, formationId, players, savedResult, savedSnapshot, onSaveSimulation, onClose }: SandboxModalProps) {
  const playersMap = useMemo(() => Object.fromEntries(players.map(player => [player.id, player])), [players]);
  const currentSnapshot = useMemo(() => createSimulationSnapshot(formationId, slots, teamInstructions, playersMap), [formationId, slots, teamInstructions, playersMap]);
  const [activeSnapshot, setActiveSnapshot] = useState<SimulationSnapshotV2 | null>(savedSnapshot || null);
  const [simulationResult, setSimulationResult] = useState<SimulationResultV2 | null>(savedResult || null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [completedScenarios, setCompletedScenarios] = useState(0);
  const [selectedOpponentId, setSelectedOpponentId] = useState(SANDBOX_OPPONENTS[0].id);
  const [selectedTier, setSelectedTier] = useState<'below' | 'equal' | 'above'>('equal');

  const matchupByOpponent = useMemo(() => Object.fromEntries(SANDBOX_OPPONENTS.map(opponent => {
    const profile = getOpponentProfileV2(opponent.id);
    return [opponent.id, analyzeTacticalMatchupV2(currentSnapshot, profile, playersMap)];
  })), [currentSnapshot, playersMap]);
  const activeMatchup = matchupByOpponent[selectedOpponentId];
  const isStale = useMemo(() => !!activeSnapshot && !!simulationResult && isSnapshotStale(currentSnapshot, activeSnapshot), [currentSnapshot, activeSnapshot, simulationResult]);
  const activeScenario: ScenarioResultV2 | undefined = useMemo(() => {
    if (!simulationResult || isStale) return undefined;
    return simulationResult.scenarios.find(scenario => scenario.opponentId === selectedOpponentId && scenario.capacityTier === selectedTier);
  }, [simulationResult, selectedOpponentId, selectedTier, isStale]);

  const handleStartSimulation = () => {
    setIsSimulating(true); setSimulationError(null); setProgress(0); setCompletedScenarios(0);
    const snapshotToRun = currentSnapshot;
    executeSimulationWithFallback(snapshotToRun, playersMap, { matchesPerScenario: 750 },
      (percentage, current) => { setProgress(percentage); setCompletedScenarios(current); },
      result => { setIsSimulating(false); setSimulationResult(result); setActiveSnapshot(snapshotToRun); onSaveSimulation?.(result, snapshotToRun); },
      error => { setIsSimulating(false); setSimulationError(error.message || 'Outcome simulation tidak dapat diselesaikan.'); }
    );
  };

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !isSimulating) onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isSimulating]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="sandbox-modal-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/90 p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl border border-cyan-700/60 bg-cyan-950/70 p-2.5 text-cyan-300"><Swords className="h-5 w-5" /></div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h3 id="sandbox-modal-title" className="text-base font-black text-white">Tactical Matchup Lab</h3><span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-400">4-phase engine</span></div>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">Diagnosis struktur lebih dulu. Simulasi hasil pertandingan bersifat opsional.</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isSimulating} aria-label="Tutup Sandbox" className="rounded-xl bg-slate-800 p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white disabled:opacity-40"><X className="h-5 w-5" /></button>
        </header>

        {isStale && <div className="flex items-center justify-between gap-3 border-b border-amber-800/70 bg-amber-950/50 px-4 py-2 text-[11px] text-amber-200"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Taktik berubah. Diagnosis sudah diperbarui; hasil probabilistik lama disembunyikan.</span><button onClick={handleStartSimulation} className="shrink-0 font-black text-amber-300 hover:text-white">Perbarui outcome</button></div>}
        {isSimulating && <div className="border-b border-slate-800 bg-slate-950 px-4 py-3"><div className="mb-2 flex justify-between text-[11px] font-bold text-slate-300"><span>Menguji variasi outcome dari diagnosis matchup…</span><span>{progress}% · {completedScenarios}/24</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-cyan-400 transition-all" style={{ width: `${progress}%` }} /></div></div>}
        {simulationError && <div className="flex items-center justify-between border-b border-rose-900 bg-rose-950/50 px-4 py-2 text-[11px] text-rose-200"><span>{simulationError}</span><button onClick={handleStartSimulation} className="font-black text-rose-300 hover:text-white">Coba lagi</button></div>}

        <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-slate-800 overflow-hidden md:grid-cols-[250px_1fr] md:divide-x md:divide-y-0">
          <aside className="overflow-y-auto bg-slate-950/55 p-3">
            <div className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Pilih pola lawan</div>
            <div className="space-y-1.5">{SANDBOX_OPPONENTS.map(opponent => {
              const matchup = matchupByOpponent[opponent.id]; const selected = selectedOpponentId === opponent.id;
              return <button key={opponent.id} onClick={() => setSelectedOpponentId(opponent.id)} className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${selected ? 'border-cyan-500 bg-cyan-950/35 ring-1 ring-cyan-500/30' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'}`}><span className="min-w-0"><span className="block truncate text-[11px] font-bold text-white">{opponent.name}</span><span className="mt-0.5 block text-[9px] text-slate-500">{opponent.formation}</span></span><span className={`font-mono text-sm font-black ${matchup.overallScore >= 65 ? 'text-emerald-400' : matchup.overallScore >= 45 ? 'text-amber-400' : 'text-rose-400'}`}>{matchup.overallScore}</span></button>;
            })}</div>
          </aside>

          <main className="overflow-y-auto bg-slate-900 p-4 text-xs sm:p-5">
            <section className="mb-5 grid gap-4 border-b border-slate-800 pb-5 lg:grid-cols-[1fr_auto] lg:items-start">
              <div><div className="mb-2 flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${scoreTone(activeMatchup.overallScore)}`}>{verdictLabels[activeMatchup.verdict]}</span><span className="text-[10px] text-slate-500">Confidence diagnosis {activeMatchup.confidence}%</span></div><h4 className="max-w-2xl text-lg font-black leading-tight text-white">{activeMatchup.headline}</h4><p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-slate-400">Skor {activeMatchup.overallScore}/100 berasal dari interaksi struktur pada empat fase, bukan dari win rate.</p></div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3"><div className={`font-mono text-3xl font-black ${activeMatchup.overallScore >= 65 ? 'text-emerald-400' : activeMatchup.overallScore >= 45 ? 'text-amber-400' : 'text-rose-400'}`}>{activeMatchup.overallScore}</div><div className="text-[9px] uppercase leading-relaxed tracking-wider text-slate-500">Tactical<br />matchup</div></div>
            </section>

            <section className="mb-5"><div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400"><Activity className="h-3.5 w-3.5 text-cyan-400" />Peta empat fase</div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{activeMatchup.phases.map(phase => <PhaseCard key={phase.id} phase={phase} />)}</div></section>

            <section className="mb-5 grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4"><div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400"><Shield className="h-3.5 w-3.5 text-rose-400" />Akar masalah & evidence</div><div className="space-y-3">{activeMatchup.rootCauses.map(cause => <article key={cause.id} className="border-l-2 border-slate-700 pl-3"><div className={`text-[11px] font-black ${cause.severity === 'critical' ? 'text-rose-300' : cause.severity === 'warning' ? 'text-amber-300' : 'text-emerald-300'}`}>{cause.title}</div><p className="mt-1 text-[10px] leading-relaxed text-slate-300">{cause.explanation}</p><div className="mt-1.5 flex flex-wrap gap-1">{cause.evidence.map(item => <span key={item} className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[8px] text-slate-400">{item}</span>)}</div></article>)}</div></div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4"><div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400"><Zap className="h-3.5 w-3.5 text-amber-400" />Penyesuaian dengan trade-off</div>{activeMatchup.adjustments.length ? <div className="space-y-3">{activeMatchup.adjustments.map(adjustment => <article key={adjustment.id}><p className="text-[11px] font-bold leading-relaxed text-white">{adjustment.action}</p><div className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[9px] leading-relaxed"><CheckCircle2 className="mt-0.5 h-3 w-3 text-emerald-400" /><span className="text-slate-300">{adjustment.expectedBenefit}</span><ArrowRight className="mt-0.5 h-3 w-3 text-amber-400" /><span className="text-slate-400">Trade-off: {adjustment.tradeOff}</span></div></article>)}</div> : <p className="text-[10px] leading-relaxed text-slate-400">Tidak ada perubahan struktural mendesak. Sesuaikan berdasarkan kualitas pemain dan game state.</p>}</div>
            </section>

            <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2 text-[11px] font-black text-white"><FlaskConical className="h-4 w-4 text-violet-400" />Outcome simulation <span className="rounded bg-violet-950 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-violet-300">opsional</span></div><p className="mt-1 text-[9px] text-slate-500">18.000 seeded rollouts untuk variasi box entry, turnover, xG, dan scoreline. Ini bukan sumber diagnosis.</p></div><button onClick={handleStartSimulation} disabled={isSimulating} className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-[10px] font-black text-white transition hover:bg-violet-500 disabled:opacity-50">{simulationResult && !isStale ? <RotateCcw className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-white" />}{simulationResult && !isStale ? 'Ulangi outcome' : 'Simulasikan outcome'}</button></div>
              {activeScenario && <div className="mt-4 border-t border-slate-800 pt-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex rounded-lg border border-slate-800 bg-slate-900 p-1">{(['below', 'equal', 'above'] as const).map(tier => <button key={tier} onClick={() => setSelectedTier(tier)} className={`rounded-md px-2.5 py-1 text-[9px] font-bold ${selectedTier === tier ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}>{tier === 'below' ? 'Lawan lebih lemah' : tier === 'equal' ? 'Setara' : 'Lawan lebih kuat'}</button>)}</div><span className="text-[9px] text-slate-500">750 rollouts/skenario · interval sampling, bukan kepastian model</span></div><div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-slate-800"><div className="bg-emerald-500" style={{ width: `${activeScenario.winRate}%` }} /><div className="bg-amber-500" style={{ width: `${activeScenario.drawRate}%` }} /><div className="bg-rose-500" style={{ width: `${activeScenario.lossRate}%` }} /></div><div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{[
                ['W/D/L', `${activeScenario.winRate}/${activeScenario.drawRate}/${activeScenario.lossRate}%`], ['xG', `${activeScenario.avgXGFor}–${activeScenario.avgXGAgainst}`], ['Box entry', `${activeScenario.avgBoxEntriesFor ?? '—'}–${activeScenario.avgBoxEntriesAgainst ?? '—'}`], ['Turnover bahaya', `${activeScenario.avgDangerousTurnovers ?? '—'}`], ['Possession', `${activeScenario.avgPossession}%`], ['Rata-rata gol', `${activeScenario.avgGoalsFor}–${activeScenario.avgGoalsAgainst}`],
              ].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-800 bg-slate-900/70 p-2"><div className="text-[8px] text-slate-500">{label}</div><div className="mt-0.5 font-mono text-[11px] font-black text-slate-200">{value}</div></div>)}</div></div>}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
