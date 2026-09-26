'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Player,
  TacticSlot,
  TeamInstructions,
  FormationTemplate,
  Position,
  Mentality,
  DEFAULT_TEAM_INSTRUCTIONS,
} from '../types';
import { DEMO_SQUADS } from '../data/demoSquads';
import { FORMATION_TEMPLATES, detectFormationShape } from '../engine/formations';
import { getRolesByPosition } from '../engine/roles';
import { auditTactics, calculateTacticalHealth } from '../engine/validator';
import { PitchBoard } from '../components/PitchBoard';
import { GuidelineGuardPanel } from '../components/GuidelineGuardPanel';
import { SquadListPanel } from '../components/SquadListPanel';
import { PlayerAttributesModal } from '../components/PlayerAttributesModal';
import { Header } from '../components/Header';
import { PlayerSlotModal } from '../components/PlayerSlotModal';
import { TeamInstructionsModal } from '../components/TeamInstructionsModal';
import { RecommenderModal } from '../components/RecommenderModal';
import { SandboxModal } from '../components/SandboxModal';
import { SquadImporterModal } from '../components/SquadImporterModal';
import {
  Users,
  Info,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  Sparkles,
  AlertTriangle,
  Sliders,
  LayoutGrid,
  RotateCcw,
  ChevronDown,
  Save,
  Check,
} from 'lucide-react';

export default function Home() {
  // Skuad aktif (default London Red)
  const [squadName, setSquadName] = useState<string>(DEMO_SQUADS[0].name);
  const [players, setPlayers] = useState<Player[]>(DEMO_SQUADS[0].players);

  // Formasi & Slot Lapangan
  const [currentFormation, setCurrentFormation] = useState<FormationTemplate>(FORMATION_TEMPLATES[6]); // Asym 3-2-4-1
  const [slots, setSlots] = useState<TacticSlot[]>(() => {
    // Inisialisasi slot awal dengan auto-assign pemain demo
    const initialSlots: TacticSlot[] = FORMATION_TEMPLATES[6].slots.map((s, idx) => ({
      ...s,
      assignedPlayerId: DEMO_SQUADS[0].players[idx]?.id,
      customPIs: [],
    }));
    return initialSlots;
  });

  // Instruksi Tim
  const [teamInstructions, setTeamInstructions] = useState<TeamInstructions>(DEFAULT_TEAM_INSTRUCTIONS);

  // Slot yang sedang dipilih untuk diedit
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  // Tab switcher kolom kanan: 'analyzer' (Guideline Guard) vs 'squad' (Squad List)
  const [rightPanelTab, setRightPanelTab] = useState<'analyzer' | 'squad'>('analyzer');

  // Pemain yang sedang dilihat atributnya di modal
  const [viewingAttributesPlayer, setViewingAttributesPlayer] = useState<Player | null>(null);

  // Modal states
  const [isRecommenderOpen, setIsRecommenderOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);

  // Persistence State
  const [isHydrated, setIsHydrated] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // 1. Restore from localStorage on initial client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fm24_saved_tactic_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.slots && Array.isArray(parsed.slots) && parsed.slots.length > 0) {
          setSlots(parsed.slots);
        }
        if (parsed.teamInstructions) {
          setTeamInstructions(parsed.teamInstructions);
        }
        if (parsed.squadName) {
          setSquadName(parsed.squadName);
          const matchedSquad = DEMO_SQUADS.find(s => s.name === parsed.squadName);
          if (matchedSquad) setPlayers(matchedSquad.players);
        }
        if (parsed.currentFormationId) {
          const found = FORMATION_TEMPLATES.find(f => f.id === parsed.currentFormationId);
          if (found) setCurrentFormation(found);
        }
        setLastSaved('Tersimpan');
      }
    } catch (e) {
      console.error('Gagal memulihkan taktik tersimpan', e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // 2. Persist to localStorage whenever formation, slots, or teamInstructions change
  useEffect(() => {
    if (!isHydrated) return;
    try {
      const dataToSave = {
        slots,
        teamInstructions,
        squadName,
        currentFormationId: currentFormation.id,
        savedAt: Date.now(),
      };
      localStorage.setItem('fm24_saved_tactic_v1', JSON.stringify(dataToSave));
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      console.error('Gagal menyimpan taktik otomatis', e);
    }
  }, [slots, teamInstructions, squadName, currentFormation, isHydrated]);

  // Map pemain untuk lookup O(1)
  const playersMap = useMemo(() => {
    const map = new Map<string, Player>();
    players.forEach(p => map.set(p.id, p));
    return map;
  }, [players]);

  // LIVE GUIDELINE GUARD AUDIT (Aturan Resmi FM24 + GuideToFootball)
  const tacticalIssues = useMemo(() => {
    return auditTactics(slots, teamInstructions, playersMap);
  }, [slots, teamInstructions, playersMap]);

  // LIVE LAYERED TACTICAL HEALTH AUDIT (Posisi Inti, Ruang, Duty, Instruksi)
  const healthResult = useMemo(() => {
    return calculateTacticalHealth(slots, tacticalIssues);
  }, [slots, tacticalIssues]);

  const healthScore = healthResult.score;
  const dangerCount = useMemo(() => tacticalIssues.filter(i => i.severity === 'danger').length, [tacticalIssues]);
  const warningCount = useMemo(() => tacticalIssues.filter(i => i.severity === 'warning').length, [tacticalIssues]);

  // Posisi yang memiliki warning untuk di-highlight di lapangan
  const affectedPositions = useMemo(() => {
    const positions: string[] = [];
    tacticalIssues.forEach(issue => {
      if (issue.affectedPositions) {
        positions.push(...issue.affectedPositions);
      }
    });
    return positions;
  }, [tacticalIssues]);

  // LIVE DETECTED FORMATION (Bentuk taktis, rest defence, dan duty distribution real-time)
  const detectedFormation = useMemo(() => {
    return detectFormationShape(slots);
  }, [slots]);

  // Deteksi apakah slot saat ini sudah dikustomisasi atau bergeser dari template preset asli
  const isCustomizedFromPreset = useMemo(() => {
    if (slots.length !== currentFormation.slots.length) return true;
    return slots.some((s) => {
      const orig = currentFormation.slots.find((os) => os.slotId === s.slotId);
      if (!orig) return true;
      return orig.x !== s.x || orig.y !== s.y || orig.position !== s.position;
    });
  }, [slots, currentFormation]);

  // Handle Ubah Formasi (Smart Non-Duplicate Assignment & Fix Re-selection Bug)
  const handleSelectFormation = (formation: FormationTemplate) => {
    setCurrentFormation(formation);
    const assignedIds = new Set<string>();

    const newSlots: TacticSlot[] = formation.slots.map((s) => {
      // 1. Coba cari pemain dari slot sebelumnya dengan posisi sama yang belum dipakai
      const match = slots.find(
        (oldS) =>
          oldS.position === s.position &&
          oldS.assignedPlayerId &&
          !assignedIds.has(oldS.assignedPlayerId)
      );
      if (match?.assignedPlayerId) {
        assignedIds.add(match.assignedPlayerId);
        return {
          ...s,
          assignedPlayerId: match.assignedPlayerId,
          customPIs: [],
        };
      }

      // 2. Coba cari pemain di skuad yang posisi natural/accomplished-nya cocok dan belum dipakai
      const squadMatch = players.find(
        (p) =>
          p.positions.some(
            (pos) =>
              pos.position === s.position &&
              (pos.familiarity === 'Natural' || pos.familiarity === 'Accomplished')
          ) && !assignedIds.has(p.id)
      );
      if (squadMatch) {
        assignedIds.add(squadMatch.id);
        return {
          ...s,
          assignedPlayerId: squadMatch.id,
          customPIs: [],
        };
      }

      // 3. Fallback ke pemain skuad manapun yang belum dipakai
      const fallback = players.find((p) => !assignedIds.has(p.id));
      if (fallback) {
        assignedIds.add(fallback.id);
      }
      return {
        ...s,
        assignedPlayerId: fallback?.id,
        customPIs: [],
      };
    });

    setSlots(newSlots);

    // Terapkan default instruksi dari template jika ada
    if (formation.defaultInstructions) {
      setTeamInstructions((prev) => ({
        ...prev,
        ...formation.defaultInstructions,
      }));
    }
  };

  // Handle Terapkan Formasi dari Rekomendasi AI
  const handleApplyRecommendedFormation = (newSlots: TacticSlot[]) => {
    setSlots(newSlots);
  };

  // Handle Ganti Skuad
  const handleSelectSquad = (newSquadName: string, newPlayers: Player[]) => {
    setSquadName(newSquadName);
    setPlayers(newPlayers);
    // Assign pemain ke slot yang ada
    const updatedSlots: TacticSlot[] = slots.map((s, idx) => ({
      ...s,
      assignedPlayerId: newPlayers[idx]?.id,
    }));
    setSlots(updatedSlots);
  };

  // Handle Update Slot Tertentu
  const handleUpdateSlot = (updatedSlot: TacticSlot) => {
    setSlots(prev => prev.map(s => s.slotId === updatedSlot.slotId ? updatedSlot : s));
  };

  // Handle Tugaskan Pemain ke Slot Tertentu
  const handleAssignPlayerToSlot = (slotId: string, playerId: string) => {
    setSlots(prev => {
      return prev.map(s => {
        // Jika slot ini adalah target:
        if (s.slotId === slotId) {
          return { ...s, assignedPlayerId: playerId };
        }
        // Jika pemain tersebut sebelumnya ada di slot lain, kosongkan slot lama
        if (s.assignedPlayerId === playerId) {
          return { ...s, assignedPlayerId: undefined };
        }
        return s;
      });
    });
  };

  // Drag and Drop: Tukar Pemain Antar Slot (Swap)
  const handleSwapSlots = (sourceSlotId: string, targetSlotId: string) => {
    setSlots(prev => {
      const sourceSlot = prev.find(s => s.slotId === sourceSlotId);
      const targetSlot = prev.find(s => s.slotId === targetSlotId);
      if (!sourceSlot || !targetSlot) return prev;

      return prev.map(s => {
        if (s.slotId === sourceSlotId) {
          return { ...s, assignedPlayerId: targetSlot.assignedPlayerId };
        }
        if (s.slotId === targetSlotId) {
          return { ...s, assignedPlayerId: sourceSlot.assignedPlayerId };
        }
        return s;
      });
    });
  };

  // Drag and Drop: Geser Koordinat Slot di Lapangan (Snap ke Skeleton Posisi)
  const handleMoveSlot = (slotId: string, newX: number, newY: number, newPosition?: Position) => {
    setSlots(prev => {
      return prev.map(s => {
        if (s.slotId === slotId) {
          const pos = newPosition || s.position;
          // Validasi apakah role lama masih ada di posisi baru
          const rolesForPos = getRolesByPosition(pos);
          const currentRoleStillValid = rolesForPos.some(r => r.id === s.roleId);
          const updatedRoleId = currentRoleStillValid ? s.roleId : (rolesForPos[0]?.id || s.roleId);

          return {
            ...s,
            x: newX,
            y: newY,
            position: pos,
            roleId: updatedRoleId,
          };
        }
        return s;
      });
    });
  };

  // Reset Koordinat Posisi ke Template Asli
  const handleResetPositions = () => {
    setSlots(prev => {
      return prev.map(s => {
        const origSlot = currentFormation.slots.find(os => os.slotId === s.slotId);
        if (origSlot) {
          return {
            ...s,
            x: origSlot.x,
            y: origSlot.y,
            position: origSlot.position,
            roleId: origSlot.roleId,
            duty: origSlot.duty,
          };
        }
        return s;
      });
    });
  };

  // Reset Keseluruhan Formasi & Instruksi ke Default Preset
  const handleResetToDefault = () => {
    if (typeof window !== 'undefined' && window.confirm('Kembalikan taktik dan formasi ke pengaturan awal?')) {
      localStorage.removeItem('fm24_saved_tactic_v1');
      const defaultTemplate = FORMATION_TEMPLATES[6];
      setCurrentFormation(defaultTemplate);
      const defaultSlots: TacticSlot[] = defaultTemplate.slots.map((s, idx) => ({
        ...s,
        assignedPlayerId: DEMO_SQUADS[0].players[idx]?.id,
        customPIs: [],
      }));
      setSlots(defaultSlots);
      setTeamInstructions(DEFAULT_TEAM_INSTRUCTIONS);
      setSquadName(DEMO_SQUADS[0].name);
      setPlayers(DEMO_SQUADS[0].players);
      setLastSaved('Direset');
    }
  };

  const selectedSlot = slots.find(s => s.slotId === selectedSlotId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Header
        onOpenRecommender={() => setIsRecommenderOpen(true)}
        onOpenSandbox={() => setIsSandboxOpen(true)}
        onOpenImporter={() => setIsImporterOpen(true)}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri / Lapangan 2D (7 Kolom) */}
        <div className="lg:col-span-7 flex flex-col items-center space-y-3">
          {/* ======================================================== */}
          {/* TACTICAL CONTROLS DI ATAS BOARD FORMASI                  */}
          {/* (Klub, Formasi, Instruksi Tim, Tactic Issues)           */}
          {/* ======================================================== */}
          <div className="w-full max-w-[620px] bg-slate-900/95 border border-slate-800 rounded-2xl p-3 shadow-xl space-y-2.5">
            {/* Baris 1: Klub Info, Tactic Issues, dan Tombol Instruksi Tim */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              {/* Klub Info */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-semibold text-[11px]">Klub:</span>
                <button
                  onClick={() => setIsImporterOpen(true)}
                  className="font-bold text-white hover:text-cyan-300 flex items-center gap-1.5 group bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 hover:border-slate-700 transition cursor-pointer"
                  title="Ganti klub atau impor file skuad FM24 baru"
                >
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-cyan-200 group-hover:underline text-xs">{squadName}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                    {players.length} pemain
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-cyan-300" />
                </button>
              </div>

              {/* Mentality Quick Selector */}
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 font-semibold text-[11px] hidden sm:inline">Mentality:</span>
                <select
                  value={teamInstructions.mentality}
                  onChange={(e) => setTeamInstructions(prev => ({ ...prev, mentality: e.target.value as Mentality }))}
                  className={`bg-transparent font-bold focus:outline-none cursor-pointer text-xs ${
                    teamInstructions.mentality === 'positive' ? 'text-emerald-400' :
                    teamInstructions.mentality === 'attacking' ? 'text-amber-400' :
                    teamInstructions.mentality === 'very_attacking' ? 'text-rose-400' :
                    teamInstructions.mentality === 'defensive' ? 'text-sky-400' :
                    teamInstructions.mentality === 'very_defensive' ? 'text-blue-400' :
                    teamInstructions.mentality === 'cautious' ? 'text-teal-400' : 'text-slate-300'
                  }`}
                  title="Team Mentality (GuideToFootball): Mengatur toleransi risiko, urgensi, dan garis keterlibatan seluruh tim"
                >
                  <option value="very_defensive" className="bg-slate-900 text-blue-400">Very Defensive</option>
                  <option value="defensive" className="bg-slate-900 text-sky-400">Defensive</option>
                  <option value="cautious" className="bg-slate-900 text-teal-400">Cautious</option>
                  <option value="balanced" className="bg-slate-900 text-slate-300">Balanced</option>
                  <option value="positive" className="bg-slate-900 text-emerald-400">Positive</option>
                  <option value="attacking" className="bg-slate-900 text-amber-400">Attacking</option>
                  <option value="very_attacking" className="bg-slate-900 text-rose-400">Very Attacking</option>
                </select>
              </div>

              {/* Tactic Issues & Instruksi Tim */}
              <div className="flex items-center gap-2">
                {/* Tactic Issues / Health Badge */}
                <button
                  onClick={() => setRightPanelTab('analyzer')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    !healthResult.isLayer1Valid
                      ? 'bg-rose-950 text-rose-200 border-rose-600 shadow-lg shadow-rose-950/60 animate-pulse'
                      : dangerCount === 0 && warningCount === 0
                      ? 'bg-emerald-950/70 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/60'
                      : dangerCount > 0
                      ? 'bg-rose-950/70 border-rose-700/80 text-rose-300 hover:bg-rose-900/60 animate-pulse'
                      : 'bg-amber-950/70 border-amber-700/80 text-amber-300 hover:bg-amber-900/60'
                  }`}
                  title={!healthResult.isLayer1Valid ? `Pelanggaran Fatal: ${healthResult.fatalError}` : "Klik untuk membuka Formation Analyzer di panel kanan"}
                >
                  {!healthResult.isLayer1Valid ? (
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                  ) : dangerCount === 0 && warningCount === 0 ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span>Taktik: {healthScore}%</span>
                  {!healthResult.isLayer1Valid ? (
                    <span className="text-[10px] bg-rose-600 text-white px-1.5 rounded-full font-black animate-pulse">
                      FATAL
                    </span>
                  ) : dangerCount > 0 ? (
                    <span className="text-[10px] bg-rose-600 text-white px-1.5 rounded-full font-black">
                      {dangerCount} Bahaya
                    </span>
                  ) : warningCount > 0 ? (
                    <span className="text-[10px] bg-amber-600 text-white px-1.5 rounded-full font-black">
                      {warningCount} Isu
                    </span>
                  ) : (
                    <span className="text-[10px] bg-emerald-800 text-emerald-200 px-1.5 rounded-full font-bold">
                      Seimbang
                    </span>
                  )}
                </button>

                {/* Tombol Instruksi Tim */}
                <button
                  onClick={() => setIsInstructionsOpen(true)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5 shadow cursor-pointer"
                  title="Buka panel instruksi taktik tim"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  <span>Instruksi Tim</span>
                </button>
              </div>
            </div>

            {/* Baris 2: Dropdown Formasi & Action Controls */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
              {/* Dropdown Formasi & Live Detected Shape */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs text-slate-300 flex-1 min-w-[240px]">
                <LayoutGrid className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-[11px] text-slate-500 font-semibold shrink-0">Preset:</span>
                <select
                  value={isCustomizedFromPreset ? 'custom' : currentFormation.id}
                  onChange={(e) => {
                    if (e.target.value === 'custom') return;
                    const found = FORMATION_TEMPLATES.find(f => f.id === e.target.value);
                    if (found) handleSelectFormation(found);
                  }}
                  className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs truncate max-w-[140px] sm:max-w-[180px]"
                >
                  {isCustomizedFromPreset && (
                    <option value="custom" className="bg-slate-900 text-amber-300 font-bold">
                      ⚡ Kustom ({detectedFormation.name})
                    </option>
                  )}
                  <optgroup label="Formasi Simetris (Baku)">
                    {FORMATION_TEMPLATES.filter(f => f.category !== 'asymmetric').map(f => (
                      <option key={f.id} value={f.id} className="bg-slate-900 text-white">
                        {f.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Formasi Asimetris (Rekayasa Khusus)">
                    {FORMATION_TEMPLATES.filter(f => f.category === 'asymmetric').map(f => (
                      <option key={f.id} value={f.id} className="bg-slate-900 text-purple-300">
                        {f.name}
                      </option>
                    ))}
                  </optgroup>
                </select>

                <div className="h-3 w-px bg-slate-800 shrink-0 mx-0.5" />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 shrink-0 whitespace-nowrap">
                  Live: {detectedFormation.name}
                </span>
              </div>

              {/* Auto-save Status & Reset Actions */}
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                {lastSaved && (
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-800">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Auto-Saved ({lastSaved})</span>
                  </span>
                )}
                <button
                  onClick={handleResetPositions}
                  className="px-2 py-1 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl flex items-center gap-1 transition text-xs font-semibold cursor-pointer"
                  title="Kembalikan koordinat posisi ke template default formasi"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Posisi</span>
                </button>
                <button
                  onClick={handleResetToDefault}
                  className="px-2 py-1 bg-slate-950 border border-rose-900/40 hover:border-rose-700 text-rose-400 hover:text-rose-200 rounded-xl flex items-center gap-1 transition text-xs font-semibold cursor-pointer"
                  title="Kembalikan formasi, peran, dan instruksi tim ke pengaturan default awal"
                >
                  <span>Reset Taktik</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Pitch Board with Drag-and-Drop */}
          <PitchBoard
            slots={slots}
            playersMap={playersMap}
            selectedSlotId={selectedSlotId}
            onSelectSlot={(slotId) => setSelectedSlotId(slotId)}
            onSwapSlots={handleSwapSlots}
            onMoveSlot={handleMoveSlot}
            onAssignPlayerToSlot={handleAssignPlayerToSlot}
            affectedPositions={affectedPositions}
          />

          {/* Banner Keterangan Taktis Formasi */}
          <div className="w-full max-w-[620px] p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 text-xs text-slate-300 shadow">
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-cyan-950 rounded border border-cyan-800">
                  <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <span className="font-bold text-white text-xs">{detectedFormation.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 border border-slate-700 font-bold">
                  {detectedFormation.code}
                </span>
                {detectedFormation.isAsymmetric && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    Asimetris
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-medium">{detectedFormation.structure}</span>
            </div>
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed text-slate-300">
                <span className="font-semibold text-slate-200">Preset Dasar:</span> {currentFormation.description}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span>Duty: <strong className="text-blue-300">{detectedFormation.dutyDistribution.defend}D</strong> / <strong className="text-amber-300">{detectedFormation.dutyDistribution.support}S</strong> / <strong className="text-emerald-300">{detectedFormation.dutyDistribution.attack}A</strong></span>
                  <span>•</span>
                  <span>Rest Defence: <strong className="text-cyan-300">{detectedFormation.restDefenceCount} Bek</strong> ({detectedFormation.restDefenceRating})</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan / Switcher Panel (5 Kolom): Formation Analyzer vs Squad List */}
        <div className="lg:col-span-5 h-[760px] flex flex-col">
          {/* Top Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl mb-3 shadow shrink-0">
            <button
              onClick={() => setRightPanelTab('analyzer')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                rightPanelTab === 'analyzer'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Formation Analyzer</span>
              {tacticalIssues.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    dangerCount > 0 ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'
                  }`}
                >
                  {tacticalIssues.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setRightPanelTab('squad')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                rightPanelTab === 'squad'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Squad List</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full font-bold">
                {players.length}
              </span>
            </button>
          </div>

          {/* Panel Content Body */}
          <div className="flex-1 overflow-hidden">
            {rightPanelTab === 'analyzer' ? (
              <GuidelineGuardPanel
                issues={tacticalIssues}
                slots={slots}
                teamInstructions={teamInstructions}
                playersMap={playersMap}
                onSelectSlot={(slotId) => setSelectedSlotId(slotId)}
                onSelectSlotPosition={(pos) => {
                  const matched = slots.find(s => s.position === pos);
                  if (matched) setSelectedSlotId(matched.slotId);
                }}
              />
            ) : (
              <SquadListPanel
                players={players}
                slots={slots}
                onOpenPlayerAttributes={(player) => setViewingAttributesPlayer(player)}
                onAssignPlayerToSlot={handleAssignPlayerToSlot}
                onSelectSlot={(slotId) => setSelectedSlotId(slotId)}
              />
            )}
          </div>
        </div>
      </main>

      {/* MODALS */}
      {/* 1. Modal Konfigurasi Slot Pemain */}
      {selectedSlot && (
        <PlayerSlotModal
          slot={selectedSlot}
          allSlots={slots}
          players={players}
          playersMap={playersMap}
          onClose={() => setSelectedSlotId(null)}
          onUpdateSlot={handleUpdateSlot}
          onOpenPlayerAttributes={(p) => setViewingAttributesPlayer(p)}
        />
      )}

      {/* 2. Modal Atribut Lengkap Pemain FM24 */}
      {viewingAttributesPlayer && (
        <PlayerAttributesModal
          player={viewingAttributesPlayer}
          currentPosition={slots.find(s => s.assignedPlayerId === viewingAttributesPlayer.id)?.position}
          currentRoleId={slots.find(s => s.assignedPlayerId === viewingAttributesPlayer.id)?.roleId}
          onClose={() => setViewingAttributesPlayer(null)}
          onAssignToSlot={handleAssignPlayerToSlot}
        />
      )}

      {/* 3. Modal Instruksi Tim */}
      {isInstructionsOpen && (
        <TeamInstructionsModal
          instructions={teamInstructions}
          onChange={setTeamInstructions}
          onClose={() => setIsInstructionsOpen(false)}
        />
      )}

      {/* 4. Modal Rekomendasi Formasi AI */}
      {isRecommenderOpen && (
        <RecommenderModal
          players={players}
          onApplyFormation={handleApplyRecommendedFormation}
          onClose={() => setIsRecommenderOpen(false)}
        />
      )}

      {/* 5. Modal Sandbox Tanding (Stress-Testing) */}
      {isSandboxOpen && (
        <SandboxModal
          slots={slots}
          teamInstructions={teamInstructions}
          playersMap={playersMap}
          onClose={() => setIsSandboxOpen(false)}
        />
      )}

      {/* 6. Modal Impor Skuad (FM24 HTML / Demo) */}
      {isImporterOpen && (
        <SquadImporterModal
          currentSquadId={DEMO_SQUADS.find(s => s.name === squadName)?.id || ''}
          onSelectSquad={handleSelectSquad}
          onClose={() => setIsImporterOpen(false)}
        />
      )}
    </div>
  );
}
