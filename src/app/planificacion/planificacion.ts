import { Component, OnInit } from '@angular/core';
import { CommonModule, NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BuscadorComponent } from '../buscador/buscador';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PlanningService, EventItem, Env, EventType } from './planning.service';
import { forkJoin } from 'rxjs';
import { LocalStorageService } from '../local-storage.service';

@Component({
  selector: 'app-planificacion',
  templateUrl: './planificacion.html',
  styleUrls: ['./planificacion.css'],
  standalone: true,
  imports: [CommonModule, NgForOf, NgIf, FormsModule, BuscadorComponent, TranslateModule]
})
export class PlanificacionComponent implements OnInit {
  title = 'Planificación semanal';

  year = 2026;
  weekStart!: Date;
  envs: Env[] = ['DEV', 'INT', 'PRE', 'PRO'];

  events: EventItem[] = [];
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

  private readonly STORAGE_KEY_WEEK = 'planning_weekStart';
  private readonly STORAGE_KEY_FILTER = 'planning_searchTerm';
  private readonly STORAGE_KEY_DRAFT = 'planning_modalDraft';

  constructor(
    private translate: TranslateService,
    private planningService: PlanningService,
    private storage: LocalStorageService
  ) {}

  ngOnInit(): void {
    this.restoreFromLocalStorage();

    this.devOpsList = [ 'PLANNING.UNASSIGNED', 'Borja Lara', 'Rubén Planté', 'Raúl Gallego', 'Fernando Gil' ];

    this.loadEvents();
  }

  // ===== LOCAL STORAGE =====

  private restoreFromLocalStorage(): void {
    // setmana
    const savedWeek = this.storage.get(this.STORAGE_KEY_WEEK);
    if (savedWeek) {
      const d = new Date(savedWeek);
      if (!isNaN(d.getTime())) {
        this.weekStart = this.startOfWeek(d);
      }
    }
    if (!this.weekStart) {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      this.weekStart = this.startOfWeek(tomorrow);
    }

    // filtre
    const savedFilter = this.storage.get(this.STORAGE_KEY_FILTER);
    if (savedFilter) {
      this.searchTerm = savedFilter;
    }

    // draft modal
    const savedDraft = this.storage.getObject<{ draft: Partial<EventItem>; editingId?: string }>(this.STORAGE_KEY_DRAFT);
    if (savedDraft && savedDraft.draft) {
      this.draft = savedDraft.draft;
      // encara no sabem els events (no podem reconstruir editing), així que només obrim el modal en mode "nou" amb draft
      this.showModal = true;
    }
  }

  private saveUiState(): void {
    this.storage.set(this.STORAGE_KEY_WEEK, this.weekStart.toISOString());
    this.storage.set(this.STORAGE_KEY_FILTER, this.searchTerm || '');
  }

  private saveDraft(): void {
    const data = {
      draft: this.draft,
      editingId: this.editing?.id
    };
    this.storage.setObject(this.STORAGE_KEY_DRAFT, data);
  }

  private clearDraft(): void {
    this.storage.remove(this.STORAGE_KEY_DRAFT);
  }

  // ===== NAV / DATES =====

  startOfWeek(d: Date) {
    const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = dt.getUTCDay();
    const diff = (day === 0 ? -6 : 1 - day);
    dt.setUTCDate(dt.getUTCDate() + diff);
    return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
  }

  prevWeek() {
    this.weekStart = new Date(this.weekStart.getTime() - 7 * 24 * 3600 * 1000);
    this.saveUiState();
  }

  nextWeek() {
    this.weekStart = new Date(this.weekStart.getTime() + 7 * 24 * 3600 * 1000);
    this.saveUiState();
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
      }
    });
  }

  keyDate(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  // Filtrado en memoria
  eventsFor(env: Env, day: Date) {
    const k = this.keyDate(day);
    const list = this.events
      .filter(e => e.env === env && e.date === k)
      .sort((a,b) => a.startTime.localeCompare(b.startTime));
    if (!this.searchTerm) return list;
    return this.applyFilter(list);
  }

  eventsForDay(day: Date) {
    const k = this.keyDate(day);
    let list = this.events
      .filter(e => e.date === k)
      .sort((a,b) => a.startTime.localeCompare(b.startTime));
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
    this.saveUiState();
  }

  // --- MODAL / DRAFT ---

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
        responsable: '',
        eventType: 'DEPLOY',
        periodDays: 1
      };
    }
    this.validationError = null;
    this.showModal = true;
    this.saveDraft();
  }

  onEventTypeChange(newType: EventType | undefined) {
    if (!newType) return;
    if (newType === 'TRAIN' || newType === 'ABSENCE') {
      this.draft.env = undefined;
    } else {
      if (!this.draft.env) this.draft.env = 'DEV';
    }
    this.saveDraft();
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
      // UPDATE
      const payload = { ...(this.editing), ...(this.draft as EventItem) };

      this.planningService.updateEvent(this.editing.id, payload).subscribe({
        next: (updatedEvent) => {
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
      // CREATE
      const days = Math.max(1, Math.min(30, Number(this.draft.periodDays || 1)));
      const requests = [];

      for (let i = 0; i < days; i++) {
        const dt = new Date(this.draft.date as string + 'T00:00:00Z');
        dt.setUTCDate(dt.getUTCDate() + i);
        const dateStr = dt.toISOString().slice(0,10);

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
    this.clearDraft();
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
        this.closeModal();
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
