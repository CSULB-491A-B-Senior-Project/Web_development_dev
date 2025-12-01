import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { ApiService } from '../api.service';

/**
 * Auth Guard - Protects routes that require authentication
 * Redirects to home if not authenticated
 */
export const authGuard: CanActivateFn = (route, state) => {
  const apiService = inject(ApiService);
  const router = inject(Router);

  if (apiService.isAuthenticated()) {
    return true;
  }

  // Redirect to home page if not authenticated
  console.log('Not authenticated, redirecting to home');
  router.navigate(['/']);
  return false;
};

/**
 * Guest Guard - Prevents authenticated users from accessing guest-only pages
 * Redirects to explore if already authenticated
 */
export const guestGuard: CanActivateFn = (route, state) => {
  const apiService = inject(ApiService);
  const router = inject(Router);

  if (!apiService.isAuthenticated()) {
    return true;
  }

  // Redirect to explore page if already authenticated
  console.log('Already authenticated, redirecting to explore');
  router.navigate(['/explore']);
  return false;
};
