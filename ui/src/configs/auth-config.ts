import { AuthConfig } from 'angular-oauth2-oidc';
import { environment } from 'src/environments/environment';

export const authConfig: AuthConfig = {
  issuer: 'https://accounts.google.com',
  redirectUri: window.location.origin + '/dashboard',
  clientId: environment.googleClientId,
  scope: 'openid profile email',
  strictDiscoveryDocumentValidation: false,
};