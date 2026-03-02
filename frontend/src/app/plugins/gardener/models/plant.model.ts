/** Perenual default_image object (thumbnail, small_url, etc.). */
export interface PlantSpeciesImage {
  thumbnail?: string;
  small_url?: string;
  medium_url?: string;
  regular_url?: string;
  original_url?: string;
  [key: string]: unknown;
}

/** Species data from Perenual API (or other source). Stored when user looks up a species. */
export interface PlantSpeciesData {
  id: number;
  common_name?: string;
  scientific_name?: string;
  /** Perenual: perennial, annual, biennial, biannual */
  cycle?: string;
  /** Perenual: tree, shrub, etc. */
  type?: string;
  /** Perenual: { min: string, max: string } USDA zone 1–13 */
  hardiness?: { min?: string; max?: string };
  watering?: string;
  sunlight?: string[];
  description?: string;
  care_level?: string;
  soil?: string[];
  /** Perenual: default plant image URLs */
  default_image?: PlantSpeciesImage;
  family?: string;
  origin?: string[];
  /** Perenual: pruning_month – array of month names e.g. ["March", "April"] */
  pruning_month?: string[];
  /** Perenual: propagation methods e.g. ["seed", "cutting"] */
  propagation?: string[];
  [key: string]: unknown;
}

export const PLANT_HARDINESS_OPTIONS = ['Hardy', 'Half-hardy', 'Tender'] as const;
export type PlantHardiness = (typeof PLANT_HARDINESS_OPTIONS)[number];

export const PLANT_LIFECYCLE_OPTIONS = ['Annual', 'Perennial', 'Biennial', 'Shrub', 'Tree'] as const;
export type PlantLifecycle = (typeof PLANT_LIFECYCLE_OPTIONS)[number];

export interface Plant {
  id: string;
  name: string;
  species?: string;
  location?: string;
  notes?: string;
  addedDate: string;
  /** Fetched species data from Perenual (or similar) when user looks up species. */
  speciesData?: PlantSpeciesData;
  /** Zone IDs this plant belongs to (zones act like tags). */
  zoneIds?: string[];
  hardiness?: PlantHardiness;
  lifecycle?: PlantLifecycle;
}
