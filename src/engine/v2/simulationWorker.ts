/// <reference lib="webworker" />

import { Player } from '../../types';
import { runFullSimulationV2, SimulationConfigV2 } from './monteCarlo';
import { PlayerV2, SimulationSnapshotV2 } from './types';

interface StartSimulationMessage {
  type: 'START_SIMULATION';
  snapshot: SimulationSnapshotV2;
  players: Record<string, PlayerV2 | Player>;
  config: SimulationConfigV2;
}

interface CancelSimulationMessage {
  type: 'CANCEL';
}

type WorkerRequest = StartSimulationMessage | CancelSimulationMessage;

const workerScope: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;
let isCancelled = false;

workerScope.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;

  if (message.type === 'CANCEL') {
    isCancelled = true;
    return;
  }

  if (message.type !== 'START_SIMULATION') return;

  isCancelled = false;

  try {
    const result = runFullSimulationV2(
      message.snapshot,
      message.players,
      message.config,
      (progress, scenarioIndex, totalScenarios) => {
        if (!isCancelled) {
          workerScope.postMessage({
            type: 'PROGRESS',
            progress,
            scenarioIndex,
            totalScenarios,
          });
        }
      }
    );

    if (!isCancelled) {
      workerScope.postMessage({ type: 'DONE', result });
    }
  } catch (error: unknown) {
    if (!isCancelled) {
      workerScope.postMessage({
        type: 'ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
};

export {};
