import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ToolAttachment {
  name: string;
  mimeType: string;
  dataUrl: string;
  size: number;
}

export interface ToolStep {
  text: string;
  attachments: ToolAttachment[];
}

export interface HerramientaRecord {
  id?: string;
  name: string;
  description?: string;
  functionality?: string;
  tags?: string[];
  installSteps?: ToolStep[];
  projects?: string[];
  projectsString?: string;
  visible?: boolean;
}

@Injectable({ providedIn: 'root' })
export class HerramientasService {
  private readonly baseUrl = `${environment.baseUrl}herramientas`;

  /** Emite cuando la IA crea/modifica/elimina una herramienta */
  readonly refresh$ = new Subject<void>();

  constructor(private http: HttpClient) {}

  getAll(): Observable<HerramientaRecord[]> {
    return this.http.get<HerramientaRecord[]>(`${this.baseUrl}/all`);
  }

  create(payload: HerramientaRecord): Observable<HerramientaRecord> {
    return this.http.post<HerramientaRecord>(`${this.baseUrl}/create`, payload);
  }

  update(id: string, payload: HerramientaRecord): Observable<HerramientaRecord> {
    return this.http.put<HerramientaRecord>(`${this.baseUrl}/update/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/delete/${id}`);
  }
}
