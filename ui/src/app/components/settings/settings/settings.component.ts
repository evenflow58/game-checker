import { Component, signal } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { validateId } from '../../../core/validator/validate-id.validator.js';
import { SettingsService } from '../../../core/service/api/settings/settings.service.js';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

@Component({
  selector: 'app-settings',
  imports: [
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatGridListModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {
  readonly steamId = new FormControl('', [Validators.required, validateId(/^\d{17}$/)])
  readonly steamErrorMessage = signal('');

  constructor(private settingsApi: SettingsService) { }

  checkSteamId() {
    if (this.steamId.hasError('required')) {
      this.steamErrorMessage.set('An id is required');
    } else if (this.steamId.hasError('forbiddenId')) {
      this.steamErrorMessage.set('The id should be nine numbers.')
    } else this.steamErrorMessage.set('');
  }

  linkSteam() {
    this.settingsApi.put(this.steamId.value!)
      .subscribe({
        next: (response) => { },
        error: (error) => { }
      });
  }
}
