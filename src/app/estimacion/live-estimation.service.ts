import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

type Msg = { type: string; sessionId?: string; payload?: any };

export interface Participant {
  id: string;
  name: string;
  vote?: string | number | null;
}

export interface LiveSession {
  id: string;
  ownerId: string;
  task: string;
  participants: Participant[];
  revealed: boolean;
  accepted?: boolean;
  result?: number | null;
}

@Injectable({ providedIn: 'root' })
export class LiveEstimationService {
  private channelName = 'janus-live-estimation-v1';
  private bc: BroadcastChannel | null = null;
  private ws: WebSocket | null = null;
  private readonly _session$ = new BehaviorSubject<LiveSession | null>(null);

  public session$: Observable<LiveSession | null> = this._session$.asObservable();

  constructor() {
    try {
      if ('BroadcastChannel' in window) {
        this.bc = new BroadcastChannel(this.channelName);
        this.bc.onmessage = (ev) => this.handleMessage(ev.data as Msg);
      }
    } catch (e) {
      this.bc = null;
    }
    // Optional WS: if window['LIVE_WS_URL'] is set, try to connect
    const url = (window as any).LIVE_WS_URL;
    if (url) this.connectWs(String(url));
  }

  private connectWs(url: string) {
    try {
      this.ws = new WebSocket(url);
      this.ws.onmessage = (ev) => {
        try { const m = JSON.parse(ev.data); this.handleMessage(m); } catch (e) {}
      };
    } catch (e) { this.ws = null; }
  }

  private post(msg: Msg) {
    try { if (this.bc) this.bc.postMessage(msg); } catch (e) {}
    try { if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg)); } catch (e) {}
  }

  private handleMessage(msg: Msg) {
    if (!msg || !msg.type) return;
    if (msg.type === 'session:update') {
      this._session$.next(msg.payload as LiveSession);
    }
  }

  createSession(task: string, ownerId: string, ownerName: string) {
    const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,6);
    const s: LiveSession = { id, ownerId, task, participants: [{ id: ownerId, name: ownerName, vote: null }], revealed: false };
    this._session$.next(s);
    this.post({ type: 'session:update', payload: s });
    return s;
  }

  joinSession(session: LiveSession, participant: Participant) {
    // merge participant
    const s = JSON.parse(JSON.stringify(session)) as LiveSession;
    const exists = s.participants.find(p => p.id === participant.id);
    if (!exists) s.participants.push(participant);
    this._session$.next(s);
    this.post({ type: 'session:update', payload: s });
  }

  leave(session: LiveSession, participantId: string) {
    const s = JSON.parse(JSON.stringify(session)) as LiveSession;
    s.participants = s.participants.filter(p => p.id !== participantId);
    this._session$.next(s);
    this.post({ type: 'session:update', payload: s });
  }

  vote(session: LiveSession, participantId: string, vote: string | number) {
    const s = JSON.parse(JSON.stringify(session)) as LiveSession;
    const p = s.participants.find(x => x.id === participantId);
    if (p) p.vote = vote;
    this._session$.next(s);
    this.post({ type: 'session:update', payload: s });
  }

  reveal(session: LiveSession) {
    const s = JSON.parse(JSON.stringify(session)) as LiveSession;
    s.revealed = true;
    this._session$.next(s);
    this.post({ type: 'session:update', payload: s });
  }

  accept(session: LiveSession, result: number) {
    const s = JSON.parse(JSON.stringify(session)) as LiveSession;
    s.accepted = true;
    s.result = result;
    this._session$.next(s);
    this.post({ type: 'session:update', payload: s });
  }

  abort(session: LiveSession) {
    this._session$.next(null);
    this.post({ type: 'session:update', payload: null });
  }
}
