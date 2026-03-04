import type { JobMaterial } from '../../../models/garden-job.model';

/** Payload emitted when saving a job (parent calls addJob or updateJob). */
export interface JobFormPayload {
  title: string;
  startDate: string;
  endDate?: string;
  zoneId?: string;
  plantIds: string[];
  materials?: JobMaterial[];
}
