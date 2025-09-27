import { Injectable, NgZone } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { Observable, ReplaySubject } from 'rxjs';

declare const google: any;

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private userSubject = new ReplaySubject<any>(1);
  user$: Observable<any> = this.userSubject.asObservable();

  private readonly STORAGE_KEY = 'google_token';

  constructor(
    private zone: NgZone,
    private cookieService: CookieService
  ) {
    const storedToken = this.getToken();
    if (storedToken) {
      const payload = this.decodeJwt(storedToken);
      this.zone.run(() => this.userSubject.next(payload));
    }
  }

  initClient(clientId: string) {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) => this.handleCredentialResponse(response),
    });
  }

  renderButton(elementId: string) {
    google.accounts.id.renderButton(
      document.getElementById(elementId),
      { theme: 'outline', size: 'large' }
    );
  }

  private async handleCredentialResponse(response: any) {
    const credential = response.credential;
    const payload = this.decodeJwt(credential);

    // Store credential in cookie with expiration
    this.cookieService.set(this.STORAGE_KEY, credential, {
      expires: payload.exp
    });

    // Emit user payload
    this.zone.run(() => this.userSubject.next(payload));
}

  signOut() {
    google.accounts.id.disableAutoSelect();
    this.cookieService.delete(this.STORAGE_KEY);
    this.zone.run(() => this.userSubject.next(null));
  }

  getToken(): string | null {
    return this.cookieService.get(this.STORAGE_KEY);
  }

  private decodeJwt(token: string): any {
    return JSON.parse(atob(token.split('.')[1]));
  }
}
