import { Component } from '@angular/core';
import { AuthGoogleService } from '../services/auth-google/auth-google.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})

export class LoginComponent {
  constructor(private authService: AuthGoogleService) { }

  signInWithGoogle() {
    this.authService.login();
  }
}
