// import { HttpInterceptorFn } from '@angular/common/http';

// const BASE_URL = 'https://avis-unpersecutive-negatively.ngrok-free.dev';

// export const apiInterceptor: HttpInterceptorFn = (req, next) => {
//   // if (req.url.startsWith('/v1/')) {
//   //   const apiReq = req.clone({
//   //     url: `${BASE_URL}${req.url}`,
//   //   });
//   //   return next(apiReq);
//   // }

//   return next(req);
// };
import { HttpInterceptorFn } from '@angular/common/http';

export const apiInterceptor: HttpInterceptorFn = (req, next ) => {
  // Pass through all requests unchanged for local dev
  return next(req);
};
