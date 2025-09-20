import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatInputModule } from '@angular/material/input';
import { catchError, finalize, first, of } from 'rxjs';
import { SnackbarService } from '../..//core/service/snackbar/snackbar.service.js';
import { SettingsService } from '../../core/service/api/settings/settings.service.js';
import { validateId } from '../../core/validator/validate-id.validator.js';

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
export class SettingsComponent implements OnInit {
  readonly steamId = new FormControl('', [Validators.required, validateId(/^\d{17}$/)])
  readonly steamErrorMessage = signal('');
  isLoading = false;

  constructor(
    private snackBar: SnackbarService,
    private settingsApi: SettingsService
  ) { }

  ngOnInit(): void {
    this.settingsApi.get()
      .pipe(
        first(),
        catchError(() => {
          this.snackBar.displayError('Unable to get settings');
          return of({ steamId: '' });
        })
      )
      .subscribe(value => {
        this.steamId.setValue(value.steamId);
      });
  }

  checkSteamId() {
    if (this.steamId.hasError('required')) {
      this.steamErrorMessage.set('An id is required');
    } else if (this.steamId.hasError('forbiddenId')) {
      this.steamErrorMessage.set('The id should be nine numbers.')
    } else this.steamErrorMessage.set('');
  }

  linkSteam() {
    this.isLoading = true;
    this.settingsApi.put(this.steamId.value!)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: () => this.snackBar.displaySuccess('Steam saved successfully!'),
        error: (error) => {
          let message = "";
          switch (error?.error?.provider) {
            case "Steam":
              message = "Unable to save Steam.";
              break;
            default:
              message = "An unknown error occured. Unable to save settings.";
              break;
          }

          this.snackBar.displayError(message);
        }
      });
  }

  isButtonDisabled() {
    return this.steamId.invalid || this.isLoading;
  }
}
