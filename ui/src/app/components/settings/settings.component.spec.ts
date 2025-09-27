import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SettingsComponent } from './settings.component.js';
import { SettingsService } from '../../core/service/api/settings/settings.service.js';
import { SnackbarService } from '../../core/service/snackbar/snackbar.service.js';
import { of, throwError } from 'rxjs';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let mockSettingsService: jasmine.SpyObj<SettingsService>;
  let mockSnackbarService: jasmine.SpyObj<SnackbarService>;

  beforeEach(async () => {
    mockSettingsService = jasmine.createSpyObj('SettingsService', ['get', 'put']);
    mockSnackbarService = jasmine.createSpyObj('SnackbarService', ['displayError', 'displaySuccess']);

    await TestBed.configureTestingModule({
      imports: [
        SettingsComponent,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: SnackbarService, useValue: mockSnackbarService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load settings on init', fakeAsync(() => {
      mockSettingsService.get.and.returnValue(of({ steamId: '12345678901234567' }));
      
      fixture.detectChanges();
      tick();

      expect(component.steamId.value).toBe('12345678901234567');
    }));

    it('should handle error when loading settings', fakeAsync(() => {
      mockSettingsService.get.and.returnValue(throwError(() => new Error()));
      
      fixture.detectChanges();
      tick();

      expect(mockSnackbarService.displayError).toHaveBeenCalledWith('Unable to get settings');
      expect(component.steamId.value).toBe('');
    }));
  });

  describe('checkSteamId', () => {
    it('should set required error message', () => {
      component.steamId.setValue('');
      component.checkSteamId();
      expect(component.steamErrorMessage()).toBe('An id is required');
    });

    it('should set forbidden id error message', () => {
      component.steamId.setValue('123'); // Invalid format
      component.checkSteamId();
      expect(component.steamErrorMessage()).toBe('The id should be nine numbers.');
    });

    it('should clear error message when valid', () => {
      component.steamId.setValue('12345678901234567');
      component.checkSteamId();
      expect(component.steamErrorMessage()).toBe('');
    });
  });

  describe('linkSteam', () => {
    it('should save steam id successfully', fakeAsync(() => {
      const steamId = '12345678901234567';
      component.steamId.setValue(steamId);
      mockSettingsService.put.and.returnValue(of(void 0));

      component.linkSteam();
      tick();

      expect(mockSettingsService.put).toHaveBeenCalledWith(steamId);
      expect(mockSnackbarService.displaySuccess).toHaveBeenCalledWith('Steam saved successfully!');
      expect(component.isLoading).toBeFalse();
    }));

    it('should handle Steam provider error', fakeAsync(() => {
      component.steamId.setValue('12345678901234567');
      mockSettingsService.put.and.returnValue(throwError(() => ({ error: { provider: 'Steam' } })));

      component.linkSteam();
      tick();

      expect(mockSnackbarService.displayError).toHaveBeenCalledWith('Unable to save Steam.');
      expect(component.isLoading).toBeFalse();
    }));

    it('should handle unknown error', fakeAsync(() => {
      component.steamId.setValue('12345678901234567');
      mockSettingsService.put.and.returnValue(throwError(() => new Error()));

      component.linkSteam();
      tick();

      expect(mockSnackbarService.displayError).toHaveBeenCalledWith('An unknown error occured. Unable to save settings.');
      expect(component.isLoading).toBeFalse();
    }));
  });

  describe('isButtonDisabled', () => {
    it('should be disabled when form is invalid', () => {
      component.steamId.setValue('');
      expect(component.isButtonDisabled()).toBeTrue();
    });

    it('should be disabled when loading', () => {
      component.steamId.setValue('12345678901234567');
      component.isLoading = true;
      expect(component.isButtonDisabled()).toBeTrue();
    });

    it('should be enabled when form is valid and not loading', () => {
      component.steamId.setValue('12345678901234567');
      component.isLoading = false;
      expect(component.isButtonDisabled()).toBeFalse();
    });
  });
});