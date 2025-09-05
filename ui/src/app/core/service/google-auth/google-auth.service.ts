import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

declare const google: any;

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private userSubject = new ReplaySubject<any>(1);
  user$: Observable<any> = this.userSubject.asObservable();

  private token: string | null = null;

  constructor(private zone: NgZone) {}

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

  private handleCredentialResponse(response: any) {
    const credential = response.credential;
    this.token = credential;

    const payload = this.decodeJwt(credential);

    this.zone.run(() => {
      this.userSubject.next(payload); // triggers all subscribers
    });
  }

  getToken(): string | null {
    return this.token;
  }

  signOut() {
    google.accounts.id.disableAutoSelect();
    this.token = null;

    this.zone.run(() => {
      this.userSubject.next(null);
    });
  }

  private decodeJwt(token: string): any {
    return JSON.parse(atob(token.split('.')[1]));
  }
}
