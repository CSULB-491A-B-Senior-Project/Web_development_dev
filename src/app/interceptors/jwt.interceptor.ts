import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  constructor(
    private router: Router,
    private apiService: ApiService
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Get token from ApiService
    const token = this.apiService.getToken();

    // Clone request and add authorization header if token exists
    if (token) {
      request = this.addTokenToRequest(request, token);
    }

    // Handle the request and catch errors
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          return this.handle401Error(request, next);
        }
        
        return throwError(() => error);
      })
    );
  }

  private addTokenToRequest(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private handle401Error(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Skip refresh for auth endpoints
    if (request.url.includes('/Auth/login') || 
        request.url.includes('/Auth/register') || 
        request.url.includes('/Auth/refresh')) {
      return throwError(() => new HttpErrorResponse({ status: 401 }));
    }

    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const refreshToken = this.apiService.getStoredRefreshToken();

      if (!refreshToken) {
        // No refresh token available, redirect to login
        this.isRefreshing = false;
        this.router.navigate(['/signup']);
        return throwError(() => new HttpErrorResponse({ status: 401 }));
      }

      return this.apiService.refreshToken().pipe(
        switchMap((response) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(response.accessToken);
          return next.handle(this.addTokenToRequest(request, response.accessToken));
        }),
        catchError((err) => {
          this.isRefreshing = false;
          // Refresh failed, redirect to login
          this.router.navigate(['/signup']);
          return throwError(() => err);
        })
      );
    } else {
      // Wait for the refresh to complete
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => {
          return next.handle(this.addTokenToRequest(request, token!));
        })
      );
    }
  }
}
