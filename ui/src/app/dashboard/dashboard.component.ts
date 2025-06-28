import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthGoogleService } from '../services';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  public profile: any;

  constructor(private authService: AuthGoogleService, private router: Router) { }

  ngOnInit() {
    this.showData();
  }

  showData() {
    this.profile = this.authService.getProfile();
  }

  logOut() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
