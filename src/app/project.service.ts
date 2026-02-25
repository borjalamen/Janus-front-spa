// src/app/services/project.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Project {
  id: string;
  code: string;
  name: string;

  departamentOrganisme?: string;
  gestorResponsableSolucio?: string;
  responsableProjecte?: string;
  equipDesenvolupament?: String;
  equipProjectesInfra?: string;
  equipProves?: string;
  equipAdminExplotacioXarxes?: string;
  oficinaSeguretat?: string;
  equipQualitat?: string;
  equipAdminOperacions?: string;
  equipAdminExplotacioSistemes?: string;
  gestorIntegracioSolucions?: string;

  createdAt?: string;
  deleted?: boolean;
  visible?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private baseUrl = `${environment.baseUrl}api/projects`;

  constructor(private http: HttpClient) {}

  // GET /api/projects/all
  getAll(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/all`);
  }

  // GET /api/projects/{id}
  getById(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.baseUrl}/${id}`);
  }

  // GET /api/projects/search/name/{name}
  searchByName(name: string): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/search/name/${encodeURIComponent(name)}`);
  }

  // POST /api/projects/create
  create(project: Partial<Project>): Observable<Project> {
    return this.http.post<Project>(`${this.baseUrl}/create`, project);
  }

  // PUT /api/projects/update/{id}
  update(id: string, details: Partial<Project>): Observable<Project> {
    return this.http.put<Project>(`${this.baseUrl}/update/${id}`, details);
  }

  // DELETE /api/projects/delete/{id}
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/delete/${id}`);
  }
}
