import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

const API = '/api/plugins';
const USER_ID_HEADER = 'X-User-Id';

@Injectable({ providedIn: 'root' })
export class PluginStoreService {
  constructor(private http: HttpClient) {}

  private headers(userId?: string): HttpHeaders {
    const h = new HttpHeaders();
    if (userId) return h.set(USER_ID_HEADER, userId);
    return h;
  }

  get<T>(pluginId: string, key: string, userId?: string): Observable<T> {
    return this.http.get<T>(`${API}/${pluginId}/store/${key}`, {
      headers: this.headers(userId),
    });
  }

  put<T>(pluginId: string, key: string, value: T, userId?: string): Observable<T> {
    return this.http.put<T>(`${API}/${pluginId}/store/${key}`, value, {
      headers: this.headers(userId),
    });
  }

  listKeys(pluginId: string, userId?: string): Observable<{ keys: string[] }> {
    return this.http.get<{ keys: string[] }>(`${API}/${pluginId}/store`, {
      headers: this.headers(userId),
    });
  }
}
