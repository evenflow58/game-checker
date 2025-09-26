import { Component, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleAuthService } from './core/service/google-auth/google-auth.service.js';
import { GoogleButtonDirective } from './core/directive/google-button.directive.js';
import { environment } from '../environments/environment.js';
import { Subject } from 'rxjs';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [CommonModule, GoogleButtonDirective, RouterOutlet],
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  title = 'game-checker-ui';
  user$ = this.googleAuth.user$;
  destroy$ = new Subject<void>();
  cachedPicture: string | null = null; // will hold base64 image

  constructor(
    private googleAuth: GoogleAuthService,
  ) { }

  ngOnInit() {
    this.googleAuth.initClient(environment.GOOGLE_CLIENT_ID);
  }

  ngAfterViewInit() {
    // Render the Google sign-in button
    this.googleAuth.renderButton('g_id_signin');
  }

  signOut() {
    this.googleAuth.signOut();
    this.cachedPicture = null; // clear picture on sign out
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
