import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import type { PlantSpeciesData, PlantSpeciesImage } from '../models/plant.model';

const API = '/api/plugins/gardener';

/** Perenual API species list item (from species-list endpoint). */
export interface PerenualSpeciesListItem {
  id: number;
  common_name?: string;
  scientific_name?: string[];
  cycle?: string;
  watering?: string;
  sunlight?: string[];
  default_image?: PlantSpeciesImage;
  [key: string]: unknown;
}

/** Get best display URL from species image (thumbnail or small_url). */
export function getSpeciesImageUrl(
  image?: PlantSpeciesImage | null
): string | undefined {
  if (!image) return undefined;
  return image.thumbnail ?? image.small_url ?? image.medium_url ?? image.regular_url ?? image.original_url;
}

export interface PerenualSpeciesListResponse {
  data?: PerenualSpeciesListItem[];
  total?: number;
  to?: number;
  from?: number;
  last_page?: number;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class GardenerPerenualService {
  private http = inject(HttpClient);

  /**
   * Search plant species via Perenual API (proxied by backend).
   * Returns list of species; use getSpeciesDetails(id) to get full data to store.
   */
  searchSpecies(query: string, page = 1): Observable<PerenualSpeciesListResponse> {
    const params: Record<string, string> = { page: String(page) };
    if (query.trim()) params['q'] = query.trim();
    const url = `${API}/species?${new URLSearchParams(params).toString()}`;
    return this.http.get<PerenualSpeciesListResponse>(url).pipe(
      catchError(() => of({ data: [], total: 0 }))
    );
  }

  /**
   * Fetch full species details by ID. Use this to store species data on the plant.
   */
  getSpeciesDetails(id: number): Observable<PlantSpeciesData | null> {
    return this.http.get<PlantSpeciesData>(`${API}/species/${id}`).pipe(
      map((d) => d ?? null),
      catchError(() => of(null))
    );
  }
}
