import { Component, OnInit } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { LocalStorageService } from '../local-storage.service';
import { RegisteredUserRecord, ScrumService, ScrumSprintRecord } from './scrum.service';

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
  sprintId?: string | null;
};

type ScrumComment = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
};

type SprintSnapshot = { date: string; remainingTasks: number; doneTasks: number; totalTasks: number; remainingHours: number; doneHours: number; totalHours: number };

@Component({
  selector: 'app-scrum',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, FormsModule, TranslateModule, MatIconModule, MatTabsModule],
  templateUrl: './scrum.html',
  styleUrls: ['./scrum.css']
})
export class ScrumComponent implements OnInit {
  private readonly STORAGE_DRAFT_KEY = 'janus_scrum_draft';

  tasks: ScrumTask[] = [];
  newTitle = '';
  newEstimate = '';
  newDescription = '';
  newPriority: number = 50;
  newAssignee: string | null = null;
  currentUserName = 'Usuari';
  assignees: string[] = [];
  private registeredDevopsAssignees: string[] = [];

  editingId: string | null = null;
  editBuffer: Partial<ScrumTask> = {};
  openCommentsTaskId: string | null = null;
  commentDrafts: Record<string, string> = {};
  searchQuery = '';

  activeSprint: ScrumSprintRecord | null = null;
  sprintHistory: ScrumSprintRecord[] = [];
  importError: string | null = null;
  importLoading = false;

  constructor(
    private storage: LocalStorageService,
    private scrumService: ScrumService
  ) {
    this.currentUserName = this.resolveCurrentUserName();
  }

  ngOnInit(): void {
    this.loadSprintState();
    this.loadTasksFromBackend();
    this.loadDevopsAssigneesFromBackend();
    this.restoreDraft();
  }

  private loadDevopsAssigneesFromBackend(): void {
    this.scrumService.getRegisteredUsers().subscribe({
      next: (users) => {
        const devopsNames = (users || [])
          .filter((u) => this.isActiveUser(u) && this.hasDevopsRole(u))
          .map((u) => (u.fullName || u.username || '').trim())
          .filter((name) => !!name);

        this.registeredDevopsAssignees = Array.from(new Set(devopsNames));
        this.refreshAssignees();
      },
      error: (err) => {
        console.error('Error loading DevOps users from backend:', err);
        this.registeredDevopsAssignees = [];
        this.refreshAssignees();
      }
    });
  }

  private hasDevopsRole(user: RegisteredUserRecord): boolean {
    const roles = (user.roles || []).map((r) => (r || '').toUpperCase().trim());
    return roles.includes('DEVOPS') || roles.includes('DEV');
  }

  private isActiveUser(user: RegisteredUserRecord): boolean {
    const status = (user.status || 'ACTIVE').toUpperCase().trim();
    return status !== 'INACTIVE' && status !== 'DISABLED';
  }

  private refreshAssignees(): void {
    const taskAssignees = this.tasks
      .map((t) => (t.assignee || '').trim())
      .filter((name) => !!name);

    this.assignees = Array.from(new Set([
      ...this.registeredDevopsAssignees,
      ...taskAssignees
    ])).sort((a, b) => a.localeCompare(b, 'ca'));

    if (this.newAssignee && !this.assignees.includes(this.newAssignee)) {
      this.newAssignee = null;
    }
  }

  private normalizeTask(raw: any): ScrumTask {
    const t: any = { ...(raw || {}) };

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
    if (!t.status) t.status = 'todo';

    return t as ScrumTask;
  }

  private loadTasksFromBackend() {
    this.scrumService.getAll().subscribe({
      next: (tasks) => {
        this.tasks = (tasks || []).map(t => this.normalizeTask(t));
        this.refreshAssignees();
        this.saveSnapshot();
      },
      error: (err) => {
        console.error('Error loading scrum tasks from backend:', err);
        this.tasks = [];
        this.refreshAssignees();
      }
    });
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

    this.scrumService.create(t as any).subscribe({
      next: (created) => {
        this.tasks.push(this.normalizeTask(created));
        this.refreshAssignees();
        this.newTitle = '';
        this.newEstimate = '';
        this.newPriority = 50;
        this.newDescription = '';
        this.newAssignee = null;
        this.clearDraft();
        this.saveSnapshot();
      },
      error: (err) => {
        console.error('Error creating scrum task in backend:', err);
      }
    });
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
    this.scrumService.update(t.id, t as any).subscribe({
      next: (updated) => {
        const idx = this.tasks.findIndex(x => x.id === t.id);
        if (idx !== -1) this.tasks[idx] = this.normalizeTask(updated);
        this.refreshAssignees();
      },
      error: (err) => {
        console.error('Error updating scrum task in backend:', err);
      }
    });
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
    this.scrumService.update(t.id, t as any).subscribe({
      next: (updated) => {
        const idx = this.tasks.findIndex(x => x.id === t.id);
        if (idx !== -1) this.tasks[idx] = this.normalizeTask(updated);
        this.refreshAssignees();
        this.saveSnapshot();
      },
      error: (err) => {
        console.error('Error moving scrum task in backend:', err);
      }
    });
  }

  removeTask(id: string) {
    this.scrumService.delete(id).subscribe({
      next: () => {
        if (this.openCommentsTaskId === id) {
          this.openCommentsTaskId = null;
        }
        if (this.editingId === id) {
          this.cancelEdit();
        }

        this.loadTasksFromBackend();
      },
      error: (err) => {
        console.error('Error deleting scrum task from backend:', err);
      }
    });
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
    this.scrumService.update(task.id, task as any).subscribe({
      next: (updated) => {
        const idx = this.tasks.findIndex(x => x.id === task.id);
        if (idx !== -1) this.tasks[idx] = this.normalizeTask(updated);
        this.refreshAssignees();
      },
      error: (err) => {
        console.error('Error saving scrum comment in backend:', err);
      }
    });
  }

  removeComment(task: ScrumTask, commentId: string) {
    if (!Array.isArray(task.comments)) return;
    task.comments = task.comments.filter(c => c.id !== commentId);
    this.scrumService.update(task.id, task as any).subscribe({
      next: (updated) => {
        const idx = this.tasks.findIndex(x => x.id === task.id);
        if (idx !== -1) this.tasks[idx] = this.normalizeTask(updated);
        this.refreshAssignees();
      },
      error: (err) => {
        console.error('Error deleting scrum comment in backend:', err);
      }
    });
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

    return 'Usuari';
  }

  // ========== SPRINT MANAGEMENT ==========

  private loadSprintState(): void {
    this.scrumService.getActiveSprint().subscribe({
      next: (sprint) => { this.activeSprint = sprint?.id ? sprint : null; },
      error: () => { this.activeSprint = null; }
    });
    this.scrumService.getSprintHistory().subscribe({
      next: (history) => { this.sprintHistory = history || []; },
      error: () => { this.sprintHistory = []; }
    });
  }

  startSprint(): void {
    if (this.activeSprint?.active) return;
    const startDate = this.toDateStr(new Date());
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const sprintKey = `SPRINT-${startDate.replace(/-/g, '')}-${suffix}`;
    this.scrumService.startSprint({ sprintKey, startDate, active: true }).subscribe({
      next: (created) => {
        this.activeSprint = created;
        // Tag existing tasks with new sprint id
        this.tasks = this.tasks.map(t => ({ ...t, sprintId: created.id }));
        this.saveSnapshot();
      },
      error: (err) => { console.error('Error starting sprint', err); }
    });
  }

  endSprint(): void {
    if (!this.activeSprint?.id) return;
    const summary = {
      totalTasks: this.tasks.length,
      doneTasks: this.tasks.filter(t => t.status === 'done').length,
      totalHours: this.sumHours(this.tasks),
      doneHours: this.sumHours(this.tasks.filter(t => t.status === 'done'))
    };
    this.scrumService.endSprint(this.activeSprint.id, summary).subscribe({
      next: (ended) => {
        this.sprintHistory = [...this.sprintHistory, ended];
        this.tasks = this.tasks.filter(t => t.status !== 'done');
        this.activeSprint = null;
      },
      error: (err) => { console.error('Error ending sprint', err); }
    });
  }

  saveSnapshot(): void {
    if (!this.activeSprint?.id) return;
    const snap: SprintSnapshot = {
      date: this.toDateStr(new Date()),
      remainingTasks: this.tasks.filter(t => t.status !== 'done').length,
      doneTasks: this.tasks.filter(t => t.status === 'done').length,
      totalTasks: this.tasks.length,
      remainingHours: this.sumHours(this.tasks.filter(t => t.status !== 'done')),
      doneHours: this.sumHours(this.tasks.filter(t => t.status === 'done')),
      totalHours: this.sumHours(this.tasks)
    };
    this.scrumService.saveSnapshot(this.activeSprint.id, snap).subscribe({
      next: (updated) => { this.activeSprint = updated; },
      error: (err) => { console.error('Error saving snapshot', err); }
    });
  }

  private sumHours(tasks: ScrumTask[]): number {
    return tasks.reduce((sum, t) => {
      const h = parseFloat(t.estimate || '0');
      return sum + (isNaN(h) ? 0 : h);
    }, 0);
  }

  private toDateStr(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  // ========== IMPORT CSV ==========

  importCsvFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.importError = null;
    this.importLoading = true;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || '';
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) { this.importError = 'CSV vacío o sin filas de datos'; this.importLoading = false; return; }
        const sep = lines[0].includes(';') ? ';' : ',';
        const headers = this.parseCsvLine(lines[0], sep).map(h => h.toLowerCase().trim());
        const fi = (kws: string[]) => headers.findIndex(h => kws.some(kw => h.includes(kw)));
        const titleIdx = fi(['title', 'titulo', 'tarea', 'task', 'nombre']);
        const estimateIdx = fi(['estim', 'horas', 'hours', 'h)']);
        const priorityIdx = fi(['prior']);
        const descIdx = fi(['desc']);
        const assigneeIdx = fi(['assign', 'asign', 'responsable']);
        const newTasks: ScrumTask[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = this.parseCsvLine(lines[i], sep);
          const title = (titleIdx >= 0 ? cols[titleIdx] : cols[0] || '').trim();
          if (!title) continue;
          newTasks.push({
            id: this.generateReadableId(),
            title,
            estimate: estimateIdx >= 0 ? (cols[estimateIdx] || '').trim() : '',
            priority: priorityIdx >= 0 ? (parseInt(cols[priorityIdx] || '50') || 50) : 50,
            description: descIdx >= 0 ? (cols[descIdx] || '').trim() : '',
            assignee: assigneeIdx >= 0 ? ((cols[assigneeIdx] || '').trim() || null) : null,
            comments: [], color: this.pickCoolColor(), status: 'todo'
          });
        }
        this.createTasksBatch(newTasks);
      } catch { this.importError = 'Error al procesar el CSV'; this.importLoading = false; }
    };
    reader.readAsText(file, 'utf-8');
    input.value = '';
  }

  private parseCsvLine(line: string, sep: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === sep && !inQuotes) { result.push(current); current = ''; }
      else current += char;
    }
    result.push(current);
    return result;
  }

  // ========== IMPORT PDF ==========

  async importPdfFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.importError = null;
    this.importLoading = true;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        fullText += (content.items as any[]).map((item: any) => item.str).join(' ') + '\n';
      }
      const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 2 && l.length < 300);
      if (!lines.length) { this.importError = 'No se pudo extraer texto del PDF'; this.importLoading = false; return; }
      this.createTasksBatch(lines.map(line => ({
        id: this.generateReadableId(),
        title: line.slice(0, 120),
        estimate: '', priority: 50, description: '',
        assignee: null, comments: [], color: this.pickCoolColor(), status: 'todo' as const
      })));
    } catch { this.importError = 'Error al leer el PDF'; this.importLoading = false; }
    input.value = '';
  }

  // ========== EXPORT CSV ==========

  exportCsv(): void {
    const sep = ';';
    const rows = [
      ['ID', 'Título', 'Estimación (h)', 'Prioridad', 'Asignado a', 'Estado', 'Descripción'],
      ...this.tasks.map(t => [t.id, t.title, t.estimate || '', t.priority ?? '', t.assignee || '', t.status, t.description || ''])
    ].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(sep)).join('\r\n');
    const blob = new Blob(['\ufeff' + rows], { type: 'text/csv;charset=utf-8;' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `scrum_${this.activeSprint?.id || 'board'}_${this.toDateStr(new Date())}.csv`
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  downloadCsvTemplate(): void {
    const sep = ';';
    const rows = [
      ['Título', 'Estimación (h)', 'Prioridad', 'Asignado a', 'Descripción'],
      ['Ejemplo de tarea', '4', '75', 'Developer', 'Descripción de la tarea']
    ].map(row => row.map(c => `"${c}"`).join(sep)).join('\r\n');
    const blob = new Blob(['\ufeff' + rows], { type: 'text/csv;charset=utf-8;' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'scrum_template.csv' });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ========== EXPORT PDF ==========

  async exportPdf(): Promise<void> {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Scrum Board', 14, 18);
    if (this.activeSprint) {
      doc.setFontSize(10);
      doc.text(`Sprint: ${this.activeSprint.id}  ·  Inicio: ${this.activeSprint.startDate}`, 14, 27);
    }
    let startY = 34;
    for (const { key, label } of [
      { key: 'todo' as const, label: 'Por hacer' },
      { key: 'doing' as const, label: 'En progreso' },
      { key: 'done' as const, label: 'Hecho' }
    ]) {
      const filtered = this.tasks.filter(t => t.status === key);
      if (!filtered.length) continue;
      doc.setFontSize(12);
      doc.text(label, 14, startY + 8);
      autoTable(doc, {
        startY: startY + 12,
        head: [['Título', 'Est.(h)', 'Prior.', 'Asignado', 'Descripción']],
        body: filtered.map(t => [t.title, t.estimate || '', t.priority ?? '', t.assignee || '', t.description || '']),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [33, 33, 33] },
        columnStyles: { 4: { cellWidth: 55 } }
      });
      startY = (doc as any).lastAutoTable.finalY + 6;
    }
    doc.save(`scrum_${this.activeSprint?.id || 'board'}_${this.toDateStr(new Date())}.pdf`);
  }

  // ========== CHART DATA ==========

  get burndownChartData(): { actualPoints: string; idealPoints: string; maxY: number; days: number; emptyMsg: boolean; yMid: number } {
    const EMPTY = { actualPoints: '', idealPoints: '50,200 450,200', maxY: 0, days: 0, emptyMsg: true, yMid: 0 };
    const snaps = this.activeSprint?.snapshots;
    if (!this.activeSprint?.startDate || !snaps?.length) return EMPTY;
    const start = new Date(this.activeSprint.startDate + 'T00:00:00');
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const maxDays = Math.max(1, Math.round((now.getTime() - start.getTime()) / 86400000));
    const maxY = snaps.reduce((m, s) => Math.max(m, s.totalTasks), 1);
    const px = (d: number) => (50 + (d / maxDays) * 400).toFixed(1);
    const py = (t: number) => (200 - (t / maxY) * 180).toFixed(1);
    const actualPoints = snaps.map(s => {
      const d = new Date(s.date + 'T00:00:00');
      const dayNum = Math.max(0, Math.round((d.getTime() - start.getTime()) / 86400000));
      return `${px(dayNum)},${py(s.remainingTasks)}`;
    }).join(' ');
    return { actualPoints, idealPoints: `50,${py(maxY)} 450,${py(0)}`, maxY, days: maxDays, emptyMsg: false, yMid: Math.round(maxY / 2) };
  }

  get burnupChartData(): { x: number; y: number; w: number; h: number; cx: number; label: string; doneTasks: number }[] {
    const history = this.sprintHistory.slice(-8);
    if (!history.length) return [];
    const maxDone = history.reduce((m, s) => Math.max(m, s.doneTasks ?? 0), 1);
    const n = history.length;
    const gap = 8;
    const barW = Math.floor((380 - gap * (n - 1)) / n);
    return history.map((s, i) => {
      const done = s.doneTasks ?? 0;
      const barH = Math.max(2, Math.round((done / maxDone) * 165));
      const x = 55 + i * (barW + gap);
      return { x, y: 195 - barH, w: barW, h: barH, cx: x + barW / 2, label: (s.sprintKey || s.id || '').split('-').pop() || '', doneTasks: done };
    });
  }

  // ========== BATCH CREATE ==========

  private createTasksBatch(tasks: ScrumTask[]): void {
    let idx = 0;
    const createNext = () => {
      if (idx >= tasks.length) { this.importLoading = false; this.loadTasksFromBackend(); return; }
      this.scrumService.create(tasks[idx++] as any).subscribe({ next: createNext, error: createNext });
    };
    createNext();
  }
}
