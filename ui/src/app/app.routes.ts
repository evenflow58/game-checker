import { Routes } from '@angular/router';
import { LoginComponent } from './components/login.component';
import { SettingsComponent } from './components/settings.component';
import { GamesComponent } from './components/games.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'games', component: GamesComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '**', redirectTo: '/login' }
];
