import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeSimulationWithFallback } from '../engine/v2/workerClient';
import { runFullSimulationV2 } from '../engine/v2/monteCarlo';
import type { SimulationResultV2, SimulationSnapshotV2 } from '../engine/v2/types';

vi.mock('../engine/v2/monteCarlo', () => ({
  runFullSimulationV2: vi.fn(),
}));

const snapshot = {
  schemaVersion: 2,
  hash: 'snapshot-hash',
  engineVersion: 'test',
  timestamp: 0,
  formationId: 'test-formation',
  slots: [],
  teamInstructions: {},
  playerAttributesDigest: {},
} as unknown as SimulationSnapshotV2;

const result: SimulationResultV2 = {
  snapshotHash: snapshot.hash,
  engineVersion: 'test',
  timestamp: 0,
  totalMatches: 0,
  scenarios: [],
  isOutdated: false,
};

class MockWorker {
  static instances: MockWorker[] = [];

  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  constructor(
    public readonly url: URL,
    public readonly options?: WorkerOptions
  ) {
    MockWorker.instances.push(this);
  }
}

describe('executeSimulationWithFallback', () => {
  beforeEach(() => {
    MockWorker.instances = [];
    vi.clearAllMocks();
    vi.stubGlobal('Worker', MockWorker);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the bundled module worker and resolves its result', async () => {
    const onDone = vi.fn();
    const onError = vi.fn();

    executeSimulationWithFallback(snapshot, {}, {}, undefined, onDone, onError);

    const worker = MockWorker.instances[0];
    expect(worker).toBeDefined();
    expect(worker.url).toBeInstanceOf(URL);
    expect(worker.url.pathname).toContain('simulationWorker.ts');
    expect(worker.options).toMatchObject({ type: 'module', name: 'fm24-monte-carlo' });
    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'START_SIMULATION', snapshot })
    );

    worker.onmessage?.(new MessageEvent('message', { data: { type: 'DONE', result } }));

    expect(onDone).toHaveBeenCalledOnce();
    expect(onDone).toHaveBeenCalledWith(result);
    expect(onError).not.toHaveBeenCalled();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('falls back to the main-thread engine when the worker fails asynchronously', async () => {
    vi.mocked(runFullSimulationV2).mockReturnValue(result);
    const onDone = vi.fn();
    const onError = vi.fn();
    const preventDefault = vi.fn();

    executeSimulationWithFallback(snapshot, {}, {}, undefined, onDone, onError);

    const worker = MockWorker.instances[0];
    worker.onerror?.({ preventDefault } as unknown as ErrorEvent);

    await vi.waitFor(() => expect(onDone).toHaveBeenCalledWith(result));

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(runFullSimulationV2).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it('cancels without delivering a late fallback result', async () => {
    vi.mocked(runFullSimulationV2).mockReturnValue(result);
    const onDone = vi.fn();

    const controller = executeSimulationWithFallback(snapshot, {}, {}, undefined, onDone);
    const worker = MockWorker.instances[0];
    worker.onmessageerror?.(new MessageEvent('messageerror'));
    controller.cancel();

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(onDone).not.toHaveBeenCalled();
    expect(runFullSimulationV2).not.toHaveBeenCalled();
  });
});
