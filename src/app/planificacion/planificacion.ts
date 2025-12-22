import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BuscadorComponent } from '../buscador/buscador';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

type Env = 'DEV' | 'INT' | 'PRE' | 'PRO';

interface EventItem {
  id: string;
  env: Env;
  project: string;
  date: string; // ISO yyyy-mm-dd
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  devOps: string;
  notes?: string;
  jiraUrl?: string;
  responsable?: string;
}

@Component({
  selector: 'app-planificacion',
  templateUrl: './planificacion.html',
  styleUrls: ['./planificacion.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, BuscadorComponent, TranslateModule]
})
export class PlanificacionComponent implements OnInit {
  title = 'Planificación semanal';

  year = 2026;
  // current week start (Date object, Monday)
  weekStart!: Date;
  envs: Env[] = ['DEV', 'INT', 'PRE', 'PRO'];

  events: EventItem[] = [];

  // search term from buscador
  searchTerm = '';

  readonly STORAGE_KEY = 'janus_weekly_planning_2026_v1';

  // modal / draft state
  showModal = false;
  editing?: EventItem;
  draft: Partial<EventItem> = {};
  // confirmation dialog state
  showConfirm = false;
  confirmMessage = '';
  private confirmAction: (() => void) | null = null;

  devOpsList: string[] = [];
  validationError: string | null = null;

  constructor(private translate: TranslateService) {}

  ngOnInit(): void {
    // Inicializar la semana en la semana que comienza mañana (por petición)
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    this.weekStart = this.startOfWeek(tomorrow);
    // inicializar lista de DevOps con opción no asignado como clave traducible
    this.devOpsList = [ 'PLANNING.UNASSIGNED', 'Borja Lara', 'Rubén Planté', 'Raúl Gallego', 'Fernando Gil' ];
    this.load();
  }

  startOfWeek(d: Date) {
    // compute Monday of week in UTC
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

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) this.events = JSON.parse(raw) as EventItem[];
    } catch {}
  }

  save() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.events));
  }

  keyDate(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  eventsFor(env: Env, day: Date) {
    const k = this.keyDate(day);
    const list = this.events.filter(e => e.env === env && e.date === k).sort((a,b) => a.startTime.localeCompare(b.startTime));
    if (!this.searchTerm) return list;
    const term = this.searchTerm.toLowerCase();
    return list.filter(e =>
      (e.project && e.project.toLowerCase().includes(term)) ||
      (e.devOps && e.devOps.toLowerCase().includes(term)) ||
      (e.notes && e.notes.toLowerCase().includes(term))
    );
  }

  eventsForDay(day: Date) {
    const k = this.keyDate(day);
    let list = this.events.filter(e => e.date === k).sort((a,b) => a.startTime.localeCompare(b.startTime));
    if (!this.searchTerm) return list;
    const term = this.searchTerm.toLowerCase();
    list = list.filter(e =>
      (e.project && e.project.toLowerCase().includes(term)) ||
      (e.devOps && e.devOps.toLowerCase().includes(term)) ||
      (e.notes && e.notes.toLowerCase().includes(term))
    );
    return list;
  }

  filtrar(valor: string) {
    this.searchTerm = (valor || '').trim().toLowerCase();
  }

  createOrEditEvent(existing?: EventItem, env?: Env, day?: Date) {
    // open modal with draft prefilled
    if (existing) {
      this.editing = existing;
      this.draft = { ...existing };
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
      };
    }
    this.validationError = null;
    this.showModal = true;
  }

  saveModal() {
    // validate required fields
    if (!this.draft || !this.draft.project || !this.draft.startTime || !this.draft.endTime || !this.draft.date || !this.draft.env) {
      this.validationError = this.translate.instant('PLANNING.ERROR_REQUIRED');
      return;
    }
    if (this.editing) {
      const idx = this.events.findIndex(e => e.id === this.editing!.id);
      if (idx !== -1) this.events[idx] = { ...(this.editing as EventItem), ...(this.draft as EventItem) };
    } else {
      const e: EventItem = {
        id: Math.random().toString(36).slice(2,9),
        env: this.draft.env as Env,
        project: this.draft.project as string,
        date: this.draft.date as string,
        startTime: this.draft.startTime as string,
        endTime: this.draft.endTime as string,
        devOps: this.draft.devOps as string,
        notes: this.draft.notes as string,
        jiraUrl: this.draft.jiraUrl as string,
        responsable: this.draft.responsable as string
      };
      this.events.push(e);
    }
    this.save();
    this.closeModal();
  }

  closeModal() {
    this.showModal = false;
    this.editing = undefined;
    this.draft = {};
    this.validationError = null;
  }

  removeFromModal() {
    if (!this.editing) return;
    this.promptConfirm(this.translate.instant('PLANNING.DELETE_CONFIRM'), () => {
      this.events = this.events.filter(e => e.id !== this.editing!.id);
      this.save();
      this.closeModal();
    });
  }

  deleteEvent(id: string) {
    this.promptConfirm(this.translate.instant('PLANNING.DELETE_CONFIRM'), () => {
      this.events = this.events.filter(e => e.id !== id);
      this.save();
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