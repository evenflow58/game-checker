import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

declare const google: any;

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
  sub: string;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleAuthService {
  private userSubject = new BehaviorSubject<any>(null);
  user$ = this.userSubject.asObservable();

  private token: string | null = null; // store raw JWT

  constructor() {}

  initClient(clientId: string) {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) => this.handleCredentialResponse(response)
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
    this.token = credential; // save the raw JWT
    const payload = this.decodeJwt(credential);
    this.userSubject.next(payload);
  }

  getToken(): string | null {
    return this.token;
  }

  signOut() {
    google.accounts.id.disableAutoSelect();
    this.token = null;
    this.userSubject.next(null);
  }

  private decodeJwt(token: string): any {
    return JSON.parse(atob(token.split('.')[1]));
  }
}
