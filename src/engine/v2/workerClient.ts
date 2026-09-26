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

  // Check if browser Web Worker is supported and available
  if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
    try {
      const worker = new Worker('/workers/simulationWorker.js');

      worker.onmessage = (e: MessageEvent) => {
        if (isCancelled) return;
        const data = e.data;
        if (data.type === 'PROGRESS' && onProgress) {
          onProgress(data.progress, data.scenarioIndex, data.totalScenarios);
        } else if (data.type === 'DONE') {
          if (onDone) onDone(data.result);
          worker.terminate();
        } else if (data.type === 'ERROR') {
          if (onError) onError(new Error(data.message || 'Worker simulation error'));
          worker.terminate();
        }
      };

      worker.onerror = (e: ErrorEvent) => {
        if (!isCancelled && onError) {
          onError(new Error(e.message || 'Worker error'));
        }
        worker.terminate();
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
          worker.postMessage({ type: 'CANCEL' });
          worker.terminate();
        },
      };
    } catch {
      // Fallback to synchronous/chunked execution if worker fails to initialize
    }
  }

  // Headless / SSR / Test fallback
  setTimeout(() => {
    if (isCancelled) return;
    try {
      const result = runFullSimulationV2(snapshot, players, config, (prog, cur, total) => {
        if (!isCancelled && onProgress) {
          onProgress(prog, cur, total);
        }
      });
      if (!isCancelled && onDone) {
        onDone(result);
      }
    } catch (err: unknown) {
      if (!isCancelled && onError) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }, 0);

  return {
    cancel: () => {
      isCancelled = true;
    },
  };
}
