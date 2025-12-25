import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SettingsService, UserSettings } from '../services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
        <div class="card steam-section">
          <h2>Steam Integration</h2>
          
          <div class="steam-description">
            <p>Connect your Steam account to track your game library.</p>
          </div>

          <div class="form-group">
            <label for="steamId">Steam ID</label>
            <input 
              type="text" 
              id="steamId" 
              [(ngModel)]="steamId"
              placeholder="Enter your Steam ID"
              class="input-field"
            >
            <small class="help-text">Find your Steam ID at <a href="https://steamid.io/" target="_blank">steamid.io</a></small>
          </div>

          <div class="form-actions">
            <button 
              (click)="saveSteamId()" 
              class="btn-save"
              [disabled]="saving()"
            >
              {{ saving() ? 'Saving...' : 'Save Steam ID' }}
            </button>
          </div>

          <div *ngIf="saveSuccess()" class="success-message">
            ✓ Steam ID saved successfully!
          </div>
          
          <div *ngIf="saveError()" class="error-message">
            {{ saveError() }}
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

    .steam-description {
      color: #666;
      margin-bottom: 1.5rem;
    }

    .steam-description p {
      margin: 0;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      font-weight: 600;
      color: #333;
      margin-bottom: 0.5rem;
    }

    .input-field {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .input-field:focus {
      outline: none;
      border-color: #667eea;
    }

    .help-text {
      display: block;
      margin-top: 0.5rem;
      color: #666;
      font-size: 0.875rem;
    }

    .help-text a {
      color: #667eea;
      text-decoration: none;
    }

    .help-text a:hover {
      text-decoration: underline;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
    }

    .btn-save {
      padding: 0.75rem 1.5rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      font-size: 1rem;
      transition: background 0.2s;
    }

    .btn-save:hover:not(:disabled) {
      background: #5568d3;
    }

    .btn-save:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .success-message {
      margin-top: 1rem;
      padding: 0.75rem;
      background: #d4edda;
      color: #155724;
      border-radius: 6px;
      font-weight: 500;
    }

    .error-message {
      margin-top: 1rem;
      padding: 0.75rem;
      background: #f8d7da;
      color: #721c24;
      border-radius: 6px;
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
  
  steamId = '';
  saving = signal(false);
  saveSuccess = signal(false);
  saveError = signal<string | null>(null);

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
        this.steamId = data.steamId || '';
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load settings. Please try again.');
        this.loading.set(false);
        console.error('Settings error:', err);
      }
    });
  }

  saveSteamId() {
    this.saving.set(true);
    this.saveSuccess.set(false);
    this.saveError.set(null);

    this.settingsService.updateSteamId(this.steamId).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => this.saveSuccess.set(false), 3000);
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set('Failed to save Steam ID. Please try again.');
        console.error('Save error:', err);
      }
    });
  }

  signOut() {
    this.authService.signOut();
    this.router.navigate(['/login']);
  }
}
