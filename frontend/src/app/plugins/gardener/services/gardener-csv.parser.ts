import type { Plant } from '../models/plant.model';

/** CSV column headers matching plants.csv. Order defines export column order. */
export const PLANT_CSV_HEADERS = [
  'Common name',
  'Variety',
  'Species name',
  'Lifecycle',
  'Hardiness',
  'Watering',
  'Pruning Months',
  'Sowing Months',
  'Harvest Months',
  'Planting-out months',
  'Preferred PH',
  'Image URL',
  'Location',
] as const;

const HEADER_TO_KEY: Record<string, keyof Plant | ''> = {
  'common name': 'name',
  'variety': 'variety',
  'species name': 'speciesName',
  'lifecycle': 'lifecycle',
  'hardiness': 'hardiness',
  'watering': 'watering',
  'pruning months': 'pruningMonths',
  'sowing months': 'sowingMonths',
  'harvest months': 'harvestMonths',
  'planting-out months': 'plantingOutMonths',
  'preferred ph': 'preferredPh',
  'image url': 'imageUrl',
  'location': 'location',
};

function escapeCsv(s: string): string {
  if (!s) return '';
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Build a single CSV row from a plant. */
export function plantToCsvRow(plant: Plant): string {
  const row = [
    escapeCsv(plant.name),
    escapeCsv(plant.variety ?? ''),
    escapeCsv(plant.speciesName ?? ''),
    escapeCsv(plant.lifecycle ?? ''),
    escapeCsv(plant.hardiness ?? ''),
    escapeCsv(plant.watering ?? ''),
    escapeCsv(plant.pruningMonths ?? ''),
    escapeCsv(plant.sowingMonths ?? ''),
    escapeCsv(plant.harvestMonths ?? ''),
    escapeCsv(plant.plantingOutMonths ?? ''),
    escapeCsv(plant.preferredPh ?? ''),
    escapeCsv(plant.imageUrl ?? ''),
    escapeCsv(plant.location ?? ''),
  ];
  return row.join(',');
}

/** Build full CSV content (header + rows). */
export function plantsToCsv(plants: Plant[], includeData: boolean): string {
  let out = PLANT_CSV_HEADERS.join(',') + '\n';
  if (includeData) {
    for (const plant of plants) {
      out += plantToCsvRow(plant) + '\n';
    }
  }
  return out;
}

/** Parse a CSV line respecting quoted fields. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const next = line[i + 1];
    if (c === '"') {
      if (inQ && next === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      out.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

/** Parse header line into array of model keys per column index. Unknown columns yield null (skipped). */
export function parseCsvHeader(line: string): (keyof Plant | null)[] | null {
  const headers = parseCsvLine(line).map((h) => h.trim().toLowerCase());
  const keys: (keyof Plant | null)[] = [];
  let hasName = false;
  for (const h of headers) {
    const key = HEADER_TO_KEY[h];
    if (key) {
      keys.push(key);
      if (key === 'name') hasName = true;
    } else {
      keys.push(null);
    }
  }
  if (!hasName) return null;
  return keys;
}

export interface ParsedPlantRow {
  name: string;
  variety?: string;
  speciesName?: string;
  lifecycle?: string;
  hardiness?: string;
  watering?: string;
  pruningMonths?: string;
  sowingMonths?: string;
  harvestMonths?: string;
  plantingOutMonths?: string;
  preferredPh?: string;
  imageUrl?: string;
  location?: string;
}

/** Parse one data row into a plant-like object. Requires Common name. */
export function parseCsvPlantRow(
  line: string,
  headerKeys: (keyof Plant | null)[],
  _rowNum: number
): ParsedPlantRow | null {
  const values = parseCsvLine(line);
  const row: Record<string, string> = {};
  headerKeys.forEach((key, i) => {
    if (key) {
      const v = (values[i] ?? '').trim();
      if (v) row[key] = v;
    }
  });
  const name = row['name']?.trim();
  if (!name) return null;
  return {
    name,
    variety: row['variety'] || undefined,
    speciesName: row['speciesName'] || undefined,
    lifecycle: row['lifecycle'] || undefined,
    hardiness: row['hardiness'] || undefined,
    watering: row['watering'] || undefined,
    pruningMonths: row['pruningMonths'] || undefined,
    sowingMonths: row['sowingMonths'] || undefined,
    harvestMonths: row['harvestMonths'] || undefined,
    plantingOutMonths: row['plantingOutMonths'] || undefined,
    preferredPh: row['preferredPh'] || undefined,
    imageUrl: row['imageUrl'] || undefined,
    location: row['location'] || undefined,
  };
}
