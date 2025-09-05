import { Directive, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { GoogleAuthService } from '../service/google-auth/google-auth.service.js';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[googleButton]',
  standalone: true
})
export class GoogleButtonDirective implements OnInit, OnDestroy {
  private userSub?: Subscription;

  constructor(
    private el: ElementRef,
    private googleAuth: GoogleAuthService
  ) {}

  ngOnInit() {
    this.userSub = this.googleAuth.user$.subscribe(user => {
      const el = this.el.nativeElement as HTMLElement;
      if (!user) {
        el.style.display = 'block';
        this.googleAuth.renderButton(el.id);
      } else {
        el.style.display = 'none';
      }
    });
  }

  ngOnDestroy() {
    this.userSub?.unsubscribe();
  }
}
