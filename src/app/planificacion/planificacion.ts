import { Component, OnInit } from '@angular/core';
import { CommonModule, NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BuscadorComponent } from '../buscador/buscador';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PlanningService, EventItem, Env, EventType } from './planning.service'; // Asegúrate de importar el servicio
import { forkJoin } from 'rxjs'; // Necesario para crear múltiples eventos a la vez

@Component({
  selector: 'app-planificacion',
  templateUrl: './planificacion.html',
  styleUrls: ['./planificacion.css'],
  standalone: true,
  // IMPORTANTE: Asegúrate de que HttpClientModule esté en los providers globales o impórtalo aquí si es necesario
  imports: [CommonModule, NgForOf, NgIf, FormsModule, BuscadorComponent, TranslateModule]
})
export class PlanificacionComponent implements OnInit {
  title = 'Planificación semanal';

  year = 2026;
  weekStart!: Date;
  envs: Env[] = ['DEV', 'INT', 'PRE', 'PRO'];

  events: EventItem[] = [];
  
  // Estado de carga para feedback visual
  isLoading = false;

  searchTerm = '';

  // Modal / Draft state
  showModal = false;
  editing?: EventItem;
  draft: Partial<EventItem> = {};
  
  // Confirmation dialog state
  showConfirm = false;
  confirmMessage = '';
  private confirmAction: (() => void) | null = null;

  devOpsList: string[] = [];
  validationError: string | null = null;

  constructor(
    private translate: TranslateService,
    private planningService: PlanningService // Inyectamos el servicio
  ) {}

  ngOnInit(): void {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    this.weekStart = this.startOfWeek(tomorrow);
    
    this.devOpsList = [ 'PLANNING.UNASSIGNED', 'Borja Lara', 'Rubén Planté', 'Raúl Gallego', 'Fernando Gil' ];
    
    // Cargar datos del Backend
    this.loadEvents();
  }

  startOfWeek(d: Date) {
    const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = dt.getUTCDay();
    const diff = (day === 0 ? -6 : 1 - day);
    dt.setUTCDate(dt.getUTCDate() + diff);
    return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
  }

  prevWeek() {
    this.weekStart = new Date(this.weekStart.getTime() - 7 * 24 * 3600 * 1000);
  }

  nextWeek() {
    this.weekStart = new Date(this.weekStart.getTime() + 7 * 24 * 3600 * 1000);
  }

  daysOfWeek() {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(new Date(this.weekStart.getTime() + i * 24 * 3600 * 1000));
    }
    return days;
  }

  // --- CONECTIVIDAD: Cargar Eventos ---
  loadEvents() {
    this.isLoading = true;
    this.planningService.getEvents().subscribe({
      next: (data) => {
        this.events = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando planificación:', err);
        this.isLoading = false;
        // Aquí podrías mostrar una notificación de error
      }
    });
  }

  keyDate(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  // Filtrado en memoria (se mantiene igual ya que tenemos todos los datos)
  eventsFor(env: Env, day: Date) {
    const k = this.keyDate(day);
    const list = this.events.filter(e => e.env === env && e.date === k).sort((a,b) => a.startTime.localeCompare(b.startTime));
    if (!this.searchTerm) return list;
    return this.applyFilter(list);
  }

  eventsForDay(day: Date) {
    const k = this.keyDate(day);
    let list = this.events.filter(e => e.date === k).sort((a,b) => a.startTime.localeCompare(b.startTime));
    if (!this.searchTerm) return list;
    return this.applyFilter(list);
  }

  applyFilter(list: EventItem[]) {
    const term = this.searchTerm.toLowerCase();
    return list.filter(e =>
      (e.project && e.project.toLowerCase().includes(term)) ||
      (e.devOps && e.devOps.toLowerCase().includes(term)) ||
      (e.notes && e.notes.toLowerCase().includes(term))
    );
  }

  filtrar(valor: string) {
    this.searchTerm = (valor || '').trim().toLowerCase();
  }

  createOrEditEvent(existing?: EventItem, env?: Env, day?: Date) {
    if (existing) {
      this.editing = existing;
      this.draft = { ...existing };
      this.onEventTypeChange(this.draft.eventType as EventType);
    } else {
      const date = (day ? this.keyDate(day) : this.keyDate(this.weekStart));
      this.editing = undefined;
      this.draft = {
        env: env || 'DEV',
        project: '',
        date,
        startTime: '09:00',
        endTime: '10:00',
        devOps: (this.devOpsList && this.devOpsList.length>0) ? this.devOpsList[0] : '',
        jiraUrl: '',
        responsable: ''
        ,eventType: 'DEPLOY'
        ,periodDays: 1
      };
    }
    this.validationError = null;
    this.showModal = true;
  }

  onEventTypeChange(newType: EventType | undefined) {
    if (!newType) return;
    if (newType === 'TRAIN' || newType === 'ABSENCE') {
      this.draft.env = undefined;
    } else {
      if (!this.draft.env) this.draft.env = 'DEV';
    }
  }

  // --- CONECTIVIDAD: Guardar (Crear o Editar) ---
  saveModal() {
    const needEnv = this.draft.eventType === 'DEPLOY' || this.draft.eventType === 'OTHER';
    if (!this.draft || !this.draft.project || !this.draft.startTime || !this.draft.endTime || !this.draft.date || (needEnv && !this.draft.env)) {
      this.validationError = this.translate.instant('PLANNING.ERROR_REQUIRED');
      return;
    }

    this.isLoading = true;

    if (this.editing && this.editing.id) {
      // --- UPDATE (PUT) ---
      const payload = { ...(this.editing), ...(this.draft as EventItem) };
      
      this.planningService.updateEvent(this.editing.id, payload).subscribe({
        next: (updatedEvent) => {
          // Actualizamos la lista localmente
          const idx = this.events.findIndex(e => e.id === updatedEvent.id);
          if (idx !== -1) this.events[idx] = updatedEvent;
          
          this.isLoading = false;
          this.closeModal();
        },
        error: (err) => {
          console.error('Error updating:', err);
          this.isLoading = false;
          this.validationError = 'Error al actualizar en servidor';
        }
      });

    } else {
      // --- CREATE (POST) ---
      // Manejo de "Period Days" (Múltiples días)
      const days = Math.max(1, Math.min(30, Number(this.draft.periodDays || 1)));
      const requests = [];

      for (let i = 0; i < days; i++) {
        const dt = new Date(this.draft.date as string + 'T00:00:00Z');
        dt.setUTCDate(dt.getUTCDate() + i);
        const dateStr = dt.toISOString().slice(0,10);

        // Preparamos el objeto para enviar al Back (sin ID, el back lo genera)
        const newItem: EventItem = {
            env: this.draft.env as Env,
            project: this.draft.project as string,
            date: dateStr,
            startTime: this.draft.startTime as string,
            endTime: this.draft.endTime as string,
            devOps: this.draft.devOps as string,
            notes: this.draft.notes as string,
            jiraUrl: this.draft.jiraUrl as string,
            responsable: this.draft.responsable as string,
            eventType: this.draft.eventType as EventType
        };
        requests.push(this.planningService.createEvent(newItem));
      }

      // Ejecutamos todas las peticiones en paralelo y esperamos a que todas terminen
      forkJoin(requests).subscribe({
        next: (newEvents) => {
          this.events.push(...newEvents);
          this.isLoading = false;
          this.closeModal();
        },
        error: (err) => {
          console.error('Error creating:', err);
          this.isLoading = false;
          this.validationError = 'Error al crear en servidor';
        }
      });
    }
  }

  closeModal() {
    this.showModal = false;
    this.editing = undefined;
    this.draft = {};
    this.validationError = null;
  }

  removeFromModal() {
    if (!this.editing || !this.editing.id) return;
    this.promptConfirm(this.translate.instant('PLANNING.DELETE_CONFIRM'), () => {
      this.performDelete(this.editing!.id!);
    });
  }

  deleteEvent(id: string) {
    this.promptConfirm(this.translate.instant('PLANNING.DELETE_CONFIRM'), () => {
      this.performDelete(id);
    });
  }

  // --- CONECTIVIDAD: Borrar ---
  performDelete(id: string) {
    this.isLoading = true;
    this.planningService.deleteEvent(id).subscribe({
      next: () => {
        this.events = this.events.filter(e => e.id !== id);
        this.isLoading = false;
        this.closeModal(); // Por si se llamó desde el modal
      },
      error: (err) => {
        console.error('Error deleting:', err);
        this.isLoading = false;
      }
    });
  }

  promptConfirm(message: string, action: () => void) {
    this.confirmMessage = message;
    this.confirmAction = action;
    this.showConfirm = true;
  }

  confirmOk() {
    if (this.confirmAction) this.confirmAction();
    this.confirmAction = null;
    this.showConfirm = false;
    this.confirmMessage = '';
  }

  confirmCancel() {
    this.confirmAction = null;
    this.showConfirm = false;
    this.confirmMessage = '';
  }

  formatDay(d: Date) {
    return `${d.getUTCDate()}/${d.getUTCMonth()+1}`;
  }

  weekRange() {
    const start = this.weekStart;
    const end = new Date(this.weekStart.getTime() + 6 * 24 * 3600 * 1000);
    return `${this.formatDay(start)} - ${this.formatDay(end)}/${end.getUTCFullYear()}`;
  }
}