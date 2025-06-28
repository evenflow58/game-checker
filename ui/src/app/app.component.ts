import { Component } from '@angular/core';
import { LoginComponent } from './login/login.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false,
})
export class AppComponent {
  title = 'game-checker-ui';
}
