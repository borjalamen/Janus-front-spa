import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LiveParticipant {
  id: string;
  name: string;
  vote: number | null;
}

export interface LiveAcceptedTask {
  task: string;
  result: number;
}

export interface LiveSession {
  id: string;
  ownerId: string;
  ownerName: string;
  estimationName: string;
  projectCode: string;
  projectName: string;
  requester: string;
  requesterEmail: string;
  notes: string;
  participants: LiveParticipant[];
  currentTask: string | null;
  phase: 'LOBBY' | 'VOTING' | 'REVEALED' | 'FINISHED';
  votingStart: number | null;
  acceptedTasks: LiveAcceptedTask[];
}

// Keep old types for backward-compatibility (unused internally)
export type Participant = LiveParticipant;

@Injectable({ providedIn: 'root' })
export class LiveEstimationService implements OnDestroy {

  private ws: WebSocket | null = null;

  private readonly _session$ = new BehaviorSubject<LiveSession | null>(null);
  private readonly _error$ = new BehaviorSubject<string | null>(null);
  private readonly _connected$ = new BehaviorSubject<boolean>(false);

  public session$: Observable<LiveSession | null> = this._session$.asObservable();
  public error$: Observable<string | null> = this._error$.asObservable();
  public connected$: Observable<boolean> = this._connected$.asObservable();

  /** Derives the WS URL from the environment baseUrl */
  private get wsUrl(): string {
    return environment.baseUrl
      .replace(/^http/, 'ws')
      .replace(/\/api\/?$/, '/ws/live-estimation');
  }

  // ── Connection ──────────────────────────────────────────────────────────────

  connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        this._connected$.next(true);
        this._error$.next(null);
        resolve();
      };
      ws.onerror = () => {
        this._connected$.next(false);
        reject(new Error('No se pudo conectar al servidor WebSocket'));
      };
      ws.onclose = () => {
        this._connected$.next(false);
      };
      ws.onmessage = (ev: MessageEvent) => {
        try {
          const msg = JSON.parse(ev.data as string);
          if (msg.type === 'SESSION_UPDATE') {
            this._session$.next(msg.payload as LiveSession);
          } else if (msg.type === 'ERROR') {
            this._error$.next((msg.payload?.message as string) || 'Error desconocido');
          }
        } catch (_) {}
      };
    });
  }

  disconnect() {
    this._session$.next(null);
    this._connected$.next(false);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // ── Messages ─────────────────────────────────────────────────────────────────

  private send(type: string, payload: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  createSession(meta: {
    userId: string; userName: string;
    estimationName: string; projectCode: string; projectName: string;
    requester: string; requesterEmail: string; notes: string;
  }) {
    this.send('CREATE', meta as unknown as Record<string, unknown>);
  }

  joinSession(sessionId: string, userId: string, userName: string) {
    this.send('JOIN', { sessionId, userId, userName });
  }

  setTask(sessionId: string, userId: string, task: string) {
    this.send('SET_TASK', { sessionId, userId, task });
  }

  vote(sessionId: string, userId: string, vote: number) {
    this.send('VOTE', { sessionId, userId, vote });
  }

  reveal(sessionId: string, userId: string) {
    this.send('REVEAL', { sessionId, userId });
  }

  accept(sessionId: string, userId: string, result: number) {
    this.send('ACCEPT', { sessionId, userId, result });
  }

  finish(sessionId: string, userId: string) {
    this.send('FINISH', { sessionId, userId });
  }

  leave(sessionId: string, userId: string) {
    this.send('LEAVE', { sessionId, userId });
    this._session$.next(null);
  }

  clearError() {
    this._error$.next(null);
  }

  ngOnDestroy() {
    this.disconnect();
  }
}

