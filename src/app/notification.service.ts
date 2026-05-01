import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface AppNotification {
  type: string;
  title: string;
  body: string;
  link: string;
  timestamp: string;
  read: boolean;
}

/**
 * Servicio de notificaciones push en tiempo real vía WebSocket.
 * Se conecta a /ws/notifications y emite notificaciones a todos los
 * suscriptores cuando el backend hace broadcast.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {

  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentUsername: string = '';

  private readonly _notifications$ = new BehaviorSubject<AppNotification[]>([]);
  public readonly notifications$: Observable<AppNotification[]> = this._notifications$.asObservable();

  private get wsUrl(): string {
    return environment.baseUrl
      .replace(/^http/, 'ws')
      .replace(/\/api\/?$/, '/ws/notifications');
  }

  connect(username?: string): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    // Guardar el username para reconexiones automáticas
    if (username) {
      this.currentUsername = username;
    }

    const url = this.currentUsername
      ? `${this.wsUrl}?username=${encodeURIComponent(this.currentUsername)}`
      : this.wsUrl;

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const notification: AppNotification = { ...data, read: false };
        const current = this._notifications$.value;
        // Máximo 50 notificaciones en memoria
        this._notifications$.next([notification, ...current].slice(0, 50));
      } catch {
        // mensaje mal formado — ignorar
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onclose = () => {
      // Si la referencia sigue siendo la misma (no fue disconnect() intencionado), reconectar
      if (this.ws === ws) {
        this.reconnectTimer = setTimeout(() => this.connect(), 5000);
      }
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      ws.close();
    }
  }

  markAllRead(): void {
    this._notifications$.next(
      this._notifications$.value.map(n => ({ ...n, read: true }))
    );
  }

  clearAll(): void {
    this._notifications$.next([]);
  }

  get unreadCount(): number {
    return this._notifications$.value.filter(n => !n.read).length;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
