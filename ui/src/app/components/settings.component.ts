import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SettingsService, UserSettings } from '../services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="settings-container">
      <header class="header">
        <h1>Game Checker Settings</h1>
        <div class="user-info" *ngIf="authService.user() as user">
          <img [src]="user.picture" [alt]="user.name" class="avatar" *ngIf="user.picture">
          <span class="user-name">{{ user.name }}</span>
          <button (click)="signOut()" class="btn-signout">Sign Out</button>
        </div>
      </header>

      <main class="content">
        <div class="card">
          <h2>User Information</h2>
          
          <div *ngIf="loading()" class="loading">
            <div class="spinner"></div>
            <p>Loading settings...</p>
          </div>

          <div *ngIf="error()" class="error">
            <p>{{ error() }}</p>
            <button (click)="loadSettings()" class="btn-retry">Retry</button>
          </div>

          <div *ngIf="settings() && !loading()" class="settings-info">
            <div class="info-row">
              <label>User ID:</label>
              <span>{{ settings()?.user?.sub }}</span>
            </div>
            <div class="info-row">
              <label>Email:</label>
              <span>{{ settings()?.user?.email }}</span>
            </div>
            <div class="info-row">
              <label>Name:</label>
              <span>{{ settings()?.user?.name }}</span>
            </div>
            <div *ngIf="settings()?.message" class="info-row">
              <label>Message:</label>
              <span>{{ settings()?.message }}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .settings-container {
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
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    .card {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .card h2 {
      margin-top: 0;
      color: #333;
      border-bottom: 2px solid #667eea;
      padding-bottom: 0.5rem;
    }

    .loading {
      text-align: center;
      padding: 2rem;
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error {
      background: #f8d7da;
      color: #721c24;
      padding: 1rem;
      border-radius: 6px;
      text-align: center;
    }

    .btn-retry {
      margin-top: 1rem;
      padding: 0.5rem 1.5rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
    }

    .btn-retry:hover {
      background: #5568d3;
    }

    .settings-info {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .info-row {
      display: flex;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .info-row label {
      font-weight: 600;
      color: #666;
      min-width: 120px;
    }

    .info-row span {
      color: #333;
      flex: 1;
    }
  `]
})
export class SettingsComponent implements OnInit {
  authService = inject(AuthService);
  private settingsService = inject(SettingsService);
  private router = inject(Router);

  settings = signal<UserSettings | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadSettings();
  }

  loadSettings() {
    this.loading.set(true);
    this.error.set(null);

    this.settingsService.getSettings().subscribe({
      next: (data) => {
        this.settings.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load settings. Please try again.');
        this.loading.set(false);
        console.error('Settings error:', err);
      }
    });
  }

  signOut() {
    this.authService.signOut();
    this.router.navigate(['/login']);
  }
}
