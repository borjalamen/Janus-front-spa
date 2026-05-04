import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type AgentEntity = 'herramienta' | 'proyecto' | 'procedimiento' | 'infra' | 'formacion' | 'all';

export interface EstimacionFill {
  estimationName?: string;
  projectCode?: string;
  projectName?: string;
  requester?: string;
  requesterEmail?: string;
  notes?: string;
  weeks?: string[];
  tasks?: { title: string; estimates: number[] }[];
}

@Injectable({ providedIn: 'root' })
export class AgentRefreshService {
  /** Emite la entidad modificada por la IA para que los componentes activos recarguen */
  readonly refresh$ = new Subject<AgentEntity>();
  /** Emite datos de estimación generados por la IA para rellenar el formulario */
  readonly fillEstimacion$ = new Subject<EstimacionFill>();

  notify(entity: AgentEntity = 'all'): void {
    this.refresh$.next(entity);
  }

  fillEstimacion(data: EstimacionFill): void {
    this.fillEstimacion$.next(data);
  }
}
