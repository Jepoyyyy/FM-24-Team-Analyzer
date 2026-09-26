'use client';

import React, { useState, useMemo } from 'react';
import { TacticSlot, TeamInstructions, Player } from '../types';
import {
  createSimulationSnapshot,
  isSnapshotStale,
  executeSimulationWithFallback,
  SimulationSnapshotV2,
  SimulationResultV2,
  ScenarioResultV2,
} from '../engine/v2';
import { SANDBOX_OPPONENTS } from '../engine/sandbox';
import {
  X,
  Swords,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
} from 'lucide-react';

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

export function SandboxModal({
  slots,
  teamInstructions,
  formationId,
  players,
  savedResult,
  savedSnapshot,
  onSaveSimulation,
  onClose,
}: SandboxModalProps) {
  const playersMap = useMemo(() => {
    const map: Record<string, Player> = {};
    players.forEach(p => {
      map[p.id] = p;
    });
    return map;
  }, [players]);

  const currentSnapshot = useMemo(() => {
    return createSimulationSnapshot(formationId, slots, teamInstructions, playersMap);
  }, [formationId, slots, teamInstructions, playersMap]);

  const [activeSnapshot, setActiveSnapshot] = useState<SimulationSnapshotV2 | null>(savedSnapshot || null);
  const [simulationResult, setSimulationResult] = useState<SimulationResultV2 | null>(savedResult || null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completedScenarios, setCompletedScenarios] = useState(0);

  // Selected filters
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>(SANDBOX_OPPONENTS[0].id);
  const [selectedTier, setSelectedTier] = useState<'below' | 'equal' | 'above'>('equal');

  // Check if active simulation is stale
  const isStale = useMemo(() => {
    if (!activeSnapshot || !simulationResult) return false;
    return isSnapshotStale(currentSnapshot, activeSnapshot);
  }, [currentSnapshot, activeSnapshot, simulationResult]);

  // Start / Regenerate Simulation
  const handleStartSimulation = () => {
    setIsSimulating(true);
    setProgress(0);
    setCompletedScenarios(0);

    const snapshotToRun = currentSnapshot;

    executeSimulationWithFallback(
      snapshotToRun,
      playersMap,
      { matchesPerScenario: 2000 },
      (pct, current) => {
        setProgress(pct);
        setCompletedScenarios(current);
      },
      (result) => {
        setIsSimulating(false);
        setSimulationResult(result);
        setActiveSnapshot(snapshotToRun);
        if (onSaveSimulation) {
          onSaveSimulation(result, snapshotToRun);
        }
      },
      (err) => {
        console.error('Simulation error', err);
        setIsSimulating(false);
      }
    );
  };

  // Find active scenario result
  const activeScenario: ScenarioResultV2 | undefined = useMemo(() => {
    if (!simulationResult) return undefined;
    return simulationResult.scenarios.find(
      s => s.opponentId === selectedOpponentId && s.capacityTier === selectedTier
    );
  }, [simulationResult, selectedOpponentId, selectedTier]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-rose-600 to-amber-500 rounded-xl text-white shadow">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Sandbox Monte Carlo Stress-Testing v2
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                  24 Skenario (48.000 Laga)
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Simulasi probabilistik 8 arketipe lawan x 3 kapasitas skuad berbobot (Below, Equal, Above)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stale Warning Banner */}
        {isStale && (
          <div className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Taktik telah berubah:</strong> Hasil simulasi di bawah terikat pada snapshot taktik sebelumnya (Outdated).
              </span>
            </div>
            <button
              onClick={handleStartSimulation}
              disabled={isSimulating}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-lg text-[11px] flex items-center gap-1 transition cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Regenerasi Simulasi</span>
            </button>
          </div>
        )}

        {/* Simulating Progress Bar */}
        {isSimulating && (
          <div className="bg-slate-950 p-4 border-b border-slate-800 text-center space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Menjalankan Simulasi Monte Carlo...</span>
              <span>{progress}% ({completedScenarios} / 24 Skenario)</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-400 h-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500">
              Memproses 2.000 pertandingan per skenario dengan seeded PRNG deterministik
            </div>
          </div>
        )}

        {/* Empty State */}
        {!simulationResult && !isSimulating && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950/40">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-4 shadow-xl">
              <Swords className="w-8 h-8 text-cyan-400" />
            </div>
            <h4 className="text-base font-black text-white mb-1">
              Belum Ada Simulasi Aktif untuk Taktik Ini
            </h4>
            <p className="text-xs text-slate-400 max-w-md mb-5 leading-relaxed">
              Sandbox v2 menguji ketahanan taktikmu melawan 8 formasi arkais FM24 pada 3 kapasitas tim (lemah, seimbang, superior) dengan total 48.000 simulasi.
            </p>
            <button
              onClick={handleStartSimulation}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-rose-950 flex items-center gap-2 transition cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Mulai Simulasi Monte Carlo</span>
            </button>
          </div>
        )}

        {/* Results Layout */}
        {simulationResult && !isSimulating && (
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800">
            {/* Kolom Kiri: 8 Arketipe Lawan */}
            <div className="p-4 overflow-y-auto space-y-2 bg-slate-950/40">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  8 Arketipe Lawan
                </label>
                <button
                  onClick={handleStartSimulation}
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Jalankan ulang simulasi"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Ulangi</span>
                </button>
              </div>

              {SANDBOX_OPPONENTS.map((opp) => {
                const isSelected = opp.id === selectedOpponentId;
                // Get scenario for selected tier
                const sc = simulationResult.scenarios.find(
                  s => s.opponentId === opp.id && s.capacityTier === selectedTier
                );

                return (
                  <button
                    key={opp.id}
                    onClick={() => setSelectedOpponentId(opp.id)}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-cyan-400 shadow-md ring-1 ring-cyan-400/50'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-white truncate max-w-[160px]">
                        {opp.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {opp.formation}
                      </div>
                    </div>

                    {sc && (
                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-cyan-400">
                          {sc.winRate}% M
                        </div>
                        <div className="text-[9px] text-slate-500">
                          xG: {sc.avgXGFor} - {sc.avgXGAgainst}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Kolom Kanan: Skenario Detail & Metrik Pertandingan */}
            <div className="md:col-span-2 p-5 overflow-y-auto space-y-5 bg-slate-900 text-xs">
              {activeScenario ? (
                <>
                  {/* Tier Selector: Below / Equal / Above */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <h4 className="text-base font-black text-white">
                        {activeScenario.opponentName}
                      </h4>
                      <div className="text-[11px] text-slate-400">
                        Formasi Lawan: {activeScenario.opponentFormation} • Kapasitas: User {activeScenario.userCapacityScore} vs Lawan {activeScenario.opponentCapacityScore}
                      </div>
                    </div>

                    <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => setSelectedTier('below')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          selectedTier === 'below'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Tier Di Bawah
                      </button>
                      <button
                        onClick={() => setSelectedTier('equal')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          selectedTier === 'equal'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Tier Seimbang
                      </button>
                      <button
                        onClick={() => setSelectedTier('above')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          selectedTier === 'above'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Tier Di Atas
                      </button>
                    </div>
                  </div>

                  {/* Outcome Distribution Bar (Exact 100%) */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-emerald-400">Menang {activeScenario.winRate}%</span>
                      <span className="text-amber-400">Imbang {activeScenario.drawRate}%</span>
                      <span className="text-rose-400">Kalah {activeScenario.lossRate}%</span>
                    </div>

                    <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-800">
                      <div className="bg-emerald-500 h-full" style={{ width: `${activeScenario.winRate}%` }} />
                      <div className="bg-amber-500 h-full" style={{ width: `${activeScenario.drawRate}%` }} />
                      <div className="bg-rose-500 h-full" style={{ width: `${activeScenario.lossRate}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>95% Confidence Interval: [{activeScenario.confidenceInterval[0]}%, {activeScenario.confidenceInterval[1]}%]</span>
                      <span>2.000 Pertandingan Monte Carlo</span>
                    </div>
                  </div>

                  {/* Match Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400">Tactical Advantage</div>
                      <div className="text-lg font-black text-cyan-400">{activeScenario.matchupRating}/100</div>
                      <div className="text-[9px] text-slate-500">Matchup Rating</div>
                    </div>

                    <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400">Ball Possession</div>
                      <div className="text-lg font-black text-emerald-400">{activeScenario.avgPossession}%</div>
                      <div className="text-[9px] text-slate-500">Penguasaan Bola</div>
                    </div>

                    <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400">Rata-rata Gol</div>
                      <div className="text-lg font-black text-white">
                        {activeScenario.avgGoalsFor} - {activeScenario.avgGoalsAgainst}
                      </div>
                      <div className="text-[9px] text-slate-500">Gol Tim vs Lawan</div>
                    </div>

                    <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400">Expected Goals (xG)</div>
                      <div className="text-lg font-black text-purple-400">
                        {activeScenario.avgXGFor} - {activeScenario.avgXGAgainst}
                      </div>
                      <div className="text-[9px] text-slate-500">xG For vs Against</div>
                    </div>
                  </div>

                  {/* Decisive Phase & Tactical Insights */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
                      <div className="font-bold text-emerald-300 mb-1.5 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Keunggulan Taktis Utama
                      </div>
                      <ul className="space-y-1 text-slate-300 text-[11px]">
                        {activeScenario.topAdvantages.map((adv, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-400">•</span>
                            <span>{adv}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40">
                      <div className="font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Titik Bahaya & Rekomendasi
                      </div>
                      <ul className="space-y-1 text-slate-300 text-[11px]">
                        {activeScenario.topRisks.map((risk, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-amber-400">•</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Snapshot Metadata Footer */}
                  <div className="text-[10px] text-slate-500 flex flex-wrap items-center justify-between pt-2 border-t border-slate-800">
                    <div>
                      Snapshot Hash: <code className="text-slate-400 font-mono">{activeSnapshot?.hash}</code>
                    </div>
                    <div>
                      Engine v{simulationResult.engineVersion} • Total {simulationResult.totalMatches.toLocaleString()} Pertandingan
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
