import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { Plant } from '../models/plant.model';
import {
  plantsToCsv,
  parseCsvHeader,
  parseCsvPlantRow,
} from './gardener-csv.parser';

export interface PlantImportResult {
  success: number;
  errors: string[];
}

@Injectable({ providedIn: 'root' })
export class GardenerImportExportService {
  exportToCsv(plants: Plant[], includeData = true, filename?: string): void {
    const csv = plantsToCsv(plants, includeData);
    const name =
      filename ??
      (includeData ? 'plants.csv' : 'plants-template.csv');
    this.download(csv, name, 'text/csv;charset=utf-8;');
  }

  importFromCsv(
    file: File,
    addPlant: (plant: Partial<Plant> & { name: string }) => Plant,
    existingPlants: Plant[] = []
  ): Observable<PlantImportResult> {
    return new Observable((observer) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const csv = (e.target?.result as string) ?? '';
          const result = this.processCsv(csv, addPlant, existingPlants);
          observer.next(result);
          observer.complete();
        } catch (err: unknown) {
          observer.error(
            err instanceof Error ? err : new Error('Failed to process CSV')
          );
        }
      };
      reader.onerror = () => observer.error(new Error('Failed to read file'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  private download(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private processCsv(
    csv: string,
    addPlant: (plant: Partial<Plant> & { name: string }) => Plant,
    existingPlants: Plant[]
  ): PlantImportResult {
    const lines = csv.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      return {
        success: 0,
        errors: ['CSV must have a header row and at least one data row'],
      };
    }

    const headerKeys = parseCsvHeader(lines[0]);
    if (!headerKeys) {
      return {
        success: 0,
        errors: ['Invalid or missing headers (Common name is required)'],
      };
    }

    const existingKeys = new Set(
      existingPlants.map((p) => `${(p.name ?? '').toLowerCase().trim()}|${(p.speciesName ?? '').toLowerCase().trim()}`)
    );
    const errors: string[] = [];
    let success = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      try {
        const parsed = parseCsvPlantRow(line, headerKeys, i + 1);
        if (!parsed) {
          errors.push(`Row ${i + 1}: missing Common name, skipped`);
          continue;
        }
        const key = `${parsed.name.toLowerCase().trim()}|${(parsed.speciesName ?? '').toLowerCase().trim()}`;
        if (existingKeys.has(key)) {
          errors.push(
            `Row ${i + 1}: "${parsed.name}" already exists, skipped`
          );
          continue;
        }
        addPlant({
          ...parsed,
          addedDate: new Date().toISOString().slice(0, 10),
        });
        existingKeys.add(key);
        success++;
      } catch (e: unknown) {
        errors.push(
          `Row ${i + 1}: ${e instanceof Error ? e.message : 'Invalid data'}`
        );
      }
    }
    return { success, errors };
  }
}
