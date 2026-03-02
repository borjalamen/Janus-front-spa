// src/app/services/project.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Task {
  titulo: string;
  prioridad?: string;
  estado?: string;
  completadoPercent?: number | null;
  notas?: string;
}

export interface DatabaseInfo {
  tipo?: string;
  uri?: string;
  usuario?: string | null;
  password?: string | null;
  notas?: string;
}

export interface DockerImage {
  image?: string;
  purpose?: string | null;
}

export interface OpenShiftInfo {
  usuario?: string | null;
  url?: string | null;
  token?: string | null;
  kibana?: string | null;
  grafana?: string | null;
}

export interface MinsaitMember {
  nombre?: string;
  rol?: string;
  email?: string;
}

export interface DevMachine {
  identifier?: string;
  ip?: string;
  user?: string;
  password?: string;
  ram?: string;
  cpu?: string;
  disk?: string;
}

export interface RepositorioSimple {
  name?: string;
  url?: string;
}

export interface SonarConfig {
  prefix?: string;
  url?: string;
  tokenUser?: string;
  tokenValue?: string;
}

export interface HerramientasMind {
  codeRepos?: RepositorioSimple[];
  artifactRepos?: RepositorioSimple[];
  jenkins?: RepositorioSimple[];
  sonarList?: SonarConfig[];
}

export interface Project {
  id?: string;
  codigoProyecto?: string;
  nombre?: string;
  codigoImputacion?: string | null;
  lote?: string | null;
  departamento?: string | null;
  
  // URLs de entorno
  urlEntornoDesarrollo?: string | null;
  urlEntornoIntegracion?: string | null;
  urlEntornoPreproduccion?: string | null;
  urlEntornoProduccion?: string | null;
  
  // Responsables
  responsableProyecto?: string | null;
  responsableTecnico?: string | null;
  horaDaily?: string | null;
  
  // Listas
  ip?: string[];
  tareas?: Task[];
  herramientas?: string[];
  jenkinsNodes?: string[];
  dockerImages?: DockerImage[];
  pipelines?: string[];
  repositorios?: string[];
  bbdd?: DatabaseInfo[];
  openshift?: OpenShiftInfo[];
  usuarios?: string[];
  
  // Información adicional
  notasGenerales?: string | null;
  entornoNotas?: string | null;
  
  // Equipos
  equipoMinsait?: MinsaitMember[];
  devMachines?: DevMachine[];
  
  // Herramientas MIND
  herramientasMind?: HerramientasMind;

  // Documentos
  documents?: Array<{
    nombre: string;
    descripcion: string;
    tipo: string;
    path: string;
  }>;

  // Auditoría
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
  visible?: boolean;
}

export interface ProjectStats {
  totalProjects: number;
  uniqueDepartments: number;
  uniqueLots: number;
  totalTasks: number;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private baseUrl = `${environment.baseUrl}projects`;

  constructor(private http: HttpClient) {}

  /**
   * GET /api/projects/all
   * Obtener todos los proyectos
   */
  getAll(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/all`);
  }

  /**
   * GET /api/projects/{id}
   * Obtener proyecto por ID
   */
  getById(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.baseUrl}/${id}`);
  }

  /**
   * GET /api/projects/code/{code}
   * Obtener proyecto por código
   */
  getByCode(code: string): Observable<Project> {
    return this.http.get<Project>(`${this.baseUrl}/code/${encodeURIComponent(code)}`);
  }

  /**
   * GET /api/projects/search/name/{name}
   * Buscar proyectos por nombre
   */
  searchByName(name: string): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/search/name/${encodeURIComponent(name)}`);
  }

  /**
   * GET /api/projects/stats/summary
   * Obtener estadísticas
   */
  getStats(): Observable<ProjectStats> {
    return this.http.get<ProjectStats>(`${this.baseUrl}/stats/summary`);
  }

  /**
   * POST /api/projects/create
   * Crear nuevo proyecto
   */
  create(project: Partial<Project>): Observable<Project> {
    return this.http.post<Project>(`${this.baseUrl}/create`, project);
  }

  /**
   * PUT /api/projects/update/{id}
   * Actualizar proyecto
   */
  update(id: string, details: Partial<Project>): Observable<Project> {
    return this.http.put<Project>(`${this.baseUrl}/update/${id}`, details);
  }

  /**
   * DELETE /api/projects/soft-delete/{id}
   * Marcar proyecto como eliminado (soft delete)
   */
  softDelete(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/soft-delete/${id}`, { responseType: 'text' });
  }

  /**
   * DELETE /api/projects/delete/{id}
   * Eliminar proyecto permanentemente (hard delete)
   */
  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/delete/${id}`);
  }

  /**
   * POST /api/projects/{id}/documents/upload
   * Subir documento a un proyecto
   */
  uploadProjectDocument(projectId: string, formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${projectId}/documents/upload`, formData);
  }

  /**
   * DELETE /api/projects/{id}/documents/delete
   * Eliminar documento de un proyecto
   */
  deleteProjectDocument(projectId: string, fileName: string): Observable<any> {
    return this.http.delete<any>(
      `${this.baseUrl}/${projectId}/documents/delete?fileName=${encodeURIComponent(fileName)}`
    );
  }

  /**
   * GET /api/projects/{id}/documents/download
   * Descargar documento de un proyecto
   */
  downloadProjectDocument(projectId: string, fileName: string): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/${projectId}/documents/download?fileName=${encodeURIComponent(fileName)}`,
      { responseType: 'blob' }
    );
  }
}
