import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface UserSettings {
  user?: {
    sub: string;
    email: string;
    name: string;
  };
  steamId?: string;
  xboxGamertag?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private settingsApiUrl = `${environment.apiUrl}/v1/settings`;
  private userApiUrl = `${environment.apiUrl}/v1/user`;

  getSettings(): Observable<UserSettings> {
    const token = this.authService.token();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    return this.http.get<UserSettings>(this.settingsApiUrl, { headers });
  }

  updateSettings(steamId: string, xboxGamertag: string): Observable<any> {
    const token = this.authService.token();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    
    return this.http.put(this.settingsApiUrl, { 
      steamId: steamId || undefined,
      xboxGamertag: xboxGamertag || undefined
    }, { headers });
  }

  updateSteamId(steamId: string): Observable<any> {
    return this.updateSettings(steamId, '');
  }

  createUser(): Observable<any> {
    const token = this.authService.token();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    
    return this.http.post(this.userApiUrl, {}, { headers });
  }
}
