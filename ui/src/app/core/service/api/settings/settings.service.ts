import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment.js';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  put(steamId: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/v1/steam`, { steamId });
  }
}
