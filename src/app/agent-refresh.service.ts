import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type AgentEntity = 'herramienta' | 'proyecto' | 'procedimiento' | 'infra' | 'all';

@Injectable({ providedIn: 'root' })
export class AgentRefreshService {
  /** Emite la entidad modificada por la IA para que los componentes activos recarguen */
  readonly refresh$ = new Subject<AgentEntity>();

  notify(entity: AgentEntity = 'all'): void {
    this.refresh$.next(entity);
  }
}
