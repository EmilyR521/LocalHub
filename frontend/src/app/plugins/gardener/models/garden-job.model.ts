/** A single material/cost line item for a garden job. */
export interface JobMaterial {
  name: string;
  cost?: number;
}

export interface GardenJob {
  id: string;
  /** Job title or description. */
  title: string;
  /** Start of period (YYYY-MM-DD). Required. */
  startDate: string;
  /** End of period (YYYY-MM-DD). Optional; if missing, job is for a single day. */
  endDate?: string;
  /** Zone ID this job applies to. */
  zoneId?: string;
  /** Plant IDs linked to this job (one-way: jobs reference plants, not shown on plant form). */
  plantIds?: string[];
  /** Materials and costs. */
  materials?: JobMaterial[];
  addedDate: string;
}
