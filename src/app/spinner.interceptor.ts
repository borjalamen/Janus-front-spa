import { inject } from '@angular/core';
import { HttpRequest, HttpHandlerFn, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { SpinnerService } from './spinner.service';

export const spinnerInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  // Permitir desactivar spinner por header
  if (req.headers.has('X-No-Spinner')) {
    const headers = req.headers.delete('X-No-Spinner');
    return next(req.clone({ headers }));
  }

  // Mostrar spinner sólo para llamadas al backend (por ejemplo, que contengan '/api')
  const url = req.url || '';
  const isApiCall = url.includes('/api');
  const isAsset = url.includes('/assets/') || url.includes('/i18n') || url.endsWith('.json');

  if (!isApiCall || isAsset) {
    // No mostramos spinner para traducciones o assets estáticos
    return next(req);
  }

  const spinner = inject(SpinnerService);
  const timerId = spinner.show();

  return next(req).pipe(
    finalize(() => {
      spinner.hide(timerId);
    })
  );
};
