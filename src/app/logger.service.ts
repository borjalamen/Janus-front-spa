import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class LoggerService {
  warn(...args: any[]) {
    if (!environment.production) console.warn(...args);
  }

  info(...args: any[]) {
    if (!environment.production) console.info(...args);
  }

  debug(...args: any[]) {
    if (!environment.production) console.debug(...args);
  }
}
