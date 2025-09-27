import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SnackbarService } from './snackbar.service.js';

describe('SnackbarService', () => {
  let service: SnackbarService;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      providers: [
        SnackbarService,
        { provide: MatSnackBar, useValue: mockSnackBar }
      ]
    });

    service = TestBed.inject(SnackbarService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('displayError', () => {
    it('should open snackbar with error configuration', () => {
      const message = 'Test error message';
      
      service.displayError(message);

      expect(mockSnackBar.open).toHaveBeenCalledWith(
        message,
        'Dismiss',
        {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        }
      );
    });
  });

  describe('displaySuccess', () => {
    it('should open snackbar with success configuration', () => {
      const message = 'Test success message';
      
      service.displaySuccess(message);

      expect(mockSnackBar.open).toHaveBeenCalledWith(
        message,
        'Dismiss',
        {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        }
      );
    });
  });
});