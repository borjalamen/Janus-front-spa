import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Procedure {
  id?: string;
  nombre: string;
  responsable: string;
  estado: string;
  descripcion?: string;
}

@Injectable({ providedIn: 'root' })
export class ProceduresService {
  private baseUrl = `${environment.baseUrl}api/procedures`;

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
