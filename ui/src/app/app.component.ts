import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleAuthService } from './core/service/google-auth/google-auth.service.js';
import { GoogleButtonDirective } from './core/directive/google-button.directive.js';
import { TestApiService } from './core/service/api/test/test.service.js';
import { environment } from '../environments/environment.js';
import { filter, switchMap, of, takeUntil, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [CommonModule, GoogleButtonDirective, RouterOutlet],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  title = 'game-checker-ui';
  user$ = this.googleAuth.user$;
  destroy$ = new Subject<void>();

  constructor(
    private googleAuth: GoogleAuthService,
    private testApi: TestApiService
  ) {}

  ngOnDestroy(): void {
  }

  ngOnInit() {
    this.googleAuth.initClient(environment.GOOGLE_CLIENT_ID);

    // run API call whenever user$ emits a non-null value
    this.user$
      .pipe(
        filter(user => !!user), // only when user is logged in
        // switchMap(() => this.testApi.getTest() || of(null)),
        takeUntil(this.destroy$)
      )
      .subscribe(result => {
        console.log('API result after login:', result);
      });
  }

  ngAfterViewInit() {
    // Render the Google sign-in button
    this.googleAuth.renderButton('g_id_signin');
  }

  signOut() {
    this.googleAuth.signOut();
  }
}
