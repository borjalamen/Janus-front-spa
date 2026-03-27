import { Component } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
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
  comments?: ScrumComment[];
  assignee?: string | null;
  color?: string;
  status: 'todo'|'doing'|'done';
};

type ScrumComment = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
};

@Component({
  selector: 'app-scrum',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, FormsModule, TranslateModule, MatIconModule],
  templateUrl: './scrum.html',
  styleUrls: ['./scrum.css']
})
export class ScrumComponent {
  private readonly STORAGE_TASKS_KEY = 'janus_scrum_tasks';
  private readonly STORAGE_DRAFT_KEY = 'janus_scrum_draft';

  tasks: ScrumTask[] = [];
  newTitle = '';
  newEstimate = '';
  newDescription = '';
  newPriority: number = 50;
  newAssignee: string | null = null;
  currentUserName = 'Usuario';
  assignees = [
    'Fernando Silvano Gil',
    'Raúl Gallego',
    'Rubén Planté',
    'Borja Lara'
  ];

  editingId: string | null = null;
  editBuffer: Partial<ScrumTask> = {};
  openCommentsTaskId: string | null = null;
  commentDrafts: Record<string, string> = {};
  searchQuery = '';

  constructor(private storage: LocalStorageService) {
    this.currentUserName = this.resolveCurrentUserName();

    // carregar tasques
    try {
      const raw = this.storage.get(this.STORAGE_TASKS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as any[];
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
              if (t.priority < 0) t.priority = 0;
              if (t.priority > 150) t.priority = 150;
            }
          } else {
            t.priority = 50;
          }
          if (t.description === undefined) t.description = '';
          if (!Array.isArray(t.comments)) {
            if (typeof t.comments === 'string' && t.comments.trim()) {
              t.comments = [{
                id: this.generateCommentId(),
                author: 'Usuario',
                text: t.comments.trim(),
                createdAt: new Date().toISOString()
              }];
            } else {
              t.comments = [];
            }
          }
          if (t.assignee === undefined) t.assignee = null;
          if (!t.id || typeof t.id !== 'string') t.id = this.generateReadableId();
          if (!t.color) t.color = this.pickCoolColor();
          return t as ScrumTask;
        });
      }
    } catch (e) {
      this.tasks = [];
    }

    // carregar draft del formulari
    this.restoreDraft();
  }

  // ========== AUTOSAVE FORM DRAFT ==========

  saveDraft(): void {
    const draft = {
      newTitle: this.newTitle,
      newEstimate: this.newEstimate,
      newDescription: this.newDescription,
      newPriority: this.newPriority,
      newAssignee: this.newAssignee
    };
    this.storage.setObject(this.STORAGE_DRAFT_KEY, draft);
  }

  restoreDraft(): void {
    const draft = this.storage.getObject<{
      newTitle: string;
      newEstimate: string;
      newDescription: string;
      newPriority: number;
      newAssignee: string | null;
    }>(this.STORAGE_DRAFT_KEY);

    if (draft) {
      this.newTitle = draft.newTitle || '';
      this.newEstimate = draft.newEstimate || '';
      this.newDescription = draft.newDescription || '';
      this.newPriority = draft.newPriority ?? 50;
      this.newAssignee = draft.newAssignee ?? null;
    }
  }

  clearDraft(): void {
    this.storage.remove(this.STORAGE_DRAFT_KEY);
  }

  // ========== PRIORITAT / COLOR / ID ==========

  getPriorityLabelKey(p?: number) {
    if (p === undefined || p === null) return '';
    if (p < 25) return 'SCRUM.PRI_LABEL_OPT';
    if (p >= 100) return 'SCRUM.PRI_LABEL_NOW';
    return '';
  }

  generateReadableId() {
    const d = new Date();
    const pad = (n:number, l=2) => String(n).padStart(l, '0');
    const date = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}${pad(d.getMinutes())}`;
    const suffix = Math.random().toString(36).slice(2,6).toUpperCase();
    return `T-${date}-${time}-${suffix}`;
  }

  generateCommentId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  pickCoolColor() {
    const hue = Math.floor(Math.random() * (260 - 180 + 1)) + 180;
    const sat = 50 + Math.floor(Math.random() * 16);
    const light = 18 + Math.floor(Math.random() * 8);
    const h2 = (hue + 10) % 360;
    const sat2 = Math.max(30, sat - 8);
    const light2 = Math.min(40, light + 8);
    const c1 = `hsl(${hue} ${sat}% ${light}%)`;
    const c2 = `hsl(${h2} ${sat2}% ${light2}%)`;
    return `linear-gradient(180deg, ${c1}, ${c2})`;
  }

  // ========== STORAGE DE TASKS ==========

  saveStore() {
    try { this.storage.setObject(this.STORAGE_TASKS_KEY, this.tasks); } catch(e) {}
  }

  // ========== CRUD ==========

  addTask() {
    if (!this.newTitle || !this.newTitle.trim()) return;
    const t: ScrumTask = {
      id: this.generateReadableId(),
      title: this.newTitle.trim(),
      estimate: this.newEstimate || '',
      priority: this.newPriority,
      description: this.newDescription || '',
      comments: [],
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
    this.clearDraft();   // un cop afegida, netegem draft
  }

  startEdit(task: ScrumTask) {
    this.editingId = task.id;
    this.editBuffer = {
      title: task.title,
      estimate: task.estimate,
      priority: task.priority,
      description: task.description,
      assignee: task.assignee
    };
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
    const q = (this.searchQuery || '').trim().toLowerCase();
    return this.tasks.filter(t => {
      if (t.status !== status) return false;
      if (!q) return true;

      const commentsText = (t.comments || []).map(c => `${c.author} ${c.text}`).join(' ');
      const haystack = `${t.title || ''} ${t.estimate || ''} ${t.priority ?? ''} ${t.description || ''} ${t.assignee || ''} ${commentsText}`.toLowerCase();
      return haystack.includes(q);
    });
  }

  filtrar(valor: string) {
    this.searchQuery = valor || '';
  }

  clearSearch() {
    this.searchQuery = '';
  }

  toggleComments(taskId: string) {
    this.openCommentsTaskId = this.openCommentsTaskId === taskId ? null : taskId;
  }

  commentCount(task: ScrumTask): number {
    return Array.isArray(task.comments) ? task.comments.length : 0;
  }

  getCommentDraft(taskId: string): string {
    return this.commentDrafts[taskId] || '';
  }

  setCommentDraft(taskId: string, value: string) {
    this.commentDrafts[taskId] = value;
  }

  addComment(task: ScrumTask) {
    const text = (this.getCommentDraft(task.id) || '').trim();
    if (!text) return;

    const comment: ScrumComment = {
      id: this.generateCommentId(),
      author: this.currentUserName,
      text,
      createdAt: new Date().toISOString()
    };

    if (!Array.isArray(task.comments)) task.comments = [];
    task.comments = [comment, ...task.comments];
    this.commentDrafts[task.id] = '';
    this.saveStore();
  }

  removeComment(task: ScrumTask, commentId: string) {
    if (!Array.isArray(task.comments)) return;
    task.comments = task.comments.filter(c => c.id !== commentId);
    this.saveStore();
  }

  formatCommentDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  }

  private resolveCurrentUserName(): string {
    const fromUserObj = this.storage.getObject<{ fullName?: string; username?: string }>('user');
    const fullName = (fromUserObj?.fullName || '').trim();
    if (fullName) return fullName;

    const username = (fromUserObj?.username || '').trim();
    if (username) return username;

    const fromKey = String(this.storage.get('username') || '').trim();
    if (fromKey) return fromKey;

    return 'Usuario';
  }
}
