import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

const environment = {
  apiUrl: 'https://api.doiownthatgame.com'
};

export interface UserSettings {
  user?: {
    sub: string;
    email: string;
    name: string;
  };
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/v1/settings`;

  getSettings(): Observable<UserSettings> {
    const token = this.authService.token();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    return this.http.get<UserSettings>(this.apiUrl, { headers });
  }
}
