'use client';

import React, { useState } from 'react';
import { TacticSlot, Player, Duty, PlayerInstructionType } from '../types';
import { getRoleById, getRolesByPosition } from '../engine/roles';
import { calculateRoleSuitability } from '../engine/suitability';
import { getTailoredPIRecommendations } from '../engine/piEnhancer';
import {
  X,
  Lock,
  Sparkles,
  Check,
  User,
  Sliders,
  Eye,
  RotateCcw,
} from 'lucide-react';

interface PlayerSlotModalProps {
  slot: TacticSlot;
  allSlots: TacticSlot[];
  players: Player[];
  playersMap: Map<string, Player>;
  onClose: () => void;
  onUpdateSlot: (updatedSlot: TacticSlot) => void;
  onOpenPlayerAttributes?: (player: Player) => void;
}

export function PlayerSlotModal({
  slot,
  allSlots,
  players,
  playersMap,
  onClose,
  onUpdateSlot,
  onOpenPlayerAttributes,
}: PlayerSlotModalProps) {
  const [activeTab, setActiveTab] = useState<'role' | 'instructions'>('role');
  const currentRole = getRoleById(slot.roleId);
  const availableRoles = getRolesByPosition(slot.position);
  const currentPlayer = slot.assignedPlayerId ? playersMap.get(slot.assignedPlayerId) : undefined;

  // Hitung suitability
  const suitability = currentPlayer && currentRole
    ? calculateRoleSuitability(currentPlayer, currentRole, slot.position)
    : null;

  // Hitung Tailored PIs
  const tailoredPIs = currentPlayer && currentRole
    ? getTailoredPIRecommendations(currentPlayer, currentRole, slot, allSlots, playersMap)
    : [];

  const handlePlayerChange = (playerId: string) => {
    onUpdateSlot({
      ...slot,
      assignedPlayerId: playerId === 'none' ? undefined : playerId,
    });
  };

  const handleRoleChange = (roleId: string) => {
    const newRole = getRoleById(roleId);
    if (!newRole) return;
    const newDuty = newRole.availableDuties.includes(slot.duty) ? slot.duty : newRole.availableDuties[0];
    onUpdateSlot({
      ...slot,
      roleId,
      duty: newDuty,
    });
  };

  const handleDutyChange = (duty: Duty) => {
    onUpdateSlot({
      ...slot,
      duty,
    });
  };

  // Mutually exclusive pairs
  const MUTUALLY_EXCLUSIVE_PAIRS: Record<string, PlayerInstructionType> = {
    take_more_risks: 'fewer_risky_passes',
    fewer_risky_passes: 'take_more_risks',
    shoot_more_often: 'shoot_less_often',
    shoot_less_often: 'shoot_more_often',
    dribble_more: 'dribble_less',
    dribble_less: 'dribble_more',
    cut_inside_with_ball: 'run_wide_with_ball',
    run_wide_with_ball: 'cut_inside_with_ball',
    cross_more_often: 'cross_less_often',
    cross_less_often: 'cross_more_often',
    stay_wider: 'sit_narrower',
    sit_narrower: 'stay_wider',
    close_down_more: 'close_down_less',
    close_down_less: 'close_down_more',
    tackle_harder: 'ease_off_tackles',
    ease_off_tackles: 'tackle_harder',
    hold_position: 'roam_from_position',
    roam_from_position: 'hold_position',
  };

  const toggleCustomPI = (pi: PlayerInstructionType) => {
    // Cek apakah PI terkunci bawaan atau tidak kompatibel
    if (currentRole?.hardcodedPIs.includes(pi) || currentRole?.incompatiblePIs.includes(pi)) {
      return; // Locked!
    }

    const exists = slot.customPIs.includes(pi);
    let updated: PlayerInstructionType[];

    if (exists) {
      updated = slot.customPIs.filter(p => p !== pi);
    } else {
      // Hapus pasangan yang bertentangan jika ada
      const conflicting = MUTUALLY_EXCLUSIVE_PAIRS[pi];
      const filtered = conflicting ? slot.customPIs.filter(p => p !== conflicting) : slot.customPIs;
      updated = [...filtered, pi];
    }

    onUpdateSlot({
      ...slot,
      customPIs: updated,
    });
  };

  // Helper untuk render tombol Personal Instruction
  const renderPIButton = (
    pi: PlayerInstructionType,
    label: string,
    subtitle?: string
  ) => {
    const isHardcoded = currentRole?.hardcodedPIs.includes(pi);
    const isIncompatible = currentRole?.incompatiblePIs.includes(pi);
    const isCustomActive = slot.customPIs.includes(pi);

    if (isIncompatible) {
      return (
        <button
          key={pi}
          type="button"
          disabled
          className="p-2 rounded-xl text-xs border bg-slate-950/40 border-slate-800/80 text-slate-600 line-through cursor-not-allowed flex items-center justify-between opacity-50"
          title={`Tidak kompatibel dengan peran ${currentRole?.name}`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <Lock className="w-3 h-3 text-slate-700 shrink-0" />
            <span className="truncate">{label}</span>
          </div>
          <span className="text-[9px] uppercase font-bold text-slate-600 bg-slate-900 px-1.5 py-0.5 rounded">
            Dilarang
          </span>
        </button>
      );
    }

    if (isHardcoded) {
      return (
        <button
          key={pi}
          type="button"
          disabled
          className="p-2.5 rounded-xl text-xs border-2 bg-emerald-950/80 border-emerald-500/80 text-emerald-200 font-extrabold cursor-not-allowed flex items-center justify-between shadow-sm shadow-emerald-950"
          title={`Instruksi wajib bawaan terkunci dari peran ${currentRole?.name}`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{label}</span>
          </div>
          <span className="text-[9px] uppercase font-black text-emerald-300 bg-emerald-900/80 px-1.5 py-0.5 rounded border border-emerald-600 shrink-0">
            Wajib Peran 🔒
          </span>
        </button>
      );
    }

    return (
      <button
        key={pi}
        type="button"
        onClick={() => toggleCustomPI(pi)}
        className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
          isCustomActive
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-950 scale-[1.01]'
            : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:text-white hover:border-slate-500'
        }`}
      >
        <span className="truncate">{label}</span>
        {isCustomActive ? (
          <span className="text-[9px] uppercase font-black text-white bg-black/30 px-1.5 py-0.5 rounded border border-emerald-300 shrink-0 flex items-center gap-1">
            <Check className="w-2.5 h-2.5" />
            Aktif
          </span>
        ) : (
          subtitle && <span className="text-[10px] text-slate-500 font-normal shrink-0">{subtitle}</span>
        )}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center font-extrabold text-cyan-300 text-sm shadow">
              {slot.position}
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Konfigurasi Slot {slot.position}
                <span className="text-xs font-bold text-cyan-400">
                  ({currentRole?.name} • {slot.duty})
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Pilih peran, duty, dan atur instruksi individu (*Personal Instructions*)
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

        {/* Tab Switcher: Peran & Pemain vs Personal Instructions */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 text-xs font-bold gap-2">
          <button
            onClick={() => setActiveTab('role')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'role'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4 text-cyan-400" />
            <span>Pemain & Peran (Role)</span>
          </button>

          <button
            onClick={() => setActiveTab('instructions')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'instructions'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Personal Instructions (PI Studio)</span>
            {slot.customPIs.length > 0 && (
              <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded-full font-black">
                {slot.customPIs.length} Kustom
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 text-xs sm:text-sm bg-slate-950/30">
          {/* ======================================================== */}
          {/* TAB 1: PEMAIN & ROLE CONFIGURATION                      */}
          {/* ======================================================== */}
          {activeTab === 'role' && (
            <div className="space-y-5">
              {/* 1. Pilih Pemain */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Pemain yang Ditugaskan
                </label>
                <select
                  value={slot.assignedPlayerId || 'none'}
                  onChange={(e) => handlePlayerChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-pointer"
                >
                  <option value="none">-- Belum Ada Pemain (Kosong) --</option>
                  {players.map((p) => {
                    const isNatural = p.positions.some(
                      pos => pos.position === slot.position && pos.familiarity === 'Natural'
                    );
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.age} thn) {isNatural ? '★ Natural' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 2. Pilih Role & Duty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Peran (Role FM24)
                  </label>
                  <select
                    value={slot.roleId}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-pointer"
                  >
                    {availableRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Tugas (Duty)
                  </label>
                  <div className="flex gap-2">
                    {currentRole?.availableDuties.map((duty) => (
                      <button
                        key={duty}
                        onClick={() => handleDutyChange(duty)}
                        className={`flex-1 py-2 px-2 rounded-xl font-bold text-xs uppercase tracking-wide border transition cursor-pointer ${
                          slot.duty === duty
                            ? duty === 'Defend' || duty === 'Stopper' || duty === 'Cover'
                              ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-900/50'
                              : duty === 'Attack'
                              ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-900/50'
                              : 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-900/50 font-black'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {duty}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Deskripsi Role */}
              {currentRole && (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400">
                  <span className="font-bold text-slate-300 mr-1.5">{currentRole.name}:</span>
                  {currentRole.description}
                </div>
              )}

              {/* Suitability Score Box */}
              {suitability && (
                <div className="p-4 bg-gradient-to-r from-slate-950 to-slate-900 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Kecocokan Peran (Suitability)</div>
                    <div className="text-lg font-black text-white mt-0.5">
                      {suitability.score}%{' '}
                      <span className="text-amber-400 text-sm ml-1.5 font-bold">
                        {'★'.repeat(Math.floor(suitability.stars))}
                        {suitability.stars % 1 !== 0 ? '½' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-left sm:text-right text-xs text-slate-400">
                      <div>Rata-rata Key Attr: <span className="text-cyan-300 font-bold">{suitability.keyScoreAvg}</span></div>
                      <div>Rata-rata Desirable: <span className="text-slate-300 font-bold">{suitability.desirableScoreAvg}</span></div>
                    </div>
                    {currentPlayer && onOpenPlayerAttributes && (
                      <button
                        onClick={() => onOpenPlayerAttributes(currentPlayer)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                        title="Buka profil lengkap atribut FM24 pemain"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Profil Atribut</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Link ke Tab Personal Instructions */}
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-white">Instruksi Individu Pemain (PIs)</div>
                  <div className="text-[11px] text-slate-400">
                    {currentRole?.hardcodedPIs.length || 0} instruksi wajib terkunci 🔒 • {slot.customPIs.length} instruksi tambahan aktif
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('instructions')}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Buka PI Studio
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: PERSONAL INSTRUCTIONS STUDIO (WITH ROLE LOCKS)   */}
          {/* ======================================================== */}
          {activeTab === 'instructions' && (
            <div className="space-y-6">
              {/* Petunjuk Banner */}
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Instruksi dengan label <strong className="text-emerald-300">Wajib Peran 🔒</strong> terkunci permanen oleh role <strong>{currentRole?.name}</strong>. Instruksi bebas lainnya dapat diklik untuk diaktifkan (<strong className="text-emerald-400">Hijau</strong>).
                  </span>
                </div>
                {slot.customPIs.length > 0 && (
                  <button
                    onClick={() => onUpdateSlot({ ...slot, customPIs: [] })}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] rounded-lg transition shrink-0 cursor-pointer flex items-center gap-1"
                    title="Hapus semua instruksi kustom tambahan"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>

              {/* 1. Operan & Distribusi (Passing) */}
              <div>
                <h4 className="font-extrabold text-xs text-cyan-400 uppercase tracking-wider mb-2">
                  Operan & Risiko Distribusi (Passing)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {renderPIButton('take_more_risks', 'Take More Risks (Lepas Umpan Terobosan Berisiko)')}
                  {renderPIButton('fewer_risky_passes', 'Fewer Risky Passes (Operan Aman Terkendali)')}
                </div>
              </div>

              {/* 2. Tembakan (Shooting) */}
              <div className="pt-3 border-t border-slate-800">
                <h4 className="font-extrabold text-xs text-amber-400 uppercase tracking-wider mb-2">
                  Tembakan ke Gawang (Shooting)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {renderPIButton('shoot_more_often', 'Shoot More Often (Sering Menembak Jarak Jauh)')}
                  {renderPIButton('shoot_less_often', 'Shoot Less Often (Tahan Tembakan Spekulatif)')}
                </div>
              </div>

              {/* 3. Dribel & Manuver Bola */}
              <div className="pt-3 border-t border-slate-800">
                <h4 className="font-extrabold text-xs text-rose-400 uppercase tracking-wider mb-2">
                  Dribel & Jalur Membawa Bola (Dribbling)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {renderPIButton('dribble_more', 'Dribble More (Aktif Menusuk Melewati Lawan)')}
                  {renderPIButton('dribble_less', 'Dribble Less (Segera Alirkan Bola Tanpa Dribel)')}
                  {renderPIButton('cut_inside_with_ball', 'Cut Inside With Ball (Memotong ke Koridor Dalam)')}
                  {renderPIButton('run_wide_with_ball', 'Run Wide With Ball (Menyusuri Garis Tepi Luar)')}
                </div>
              </div>

              {/* 4. Umpan Silang (Crossing) */}
              <div className="pt-3 border-t border-slate-800">
                <h4 className="font-extrabold text-xs text-purple-400 uppercase tracking-wider mb-2">
                  Umpan Silang (Crossing)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {renderPIButton('cross_more_often', 'Cross More Often (Sering Melepaskan Umpan Silang)')}
                  {renderPIButton('cross_less_often', 'Cross Less Often (Jarang Mengumpan Silang)')}
                  {renderPIButton('cross_aim_near_post', 'Cross Aim Near Post (Target Tiang Dekat)')}
                  {renderPIButton('cross_aim_far_post', 'Cross Aim Far Post (Target Tiang Jauh)')}
                  {renderPIButton('cross_aim_target_forward', 'Cross Aim Target Forward (Target ke Penyerang Jangkung)')}
                </div>
              </div>

              {/* 5. Pergerakan Posisi (Positioning & Movement) */}
              <div className="pt-3 border-t border-slate-800">
                <h4 className="font-extrabold text-xs text-emerald-400 uppercase tracking-wider mb-2">
                  Pergerakan Posisi & Ruang (Movement)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {renderPIButton('stay_wider', 'Stay Wider (Menempel Garis Tepi Lapangan)')}
                  {renderPIButton('sit_narrower', 'Sit Narrower (Menyempit Menjaga Koridor Tengah)')}
                  {renderPIButton('move_into_channels', 'Move Into Channels (Menyusup Antara Bek Lawan)')}
                  {renderPIButton('roam_from_position', 'Roam From Position (Bebas Berkelana Mencari Ruang)')}
                  {renderPIButton('hold_position', 'Hold Position (Disiplin Menjaga Posisi Zonal)')}
                  {renderPIButton('get_further_forward', 'Get Further Forward (Maju Menyerbu Kotak Penalti)')}
                  {renderPIButton('hold_up_ball', 'Hold Up Ball (Menahan Bola Lindungi dengan Badan)')}
                  {renderPIButton('drop_deeper', 'Drop Deeper (Turun Menjemput Bola ke Lini Tengah)')}
                </div>
              </div>

              {/* 6. Bertahan & Pressing (Defending) */}
              <div className="pt-3 border-t border-slate-800">
                <h4 className="font-extrabold text-xs text-blue-400 uppercase tracking-wider mb-2">
                  Pressing, Duel, & Tekel (Defending)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {renderPIButton('close_down_more', 'Close Down More (Menekan Pemain Lawan Lebih Rapat)')}
                  {renderPIButton('close_down_less', 'Close Down Less (Menahan Diri Tidak Meninggalkan Barisan)')}
                  {renderPIButton('tackle_harder', 'Tackle Harder (Tekel Keras Agresif Rebut Bola)')}
                  {renderPIButton('ease_off_tackles', 'Ease Off Tackles (Hati-hati Bertahan Tanpa Pelanggaran)')}
                  {renderPIButton('mark_tighter', 'Mark Tighter (Kawal Pemain Lawan Sangat Melekat)')}
                </div>
              </div>

              {/* 7. AI Enhancer Rekomendasi Pintar */}
              {tailoredPIs.length > 0 && (
                <div className="p-3.5 bg-gradient-to-br from-cyan-950/40 to-emerald-950/40 rounded-xl border border-cyan-800/50 mt-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 mb-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Saran AI Berdasarkan Atribut Unik {currentPlayer?.name}:
                  </div>
                  <div className="space-y-2">
                    {tailoredPIs.map((rec) => {
                      const isApplied = slot.customPIs.includes(rec.recommendedPI);
                      return (
                        <div
                          key={rec.recommendedPI}
                          className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-700/60 flex items-start justify-between gap-3 text-xs"
                        >
                          <div>
                            <span className="font-bold text-white capitalize">
                              {rec.recommendedPI.replace(/_/g, ' ')}:
                            </span>{' '}
                            <span className="text-slate-300 text-[11px] leading-relaxed">
                              {rec.tacticalBenefit}
                            </span>
                          </div>
                          <button
                            onClick={() => toggleCustomPI(rec.recommendedPI)}
                            className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                              isApplied
                                ? 'bg-emerald-600 text-white shadow'
                                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow'
                            }`}
                          >
                            {isApplied ? 'Aktif' : 'Aktifkan'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Perubahan langsung tersimpan dan dianalisis secara real-time
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-cyan-900/40 transition cursor-pointer"
          >
            Selesai & Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
