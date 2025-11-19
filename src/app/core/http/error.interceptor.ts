import { HttpInterceptorFn } from '@angular/common/http';

export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    // You can add global error handling here if desired
  );