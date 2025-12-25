import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { GamesService, SteamGame } from '../services/games.service';

@Component({
  selector: 'app-games',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
            <p class="game-count">{{ filteredGames().length }} of {{ games().length }} games</p>
          </div>
          
          <div class="controls">
            <input 
              type="text" 
              class="search-input" 
              placeholder="Search games..."
              [(ngModel)]="searchTerm"
              (input)="onSearchChange()"
            >
            <select class="sort-select" [(ngModel)]="sortBy" (change)="onSortChange()">
              <option value="name">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="playtime">Most Played</option>
              <option value="playtime-asc">Least Played</option>
            </select>
          </div>
          
          <div class="games-grid">
            <div *ngFor="let game of filteredGames()" class="game-card">
              <div class="game-image">
                <img 
                  *ngIf="game.img_logo_url || game.img_icon_url" 
                  [src]="getGameImageUrl(game)" 
                  [alt]="game.name"
                  (error)="onImageError($event)"
                >
                <div *ngIf="!game.img_logo_url && !game.img_icon_url" class="game-placeholder">🎮</div>
              </div>
              <div class="game-info">
                <div class="game-header">
                  <h3 class="game-name">{{ game.name }}</h3>
                  <div class="platform-badge steam" title="Steam">
                    <svg viewBox="0 0 256 256" fill="currentColor">
                      <path d="M127.9,3.1C61.6,3.1,7.4,55,3.3,120.6L68,143.4c5.1-3.5,11.3-5.5,17.9-5.5c0.6,0,1.2,0,1.8,0.1l31.3-45.4c0-0.3,0-0.6,0-0.9
                        c0-25.4,20.6-46,46-46c25.4,0,46,20.6,46,46c0,25.4-20.6,46-46,46c-0.3,0-0.7,0-1,0l-44.6,31.9c0,0.5,0.1,1,0.1,1.4
                        c0,17.6-14.3,31.9-31.9,31.9c-15.9,0-29-11.6-31.4-26.9l-46.1-19c11.5,57.8,62.2,101.4,122.5,101.4c69.3,0,125.5-56.2,125.5-125.5
                        C253.4,59.2,197.2,3.1,127.9,3.1z M80.1,186.5l-10.5-4.3c1.9,3.9,5.1,7.2,9.3,9.2c9.1,4.3,20-0.6,24.2-9.7
                        c2.1-4.4,2.1-9.3,0-13.7c-2.1-4.4-5.9-7.7-10.3-9.8c-4.3-2-9-2.3-13.4-1l10.8,4.5c6.7,2.8,9.9,10.5,7.1,17.2
                        C84.5,185.6,76.8,188.8,80.1,186.5z M193.8,92c0-16.9-13.7-30.6-30.6-30.6c-16.9,0-30.6,13.7-30.6,30.6
                        c0,16.9,13.7,30.6,30.6,30.6C180.1,122.6,193.8,108.9,193.8,92z M140.2,92c0-12.7,10.3-23,23-23c12.7,0,23,10.3,23,23
                        c0,12.7-10.3,23-23,23C150.5,115,140.2,104.7,140.2,92z"/>
                    </svg>
                  </div>
                </div>
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
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 1rem;
    }

    .game-card {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }

    .game-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }

    .game-image {
      width: 100%;
      height: 70px;
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
      font-size: 1.5rem;
      opacity: 0.5;
    }

    .game-info {
      padding: 0.5rem;
    }

    .game-header {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }

    .game-name {
      flex: 1;
      margin: 0;
      color: #333;
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1.2;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .platform-badge {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .platform-badge.steam {
      background: #171a21;
      color: white;
    }

    .platform-badge svg {
      width: 12px;
      height: 12px;
    }

    .game-playtime {
      margin: 0;
      color: #666;
      font-size: 0.65rem;
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

    .controls {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .search-input {
      flex: 1;
      padding: 0.75rem 1rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s;
    }

    .search-input:focus {
      border-color: #667eea;
    }

    .sort-select {
      padding: 0.75rem 1rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 0.9rem;
      background: white;
      cursor: pointer;
      outline: none;
      transition: border-color 0.2s;
    }

    .sort-select:focus {
      border-color: #667eea;
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
  searchTerm = '';
  sortBy = 'name';

  filteredGames = computed(() => {
    let filtered = this.games();

    // Apply search filter
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(game => 
        game.name.toLowerCase().includes(search)
      );
    }

    // Apply sorting
    const sorted = [...filtered];
    switch (this.sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'playtime':
        sorted.sort((a, b) => b.playtime_forever - a.playtime_forever);
        break;
      case 'playtime-asc':
        sorted.sort((a, b) => a.playtime_forever - b.playtime_forever);
        break;
    }

    return sorted;
  });

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadGames();
  }

  onSearchChange() {
    // Trigger computed signal update
    this.games.set([...this.games()]);
  }

  onSortChange() {
    // Trigger computed signal update
    this.games.set([...this.games()]);
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
    // Try logo first (higher resolution), fall back to icon
    if (game.img_logo_url) {
      return `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_logo_url}.jpg`;
    } else if (game.img_icon_url) {
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
