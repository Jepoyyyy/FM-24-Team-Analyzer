import {
  SimulationSnapshotV2,
  SimulationResultV2,
  PlayerV2,
} from './types';
import { Player } from '../../types';
import { runFullSimulationV2, SimulationConfigV2 } from './monteCarlo';

export interface WorkerSimulationController {
  cancel: () => void;
}

/**
 * Executes the Monte Carlo simulation with Web Worker support and headless/test fallback.
 */
export function executeSimulationWithFallback(
  snapshot: SimulationSnapshotV2,
  players: Record<string, PlayerV2 | Player>,
  config: SimulationConfigV2 = {},
  onProgress?: (progress: number, scenarioIndex: number, totalScenarios: number) => void,
  onDone?: (result: SimulationResultV2) => void,
  onError?: (err: Error) => void
): WorkerSimulationController {
  let isCancelled = false;
  let isSettled = false;
  let worker: Worker | null = null;

  const finishWithResult = (result: SimulationResultV2) => {
    if (isCancelled || isSettled) return;
    isSettled = true;
    onDone?.(result);
  };

  const finishWithError = (err: unknown) => {
    if (isCancelled || isSettled) return;
    isSettled = true;
    onError?.(err instanceof Error ? err : new Error(String(err)));
  };

  const executeFallback = () => {
    if (isCancelled || isSettled) return;

    // Yield once so React can paint the fallback/progress state before the
    // synchronous simulation starts on browsers that cannot run the worker.
    setTimeout(() => {
      if (isCancelled || isSettled) return;
      try {
        const result = runFullSimulationV2(snapshot, players, config, (prog, cur, total) => {
          if (!isCancelled && !isSettled) {
            onProgress?.(prog, cur, total);
          }
        });
        finishWithResult(result);
      } catch (err: unknown) {
        finishWithError(err);
      }
    }, 0);
  };

  // Check if browser Web Worker is supported and available
  if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
    try {
      worker = new Worker(new URL('./simulationWorker.ts', import.meta.url), {
        type: 'module',
        name: 'fm24-monte-carlo',
      });

      worker.onmessage = (e: MessageEvent) => {
        if (isCancelled || isSettled) return;
        const data = e.data;
        if (data.type === 'PROGRESS' && onProgress) {
          onProgress(data.progress, data.scenarioIndex, data.totalScenarios);
        } else if (data.type === 'DONE') {
          finishWithResult(data.result);
          worker?.terminate();
        } else if (data.type === 'ERROR') {
          worker?.terminate();
          worker = null;
          executeFallback();
        }
      };

      worker.onerror = (e: ErrorEvent) => {
        e.preventDefault();
        worker?.terminate();
        worker = null;
        executeFallback();
      };

      worker.onmessageerror = () => {
        worker?.terminate();
        worker = null;
        executeFallback();
      };

      worker.postMessage({
        type: 'START_SIMULATION',
        snapshot,
        players,
        config,
      });

      return {
        cancel: () => {
          isCancelled = true;
          worker?.postMessage({ type: 'CANCEL' });
          worker?.terminate();
          worker = null;
        },
      };
    } catch {
      worker?.terminate();
      worker = null;
    }
  }

  // Headless / SSR / Test fallback
  executeFallback();

  return {
    cancel: () => {
      isCancelled = true;
    },
  };
}
