// src/app/services/project.service.ts
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../environments/environment";

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

export interface ResponsableInfo {
  nombre?: string;
  email?: string;
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

export interface MonitoringEnv {
  grafanaUrl?: string;
  grafanaUser?: string;
  grafanaPassword?: string;
  kibanaUrl?: string;
  kibanaUser?: string;
  kibanaPassword?: string;
}

export interface MonitoringTools {
  dev?: MonitoringEnv;
  pre?: MonitoringEnv;
  pro?: MonitoringEnv;
  [key: string]: MonitoringEnv | undefined;
}

export interface ConnectivityEntry {
  id?: string;
  role?: 'PRODUCER' | 'CONSUMER' | 'MIXED';
  type?: 'INTERNAL' | 'EXTERNAL' | 'OTHER';

  // Para INTERNAL (proyecto JanusHub)
  internalProjectId?: string;
  internalProjectCode?: string;
  internalProjectName?: string;

  // Para EXTERNAL (servicio externo)
  externalServiceId?: string;
  externalServiceName?: string;

  // Para OTHER
  otherName?: string;
  otherCode?: string;
  otherNotes?: string;

  // Común
  environments?: string[];   // 'DEV' | 'INT' | 'PRE' | 'PRO'
  notes?: string;
}

export interface ExternalService {
  id?: string;
  name?: string;
  code?: string;
  description?: string;
  url?: string;
}

export interface ExtraMetadata {
  key: string;
  value: string;
}

export interface TechnologyEntry {
  name: string;
  version: string;
  comment?: string;
  obsolete?: boolean;
}

export interface Department {
  id?: string;
  name: string;
}

export interface Daily {
  hora: string;
  dias: string[];
  notas: string;
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
  responsableProyecto?: ResponsableInfo | null;
  responsableTecnico?: ResponsableInfo | null;
  horaDaily?: string | null;
  dailies?: Daily[];

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

  // Herramientas de Monitorización
  monitoringTools?: MonitoringTools;

  // Conectividades del proyecto
  connectivities?: ConnectivityEntry[];

  // Documentos
  documents?: Array<{
    nombre: string;
    descripcion: string;
    tipo: string;
    path: string;
  }>;

  // Metadatos extra clave-valor
  extras?: ExtraMetadata[];

  // Tecnologías utilizadas en el proyecto
  technologies?: TechnologyEntry[];

  // ── Campos CTTI / Inventari d'Aplicacions ──

  // Classificació
  acronim?: string | null;
  codiComponent?: string | null;
  blocServei?: string | null;
  estat?: string | null;
  tipusAplicacio?: string | null;
  nivelCriticitat?: string | null;
  gestionadaCdC?: string | null;

  // Identificació addicional
  codidep?: string | null;
  codient?: string | null;
  entitat?: string | null;
  codiClientAdmin?: string | null;
  codiDialeg?: string | null;

  // Contracte i manteniment
  empresaManteniment?: string | null;
  contracteManteniment?: string | null;
  serveiMantHorari?: string | null;
  descripcioLot?: string | null;
  cmdb?: string | null;

  // Taxonomia
  sistemaInformacio?: string | null;
  codiSolucio?: string | null;
  familiaSolucions?: string | null;
  anyImplantacio?: string | null;

  // Plataforma i Entorn Tecnològic
  plataforma?: string | null;
  entornTecnologic?: string | null;
  descEntornTecnologic?: string | null;
  numUsuaris?: string | null;
  estacionalitat?: string | null;
  lotCPD?: string | null;
  proveidor?: string | null;
  producteUtilitzat?: string | null;

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

@Injectable({ providedIn: "root" })
export class ProjectService {
  private baseUrl = `${environment.baseUrl}projects`;
  private departmentsUrl = `${environment.baseUrl}departments`;
  private externalServicesUrl = `${environment.baseUrl}external-services`;

  constructor(private http: HttpClient) {}

  /**
   * GET /api/projects/all
   * Obtener todos los proyectos
   */
  getAll(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/all`);
  }

  /**
   * GET /api/projects/for-user?email={email}
   * Obtener proyectos filtrados por email de usuario (para roles MANAGER y TEAM)
   */
  getForUser(email: string): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/for-user`, {
      params: { email }
    });
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
    return this.http.get<Project>(
      `${this.baseUrl}/code/${encodeURIComponent(code)}`,
    );
  }

  /**
   * GET /api/projects/search/name/{name}
   * Buscar proyectos por nombre
   */
  searchByName(name: string): Observable<Project[]> {
    return this.http.get<Project[]>(
      `${this.baseUrl}/search/name/${encodeURIComponent(name)}`,
    );
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
    return this.http.delete(`${this.baseUrl}/soft-delete/${id}`, {
      responseType: "text",
    });
  }

  /**
   * DELETE /api/projects/delete/{id}
   * Eliminar proyecto permanentemente (hard delete)
   */
  delete(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/delete/${id}`, {
      responseType: "text",
    });
  }

  /**
   * POST /api/projects/{id}/documents/upload
   * Subir documento a un proyecto
   */
  uploadProjectDocument(
    projectId: string,
    formData: FormData,
  ): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${projectId}/documents/upload`,
      formData,
    );
  }

  /**
   * DELETE /api/projects/{id}/documents/delete
   * Eliminar documento de un proyecto
   */
  deleteProjectDocument(projectId: string, fileName: string): Observable<any> {
    return this.http.delete<any>(
      `${this.baseUrl}/${projectId}/documents/delete?fileName=${encodeURIComponent(fileName)}`,
    );
  }

  /**
   * GET /api/projects/{id}/documents/download
   * Descargar documento de un proyecto
   */
  downloadProjectDocument(
    projectId: string,
    fileName: string,
  ): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/${projectId}/documents/download?fileName=${encodeURIComponent(fileName)}`,
      { responseType: "blob" },
    );
  }

  /**
   * GET /api/departments
   * Obtener todos los departamentos
   */
  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(this.departmentsUrl);
  }

  /**
   * POST /api/departments
   * Crear nuevo departamento
   */
  createDepartment(department: Partial<Department>): Observable<Department> {
    return this.http.post<Department>(this.departmentsUrl, department);
  }

  /**
   * PUT /api/departments/{id}
   * Actualizar departamento
   */
  updateDepartment(
    id: string,
    department: Partial<Department>,
  ): Observable<Department> {
    return this.http.put<Department>(
      `${this.departmentsUrl}/${id}`,
      department,
    );
  }

  /**
   * DELETE /api/departments/{id}
   * Eliminar departamento
   */
  deleteDepartment(id: string): Observable<any> {
    return this.http.delete<any>(`${this.departmentsUrl}/${id}`);
  }

  // ── Servicios Externos ──

  /**
   * GET /api/external-services
   * Obtener todos los servicios externos
   */
  getExternalServices(): Observable<ExternalService[]> {
    return this.http.get<ExternalService[]>(this.externalServicesUrl);
  }

  /**
   * POST /api/external-services
   * Crear servicio externo
   */
  createExternalService(data: Partial<ExternalService>): Observable<ExternalService> {
    return this.http.post<ExternalService>(this.externalServicesUrl, data);
  }

  /**
   * PUT /api/external-services/{id}
   * Actualizar servicio externo
   */
  updateExternalService(id: string, data: Partial<ExternalService>): Observable<ExternalService> {
    return this.http.put<ExternalService>(`${this.externalServicesUrl}/${id}`, data);
  }

  /**
   * DELETE /api/external-services/{id}
   * Eliminar servicio externo
   */
  deleteExternalService(id: string): Observable<any> {
    return this.http.delete<any>(`${this.externalServicesUrl}/${id}`);
  }
}
