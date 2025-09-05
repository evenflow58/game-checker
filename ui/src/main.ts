import { bootstrapApplication } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AppComponent } from './app/app.component.js';
import { importProvidersFrom } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthInterceptor } from './app/core/interceptor/auth.interceptor.js';
import { GoogleAuthService } from './app/core/service/google-auth/google-auth.service.js';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    importProvidersFrom(CommonModule), // provides directives like *ngIf, *ngFor
    GoogleAuthService,
    provideHttpClient(withInterceptorsFromDi()),

    // Register your interceptor
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
})
  .catch(err => console.error(err));
