import { bootstrapApplication } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppComponent } from './app/app.component.js';
import { AuthInterceptor } from './app/core/interceptor/auth.interceptor.js';
import { GoogleAuthService } from './app/core/service/google-auth/google-auth.service.js';
import { routes } from './app/app-routing.module.js';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideAnimations } from '@angular/platform-browser/animations';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    importProvidersFrom(CommonModule), // provides directives like *ngIf, *ngFor
    GoogleAuthService,
    provideHttpClient(withInterceptorsFromDi()),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideAnimations(),

    // Register your interceptor
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
})
  .catch(err => console.error(err));
