import { Component } from '@angular/core';
import { GoogleAuthService } from './core/service//google-auth/google-auth.service.js';
import { CommonModule } from '@angular/common';
import { GoogleButtonDirective } from './core/directive/google-button.directive.js';
import { environment } from 'src/environments/environment.js';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [CommonModule, GoogleButtonDirective], // important for directives and standalone components
})
export class AppComponent {
  title = 'game-checker-ui';
  user$ = this.googleAuth.user$;

  constructor(private googleAuth: GoogleAuthService) {}

  ngOnInit() {
    this.googleAuth.initClient(environment.GOOGLE_CLIENT_ID);
  }

  signOut() {
    this.googleAuth.signOut();
  }
}
