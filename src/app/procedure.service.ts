import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface ProcedureStep {
  id: string;
  titulo: string;
  descripcion: string;
  responsable: string;
  metodo: string;
  orden: number;
  tags?: string[];
}

export interface Procedure {
  id?: string;
  titulo: string | null;
  descripcion?: string | null;
  departamento?: string | null;
  tags?: string[] | null;
  steps?: ProcedureStep[] | null;
  createdAt?: string;
  updatedAt?: string;
  visible?: boolean;
  deleted?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProceduresService {
  // si environment.baseUrl = 'http://localhost:8080/api'
  private baseUrl = `${environment.baseUrl}/procedures`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Procedure[]> {
    return this.http.get<Procedure[]>(this.baseUrl);
  }

  create(proc: Procedure): Observable<Procedure> {
    return this.http.post<Procedure>(this.baseUrl, proc);
  }

  update(id: string, proc: Procedure): Observable<Procedure> {
    return this.http.put<Procedure>(`${this.baseUrl}/${id}`, proc);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
