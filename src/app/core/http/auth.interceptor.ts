import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { catchError, switchMap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

const ACCESS_TOKEN_COOKIE_NAME = 'access_token';
const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';
const BASE_URL = 'https://avis-unpersecutive-negatively.ngrok-free.dev/api';

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const cookieService = inject(CookieService);
  const router = inject(Router);
  const http = inject(HttpClient);
  
  const token = cookieService.get(ACCESS_TOKEN_COOKIE_NAME);

  // Endpoints that should not have auth header
  const excludedEndpoints = ['/Auth/register', '/Auth/login', '/Auth/refresh'];
  const isExcluded = excludedEndpoints.some(endpoint => req.url.includes(endpoint));

  // If no token or excluded endpoint, pass through
  if (!token || isExcluded) {
    return next(req);
  }

  // Attach token to request
  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });
  
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 errors with token refresh
      if (error.status === 401 && !isExcluded) {
        const refreshToken = cookieService.get(REFRESH_TOKEN_COOKIE_NAME);
        
        if (!refreshToken || isRefreshing) {
          // No refresh token or already refreshing, redirect to login
          isRefreshing = false;
          router.navigate(['/signup']);
          return throwError(() => error);
        }

        isRefreshing = true;

        // Attempt to refresh the token
        return http.post<{
          accessToken: string;
          refreshToken: string;
          expiresIn: number;
          username: string;
          email: string;
        }>(`${BASE_URL}/Auth/refresh`, { refreshToken }).pipe(
          switchMap((response) => {
            isRefreshing = false;
            
            // Store new tokens
            const accessTokenExpiryMinutes = 30 / (24 * 60);
            const refreshTokenExpiryDays = 7;

            cookieService.set(
              ACCESS_TOKEN_COOKIE_NAME,
              response.accessToken,
              accessTokenExpiryMinutes,
              '/',
              undefined,
              false,
              'Lax'
            );

            cookieService.set(
              REFRESH_TOKEN_COOKIE_NAME,
              response.refreshToken,
              refreshTokenExpiryDays,
              '/',
              undefined,
              false,
              'Lax'
            );

            // Retry original request with new token
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${response.accessToken}` }
            });
            
            return next(retryReq);
          }),
          catchError((refreshError) => {
            isRefreshing = false;
            // Refresh failed, clear tokens and redirect
            cookieService.delete(ACCESS_TOKEN_COOKIE_NAME, '/');
            cookieService.delete(REFRESH_TOKEN_COOKIE_NAME, '/');
            router.navigate(['/signup']);
            return throwError(() => refreshError);
          })
        );
      }
      
      return throwError(() => error);
    })
  );
};

