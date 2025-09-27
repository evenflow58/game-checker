import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component.js';
import { GoogleAuthService } from './core/service/google-auth/google-auth.service.js';
import { BehaviorSubject } from 'rxjs';

describe('AppComponent', () => {
  let mockGoogleAuthService: jasmine.SpyObj<GoogleAuthService>;
  let userSubject: BehaviorSubject<any>;

  beforeEach(() => {
    userSubject = new BehaviorSubject<any>(null);
    mockGoogleAuthService = jasmine.createSpyObj('GoogleAuthService', 
      ['initClient', 'renderButton', 'signOut'],
      { user$: userSubject.asObservable() }
    );

    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: GoogleAuthService, useValue: mockGoogleAuthService }
      ]
    });
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should initialize Google client on init', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(mockGoogleAuthService.initClient).toHaveBeenCalled();
  });

  it('should render Google button after view init', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(mockGoogleAuthService.renderButton).toHaveBeenCalledWith('g_id_signin');
  });

  it('should clear cached picture on sign out', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    app.cachedPicture = 'test-picture';
    
    app.signOut();
    
    expect(mockGoogleAuthService.signOut).toHaveBeenCalled();
    expect(app.cachedPicture).toBeNull();
  });

  it('should complete destroy$ subject on destroy', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const completeSpy = spyOn(app.destroy$, 'complete');
    
    fixture.destroy();
    
    expect(completeSpy).toHaveBeenCalled();
  });
});