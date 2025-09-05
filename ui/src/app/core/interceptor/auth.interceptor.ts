import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GoogleAuthService } from '../service/google-auth/google-auth.service.js';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private googleAuth: GoogleAuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.googleAuth.getToken();

    const cloned = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(cloned);
  }
}
