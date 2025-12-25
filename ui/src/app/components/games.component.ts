import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

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
        <div class="placeholder-container">
          <div class="placeholder-icon">🎮</div>
          <h2>Games Page Coming Soon!</h2>
          <p class="placeholder-text">
            This is where you'll see your game library and check which games you own across different platforms.
          </p>
          <div class="features-list">
            <div class="feature-item">
              <span class="feature-icon">✓</span>
              <span>View games from your Steam library</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">✓</span>
              <span>Cross-platform game tracking</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">✓</span>
              <span>Check game ownership before buying</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .games-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    .header {
      background: white;
      padding: 1.5rem 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
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
      max-width: 1200px;
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
  `]
})
export class GamesComponent implements OnInit {
  authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
  }

  goToSettings() {
    this.router.navigate(['/settings']);
  }

  signOut() {
    this.authService.signOut();
    this.router.navigate(['/login']);
  }
}
