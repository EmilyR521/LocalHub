import type { PlantSpeciesData, PlantHardiness, PlantLifecycle } from '../models/plant.model';

/**
 * Map Perenual hardiness zone (USDA 1–13) to our Hardiness options.
 * Zones 1–4: Hardy; 5–8: Half-hardy; 9–13: Tender.
 */
export function perenualHardinessToPlant(details: PlantSpeciesData): PlantHardiness | undefined {
  const h = details.hardiness;
  if (!h) return undefined;
  const min = h.min != null ? parseInt(String(h.min), 10) : NaN;
  const max = h.max != null ? parseInt(String(h.max), 10) : NaN;
  const zone = Number.isNaN(min) ? max : Number.isNaN(max) ? min : Math.floor((min + max) / 2);
  if (Number.isNaN(zone) || zone < 1 || zone > 13) return undefined;
  if (zone <= 4) return 'Hardy';
  if (zone <= 8) return 'Half-hardy';
  return 'Tender';
}

/**
 * Map Perenual cycle/type to our Lifecycle options.
 */
export function perenualCycleToPlant(details: PlantSpeciesData): PlantLifecycle | undefined {
  const type = typeof details.type === 'string' ? details.type.trim().toLowerCase() : '';
  const cycle = typeof details.cycle === 'string' ? details.cycle.trim().toLowerCase() : '';
  if (type === 'tree') return 'Tree';
  if (type === 'shrub') return 'Shrub';
  if (cycle === 'perennial') return 'Perennial';
  if (cycle === 'annual') return 'Annual';
  if (cycle === 'biennial' || cycle === 'biannual') return 'Biennial';
  return undefined;
}

/**
 * Build care notes text from Perenual species details for the notes field.
 */
export function perenualCareNotes(details: PlantSpeciesData): string {
  const parts: string[] = [];
  if (details.description?.trim()) {
    parts.push(details.description.trim());
  }
  const care: string[] = [];
  if (details.watering?.trim()) care.push(`Watering: ${details.watering.trim()}`);
  if (Array.isArray(details.sunlight) && details.sunlight.length > 0) {
    const sun = details.sunlight.map((s) => (typeof s === 'string' ? s : String(s)).trim()).filter(Boolean);
    if (sun.length) care.push(`Sunlight: ${sun.join(', ')}`);
  }
  if (details.care_level?.trim()) care.push(`Care level: ${details.care_level.trim()}`);
  if (Array.isArray(details.soil) && details.soil.length > 0) {
    const soil = details.soil.map((s) => (typeof s === 'string' ? s : String(s)).trim()).filter(Boolean);
    if (soil.length) care.push(`Soil: ${soil.join(', ')}`);
  }
  if (care.length > 0) {
    parts.push(care.join('\n'));
  }
  return parts.join('\n\n').trim();
}
