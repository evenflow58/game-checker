import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

declare const google: any;

export interface User {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSignal = signal<User | null>(null);
  private tokenSignal = signal<string | null>(null);
  
  user = this.userSignal.asReadonly();
  token = this.tokenSignal.asReadonly();
  isAuthenticated = signal(false);

  constructor() {
    // Check for existing token in localStorage
    const savedToken = localStorage.getItem('id_token');
    if (savedToken) {
      this.tokenSignal.set(savedToken);
      this.decodeToken(savedToken);
    }
  }

  initializeGoogleSignIn(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof google === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = () => {
          this.setupGoogle();
          resolve();
        };
        document.head.appendChild(script);
      } else {
        this.setupGoogle();
        resolve();
      }
    });
  }

  private setupGoogle(): void {
    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: any) => this.handleCredentialResponse(response),
      ux_mode: 'popup',
      auto_select: false
    });
  }

  renderButton(element: HTMLElement): void {
    google.accounts.id.renderButton(element, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular'
    });
  }

  private handleCredentialResponse(response: any): void {
    const idToken = response.credential;
    this.tokenSignal.set(idToken);
    localStorage.setItem('id_token', idToken);
    this.decodeToken(idToken);
    this.isAuthenticated.set(true);
  }

  private decodeToken(token: string): void {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      this.userSignal.set({
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      });
      this.isAuthenticated.set(true);
    } catch (error) {
      console.error('Failed to decode token:', error);
      this.signOut();
    }
  }

  signOut(): void {
    this.userSignal.set(null);
    this.tokenSignal.set(null);
    this.isAuthenticated.set(false);
    localStorage.removeItem('id_token');
    google.accounts.id.disableAutoSelect();
  }
}
