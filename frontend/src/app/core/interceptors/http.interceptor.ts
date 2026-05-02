// HTTP Interceptor to handle API requests
// Per CLAUDE.md: HTTP interceptor attached to ApiService for userId handling

import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserService } from '../services/user.service';

@Injectable()
export class ApiHttpInterceptor implements HttpInterceptor {
  constructor(private userService: UserService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Clone the request
    let clonedRequest = request.clone({
      setHeaders: {
        'Content-Type': 'application/json'
      }
    });

    // Add authorization headers or other global headers if needed
    // Note: userId is part of the URL path itself per the API design

    return next.handle(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('HTTP Error:', error);
        return throwError(() => error);
      })
    );
  }
}
