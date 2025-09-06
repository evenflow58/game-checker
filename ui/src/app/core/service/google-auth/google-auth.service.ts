import { Injectable, NgZone } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';

declare const google: any;

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private userSubject = new ReplaySubject<any>(1);
  user$: Observable<any> = this.userSubject.asObservable();

  private token: string | null = null;
  private readonly STORAGE_KEY = 'google_token';

  constructor(private zone: NgZone) {
    // Load token from storage if it exists
    const storedToken = localStorage.getItem(this.STORAGE_KEY);
    if (storedToken) {
      this.token = storedToken;
      const payload = this.decodeJwt(storedToken);
      this.zone.run(() => {
        this.userSubject.next(payload);
      });
    }
  }

  initClient(clientId: string) {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) => this.handleCredentialResponse(response),
    });

    // Optional: Let GIS auto-login silently
    google.accounts.id.prompt();
  }

  renderButton(elementId: string) {
    google.accounts.id.renderButton(
      document.getElementById(elementId),
      { theme: 'outline', size: 'large' }
    );
  }

  private handleCredentialResponse(response: any) {
    const credential = response.credential;
    this.token = credential;

    // Store token in localStorage so it's available after refresh
    localStorage.setItem(this.STORAGE_KEY, credential);

    const payload = this.decodeJwt(credential);

    this.zone.run(() => {
      this.userSubject.next(payload);
    });
  }

  getToken(): string | null {
    return this.token;
  }

  signOut() {
    google.accounts.id.disableAutoSelect();
    this.token = null;

    // Clear storage
    localStorage.removeItem(this.STORAGE_KEY);

    this.zone.run(() => {
      this.userSubject.next(null);
    });
  }

  private decodeJwt(token: string): any {
    return JSON.parse(atob(token.split('.')[1]));
  }
}
