import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../auth.service';
import { environment } from '../../environments/environment';
import { Subscription, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';

export interface SprintKpi {
  id: string;
  sprintKey: string;
  startDate: string;
  endDate?: string;
  totalTasks: number;
  todo: number;
  doing: number;
  done: number;
  pct: number;
  totalHours: number;
  doneHours: number;
}

export interface PeticionRecent {
  id: string;
  requesterName: string;
  projectName: string;
  estado: string;
  createdAt: string;
}

export interface BitacoraRecent {
  id: string;
  titulo: string;
  entorno: string;
  fecha: string;
  tags: string[];
}

export interface DashboardKpis {
  sprint: SprintKpi | null;
  peticiones: {
    total: number;
    byEstado: Record<string, number>;
    recent: PeticionRecent[];
  };
  join: { total: number; pendientes: number };
  proyectos: { total: number };
  bitacora: { total: number; recent: BitacoraRecent[] };
  usuarios: { total: number };
  backlog: { total: number };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
  imports: [CommonModule, MatIconModule, TranslateModule, RouterLink],
})
export class DashboardComponent implements OnInit, OnDestroy {

  kpis: DashboardKpis | null = null;
  loading = true;
  error = false;

  private refreshSub?: Subscription;

  constructor(
    private http: HttpClient,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.refreshSub = interval(60_000).pipe(
      startWith(0),
      switchMap(() => this.http.get<DashboardKpis>(`${environment.baseUrl}dashboard/kpis`))
    ).subscribe({
      next: (data) => { this.kpis = data; this.loading = false; this.error = false; },
      error: ()    => { this.loading = false; this.error = true; }
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  get rol(): string { return this.auth.currentUserValue?.rol ?? 'invitado'; }
  get isPrivileged(): boolean { return ['devops', 'admin'].includes(this.rol); }

  estadoClass(estado: string): string {
    const e = (estado ?? '').toUpperCase();
    if (e === 'PENDIENTE')  return 'badge-pendiente';
    if (e === 'APROBADA')   return 'badge-aprobada';
    if (e === 'INICIADA')   return 'badge-iniciada';
    if (e === 'FINALIZADA') return 'badge-finalizada';
    if (e === 'RECHAZADA')  return 'badge-rechazada';
    return 'badge-default';
  }

  estadoIcon(estado: string): string {
    const e = (estado ?? '').toUpperCase();
    if (e === 'PENDIENTE')  return 'hourglass_empty';
    if (e === 'APROBADA')   return 'thumb_up';
    if (e === 'INICIADA')   return 'play_circle';
    if (e === 'FINALIZADA') return 'check_circle';
    if (e === 'RECHAZADA')  return 'cancel';
    return 'help_outline';
  }

  sprintBarWidth(pct: number): string {
    return Math.min(pct, 100) + '%';
  }
}
