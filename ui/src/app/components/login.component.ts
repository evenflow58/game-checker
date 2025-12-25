import { Component, OnInit, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-container">
      <div class="game-boxes-background">
        <div class="game-box" *ngFor="let game of games" [style.background]="game.gradient">
          <div class="game-art" [innerHTML]="game.icon"></div>
          <div class="game-title">{{ game.title }}</div>
          <div class="game-genre">{{ game.genre }}</div>
        </div>
      </div>
      
      <div class="login-card">
        <h1>Game Checker</h1>
        <p class="subtitle">Sign in to manage your game settings</p>
        
        <div *ngIf="signingIn()" class="signing-in-overlay">
          <div class="spinner"></div>
          <p>Signing you in...</p>
        </div>
        
        <div #googleButton class="google-button-container" [class.hidden]="signingIn()"></div>
        
        <p class="info-text">
          Sign in with your Google account to access your personalized settings
        </p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      position: fixed;
      top: 0;
      left: 0;
      margin: 0;
      padding: 0;
    }
    
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      background: #1a1a2e;
      overflow: hidden;
      position: relative;
      margin: 0;
      padding: 0;
    }
    
    .game-boxes-background {
      position: absolute;
      top: -100%;
      left: -100%;
      width: 400%;
      height: 400%;
      display: grid;
      grid-template-columns: repeat(15, 200px);
      grid-auto-rows: 280px;
      gap: 30px;
      transform: rotate(-15deg);
      animation: scrollDiagonal 30s linear infinite;
      opacity: 0.3;
    }
    
    @keyframes scrollDiagonal {
      0% {
        transform: rotate(-15deg) translate(0, 0);
      }
      100% {
        transform: rotate(-15deg) translate(-230px, 230px);
      }
    }
    
    .game-box {
      width: 200px;
      height: 280px;
      border-radius: 8px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 20px;
      position: relative;
      overflow: hidden;
    }
    
    .game-box::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 100%);
    }
    
    .game-art {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 5rem;
      opacity: 0.6;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
    }
    
    .game-title {
      font-size: 1.3rem;
      font-weight: bold;
      color: white;
      z-index: 1;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      line-height: 1.2;
    }
    
    .game-genre {
      font-size: 0.85rem;
      color: rgba(255,255,255,0.8);
      z-index: 1;
      margin-top: 5px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .login-card {
      background: white;
      padding: 3rem;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      text-align: center;
      max-width: 400px;
      width: 90%;
      z-index: 10;
      position: relative;
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

    .google-button-container.hidden {
      visibility: hidden;
    }

    .signing-in-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 0;
      margin: 2rem 0;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e0e0e0;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .signing-in-overlay p {
      margin-top: 1rem;
      color: #667eea;
      font-size: 1rem;
      font-weight: 500;
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

  signingIn = signal(false);

  // Fake video game box covers with vibrant gradients and icons
  games = [
    { title: 'CYBER NEXUS', genre: 'Action RPG', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: '🤖' },
    { title: 'NEON STREETS', genre: 'Racing', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', icon: '🏎️' },
    { title: 'SPACE WARS', genre: 'Strategy', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', icon: '🚀' },
    { title: 'DARK LEGENDS', genre: 'Horror', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', icon: '👻' },
    { title: 'PIXEL QUEST', genre: 'Adventure', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', icon: '🗡️' },
    { title: 'BATTLE ARENA', genre: 'Fighting', gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', icon: '⚔️' },
    { title: 'MAGIC REALM', genre: 'Fantasy RPG', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', icon: '🧙' },
    { title: 'STEEL COMMAND', genre: 'Tactical', gradient: 'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)', icon: '🎖️' },
    { title: 'DRAGON SAGA', genre: 'MMORPG', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', icon: '🐉' },
    { title: 'VOID HUNTER', genre: 'Shooter', gradient: 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)', icon: '🎯' },
    { title: 'CRYSTAL CASTLE', genre: 'Puzzle', gradient: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', icon: '💎' },
    { title: 'TIME BREACH', genre: 'Sci-Fi', gradient: 'linear-gradient(135deg, #f77062 0%, #fe5196 100%)', icon: '⏰' },
    { title: 'SHADOW OPS', genre: 'Stealth', gradient: 'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)', icon: '🕵️' },
    { title: 'OCEAN DEEP', genre: 'Exploration', gradient: 'linear-gradient(135deg, #48c6ef 0%, #6f86d6 100%)', icon: '🌊' },
    { title: 'HERO RISE', genre: 'Platformer', gradient: 'linear-gradient(135deg, #feac5e 0%, #c779d0 100%)', icon: '⭐' },
    { title: 'GALACTIC WARS', genre: 'Space Sim', gradient: 'linear-gradient(135deg, #4bc0c8 0%, #c779d0 100%)', icon: '🛸' },
    { title: 'WILD FRONTIERS', genre: 'Western', gradient: 'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)', icon: '🤠' },
    { title: 'NINJA PATH', genre: 'Action', gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)', icon: '🥷' },
    { title: 'MYSTIC FOREST', genre: 'Adventure', gradient: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', icon: '🌲' },
    { title: 'RETRO ARCADE', genre: 'Classic', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', icon: '👾' },
    { title: 'ZOMBIE DAWN', genre: 'Survival', gradient: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)', icon: '🧟' },
    { title: 'SPEED RUSH', genre: 'Arcade Racing', gradient: 'linear-gradient(135deg, #ffd89b 0%, #19547b 100%)', icon: '⚡' },
    { title: 'FANTASY WORLD', genre: 'JRPG', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: '🏰' },
    { title: 'CRIME CITY', genre: 'GTA-style', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', icon: '🚔' },
    { title: 'MECH WARRIOR', genre: 'Mech Combat', gradient: 'linear-gradient(135deg, #96fbc4 0%, #f9f586 100%)', icon: '🦾' },
    { title: 'PIRATE SEAS', genre: 'Naval Action', gradient: 'linear-gradient(135deg, #667eea 0%, #f77062 100%)', icon: '⚓' },
    { title: 'DINO ISLAND', genre: 'Survival', gradient: 'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)', icon: '🦖' },
    { title: 'CYBER PUNK', genre: 'RPG', gradient: 'linear-gradient(135deg, #fa8bff 0%, #2bd2ff 100%)', icon: '🌃' },
    { title: 'ALIEN WORLD', genre: 'Sci-Fi FPS', gradient: 'linear-gradient(135deg, #92fe9d 0%, #00c9ff 100%)', icon: '👽' },
    { title: 'KNIGHT QUEST', genre: 'Medieval', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', icon: '🛡️' },
    // Repeat multiple times for seamless continuous scroll
    { title: 'CYBER NEXUS', genre: 'Action RPG', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: '🤖' },
    { title: 'NEON STREETS', genre: 'Racing', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', icon: '🏎️' },
    { title: 'SPACE WARS', genre: 'Strategy', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', icon: '🚀' },
    { title: 'DARK LEGENDS', genre: 'Horror', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', icon: '👻' },
    { title: 'PIXEL QUEST', genre: 'Adventure', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', icon: '🗡️' },
    { title: 'BATTLE ARENA', genre: 'Fighting', gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', icon: '⚔️' },
    { title: 'MAGIC REALM', genre: 'Fantasy RPG', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', icon: '🧙' },
    { title: 'STEEL COMMAND', genre: 'Tactical', gradient: 'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)', icon: '🎖️' },
    { title: 'DRAGON SAGA', genre: 'MMORPG', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', icon: '🐉' },
    { title: 'VOID HUNTER', genre: 'Shooter', gradient: 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)', icon: '🎯' },
    { title: 'CRYSTAL CASTLE', genre: 'Puzzle', gradient: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', icon: '💎' },
    { title: 'TIME BREACH', genre: 'Sci-Fi', gradient: 'linear-gradient(135deg, #f77062 0%, #fe5196 100%)', icon: '⏰' },
    { title: 'SHADOW OPS', genre: 'Stealth', gradient: 'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)', icon: '🕵️' },
    { title: 'OCEAN DEEP', genre: 'Exploration', gradient: 'linear-gradient(135deg, #48c6ef 0%, #6f86d6 100%)', icon: '🌊' },
    { title: 'HERO RISE', genre: 'Platformer', gradient: 'linear-gradient(135deg, #feac5e 0%, #c779d0 100%)', icon: '⭐' },
    { title: 'GALACTIC WARS', genre: 'Space Sim', gradient: 'linear-gradient(135deg, #4bc0c8 0%, #c779d0 100%)', icon: '🛸' },
    { title: 'WILD FRONTIERS', genre: 'Western', gradient: 'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)', icon: '🤠' },
    { title: 'NINJA PATH', genre: 'Action', gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)', icon: '🥷' },
    { title: 'MYSTIC FOREST', genre: 'Adventure', gradient: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', icon: '🌲' },
    { title: 'RETRO ARCADE', genre: 'Classic', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', icon: '👾' },
    { title: 'ZOMBIE DAWN', genre: 'Survival', gradient: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)', icon: '🧟' },
    { title: 'SPEED RUSH', genre: 'Arcade Racing', gradient: 'linear-gradient(135deg, #ffd89b 0%, #19547b 100%)', icon: '⚡' },
    { title: 'FANTASY WORLD', genre: 'JRPG', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: '🏰' },
    { title: 'CRIME CITY', genre: 'GTA-style', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', icon: '🚔' },
    { title: 'MECH WARRIOR', genre: 'Mech Combat', gradient: 'linear-gradient(135deg, #96fbc4 0%, #f9f586 100%)', icon: '🦾' },
    { title: 'PIRATE SEAS', genre: 'Naval Action', gradient: 'linear-gradient(135deg, #667eea 0%, #f77062 100%)', icon: '⚓' },
    { title: 'DINO ISLAND', genre: 'Survival', gradient: 'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)', icon: '🦖' },
    { title: 'CYBER PUNK', genre: 'RPG', gradient: 'linear-gradient(135deg, #fa8bff 0%, #2bd2ff 100%)', icon: '🌃' },
    { title: 'ALIEN WORLD', genre: 'Sci-Fi FPS', gradient: 'linear-gradient(135deg, #92fe9d 0%, #00c9ff 100%)', icon: '👽' },
    { title: 'KNIGHT QUEST', genre: 'Medieval', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', icon: '🛡️' },
    // Third repetition
    { title: 'CYBER NEXUS', genre: 'Action RPG', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: '🤖' },
    { title: 'NEON STREETS', genre: 'Racing', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', icon: '🏎️' },
    { title: 'SPACE WARS', genre: 'Strategy', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', icon: '🚀' },
    { title: 'DARK LEGENDS', genre: 'Horror', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', icon: '👻' },
    { title: 'PIXEL QUEST', genre: 'Adventure', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', icon: '🗡️' },
    { title: 'BATTLE ARENA', genre: 'Fighting', gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', icon: '⚔️' },
    { title: 'MAGIC REALM', genre: 'Fantasy RPG', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', icon: '🧙' },
    { title: 'STEEL COMMAND', genre: 'Tactical', gradient: 'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)', icon: '🎖️' },
    { title: 'DRAGON SAGA', genre: 'MMORPG', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', icon: '🐉' },
    { title: 'VOID HUNTER', genre: 'Shooter', gradient: 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)', icon: '🎯' },
    { title: 'CRYSTAL CASTLE', genre: 'Puzzle', gradient: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', icon: '💎' },
    { title: 'TIME BREACH', genre: 'Sci-Fi', gradient: 'linear-gradient(135deg, #f77062 0%, #fe5196 100%)', icon: '⏰' },
    { title: 'SHADOW OPS', genre: 'Stealth', gradient: 'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)', icon: '🕵️' },
    { title: 'OCEAN DEEP', genre: 'Exploration', gradient: 'linear-gradient(135deg, #48c6ef 0%, #6f86d6 100%)', icon: '🌊' },
    { title: 'HERO RISE', genre: 'Platformer', gradient: 'linear-gradient(135deg, #feac5e 0%, #c779d0 100%)', icon: '⭐' },
    { title: 'GALACTIC WARS', genre: 'Space Sim', gradient: 'linear-gradient(135deg, #4bc0c8 0%, #c779d0 100%)', icon: '🛸' },
    { title: 'WILD FRONTIERS', genre: 'Western', gradient: 'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)', icon: '🤠' },
    { title: 'NINJA PATH', genre: 'Action', gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)', icon: '🥷' },
    { title: 'MYSTIC FOREST', genre: 'Adventure', gradient: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', icon: '🌲' },
    { title: 'RETRO ARCADE', genre: 'Classic', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', icon: '👾' },
    { title: 'ZOMBIE DAWN', genre: 'Survival', gradient: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)', icon: '🧟' },
    { title: 'SPEED RUSH', genre: 'Arcade Racing', gradient: 'linear-gradient(135deg, #ffd89b 0%, #19547b 100%)', icon: '⚡' },
    { title: 'FANTASY WORLD', genre: 'JRPG', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: '🏰' },
    { title: 'CRIME CITY', genre: 'GTA-style', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', icon: '🚔' },
    { title: 'MECH WARRIOR', genre: 'Mech Combat', gradient: 'linear-gradient(135deg, #96fbc4 0%, #f9f586 100%)', icon: '🦾' },
    { title: 'PIRATE SEAS', genre: 'Naval Action', gradient: 'linear-gradient(135deg, #667eea 0%, #f77062 100%)', icon: '⚓' },
    { title: 'DINO ISLAND', genre: 'Survival', gradient: 'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)', icon: '🦖' },
    { title: 'CYBER PUNK', genre: 'RPG', gradient: 'linear-gradient(135deg, #fa8bff 0%, #2bd2ff 100%)', icon: '🌃' },
    { title: 'ALIEN WORLD', genre: 'Sci-Fi FPS', gradient: 'linear-gradient(135deg, #92fe9d 0%, #00c9ff 100%)', icon: '👽' },
    { title: 'KNIGHT QUEST', genre: 'Medieval', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', icon: '🛡️' },
  ];

  async ngOnInit() {
    // If already authenticated, redirect to settings
    if (this.authService.isAuthenticated()) {
      this.signingIn.set(true);
      this.router.navigate(['/settings']);
      return;
    }

    await this.authService.initializeGoogleSignIn();
    this.authService.renderButton(this.googleButton.nativeElement);
    
    // Watch for authentication changes
    setInterval(() => {
      if (this.authService.isAuthenticated()) {
        this.signingIn.set(true);
        this.router.navigate(['/settings']);
      }
    }, 500);
  }
}
