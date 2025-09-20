import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { Settings } from 'src/app/core/types/index.js';
import { environment } from '../../../../../environments/environment.js';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  get(): Observable<Settings> {
    return this.http.get<Settings>(`${this.baseUrl}/v1/settings`);
  }

  put(steamId: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/v1/settings`, { steamId });
  }
}
