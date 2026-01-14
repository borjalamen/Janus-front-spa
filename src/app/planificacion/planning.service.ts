import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Definimos la interfaz aquí o impórtala de un archivo de modelos compartido
export type Env = 'DEV' | 'INT' | 'PRE' | 'PRO';
export type EventType = 'DEPLOY' | 'TRAIN' | 'OTHER' | 'ABSENCE';

export interface EventItem {
  id?: string; // Opcional al crear, obligatorio al recibir del back
  env: Env;
  project: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  devOps: string;
  notes?: string;
  jiraUrl?: string;
  responsable?: string;
  periodDays?: number;
  eventType?: EventType;
}

@Injectable({
  providedIn: 'root'
})
export class PlanningService {
  // URL del backend - usa el proxy de Angular (proxy.conf.json redirige /api a localhost:8080)
  private apiUrl = '/api/planificacion'; 

  constructor(private http: HttpClient) {}

  // GET: Obtener todos los eventos
  getEvents(): Observable<EventItem[]> {
    return this.http.get<EventItem[]>(this.apiUrl);
  }

  // GET: Obtener por rango de fechas (Opcional, si el back lo soporta)
  getEventsByDate(start: string, end: string): Observable<EventItem[]> {
    return this.http.get<EventItem[]>(`${this.apiUrl}/range?start=${start}&end=${end}`);
  }

  // POST: Crear nuevo evento
  createEvent(event: EventItem): Observable<EventItem> {
    return this.http.post<EventItem>(this.apiUrl, event);
  }

  // PUT: Actualizar evento existente
  updateEvent(id: string, event: EventItem): Observable<EventItem> {
    return this.http.put<EventItem>(`${this.apiUrl}/${id}`, event);
  }

  // DELETE: Borrar evento
  deleteEvent(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}