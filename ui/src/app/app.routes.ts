import { Routes } from '@angular/router';
import { LoginComponent } from './components/login.component';
import { SettingsComponent } from './components/settings.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '**', redirectTo: '/login' }
];
