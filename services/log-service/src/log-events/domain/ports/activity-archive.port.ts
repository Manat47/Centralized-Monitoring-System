import type { StoredLog } from '../entities/log-event.entity';

// Reserved seam for a future warm/cold tier. The current release keeps only
// the 30-day hot tier and has no archive adapter or scheduled export.
export interface ActivityArchivePort {
  exportBatch(projectId: string, events: StoredLog[]): Promise<void>;
  readRange(projectId: string, from: string, to: string): Promise<StoredLog[]>;
}
