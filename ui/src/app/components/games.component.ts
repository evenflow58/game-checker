import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { GamesService, SteamGame } from '../services/games.service';

@Component({
  selector: 'app-games',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="games-container">
      <header class="header">
        <h1>Game Checker</h1>
        <div class="user-info" *ngIf="authService.user() as user">
          <img [src]="user.picture" [alt]="user.name" class="avatar" *ngIf="user.picture">
          <span class="user-name">{{ user.name }}</span>
          <button (click)="goToSettings()" class="btn-settings">Settings</button>
          <button (click)="signOut()" class="btn-signout">Sign Out</button>
        </div>
      </header>

      <main class="content">
        <div *ngIf="loading()" class="loading-container">
          <div class="spinner"></div>
          <p>Loading your games...</p>
        </div>

        <div *ngIf="error()" class="error-container">
          <div class="error-icon">⚠️</div>
          <h2>Unable to load games</h2>
          <p>{{ error() }}</p>
          <button (click)="loadGames()" class="btn-retry">Try Again</button>
        </div>

        <div *ngIf="!loading() && !error() && games().length > 0" class="games-list">
          <div class="games-header">
            <h2>Your Steam Library</h2>
            <p class="game-count">{{ games().length }} games</p>
          </div>
          
          <div class="games-grid">
            <div *ngFor="let game of games()" class="game-card">
              <div class="game-image">
                <img 
                  *ngIf="game.img_icon_url" 
                  [src]="getGameImageUrl(game)" 
                  [alt]="game.name"
                  (error)="onImageError($event)"
                >
                <div *ngIf="!game.img_icon_url" class="game-placeholder">🎮</div>
              </div>
              <div class="game-info">
                <h3 class="game-name">{{ game.name }}</h3>
                <p class="game-playtime" *ngIf="game.playtime_forever > 0">
                  {{ formatPlaytime(game.playtime_forever) }} played
                </p>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="!loading() && !error() && games().length === 0" class="empty-state">
          <div class="placeholder-icon">🎮</div>
          <h2>No games found</h2>
          <p class="placeholder-text">
            Make sure your Steam ID is configured correctly in settings.
          </p>
          <button (click)="goToSettings()" class="btn-settings">Go to Settings</button>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .games-container {
      min-height: 100vh;
      background: #f5f7fa;
      display: flex;
      flex-direction: column;
    }

    .header {
      background: white;
      padding: 1.5rem 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }

    .header h1 {
      margin: 0;
      font-size: 1.8rem;
      color: #333;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid #667eea;
    }

    .user-name {
      font-weight: 500;
      color: #333;
    }

    .btn-settings {
      padding: 0.5rem 1rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: background 0.2s;
    }

    .btn-settings:hover {
      background: #5568d3;
    }

    .btn-signout {
      padding: 0.5rem 1rem;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: background 0.2s;
    }

    .btn-signout:hover {
      background: #c82333;
    }

    .content {
      flex: 1;
      overflow-y: auto;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      padding: 3rem 1rem;
    }

    .placeholder-container {
      background: white;
      padding: 4rem 2rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
    }

    .placeholder-icon {
      font-size: 6rem;
      margin-bottom: 1.5rem;
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-20px);
      }
    }

    .placeholder-container h2 {
      color: #333;
      font-size: 2rem;
      margin: 0 0 1rem 0;
    }

    .placeholder-text {
      color: #666;
      font-size: 1.1rem;
      margin-bottom: 2rem;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    .features-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 500px;
      margin: 0 auto;
      text-align: left;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .feature-icon {
      width: 32px;
      height: 32px;
      background: #667eea;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      flex-shrink: 0;
    }

    .feature-item span:last-child {
      color: #333;
      font-weight: 500;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      gap: 1rem;
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #f3f4f6;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-container p {
      color: #666;
      font-size: 1.1rem;
    }

    .error-container {
      background: white;
      padding: 4rem 2rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
    }

    .error-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .error-container h2 {
      color: #dc3545;
      margin: 0 0 1rem 0;
    }

    .error-container p {
      color: #666;
      margin-bottom: 1.5rem;
    }

    .btn-retry {
      padding: 0.75rem 1.5rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: background 0.2s;
    }

    .btn-retry:hover {
      background: #5568d3;
    }

    .games-list {
      width: 100%;
    }

    .games-header {
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .games-header h2 {
      margin: 0;
      color: #333;
      font-size: 1.8rem;
    }

    .game-count {
      color: #666;
      font-size: 1.1rem;
      margin: 0;
    }

    .games-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .game-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }

    .game-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .game-image {
      width: 100%;
      height: 140px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .game-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .game-placeholder {
      font-size: 3rem;
      opacity: 0.5;
    }

    .game-info {
      padding: 1rem;
    }

    .game-name {
      margin: 0 0 0.5rem 0;
      color: #333;
      font-size: 1.1rem;
      font-weight: 600;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .game-playtime {
      margin: 0;
      color: #666;
      font-size: 0.9rem;
    }

    .empty-state {
      background: white;
      padding: 4rem 2rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
    }

    .empty-state .placeholder-icon {
      font-size: 6rem;
      margin-bottom: 1.5rem;
      opacity: 0.3;
    }

    .empty-state h2 {
      color: #333;
      font-size: 2rem;
      margin: 0 0 1rem 0;
    }

    .empty-state .placeholder-text {
      color: #666;
      font-size: 1.1rem;
      margin-bottom: 2rem;
    }
  `]
})
export class GamesComponent implements OnInit {
  authService = inject(AuthService);
  private router = inject(Router);
  private gamesService = inject(GamesService);

  games = signal<SteamGame[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadGames();
  }

  loadGames() {
    this.loading.set(true);
    this.error.set(null);

    this.gamesService.getSteamGames().subscribe({
      next: (response) => {
        this.games.set(response.games || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading games:', err);
        this.error.set(err.error?.message || 'Failed to load games. Please try again.');
        this.loading.set(false);
      }
    });
  }

  getGameImageUrl(game: SteamGame): string {
    if (game.img_icon_url) {
      return `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`;
    }
    return '';
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  formatPlaytime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours === 1) {
      return '1 hour';
    }
    return `${hours} hours`;
  }

  goToSettings() {
    this.router.navigate(['/settings']);
  }

  signOut() {
    this.authService.signOut();
    this.router.navigate(['/login']);
  }
}
