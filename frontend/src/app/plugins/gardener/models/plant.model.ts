/** Plant model aligned with plants.csv columns. User adds their own details. */
export interface Plant {
  id: string;
  /** Common name (required). */
  name: string;
  /** Variety or cultivar (e.g. 'Atropurpureum'). */
  variety?: string;
  /** Species name (e.g. Acer palmatum). */
  speciesName?: string;
  /** Lifecycle: tree, perennial, annual, shrub, climber, etc. */
  lifecycle?: string;
  /** Hardiness: hardy, half-hardy, tender, etc. */
  hardiness?: string;
  /** Watering: low, medium, high. */
  watering?: string;
  /** Pruning months (e.g. "Jul Aug"). */
  pruningMonths?: string;
  /** Sowing months. */
  sowingMonths?: string;
  /** Harvest months. */
  harvestMonths?: string;
  /** Planting-out months. */
  plantingOutMonths?: string;
  /** Preferred PH (e.g. "slightly acidic to neutral"). */
  preferredPh?: string;
  /** Image URL. */
  imageUrl?: string;
  /** Location in garden. */
  location?: string;
  notes?: string;
  addedDate: string;
  /** Zone IDs this plant belongs to. */
  zoneIds?: string[];
}
