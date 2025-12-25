import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url?: string;
  img_logo_url?: string;
  has_community_visible_stats?: boolean;
  playtime_windows_forever?: number;
  playtime_mac_forever?: number;
  playtime_linux_forever?: number;
  playtime_deck_forever?: number;
  rtime_last_played?: number;
  playtime_disconnected?: number;
}

export interface SteamGamesResponse {
  steamId: string;
  gameCount: number;
  games: SteamGame[];
}

@Injectable({
  providedIn: 'root'
})
export class GamesService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private gamesApiUrl = `${environment.apiUrl}/v1/games`;

  getSteamGames(): Observable<SteamGamesResponse> {
    const token = this.authService.token();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    return this.http.get<SteamGamesResponse>(`${this.gamesApiUrl}/steam`, { headers });
  }
}
