import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { authConfig } from 'src/configs/auth-config';

@Injectable({
  providedIn: 'root'
})
export class AuthGoogleService {
  constructor(
    private oAuthService: OAuthService,
    private router: Router
  ) {
    this.initConfiguration();
  }

  initConfiguration() {
    this.oAuthService.configure(authConfig);
    this.oAuthService.setupAutomaticSilentRefresh();
    this.oAuthService.loadDiscoveryDocumentAndTryLogin();
  }

  login() {
    this.oAuthService.initImplicitFlow();
  }

  logout() {
    this.oAuthService.revokeTokenAndLogout();
    this.oAuthService.logOut();
  }

  getProfile() {
    return this.oAuthService.getIdentityClaims();
  }

  getToken() {
    return this.oAuthService.getAccessToken();
  }
}
