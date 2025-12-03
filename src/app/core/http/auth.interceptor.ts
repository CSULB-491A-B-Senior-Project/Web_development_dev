import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const cookieService = inject(CookieService);
  const token = cookieService.get('jwt_token');

  // 1. Define the endpoints that must NEVER have an Auth header
  // Check against your API paths (e.g., /Auth/login, /Auth/register)
  const excludedEndpoints = ['/Auth/register', '/Auth/login'];

  // 2. Check if the current request URL contains one of the excluded paths
  // We check if the request URL includes the string (handles full URLs)
  const isExcluded = excludedEndpoints.some(endpoint => req.url.includes(endpoint));

  // 3. If there is no token OR the route is excluded, pass the request cleanly
  if (!token || isExcluded) {
    return next(req);
  }

  // 4. Otherwise, attach the token
  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });
  
  return next(authReq);
};
