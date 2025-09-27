import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SettingsService } from './settings.service.js';
import { environment } from '../../../../../environments/environment.js';

describe('SettingsService', () => {
  let service: SettingsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SettingsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });

    service = TestBed.inject(SettingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('get', () => {
    it('should fetch settings from the API', () => {
      const mockSettings = { steamId: '12345', steamProfile: { name: 'Test User' } };

      service.get().subscribe(settings => {
        expect(settings).toEqual(mockSettings);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v1/settings`);
      expect(req.request.method).toBe('GET');
      req.flush(mockSettings);
    });
  });

  describe('put', () => {
    it('should update settings with steam ID', () => {
      const steamId = '12345';

      service.put(steamId).subscribe(() => {
        // Should complete successfully
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v1/settings`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ steamId });
      req.flush(null);
    });
  });
});