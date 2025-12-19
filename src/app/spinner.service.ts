import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SpinnerService {
  constructor(private ngZone: NgZone) {}
  private _visible$ = new BehaviorSubject<boolean>(false);
  visible$ = this._visible$.asObservable();

  // Contador de peticiones activas (llamadas show - hide)
  private counter = 0;

  // Map de timers para debounce: cada show genera un id y un timeout
  private pendingTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextTimerId = 1;

  // Delay en ms antes de mostrar el spinner (evita parpadeos en peticiones rápidas)
  debounceMs = 0;
  // Tiempo mínimo en ms que el spinner permanecerá visible una vez mostrado
  minVisibleMs = 250;
  // Tiempo de gracia en ms para retrasar el hide cuando no hay peticiones
  // Esto evita parpadeos si otra petición se lanza justo después
  hideGraceMs = 200;

  // Tiempo en que se mostró por última vez (timestamp ms). 0 si no está mostrado.
  private lastShownAt = 0;
  // Timer para posponer el hide si se oculta antes de minVisibleMs
  private hideDelayTimer?: ReturnType<typeof setTimeout>;
  // Watchdog para evitar que el spinner quede atascado (ms)
  private watchdogMs = 10000;
  private watchdogTimer?: ReturnType<typeof setTimeout>;

  show(): number {
    this.counter++;
      // debug logs removed

    // reiniciar watchdog
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    this.watchdogTimer = setTimeout(() => {
      // resetear si algo falla
      this.reset();
    }, this.watchdogMs);

    // Si hay un hide retrasado, cancelarlo: nueva petición cancela oculta pendiente
    if (this.hideDelayTimer) {
      clearTimeout(this.hideDelayTimer);
      this.hideDelayTimer = undefined;
    }

    // Si debounceMs <= 0 mostramos inmediatamente (sin timer)
    if (this.debounceMs <= 0) {
      this._visible$.next(true);
      this.lastShownAt = Date.now();
      return 0; // id 0 significa no hay timer asociado
    }

    const id = this.nextTimerId++;
    // created timer (debounce)
    const t = setTimeout(() => {
      // Si al menos hay una petición activa cuando el timer expira, mostrar
      if (this.counter > 0) {
        this._visible$.next(true);
      }
      this.pendingTimers.delete(id);
    }, this.debounceMs);

    this.pendingTimers.set(id, t);
    return id;
  }

  hide(timerId?: number) {
    // Si proporcionan el id de timer, cancelamos ese timer específico
    if (timerId) {
      const t = this.pendingTimers.get(timerId);
      if (t) {
        clearTimeout(t);
        this.pendingTimers.delete(timerId);
      }
    }

    this.counter = Math.max(0, this.counter - 1);
      // debug logs removed

    // Si no quedan peticiones activas, ocultar y limpiar timers pendientes
    if (this.counter === 0) {
      // cancel any pending timers
      for (const t of this.pendingTimers.values()) clearTimeout(t);
      this.pendingTimers.clear();
      // Si se mostró recientemente, respetar minVisibleMs y además esperar un periodo de gracia
      const now = Date.now();
      const shownFor = this.lastShownAt ? now - this.lastShownAt : Infinity;
      const remainMin = this.lastShownAt ? Math.max(0, this.minVisibleMs - shownFor) : 0;
      const totalDelay = Math.max(remainMin, this.hideGraceMs);

      // Programar ocultado con un timeout + doble requestAnimationFrame
      if (this.hideDelayTimer) clearTimeout(this.hideDelayTimer);
      this.hideDelayTimer = setTimeout(() => {
        // Give the browser a chance to paint after app updates by using two RAFs
        this.ngZone.runOutsideAngular(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              this.ngZone.run(() => {
                this._visible$.next(false);
                this.lastShownAt = 0;
                this.hideDelayTimer = undefined;
                // limpiar watchdog cuando se oculta correctamente
                if (this.watchdogTimer) { clearTimeout(this.watchdogTimer); this.watchdogTimer = undefined; }
              });
            });
          });
        });
      }, totalDelay);
    }
  }

  reset() {
    this.counter = 0;
    for (const t of this.pendingTimers.values()) clearTimeout(t);
    this.pendingTimers.clear();
    if (this.hideDelayTimer) {
      clearTimeout(this.hideDelayTimer);
      this.hideDelayTimer = undefined;
    }
    if (this.watchdogTimer) { clearTimeout(this.watchdogTimer); this.watchdogTimer = undefined; }
    this._visible$.next(false);
  }
}
