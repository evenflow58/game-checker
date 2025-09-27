import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { GoogleButtonDirective } from './google-button.directive.js';
import { GoogleAuthService } from '../service/google-auth/google-auth.service.js';
import { BehaviorSubject, Subscription } from 'rxjs';

@Component({
  template: '<div id="google-btn" googleButton></div>',
  standalone: true,
  imports: [GoogleButtonDirective]
})
class TestComponent {}

describe('GoogleButtonDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let mockGoogleAuthService: jasmine.SpyObj<GoogleAuthService>;
  let userSubject: BehaviorSubject<any>;

  beforeEach(async () => {
    userSubject = new BehaviorSubject<any>(null);
    mockGoogleAuthService = jasmine.createSpyObj('GoogleAuthService', ['renderButton'], {
      user$: userSubject.asObservable()
    });

    await TestBed.configureTestingModule({
      imports: [TestComponent],
      providers: [
        { provide: GoogleAuthService, useValue: mockGoogleAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
  });

  it('should show button and render when user is null', () => {
    fixture.detectChanges();
    
    const buttonElement = fixture.nativeElement.querySelector('#google-btn');
    expect(buttonElement.style.display).toBe('block');
    expect(mockGoogleAuthService.renderButton).toHaveBeenCalledWith('google-btn');
  });

  it('should hide button when user is present', () => {
    userSubject.next({ id: '123', name: 'Test User' });
    fixture.detectChanges();
    
    const buttonElement = fixture.nativeElement.querySelector('#google-btn');
    expect(buttonElement.style.display).toBe('none');
  });

  it('should unsubscribe when destroyed', () => {
    const subscription = new Subscription();
    const unsubscribeSpy = spyOn(subscription, 'unsubscribe');
    spyOn(userSubject, 'subscribe').and.returnValue(subscription);

    fixture.detectChanges();
    fixture.destroy();
    
    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});