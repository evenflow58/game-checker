import { NgZone } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { GoogleAuthService } from './google-auth.service.js';

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;
  let mockCookieService: jasmine.SpyObj<CookieService>;
  let mockNgZone: jasmine.SpyObj<NgZone>;

  // Mock the global google object
  const mockGoogle = {
    accounts: {
      id: {
        initialize: jasmine.createSpy('initialize'),
        renderButton: jasmine.createSpy('renderButton'),
        disableAutoSelect: jasmine.createSpy('disableAutoSelect')
      }
    }
  };

  beforeEach(() => {
    // Create spies
    mockCookieService = jasmine.createSpyObj('CookieService', ['get', 'set', 'delete']);
    mockNgZone = jasmine.createSpyObj('NgZone', ['run']);
    mockNgZone.run.and.callFake((fn: Function) => fn());

    // Reset google mock
    (window as any).google = mockGoogle;
    Object.values(mockGoogle.accounts.id).forEach(spy => spy.calls.reset());

    // Initialize the service directly to ensure proper setup
    service = new GoogleAuthService(mockNgZone, mockCookieService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('constructor', () => {
    it('should initialize user from stored token', () => {
      const mockToken = 'header.eyJuYW1lIjoidGVzdCJ9.signature';
      mockCookieService.get.and.returnValue(mockToken);

      // Create a new instance to trigger constructor
      const testService = new GoogleAuthService(mockNgZone, mockCookieService);

      const emittedValues: any[] = [];
      testService.user$.subscribe(user => emittedValues.push(user));
      expect(emittedValues[0]).toEqual({ name: 'test' });
    });
  });

  describe('initClient', () => {
    it('should initialize google client with correct parameters', () => {
      const clientId = 'test-client-id';
      service.initClient(clientId);

      expect(mockGoogle.accounts.id.initialize).toHaveBeenCalledWith({
        client_id: clientId,
        callback: jasmine.any(Function)
      });
    });

    it('should handle credential response when callback is called', () => {
      const mockToken = 'header.eyJuYW1lIjoidGVzdCIsImV4cCI6MTIzNH0.signature';
      service.initClient('test-client-id');

      // Get the callback function
      const callback = mockGoogle.accounts.id.initialize.calls.mostRecent().args[0].callback;

      const emittedValues: any[] = [];
      service.user$.subscribe(user => emittedValues.push(user));

      // Call the callback with a mock response
      callback({ credential: mockToken });

      // Match the actual service implementation which passes expiration directly
      expect(mockCookieService.set).toHaveBeenCalledWith(
        'google_token',
        mockToken,
        { expires: 1234 }
      );

      expect(emittedValues).toContain({ name: 'test', exp: 1234 });
    });
  });

  describe('renderButton', () => {
    it('should call google renderButton with correct element', () => {
      const elementId = 'test-button';
      const mockElement = document.createElement('div');
      spyOn(document, 'getElementById').and.returnValue(mockElement);

      service.renderButton(elementId);

      expect(document.getElementById).toHaveBeenCalledWith(elementId);
      expect(mockGoogle.accounts.id.renderButton).toHaveBeenCalledWith(
        mockElement,
        { theme: 'outline', size: 'large' }
      );
    });
  });

  describe('signOut', () => {
    it('should clear token and user data', () => {
      const emittedValues: any[] = [];
      service.user$.subscribe(user => emittedValues.push(user));

      service.signOut();

      expect(mockGoogle.accounts.id.disableAutoSelect).toHaveBeenCalled();
      expect(mockCookieService.delete).toHaveBeenCalledWith('google_token');
      expect(emittedValues).toContain(null);
    });
  });

  describe('getToken', () => {
    it('should return token from cookie service', () => {
      const mockToken = 'test-token';
      mockCookieService.get.and.returnValue(mockToken);

      const result = service.getToken();

      expect(result).toBe(mockToken);
      expect(mockCookieService.get).toHaveBeenCalledWith('google_token');
    });
  });
});