import { Component, OnInit, ElementRef, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <div class="login-container">
      <div class="login-card">
        <h1>Game Checker</h1>
        <p class="subtitle">Sign in to manage your game settings</p>
        
        <div #googleButton class="google-button-container"></div>
        
        <p class="info-text">
          Sign in with your Google account to access your personalized settings
        </p>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    .login-card {
      background: white;
      padding: 3rem;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
      max-width: 400px;
      width: 90%;
    }
    
    h1 {
      margin: 0 0 0.5rem 0;
      font-size: 2.5rem;
      color: #333;
      font-weight: 700;
    }
    
    .subtitle {
      color: #666;
      margin-bottom: 2rem;
      font-size: 1.1rem;
    }
    
    .google-button-container {
      display: flex;
      justify-content: center;
      margin: 2rem 0;
    }
    
    .info-text {
      color: #888;
      font-size: 0.9rem;
      margin-top: 1.5rem;
    }
  `]
})
export class LoginComponent implements OnInit {
  @ViewChild('googleButton', { static: true }) googleButton!: ElementRef;
  
  private authService = inject(AuthService);
  private router = inject(Router);

  async ngOnInit() {
    // If already authenticated, redirect to settings
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/settings']);
      return;
    }

    await this.authService.initializeGoogleSignIn();
    this.authService.renderButton(this.googleButton.nativeElement);
    
    // Watch for authentication changes
    setInterval(() => {
      if (this.authService.isAuthenticated()) {
        this.router.navigate(['/settings']);
      }
    }, 500);
  }
}
