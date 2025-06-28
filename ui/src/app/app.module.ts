import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideOAuthClient } from 'angular-oauth2-oidc';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { provideHttpClient } from '@angular/common/http';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    AppRoutingModule,
    BrowserModule,
  ],
  providers: [
    provideOAuthClient(),
    provideHttpClient(),
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
