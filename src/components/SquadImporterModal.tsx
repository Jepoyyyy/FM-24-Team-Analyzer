'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, LoaderCircle, ShieldAlert, UploadCloud, Users, X } from 'lucide-react';
import { DEMO_SQUADS } from '../data/demoSquads';
import { createImportDraft } from '../engine/parser';
import { ImportDraft } from '../types';

interface SquadImporterModalProps {
  currentSquadId: string;
  onSelectDemo: (squadId: string) => void;
  onConfirmImport: (draft: ImportDraft, squadName: string) => { success: boolean; error?: string };
  onClose: () => void;
}

type FileKind = 'attribute' | 'performance';

function coverageLabel(coverage: Record<string, number>, rows: number) {
  return `${Object.keys(coverage).length} field tersedia dari ${rows} baris`;
}

type HeaderCoverageStatus = 'mapped' | 'identity' | 'unmapped';

/**
 * Shows the parser's header-by-occurrence audit, rather than implying that a
 * raw header count means every column will influence Player Lab.  Keeping the
 * two views separate matters: Attribute columns feed capacity; Performance
 * columns feed observed evidence.
 */
function HeaderCoverageDetails({
  title,
  coverage,
  duplicates,
}: {
  title: string;
  coverage?: Record<string, HeaderCoverageStatus>;
  duplicates?: Array<{ header: string; occurrences: number }>;
}) {
  const entries = Object.entries(coverage ?? {});
  const buckets: Array<{ status: HeaderCoverageStatus; label: string; description: string; className: string }> = [
    { status: 'mapped', label: 'Mapped', description: 'dipakai oleh model', className: 'border-emerald-800/70 bg-emerald-950/25 text-emerald-100' },
    { status: 'identity', label: 'Identity', description: 'kunci/metadata untuk merge', className: 'border-cyan-800/70 bg-cyan-950/25 text-cyan-100' },
    { status: 'unmapped', label: 'Unmapped', description: 'dibaca tetapi belum dipakai', className: 'border-amber-800/70 bg-amber-950/25 text-amber-100' },
  ];

  return <details className="rounded-lg border border-slate-700/80 bg-slate-950/45 p-3 text-[11px]">
    <summary className="cursor-pointer list-none font-semibold text-slate-200 marker:content-none">
      <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-cyan-400" />{title} field mapping <span className="font-normal text-slate-500">({entries.length} columns; expand to audit)</span></span>
    </summary>
    <p className="mt-2 leading-relaxed text-slate-400">Mapped fields influence this snapshot. Identity fields only identify or describe players. Unmapped fields are retained in the source audit but do not affect a score.</p>
    <div className="mt-3 grid gap-2 lg:grid-cols-3">
      {buckets.map(bucket => {
        const fields = entries.filter(([, status]) => status === bucket.status);
        return <section key={bucket.status} className={`rounded-md border p-2 ${bucket.className}`} aria-label={`${title} ${bucket.label} fields`}>
          <p className="font-bold">{bucket.label} <span className="font-normal opacity-75">· {fields.length}</span></p>
          <p className="mt-0.5 text-[10px] opacity-75">{bucket.description}</p>
          {fields.length > 0 ? <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto pr-1 font-mono text-[10px] leading-4">
            {fields.map(([header]) => <li key={header}>{header}</li>)}
          </ul> : <p className="mt-2 text-[10px] opacity-70">Tidak ada.</p>}
        </section>;
      })}
    </div>
    {duplicates && duplicates.length > 0 && <p className="mt-3 rounded border border-amber-800/60 bg-amber-950/20 p-2 text-amber-100"><strong>Repeated header occurrences:</strong> {duplicates.map(item => `${item.header} ×${item.occurrences}`).join(' · ')}. Each occurrence above keeps its own <span className="font-mono">#</span> column number.</p>}
  </details>;
}

/** Stages both FM exports locally. No application state changes until explicit confirmation. */
export function SquadImporterModal({ currentSquadId, onSelectDemo, onConfirmImport, onClose }: SquadImporterModalProps) {
  const [attributeFile, setAttributeFile] = useState<File | null>(null);
  const [performanceFile, setPerformanceFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<ImportDraft | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // File.text() cannot be cancelled. This sequence makes a late result from an
  // earlier selection unable to overwrite the current staging state.
  const parseGeneration = useRef(0);

  useEffect(() => {
    const generation = ++parseGeneration.current;
    if (!attributeFile || !performanceFile) {
      Promise.resolve().then(() => { if (generation === parseGeneration.current) setIsParsing(false); });
      return;
    }
    Promise.resolve().then(() => { if (generation === parseGeneration.current) setIsParsing(true); });
    Promise.all([attributeFile.text(), performanceFile.text()])
      .then(([attributes, performance]) => {
        if (generation === parseGeneration.current) setDraft(createImportDraft(attributes, performance));
      })
      .catch(() => {
        if (generation === parseGeneration.current) {
          setDraft(null);
          setMessage('File tidak dapat dibaca. Pastikan keduanya adalah ekspor Web Page (.html) dari FM24.');
        }
      })
      .finally(() => { if (generation === parseGeneration.current) setIsParsing(false); });
  }, [attributeFile, performanceFile]);

  const fatalDiagnostics = useMemo(() => draft?.diagnostics.filter(item => item.severity === 'fatal') ?? [], [draft]);
  const warnings = useMemo(() => draft?.diagnostics.filter(item => item.severity === 'warning') ?? [], [draft]);
  const selectFile = (kind: FileKind, file: File | null) => {
    setMessage(null);
    setDraft(null);
    if (kind === 'attribute') setAttributeFile(file); else setPerformanceFile(file);
  };
  const confirmImport = () => {
    if (!draft || !draft.canConfirm || !attributeFile) return;
    const squadName = attributeFile.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Imported FM Squad';
    const result = onConfirmImport(draft, squadName);
    if (result.success) onClose(); else setMessage(result.error ?? 'Snapshot impor tidak dapat disimpan. Skuad aktif tidak diubah.');
  };
  const fileSlot = (kind: FileKind, title: string, description: string, file: File | null) => (
    <section className="rounded-xl border border-slate-700/80 bg-slate-950/55 p-3.5">
      <div className="flex items-start justify-between gap-3"><div><h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">{title}</h4><p className="mt-1 text-[11px] leading-relaxed text-slate-400">{description}</p></div>{file && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-label="File selected" />}</div>
      <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-slate-600 bg-slate-900/80 px-3 py-2.5 transition hover:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-400"><span className="min-w-0 truncate text-xs font-medium text-slate-200">{file ? file.name : 'Pilih file .html'}</span><span className="shrink-0 rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-cyan-300">Ganti</span><input aria-label={title} className="sr-only" type="file" accept=".html,.htm,text/html" onChange={event => selectFile(kind, event.target.files?.[0] ?? null)} /></label>
      {file && <button type="button" className="mt-2 text-[11px] font-medium text-slate-400 underline decoration-slate-600 underline-offset-2 hover:text-white" onClick={() => selectFile(kind, null)}>Hapus {title}</button>}
    </section>
  );

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="squad-import-title">
    <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 p-4 sm:p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 p-2.5 text-white"><Users className="h-5 w-5" /></div><div><h3 id="squad-import-title" className="text-base font-bold text-white">Import squad snapshot</h3><p className="text-xs text-slate-400">Staging dulu, lalu konfirmasi satu snapshot yang dapat diaudit.</p></div></div><button type="button" onClick={onClose} aria-label="Tutup import squad" className="rounded-lg bg-slate-800 p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"><X className="h-5 w-5" /></button></header>
      <div className="flex-1 space-y-5 overflow-y-auto p-4 text-xs sm:p-5">
        <div className="rounded-xl border border-cyan-900/80 bg-cyan-950/30 p-3 text-[11px] leading-relaxed text-cyan-100"><span className="font-bold">Cara ekspor FM24:</span> buat dua custom view pada layar Squad/Player Search: <strong>Attribute View</strong> berisi UID, Name, Position, Sec. Position, dan atribut; <strong>Performance View</strong> berisi UID, Name, Mins, Apps, dan statistik. Pada masing-masing view pilih <strong>Print → Web Page (.html)</strong>. UID adalah kunci utama; nama hanya fallback unik bila UID kosong.</div>
        <section><p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-300">Demo presets</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{DEMO_SQUADS.map(squad => <button key={squad.id} type="button" onClick={() => { onSelectDemo(squad.id); onClose(); }} className={`flex min-h-32 flex-col rounded-xl border p-3 text-left transition ${currentSquadId === squad.id ? 'border-cyan-400 bg-slate-800 ring-1 ring-cyan-400/40' : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'}`}><span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">{squad.league}</span><span className="mt-1 text-sm font-bold text-white">{squad.name}</span><span className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-slate-400">{squad.description}</span><span className="mt-auto pt-2 text-[10px] font-bold text-slate-500">{squad.players.length} pemain · atribut demo</span></button>)}</div></section>
        <section className="border-t border-slate-800 pt-5"><div className="mb-3 flex items-center gap-2"><UploadCloud className="h-4 w-4 text-cyan-400" /><p className="text-xs font-bold uppercase tracking-wider text-slate-300">Dua file FM HTML</p></div><div className="grid gap-3 sm:grid-cols-2">{fileSlot('attribute', 'Attribute View', 'UID, Name, Position, Sec. Position dan atribut pemain.', attributeFile)}{fileSlot('performance', 'Performance View', 'UID, Name, Mins, Apps dan statistik performa.', performanceFile)}</div></section>
        <div aria-live="polite">{isParsing && <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-slate-300"><LoaderCircle className="h-4 w-4 animate-spin text-cyan-400" /> Memeriksa skema, identitas, dan cakupan data…</div>}{message && <div className="flex items-start gap-2 rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{message}</div>}</div>
        {draft && <section className={`rounded-xl border p-4 ${draft.canConfirm ? 'border-emerald-800/80 bg-emerald-950/20' : 'border-rose-800/80 bg-rose-950/20'}`} aria-label="Import preview"><div className="flex items-start justify-between gap-3"><div><h4 className="font-bold text-white">Preview snapshot</h4><p className="mt-1 text-[11px] text-slate-400">{draft.snapshotId} · belum mengubah squad aktif.</p></div>{draft.canConfirm ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <ShieldAlert className="h-5 w-5 text-rose-400" />}</div><dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4"><Metric label="Attribute rows" value={draft.report.attributeRows} /><Metric label="Performance rows" value={draft.report.performanceRows} /><Metric label="UID joined" value={draft.report.uidMatches} /><Metric label="Name fallback" value={draft.report.nameFallbackMatches} /></dl><div className="mt-3 grid gap-2 text-[11px] text-slate-300 sm:grid-cols-2"><p><FileText className="mr-1 inline h-3.5 w-3.5 text-cyan-400" />Attribute coverage: {coverageLabel(draft.report.attributeCoverage, draft.report.attributeRows)}</p><p><FileText className="mr-1 inline h-3.5 w-3.5 text-cyan-400" />Performance coverage: {coverageLabel(draft.report.performanceCoverage, draft.report.performanceRows)}</p></div><div className="mt-3 grid gap-3 xl:grid-cols-2"><HeaderCoverageDetails title="Attribute View" coverage={draft.report.attributeHeaderCoverage} duplicates={draft.report.duplicateHeaderOccurrences?.filter(item => item.view === 'attribute')} /><HeaderCoverageDetails title="Performance View" coverage={draft.report.performanceHeaderCoverage} duplicates={draft.report.duplicateHeaderOccurrences?.filter(item => item.view === 'performance')} /></div><p className="mt-2 text-[11px] text-slate-400">Unmatched: {draft.report.unmatchedAttributeRows} attribute (tetap dipakai, performance unknown) · {draft.report.unmatchedPerformanceRows} performance (dibuang).</p>{fatalDiagnostics.length > 0 && <DiagnosticList title="Perbaiki sebelum konfirmasi" diagnostics={fatalDiagnostics.map(item => item.message)} tone="fatal" />}{warnings.length > 0 && <DiagnosticList title="Peringatan yang akan ikut tercatat" diagnostics={warnings.map(item => item.message)} tone="warning" />}</section>}
      </div>
      <footer className="flex flex-col-reverse gap-2 border-t border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-[11px] text-slate-500">{draft?.canConfirm ? 'Konfirmasi akan mengganti snapshot sekali dan mengosongkan cache Player Lab.' : 'Pilih dua file yang valid untuk membuka konfirmasi.'}</p><div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">Batal</button><button type="button" disabled={!draft?.canConfirm || isParsing} onClick={confirmImport} className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40">Konfirmasi snapshot</button></div></footer>
    </div>
  </div>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded bg-slate-950/60 p-2"><dt className="text-slate-500">{label}</dt><dd className="mt-0.5 font-bold text-white">{value}</dd></div>; }
function DiagnosticList({ title, diagnostics, tone }: { title: string; diagnostics: string[]; tone: 'fatal' | 'warning' }) { const classes = tone === 'fatal' ? 'border-rose-800/80 bg-rose-950/30 text-rose-100' : 'border-amber-800/80 bg-amber-950/20 text-amber-100'; return <div className={`mt-3 rounded-lg border p-2.5 ${classes}`}><p className="font-bold">{title}</p><ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-relaxed">{diagnostics.map((diagnostic, index) => <li key={`${diagnostic}-${index}`}>{diagnostic}</li>)}</ul></div>; }
