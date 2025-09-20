import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
  constructor(private snackBar: MatSnackBar) { }

  private display(message: string, action: string, cssClass: string): void {
    this.snackBar.open(
      message,
      action,
      {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: [cssClass]
      });
  }

  public displayError(message: string): void {
    this.display(message, 'Dismiss', 'error-snackbar');
  }

  public displaySuccess(message: string): void {
    this.display(message, 'Dismiss', 'success-snackbar');
  }
}
