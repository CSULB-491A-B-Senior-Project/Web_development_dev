import { HttpInterceptorFn } from '@angular/common/http';

const BASE_URL = 'https://api.crescendo.chat/v1';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith('/v1/')) {
    const apiReq = req.clone({
      url: `${BASE_URL}${req.url}`,
    });
    return next(apiReq);
  }

  return next(req);
};
