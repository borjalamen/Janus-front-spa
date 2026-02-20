import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { LocalStorageService } from '../local-storage.service';

type ScrumTask = {
  id: string;
  title: string;
  estimate?: string;
  priority?: number;
  description?: string;
  assignee?: string | null;
  color?: string;
  status: 'todo'|'doing'|'done';
};

@Component({
  selector: 'app-scrum',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, MatIconModule],
  templateUrl: './scrum.html',
  styleUrls: ['./scrum.css']
})
export class ScrumComponent {
  tasks: ScrumTask[] = [];
  newTitle = '';
  newEstimate = '';
  newDescription = '';
  newPriority: number = 50;
  newAssignee: string | null = null;
  assignees = [
    'Fernando Silvano Gil',
    'Raúl Gallego',
    'Rubén Planté',
    'Borja Lara'
  ];

  editingId: string | null = null;
  editBuffer: Partial<ScrumTask> = {};

  getPriorityLabelKey(p?: number) {
    if (p === undefined || p === null) return '';
    if (p < 25) return 'SCRUM.PRI_LABEL_OPT';
    if (p >= 100) return 'SCRUM.PRI_LABEL_NOW';
    return '';
  }

  generateReadableId() {
    // Format: T-YYYYMMDD-HHMM-xxxx (readable and unique enough)
    const d = new Date();
    const pad = (n:number, l=2) => String(n).padStart(l, '0');
    const date = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}${pad(d.getMinutes())}`;
    const suffix = Math.random().toString(36).slice(2,6).toUpperCase();
    return `T-${date}-${time}-${suffix}`;
  }

  pickCoolColor() {
    // pick a cool hue between cyan-blue-purple (180-260)
    const hue = Math.floor(Math.random() * (260 - 180 + 1)) + 180;
    const sat = 50 + Math.floor(Math.random() * 16); // 50-65
    const light = 18 + Math.floor(Math.random() * 8); // 18-25
    const h2 = (hue + 10) % 360;
    const sat2 = Math.max(30, sat - 8);
    const light2 = Math.min(40, light + 8);
    const c1 = `hsl(${hue} ${sat}% ${light}%)`;
    const c2 = `hsl(${h2} ${sat2}% ${light2}%)`;
    return `linear-gradient(180deg, ${c1}, ${c2})`;
  }

  constructor(private storage: LocalStorageService) {
    try {
      const raw = this.storage.get('janus_scrum_tasks');
      if (raw) {
        const parsed = JSON.parse(raw) as any[];
        // migrate priority values: old strings -> numeric scale
        this.tasks = parsed.map(p => {
          const t: any = p;
          if (t && t.priority !== undefined && t.priority !== null) {
            if (typeof t.priority === 'string') {
              const s = (t.priority || '').toLowerCase();
              if (s === 'low') t.priority = 25;
              else if (s === 'medium') t.priority = 75;
              else if (s === 'high') t.priority = 125;
              else {
                const n = parseInt(t.priority, 10);
                t.priority = isNaN(n) ? 50 : n;
              }
            } else if (typeof t.priority === 'number') {
              // clamp to 0-150
              if (t.priority < 0) t.priority = 0;
              if (t.priority > 150) t.priority = 150;
            }
          } else {
            t.priority = 50;
          }
          // ensure description and assignee exist
          if (t.description === undefined) t.description = '';
          if (t.assignee === undefined) t.assignee = null;
          // ensure id exists and is readable
          if (!t.id || typeof t.id !== 'string') t.id = this.generateReadableId();
          if (!t.color) t.color = this.pickCoolColor();
          return t as ScrumTask;
        });
      }
    } catch (e) { this.tasks = []; }
  }

  saveStore() {
    try { this.storage.setObject('janus_scrum_tasks', this.tasks); } catch(e) {}
  }

  addTask() {
    if (!this.newTitle || !this.newTitle.trim()) return;
    const t: ScrumTask = {
      id: this.generateReadableId(),
      title: this.newTitle.trim(),
      estimate: this.newEstimate || '',
      priority: this.newPriority,
      description: this.newDescription || '',
      assignee: this.newAssignee || null,
      color: this.pickCoolColor(),
      status: 'todo'
    };
    this.tasks.push(t);
    this.newTitle = '';
    this.newEstimate = '';
    this.newPriority = 50;
    this.newDescription = '';
    this.newAssignee = null;
    this.saveStore();
  }

  startEdit(task: ScrumTask) {
    this.editingId = task.id;
    this.editBuffer = { title: task.title, estimate: task.estimate, priority: task.priority, description: task.description, assignee: task.assignee };
  }

  saveEdit(id: string) {
    const t = this.tasks.find(x => x.id === id);
    if (!t) return this.cancelEdit();
    t.title = (this.editBuffer.title as string) || t.title;
    t.estimate = (this.editBuffer.estimate as string) || t.estimate;
    if (this.editBuffer.priority !== undefined && this.editBuffer.priority !== null) {
      let p = Number(this.editBuffer.priority);
      if (isNaN(p)) p = 50;
      if (p < 0) p = 0;
      if (p > 150) p = 150;
      t.priority = p;
    }
    t.description = (this.editBuffer.description as string) || t.description || '';
    t.assignee = (this.editBuffer.assignee as string) || null;
    this.saveStore();
    this.cancelEdit();
  }

  cancelEdit() {
    this.editingId = null;
    this.editBuffer = {};
  }

  moveTask(id: string, to: ScrumTask['status']) {
    const t = this.tasks.find(x => x.id === id);
    if (!t) return;
    t.status = to;
    this.saveStore();
  }

  removeTask(id: string) {
    this.tasks = this.tasks.filter(x => x.id !== id);
    this.saveStore();
  }

  tasksBy(status: ScrumTask['status']) {
    return this.tasks.filter(t => t.status === status);
  }
}
