import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { LiveEstimationService, LiveSession, Participant } from './live-estimation.service';
import { LocalStorageService } from '../local-storage.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EstimacionService } from './estimacion.service';

interface Task {
  id: string;
  title: string;
  estimates: number[]; // hours per week
}

interface EstimationComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

interface SavedEstimationRecord {
  id: string;
  estimationName?: string;
  projectCode?: string;
  projectName?: string;
  requester?: string;
  requesterEmail?: string;
  notes?: string;
  comments?: EstimationComment[];
  weeks?: string[];
  tasks?: Task[];
  createdAt?: string;
  visible?: boolean;
}

@Component({
  selector: 'app-estimacion',
  templateUrl: './estimacion.html',
  styleUrls: ['./estimacion.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatTabsModule,
    MatCardModule,
    MatListModule,
    TranslateModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
})
export class EstimacionComponent implements OnInit, OnDestroy {
  constructor(
    public liveService: LiveEstimationService,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private storage: LocalStorageService,
    private estimacionService: EstimacionService
  ) {}

  weeks: string[] = ['1'];
  tasks: Task[] = [];
  newTaskTitle = '';

  // metadata
  estimationName = '';
  projectCode = '';
  projectName = '';
  requester = '';
  requesterEmail = '';
  notes = '';
  started = true; // enabled by default
  comments: EstimationComment[] = [];
  newCommentText = '';
  showCommentsPanel = false;

  // persistence
  private STORAGE_KEY_DRAFT = 'estimations_form_draft_v1';
  private readonly LEGACY_SAVED_STORAGE_KEYS = [
    'estimations_saved_v1',
    'estimaciones_saved_v1',
    'estimacion_saved_v1',
    'saved_estimaciones'
  ];
  savedEstimations: SavedEstimationRecord[] = [];
  searchQuery = '';
  selectedTab = 0; // 0: realizar, 1: listado
  saveButtonText = '';
  showEditModal = false;
  isEditSaving = false;
  editDraft: any = {};

  // clear controls
  clearMeta = false;
  clearEstimation = false;

  // --- Live estimation state ---
  liveTaskInput = '';
  liveSession: LiveSession | null = null;
  myId = 'u' + Math.random().toString(36).slice(2,8);
  myName = (this.storage.get('username') as string) || ('User-' + this.myId.slice(-4));
  myVote: string | number | null = null;
  liveCards: Array<string | number> = ['0', '½', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?'];
  private liveSub: Subscription | null = null;

  // ===== Draft helpers =====

  private saveFormDraft(): void {
    const draft = {
      estimationName: this.estimationName,
      projectCode: this.projectCode,
      projectName: this.projectName,
      requester: this.requester,
      requesterEmail: this.requesterEmail,
      notes: this.notes,
      comments: this.comments,
      weeks: this.weeks,
      tasks: this.tasks,
      newTaskTitle: this.newTaskTitle
    };
    this.storage.setObject(this.STORAGE_KEY_DRAFT, draft);
  }

  onFormChange(): void {
    this.saveFormDraft();
  }

  private restoreFormDraft(): void {
    const draft = this.storage.getObject<{
      estimationName: string;
      projectCode: string;
      projectName: string;
      requester: string;
      requesterEmail: string;
      notes: string;
      comments: EstimationComment[];
      weeks: string[];
      tasks: Task[];
      newTaskTitle: string;
    }>(this.STORAGE_KEY_DRAFT);

    if (draft) {
      this.estimationName = draft.estimationName || '';
      this.projectCode = draft.projectCode || '';
      this.projectName = draft.projectName || '';
      this.requester = draft.requester || '';
      this.requesterEmail = draft.requesterEmail || '';
      this.notes = draft.notes || '';
      this.comments = Array.isArray(draft.comments) ? [...draft.comments] : [];
      this.weeks = draft.weeks && draft.weeks.length ? [...draft.weeks] : ['1'];
      this.tasks = draft.tasks ? JSON.parse(JSON.stringify(draft.tasks)) : [];
      this.newTaskTitle = draft.newTaskTitle || '';
      this.started = true;
    }
  }

  private clearFormDraft(): void {
    this.storage.remove(this.STORAGE_KEY_DRAFT);
  }

  // ===== Weeks & tasks =====

  addWeek() {
    const next = this.weeks.length + 1;
    this.weeks.push(String(next));
    this.tasks.forEach(t => t.estimates.push(0));
    this.saveFormDraft();
  }

  removeWeek(index: number) {
    if (this.weeks.length <= 1) return;
    this.weeks.splice(index, 1);
    this.tasks.forEach(t => t.estimates.splice(index, 1));
    this.saveFormDraft();
  }

  addTask() {
    if (!this.started) return;
    if (!this.newTaskTitle || !this.newTaskTitle.trim()) return;
    const t: Task = {
      id: Date.now().toString(36),
      title: this.newTaskTitle.trim(),
      estimates: this.weeks.map(() => 0),
    };
    this.tasks.push(t);
    this.newTaskTitle = '';
    this.saveFormDraft();
  }

  // Start estimation from metadata
  startFromMetadata() {
    this.started = true;
    if (!this.weeks || this.weeks.length === 0) this.weeks = ['1'];
    this.saveFormDraft();
  }

  // ===== Live estimation helpers =====

  startLiveEstimation() {
    if (!this.liveTaskInput || !this.liveTaskInput.trim()) return;
    const s = this.liveService.createSession(this.liveTaskInput.trim(), this.myId, this.myName);
    this.liveTaskInput = '';
    this.selectedTab = 0;
  }

  joinCurrentSession() {
    const s = (this.liveService as any)['_session$']?.getValue?.();
    if (!s) return;
    this.liveService.joinSession(s as LiveSession, { id: this.myId, name: this.myName });
  }

  castVote(card: string | number) {
    const s = this.liveSession;
    if (!s) return;
    this.myVote = card;
    this.liveService.vote(s, this.myId, card as any);
    setTimeout(() => this.tryAutoReveal(), 200);
  }

  tryAutoReveal() {
    const s = this.liveSession;
    if (!s) return;
    const total = s.participants.length;
    const voted = s.participants.filter(p => p.vote !== null && p.vote !== undefined).length;
    if (voted >= total && total > 0 && !s.revealed) {
      this.liveService.reveal(s);
    }
  }

  revealNow() {
    if (!this.liveSession) return;
    this.liveService.reveal(this.liveSession);
  }

  computeResultFromSession(session: LiveSession) {
    const vals: number[] = [];
    session.participants.forEach(p => {
      const v = this.parseCardValue(p.vote);
      if (v !== null && !isNaN(v)) vals.push(v);
    });
    if (vals.length === 0) return 0;
    const sum = vals.reduce((a,b) => a + b, 0);
    return sum / vals.length;
  }

  acceptSessionResult() {
    const s = this.liveSession;
    if (!s) return;
    const result = this.computeResultFromSession(s);
    this.liveService.accept(s, result);
    const t = {
      id: Date.now().toString(36),
      title: s.task + ' (live)',
      estimates: this.weeks.map((_, i) => i === 0 ? Number(result) : 0)
    } as Task;
    this.tasks.push(t);
    this.saveFormDraft();
  }

  parseCardValue(v: any): number | null {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return v;
    const s = String(v).replace('½', '0.5').replace(',', '.').trim();
    if (s === '?' || s.toLowerCase() === 'coffee') return null;
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  // ===== Persistence of saved estimations =====

  private isPersistedBackendRecord(record: any): record is SavedEstimationRecord {
    const id = (record?.id || '').toString().trim();
    return !!id && record?.visible !== false;
  }

  private clearLegacySavedEstimationsStorage(): void {
    this.LEGACY_SAVED_STORAGE_KEYS.forEach((key) => this.storage.remove(key));
  }

  loadSavedEstimations() {
    this.estimacionService.getAll().subscribe({
      next: (data) => {
        const backendRecords = Array.isArray(data) ? data : [];
        this.savedEstimations = backendRecords.filter((record) => this.isPersistedBackendRecord(record));
      },
      error: (err) => {
        console.error('Error loading estimaciones from backend:', err);
        this.savedEstimations = [];
      }
    });
  }

  saveCurrentEstimation() {
    const obj = {
      estimationName: this.estimationName,
      projectCode: this.projectCode,
      projectName: this.projectName,
      requester: this.requester,
      requesterEmail: this.requesterEmail,
      notes: this.notes,
      comments: JSON.parse(JSON.stringify(this.comments)),
      weeks: [...this.weeks],
      tasks: JSON.parse(JSON.stringify(this.tasks)),
      createdAt: new Date().toISOString()
    };

    this.estimacionService.create(obj).subscribe({
      next: () => {
        this.loadSavedEstimations();
        const savedMsg = this.translate.instant('ESTIMATION.SAVED') || 'Estimación guardada';
        this.snackBar.open(savedMsg, undefined, { duration: 2500 });

        const prev = this.saveButtonText;
        this.saveButtonText = savedMsg;
        setTimeout(() => { this.saveButtonText = prev; }, 2000);

        this.selectedTab = 1;
      },
      error: (err) => {
        console.error('Error saving estimacion in backend:', err);
        const msg = this.translate.instant('ESTIMATION.ERROR_SAVE') || 'No se ha podido guardar la estimación';
        this.snackBar.open(msg, undefined, { duration: 3000 });
      }
    });
  }

  ngOnInit(): void {
    this.clearLegacySavedEstimationsStorage();
    this.loadSavedEstimations();
    this.restoreFormDraft();
    this.liveSub = this.liveService.session$.subscribe(s => { this.liveSession = s; });
    this.saveButtonText = this.translate.instant('ESTIMATION.SAVE') || 'Guardar estimación';
  }

  clearSelected() {
    const cleared: string[] = [];
    if (this.clearMeta) {
      this.estimationName = '';
      this.projectCode = '';
      this.projectName = '';
      this.requester = '';
      this.requesterEmail = '';
      this.notes = '';
      cleared.push(this.translate.instant('ESTIMATION.CLEAR_META') || 'metadata');
    }
    if (this.clearEstimation) {
      this.tasks = [];
      this.weeks = ['1'];
      this.newTaskTitle = '';
      cleared.push(this.translate.instant('ESTIMATION.CLEAR_ESTIMATION') || 'estimation');
    }
    if (cleared.length === 0) {
      const msg = this.translate.instant('ESTIMATION.CLEAR_NONE') || 'No hay nada seleccionado para limpiar.';
      this.snackBar.open(msg, undefined, { duration: 2000 });
      return;
    }
    this.clearMeta = false;
    this.clearEstimation = false;
    this.saveFormDraft();
    const cfg = { duration: 2200 };
    const msg = this.translate.instant('ESTIMATION.CLEARED') || 'Limpieza realizada';
    this.snackBar.open(msg, undefined, cfg);
  }

  ngOnDestroy(): void {
    if (this.liveSub) this.liveSub.unsubscribe();
  }

  get filteredSavedEstimations() {
    const q = (this.searchQuery || '').toString().toLowerCase().trim();
    if (!q) return this.savedEstimations;
    return this.savedEstimations.filter(s => {
      return (s.estimationName || '').toString().toLowerCase().includes(q)
        || (s.projectCode || '').toString().toLowerCase().includes(q)
        || (s.projectName || '').toString().toLowerCase().includes(q)
        || (s.requester || '').toString().toLowerCase().includes(q)
        || (s.requesterEmail || '').toString().toLowerCase().includes(q)
        || (s.notes || '').toString().toLowerCase().includes(q);
    });
  }

  deleteSavedEstimation(id: string) {
    this.estimacionService.delete(id).subscribe({
      next: () => {
        this.savedEstimations = this.savedEstimations.filter(s => s.id !== id);
      },
      error: (err) => {
        console.error('Error deleting estimacion from backend:', err);
      }
    });
  }

  openEditSavedEstimation(estimation: any) {
    this.editDraft = this.normalizeSavedEstimationForUpdate(estimation);
    this.showEditModal = true;
    this.isEditSaving = false;
  }

  closeEditSavedEstimation() {
    this.showEditModal = false;
    this.isEditSaving = false;
    this.editDraft = {};
  }

  saveEditedEstimation() {
    const payload = this.normalizeSavedEstimationForUpdate(this.editDraft);
    if (!payload?.id) return;

    this.isEditSaving = true;
    this.estimacionService.update(payload.id, payload).subscribe({
      next: () => {
        this.isEditSaving = false;
        this.closeEditSavedEstimation();
        this.loadSavedEstimations();
        this.snackBar.open('Estimación actualizada', undefined, { duration: 2200 });
      },
      error: (err) => {
        this.isEditSaving = false;
        console.error('Error updating estimacion in backend:', err);
        this.snackBar.open('No se ha podido actualizar la estimación', undefined, { duration: 3000 });
      }
    });
  }

  private normalizeSavedEstimationForUpdate(source: any): any {
    const clone = JSON.parse(JSON.stringify(source || {}));
    clone.comments = Array.isArray(clone.comments) ? clone.comments : [];
    clone.weeks = Array.isArray(clone.weeks) ? clone.weeks : [];
    clone.tasks = Array.isArray(clone.tasks) ? clone.tasks : [];
    clone.visible = clone.visible === undefined || clone.visible === null ? true : !!clone.visible;
    clone.createdAt = clone.createdAt || new Date().toISOString();
    return clone;
  }

  loadSavedIntoCurrent(id: string) {
    const s = this.savedEstimations.find(x => x.id === id);
    if (!s) return;
    this.estimationName = s.estimationName || '';
    this.projectCode = s.projectCode || '';
    this.projectName = s.projectName || '';
    this.requester = s.requester || '';
    this.requesterEmail = s.requesterEmail || '';
    this.notes = s.notes || '';
    this.comments = Array.isArray(s.comments) ? JSON.parse(JSON.stringify(s.comments)) : [];
    this.weeks = s.weeks ? [...s.weeks] : ['1'];
    this.tasks = s.tasks ? JSON.parse(JSON.stringify(s.tasks)) : [];
    this.started = true;
    this.selectedTab = 0;
    this.saveFormDraft();
  }

  removeTask(id: string) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.saveFormDraft();
  }

  setEstimate(task: Task, weekIndex: number, value: string) {
    const v = parseFloat(value.replace(',', '.')) || 0;
    task.estimates[weekIndex] = v;
    this.saveFormDraft();
  }

  totalForTask(task: Task) {
    return task.estimates.reduce((a, b) => a + b, 0);
  }

  totalForWeek(weekIndex: number) {
    return this.tasks.reduce((sum, t) => sum + (t.estimates[weekIndex] || 0), 0);
  }

  grandTotal() {
    return this.tasks.reduce((s, t) => s + this.totalForTask(t), 0);
  }

  addComment() {
    const text = (this.newCommentText || '').trim();
    if (!text) return;

    const comment: EstimationComment = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      author: this.myName || 'User',
      text,
      createdAt: new Date().toISOString()
    };

    this.comments = [comment, ...this.comments];
    this.newCommentText = '';
    this.saveFormDraft();
  }

  toggleCommentsPanel() {
    this.showCommentsPanel = !this.showCommentsPanel;
  }

  deleteComment(commentId: string) {
    this.comments = this.comments.filter(c => c.id !== commentId);
    this.saveFormDraft();
  }

  formatCommentDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  }

  exportCsv() {
    const rows: string[] = [];
    rows.push(`"${this.escapeCsv('Estimation Name')}","${this.escapeCsv(this.estimationName)}"`);
    rows.push(`"${this.escapeCsv('Project Code')}","${this.escapeCsv(this.projectCode)}"`);
    rows.push(`"${this.escapeCsv('Project Name')}","${this.escapeCsv(this.projectName)}"`);
    rows.push(`"${this.escapeCsv('Requester')}","${this.escapeCsv(this.requester)}"`);
    rows.push(`"${this.escapeCsv('Requester Email')}","${this.escapeCsv(this.requesterEmail)}"`);
    rows.push(`"${this.escapeCsv('Notes')}","${this.escapeCsv(this.notes)}"`);
    rows.push('');

    const header = ['Tarea', ...this.weeks.map(w => `Semana ${w}`), 'Total'];
    rows.push(header.map(h => `"${this.escapeCsv(h)}"`).join(','));

    this.tasks.forEach(t => {
      const r = [this.escapeCsv(t.title), ...t.estimates.map(e => String(e)), String(this.totalForTask(t))];
      rows.push(r.map(c => `"${this.escapeCsv(c)}"`).join(','));
    });

    const totals = ['Total', ...this.weeks.map((_, i) => String(this.totalForWeek(i))), String(this.grandTotal())];
    rows.push(totals.map(c => `"${this.escapeCsv(c)}"`).join(','));

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = (this.estimationName && this.estimationName.trim())
      ? this.estimationName.replace(/[^a-z0-9\-_.]/gi, '_') + '.csv'
      : 'estimation.csv';
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  escapeCsv(v: string) {
    return (v ?? '').toString().replace(/"/g, '""');
  }

  exportPdf() {
    this.createPdfBlob().then(blob => {
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) {
        const html = this.buildPrintableHtml();
        const newWin = window.open('', '_blank', 'width=900,height=700');
        if (!newWin) { this.snackBar.open('No se ha podido abrir la ventana de impresión.', '✕', { duration: 3500 }); return; }
        newWin.document.open();
        newWin.document.write(html);
        newWin.document.close();
        setTimeout(() => { newWin.print(); }, 300);
      }
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }).catch(_ => {
      const html = this.buildPrintableHtml();
      const newWin = window.open('', '_blank', 'width=900,height=700');
      if (!newWin) { this.snackBar.open('No se ha podido abrir la ventana de impresión.', '✕', { duration: 3500 }); return; }
      newWin.document.open();
      newWin.document.write(html);
      newWin.document.close();
      setTimeout(() => { newWin.print(); }, 300);
    });
  }

  buildPrintableHtml() {
    const style = `
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff}
        table{border-collapse:collapse;width:100%;}
        th,td{border:1px solid #999;padding:6px;text-align:left}
        th{background:#163f6b;color:#fff}
      </style>
    `;
    let html = '<html><head><title>Estimation</title>' + style + '</head><body>';
    html += `<h2>${this.escapeHtml(this.estimationName || 'Estimation')}</h2>`;
    html += `<p><strong>Project:</strong> ${this.escapeHtml(this.projectCode)} - ${this.escapeHtml(this.projectName)}<br/>`;
    html += `<strong>Requester:</strong> ${this.escapeHtml(this.requester)} (${this.escapeHtml(this.requesterEmail)})</p>`;
    if (this.notes) html += `<p><strong>Notes:</strong><br/>${this.escapeHtml(this.notes).replace(/\n/g,'<br/>')}</p>`;
    html += '<table><thead><tr>';
    html += `<th>Task</th>`;
    this.weeks.forEach(w => html += `<th>Week ${w}</th>`);
    html += `<th>Total</th></tr></thead><tbody>`;
    this.tasks.forEach(t => {
      html += `<tr><td>${this.escapeHtml(t.title)}</td>`;
      t.estimates.forEach(e => html += `<td>${e}</td>`);
      html += `<td>${this.totalForTask(t)}</td></tr>`;
    });
    html += `</tbody><tfoot><tr><td><strong>Total</strong></td>`;
    this.weeks.forEach((_, i) => html += `<td><strong>${this.totalForWeek(i)}</strong></td>`);
    html += `<td><strong>${this.grandTotal()}</strong></td></tr></tfoot></table>`;
    html += '</body></html>';
    return html;
  }

  private async loadImageDataUrl(url: string): Promise<string> {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Network response was not ok');
      const blob = await resp.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('Could not load image for PDF header:', e);
      return '';
    }
  }

  async createPdfBlob(): Promise<Blob> {
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    let y = 40;
    const lineHeight = 14;

    // load image from assets (falls back silently if not available)
    const imagePath = '/assets/images/7dRimV7.png';
    const imageDataUrl = await this.loadImageDataUrl(imagePath);

    doc.setFontSize(16);
    doc.text(this.estimationName || 'Estimation', margin, y);
    y += 24;

    doc.setFontSize(11);
    doc.text(`Project: ${this.projectCode} - ${this.projectName}`, margin, y);
    y += lineHeight;
    doc.text(`Requester: ${this.requester} (${this.requesterEmail})`, margin, y);
    y += lineHeight + 6;

    if (this.notes) {
      doc.text('Notes:', margin, y);
      y += lineHeight;
      const split = doc.splitTextToSize(this.notes, 520);
      doc.text(split, margin, y);
      y += split.length * lineHeight + 6;
    }

    const colWidths = [220, ...this.weeks.map(() => 60), 60];
    let x = margin;
    doc.setFillColor(22, 63, 107);
    doc.setTextColor(255, 255, 255);
    doc.rect(x, y, colWidths.reduce((a,b)=>a+b,0), 18, 'F');
    doc.setFontSize(11);
    let cx = x + 6;
    doc.text('Task', cx, y + 13);
    cx += colWidths[0];
    this.weeks.forEach((w, i) => { doc.text(`W${w}`, cx + 6, y + 13); cx += colWidths[i+1]; });
    doc.text('Total', cx + 6, y + 13);
    y += 22;
    doc.setTextColor(0,0,0);

    this.tasks.forEach(t => {
      if (y > 760) { doc.addPage(); y = 40; }
      let cx2 = x + 6;
      doc.text(t.title, cx2, y + 12);
      cx2 += colWidths[0];
      t.estimates.forEach((e, idx) => { doc.text(String(e), cx2 + 4, y + 12); cx2 += colWidths[idx+1]; });
      doc.text(String(this.totalForTask(t)), cx2 + 4, y + 12);
      y += 18;
    });

    y += 8;
    if (y > 760) { doc.addPage(); y = 40; }
    doc.setFontSize(11);
    doc.text('Total', x + 6, y + 12);
    let cx3 = x + colWidths[0];
    this.weeks.forEach((_, i) => { doc.text(String(this.totalForWeek(i)), cx3 + 6, y + 12); cx3 += colWidths[i+1]; });
    doc.text(String(this.grandTotal()), cx3 + 6, y + 12);

    // Add branding image and footer on every page
    const pageCount = doc.getNumberOfPages();
    const footerText = `Estimación realizada por el equipo de Janus a fecha: ${new Date().toLocaleDateString('es-ES')}`;
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      if (imageDataUrl) {
        const imgW = 60;
        const imgH = 60;
        try {
          // place top-right
          doc.addImage(imageDataUrl, 'PNG', pw - margin - imgW, 20, imgW, imgH);
        } catch (e) {
          // ignore image errors
          console.warn('addImage failed', e);
        }
      }
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(footerText, margin, ph - 30);
    }

    const pdfBlob = doc.output('blob');
    return pdfBlob;
  }

  async exportPdfAndMail() {
    try {
      const pdfBlob = await this.createPdfBlob();
      const fileName = (this.estimationName && this.estimationName.trim())
        ? this.estimationName.replace(/[^a-z0-9\-_.]/gi, '_') + '.pdf'
        : 'estimation.pdf';
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      // @ts-ignore
      if (navigator && (navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
        try {
          // @ts-ignore
          await (navigator as any).share({ files: [file], title: this.estimationName || 'Estimation', text: '' });
          return;
        } catch (err) {
          // continue to fallback
        }
      }

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      const subject = encodeURIComponent((this.estimationName || 'Estimation') + ' - Estimation');
      const bodyLines = [];
      bodyLines.push('Hi ' + (this.requester || 'Requester') + ',');
      bodyLines.push('');
      bodyLines.push('I have attached the estimation. If your mail client does not auto-attach the file, please attach the downloaded PDF: ' + fileName);
      bodyLines.push('');
      bodyLines.push('Regards,');
      const body = encodeURIComponent(bodyLines.join('\n'));
      const mailto = `mailto:${encodeURIComponent(this.requesterEmail || '')}?subject=${subject}&body=${body}`;
      window.location.href = mailto;
    } catch (e) {
      const html = this.buildPrintableHtml();
      const newWin = window.open('', '_blank', 'width=900,height=700');
      if (!newWin) { this.snackBar.open('No se ha podido abrir la ventana de impresión.', '✕', { duration: 3500 }); return; }
      newWin.document.open();
      newWin.document.write(html);
      newWin.document.close();
      setTimeout(() => { newWin.print(); }, 300);
    }
  }

  async onPdfSelected(event: Event) {
    const inp = event.target as HTMLInputElement;
    if (!inp || !inp.files || inp.files.length === 0) return;
    const file = inp.files[0];
    try {
      await this.parsePdf(file);
      inp.value = '';
    } catch (e) {
      console.error('PDF import error', e);
      this.snackBar.open('Error importando PDF: ' + (e && (e as any).message ? (e as any).message : e), '✕', { duration: 3500 });
    }
  }

  private async parsePdf(file: File) {
    const data = await file.arrayBuffer();

    let workerBlobUrl: string | null = null;
    try {
      const resp = await fetch('/assets/pdf.worker.min.js');
      if (resp.ok) {
        const b = await resp.blob();
        workerBlobUrl = URL.createObjectURL(b);
      }
    } catch (e) {
      console.warn('Could not fetch local pdf.worker.min.js', e);
    }

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf');
    try { (pdfjs as any).GlobalWorkerOptions = (pdfjs as any).GlobalWorkerOptions || {}; } catch (e) {}
    if (workerBlobUrl) {
      // @ts-ignore
      (pdfjs as any).GlobalWorkerOptions.workerSrc = workerBlobUrl;
    }

    const loading = (pdfjs as any).getDocument({ data, disableWorker: true } as any);
    const doc = await loading.promise;

    let fullText = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const items: Array<{ str: string; x: number; y: number }> = (content.items || []).map((it: any) => {
        const tr = it.transform || [];
        const x = (tr[4] !== undefined && !isNaN(tr[4])) ? tr[4] : (it.x || 0);
        const y = (tr[5] !== undefined && !isNaN(tr[5])) ? tr[5] : (it.y || 0);
        return { str: it.str || '', x: Number(x), y: Number(y) };
      });

      items.sort((a, b) => (b.y - a.y) || (a.x - b.x));
      const linesMap = new Map<number, string[]>();
      for (const it of items) {
        const key = Math.round(it.y * 10);
        const arr = linesMap.get(key) || [];
        arr.push(it.str);
        linesMap.set(key, arr);
      }

      const pageLines: string[] = [];
      Array.from(linesMap.keys()).sort((a, b) => b - a).forEach(k => {
        const parts = linesMap.get(k) || [];
        pageLines.push(parts.join(' ').replace(/\s+/g, ' ').trim());
      });

      fullText += '\n' + pageLines.join('\n');
    }

    const projectMatch = fullText.match(/Project:\s*([^\n]+)/i);
    if (projectMatch) {
      const pv = projectMatch[1].trim();
      const parts = pv.split(/\s*-\s*/);
      if (parts.length >= 2) {
        this.projectCode = parts[0].trim();
        this.projectName = parts.slice(1).join(' - ').trim();
      } else {
        this.projectName = pv;
      }
    }
    const requesterMatch = fullText.match(/Requester:\s*([^\n(]+)\s*\(?([^\)\n]+)?\)?/i);
    if (requesterMatch) {
      this.requester = (requesterMatch[1] || '').trim();
      const maybeEmail = (requesterMatch[2] || '').trim();
      if (maybeEmail && maybeEmail.indexOf('@') !== -1) this.requesterEmail = maybeEmail;
    }

    const lines = fullText.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (/Task/i.test(l) && /W\d+/i.test(l) && /Total/i.test(l)) { headerIndex = i; break; }
    }
    if (headerIndex === -1) headerIndex = lines.findIndex(l => /Task/i.test(l) || (/W1/i.test(l) && /Total/i.test(l)));

    let weeksCount = 1;
    if (headerIndex >= 0) {
      const headerParts = lines[headerIndex].split(/\s{2,}|\t/).map(p => p.trim()).filter(p => p);
      const wparts = headerParts.filter(p => /W\d+/i.test(p));
      weeksCount = Math.max(1, wparts.length);
    }

    const parsedTasks: Task[] = [];
    for (let i = Math.max(0, headerIndex + 1); i < lines.length; i++) {
      const line = lines[i];
      if (/^Total\b/i.test(line)) break;
      const nums = line.match(/(\d+[\.,]?\d*)/g) || [];
      if (nums.length === 0) continue;
      const estimates = nums.map(n => parseFloat(n.replace(',', '.')) || 0);
      const title = line.replace(/(\s*\d+[\.,]?\d*)+\s*$/,'').trim();
      const estAligned = new Array(weeksCount).fill(0).map((_, idx) => estimates[idx] !== undefined ? estimates[idx] : 0);
      parsedTasks.push({
        id: Date.now().toString(36) + '_' + parsedTasks.length,
        title: title || 'Task',
        estimates: estAligned
      });
    }

    if (parsedTasks.length > 0) {
      this.tasks = parsedTasks;
      this.weeks = new Array(weeksCount).fill(0).map((_, i) => String(i+1));
      this.started = true;
      this.estimationName = this.estimationName || file.name.replace(/\.pdf$/i,'');
      this.saveFormDraft();
    } else {
      throw new Error('No se han encontrado filas de tareas en el PDF.');
    }
  }

  escapeHtml(s: string) {
    return (s ?? '').toString()
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }
}
