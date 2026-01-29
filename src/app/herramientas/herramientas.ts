import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BuscadorComponent } from '../buscador/buscador';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

type Tool = {
  id: string;
  name: string;
  description?: string;
  functionality?: string;
  tags?: string[];
  installSteps?: string;
  projects?: string[];
}

const STORAGE_KEY = 'tools_v1';

@Component({
  selector: 'app-herramientas',
  standalone: true,
  template: `
    <app-buscador (buscar)="filtrar($event)"></app-buscador>

    <div class="tools-root">
        <div class="tools-header">
          <h2>{{ 'MENU.TOOLS' | translate }}</h2>
          <div>
            <button class="jh-btn" style="padding:6px 10px; font-size:13px" (click)="newTool()">{{ 'HERRAMIENTAS.NEW_TOOL' | translate }}</button>
          </div>
        </div>

      <div class="tools-list">
        <ul class="paths-list">
          <li *ngFor="let t of filteredTools" (click)="selectTool(t)" [class.selected]="selectedTool?.id===t.id">
            <div class="tool-main">
              <div class="tool-title"><strong>{{ t.name }}</strong></div>
              <div class="tool-desc">{{ t.description }}</div>
              <div class="tool-tags">{{ (t.tags||[]).join(', ') }}</div>
            </div>
              <div class="actions">
                <button class="icon-btn view" [title]="('HERRAMIENTAS.VIEW'|translate)" (click)="viewTool(t); $event.stopPropagation()">👁️</button>
                <button class="icon-btn edit" [title]="('HERRAMIENTAS.EDIT'|translate)" (click)="editTool(t); $event.stopPropagation()">✏️</button>
                <button class="icon-btn delete" [title]="('HERRAMIENTAS.DELETE'|translate)" (click)="confirmDeleteTool(t.id, t.name); $event.stopPropagation()">🗑️</button>
              </div>
          </li>
        </ul>
      </div>

      <div class="tool-detail" *ngIf="selectedTool">
        <h3>{{ selectedTool.name }}</h3>
        <div><strong>{{ 'HERRAMIENTAS.LABEL_DESCRIPTION' | translate }}:</strong> {{ selectedTool.description }}</div>
        <div><strong>{{ 'HERRAMIENTAS.LABEL_FUNCTIONALITY' | translate }}:</strong> {{ selectedTool.functionality }}</div>
        <div><strong>{{ 'HERRAMIENTAS.LABEL_INSTALL' | translate }}:</strong>
          <pre class="install-steps">{{ selectedTool.installSteps }}</pre>
        </div>
        <div><strong>{{ 'HERRAMIENTAS.LABEL_PROJECTS' | translate }}:</strong> {{ (selectedTool.projects||[]).join(', ') }}</div>
      </div>

      <!-- Tool modal (namespaced classes to avoid global conflicts) -->
      <div class="jh-modal-backdrop" *ngIf="showToolModal">
        <div class="jh-modal" (click)="$event.stopPropagation()">
          <h3 *ngIf="!editingTool.readonly">{{ editingTool.id ? ('HERRAMIENTAS.EDIT_TOOL'|translate) : ('HERRAMIENTAS.NEW_TOOL'|translate) }}</h3>
          <h3 *ngIf="editingTool.readonly">{{ 'HERRAMIENTAS.VIEW_TOOL' | translate }}</h3>
          <div class="form-row"><label>{{ 'HERRAMIENTAS.NAME' | translate }}</label><input [(ngModel)]="editingTool.name" [readonly]="editingTool.readonly" placeholder="{{ 'HERRAMIENTAS.NAME_PLACEHOLDER' | translate }}"/></div>
          <div class="form-row"><label>{{ 'HERRAMIENTAS.DESCRIPTION' | translate }}</label><textarea rows="3" [(ngModel)]="editingTool.description" [readonly]="editingTool.readonly" placeholder="{{ 'HERRAMIENTAS.DESCRIPTION_PLACEHOLDER' | translate }}"></textarea></div>
          <div class="form-row"><label>{{ 'HERRAMIENTAS.FUNCTIONALITY' | translate }}</label><textarea rows="3" [(ngModel)]="editingTool.functionality" [readonly]="editingTool.readonly" placeholder="{{ 'HERRAMIENTAS.FUNCTIONALITY_PLACEHOLDER' | translate }}"></textarea></div>
          <div class="form-row"><label>{{ 'HERRAMIENTAS.TAGS' | translate }}</label><input [(ngModel)]="editingTool.tagsString" [readonly]="editingTool.readonly" placeholder="{{ 'HERRAMIENTAS.TAGS_PLACEHOLDER' | translate }}"/></div>
          <div class="form-row"><label>{{ 'HERRAMIENTAS.INSTALL' | translate }}</label><textarea rows="4" [(ngModel)]="editingTool.installSteps" [readonly]="editingTool.readonly" placeholder="{{ 'HERRAMIENTAS.INSTALL_PLACEHOLDER' | translate }}"></textarea></div>
          <div class="form-row"><label>{{ 'HERRAMIENTAS.PROJECTS' | translate }}</label><input [(ngModel)]="editingTool.projectsString" [readonly]="editingTool.readonly" placeholder="{{ 'HERRAMIENTAS.PROJECTS_PLACEHOLDER' | translate }}"/></div>
          <div class="jh-modal-actions">
            <button class="jh-btn" *ngIf="!editingTool.readonly" (click)="saveTool()">{{ 'HERRAMIENTAS.SAVE' | translate }}</button>
            <button class="jh-btn" (click)="showToolModal=false">{{ 'HERRAMIENTAS.CLOSE' | translate }}</button>
          </div>
        </div>
      </div>

      <!-- Confirm modal -->
      <div class="jh-modal-backdrop" *ngIf="showConfirm">
        <div class="jh-modal" (click)="$event.stopPropagation()">
          <h3>{{ 'HERRAMIENTAS.CONFIRM_TITLE' | translate }}</h3>
          <div class="modal-body">{{ confirmMessage }}</div>
          <div class="jh-modal-actions">
            <button class="jh-btn" (click)="confirmOk()">{{ 'HERRAMIENTAS.CONFIRM_OK' | translate }}</button>
            <button class="jh-btn" (click)="confirmCancel()">{{ 'HERRAMIENTAS.CONFIRM_CANCEL' | translate }}</button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [
    `
    .tools-root { padding: 12px; }
    .tools-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px }
    .tools-list { display:flex; }
    .paths-list { list-style:none; padding:0; margin:0; width:360px }
    .paths-list li { padding:8px; border-bottom:1px solid rgba(255,255,255,0.04); display:flex; justify-content:space-between; align-items:center; background: transparent; color: #ddd }
    .paths-list li .tool-main { flex:1 }
    .paths-list li .tool-title { font-size:14px; color:#ffd54f }
    .paths-list li .tool-desc { font-size:12px; color:#bfc3c6 }
    .paths-list li .tool-tags { font-size:11px; color:#9aa0a3 }
    .paths-list li.selected { background: linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); border:1px solid rgba(255,255,255,0.03) }
    .actions { display:flex; gap:6px }
    .icon-btn { border:0; background:transparent; cursor:pointer }
    .tool-detail { margin-top:12px; padding:12px; border-top:1px solid rgba(255,255,255,0.04); background: #0b0c0d; color:#e6e6e6 }
    .install-steps { background:#0b0c0d; border:1px solid rgba(255,255,255,0.03); padding:8px; border-radius:4px; white-space:pre-wrap; color:#dcdcdc }

    .jh-modal-backdrop { position:fixed; left:0; right:0; top:0; bottom:0; background:rgba(0,0,0,0.85) !important; display:flex; align-items:center; justify-content:center; z-index:2147483000 !important }
    .jh-modal { background:#0f1113 !important; color:#eee !important; padding:22px !important; border-radius:8px !important; width:720px !important; max-height:80vh !important; overflow:auto !important; box-shadow: 0 18px 60px rgba(0,0,0,0.8) !important; border: 1px solid rgba(255,255,255,0.04) !important }
    .form-row { display:flex; flex-direction:column; gap:6px; margin-bottom:8px }
    .form-row label { color: #cfcfcf; font-size:13px }
    .form-row input, .form-row textarea { background: #141516 !important; color: #eee !important; border: 1px solid #2e3236 !important; padding:8px !important; border-radius:4px !important }
    .form-row input::placeholder, .form-row textarea::placeholder { color: #7c8084 !important }
    .jh-modal-actions { display:flex; gap:8px; justify-content:flex-end }
    .jh-btn { background:#1e88e5 !important; color:#fff !important; border:0 !important; padding:6px 10px !important; border-radius:4px !important; cursor:pointer }
    .jh-btn:focus { outline: 2px solid rgba(30,136,229,0.35) !important }
    .btn.small { padding:4px 8px }
    .csv-btn { background:#4caf50 }
    .toast { position:fixed; right:20px; bottom:20px; background:#222; color:white; padding:10px; border-radius:6px }
    `
  ],
  imports: [CommonModule, FormsModule, BuscadorComponent, TranslateModule, MatIconModule]
})
export class Herramientas {
  title = '';
  tools: Tool[] = [];
  filteredTools: Tool[] = [];
  lastSearch = '';

  // UI state
  selectedTool?: Tool;
  showToolModal = false;
  editingTool: Partial<Tool> & { tagsString?: string; projectsString?: string; readonly?: boolean } = {};

  // confirm
  showConfirm = false;
  confirmMessage = '';
  private confirmAction: (() => void) | null = null;

  constructor(private translate: TranslateService) {
    this.load();
    this.title = this.translate.instant('MENU.TOOLS') || 'Herramientas';
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.tools = JSON.parse(raw) as Tool[];
    } catch (e) { this.tools = []; }
    this.filteredTools = [...this.tools];
    if (!this.selectedTool && this.tools.length) this.selectedTool = this.tools[0];
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tools));
    this.filteredTools = [...this.tools];
  }

  filtrar(valor: string) {
    this.lastSearch = valor || '';
    const v = (valor || '').toLowerCase();
    if (!v) { this.filteredTools = [...this.tools]; return; }
    this.filteredTools = this.tools.filter(t =>
      (t.name||'').toLowerCase().includes(v) ||
      (t.description||'').toLowerCase().includes(v) ||
      ((t.tags||[]).join(' ').toLowerCase().includes(v)) ||
      ((t.projects||[]).join(' ').toLowerCase().includes(v))
    );
  }

  selectTool(t: Tool) { this.selectedTool = t; }

  newTool() {
    this.editingTool = { name: '', description: '', functionality: '', tagsString: '', installSteps: '', projectsString: '' };
    this.showToolModal = true;
  }

  editTool(t: Tool) {
    this.editingTool = { ...t, tagsString: (t.tags||[]).join(','), projectsString: (t.projects||[]).join(',') } as any;
    this.showToolModal = true;
  }

  viewTool(t: Tool) {
    this.editingTool = { ...t } as any;
    this.editingTool.readonly = true;
    this.showToolModal = true;
  }

  saveTool() {
    if ((this.editingTool as any).readonly) return;
    const partial = this.editingTool as Partial<Tool> & { tagsString?: string; projectsString?: string };
    if (!partial.name || !partial.name.trim()) return;
    const tool: Tool = {
      id: partial.id || '',
      name: (partial.name||'').trim(),
      description: partial.description,
      functionality: partial.functionality,
      tags: (partial.tagsString||'').split(',').map(s=>s.trim()).filter(Boolean),
      installSteps: partial.installSteps,
      projects: (partial.projectsString||'').split(',').map(s=>s.trim()).filter(Boolean)
    };
    if (!tool.id) {
      tool.id = Math.random().toString(36).slice(2,9);
      this.tools.push(tool);
    } else {
      const idx = this.tools.findIndex(x => x.id === tool.id);
      if (idx !== -1) this.tools[idx] = tool;
    }
    this.save();
    this.showToolModal = false;
    this.editingTool = {};
  }

  confirmDeleteTool(id: string, name?: string) {
    const msg = this.translate.instant('HERRAMIENTAS.CONFIRM_DELETE_MESSAGE', { name: name || '' }) || `¿Eliminar herramienta "${name || ''}"?`;
    this.promptConfirm(msg, () => this.deleteTool(id));
  }

  deleteTool(id: string) {
    this.tools = this.tools.filter(t => t.id !== id);
    if (this.selectedTool?.id === id) this.selectedTool = this.tools[0];
    this.save();
  }

  promptConfirm(message: string, action: () => void) {
    this.confirmMessage = message;
    this.confirmAction = action;
    this.showConfirm = true;
  }

  confirmOk() {
    if (this.confirmAction) this.confirmAction();
    this.showConfirm = false;
    this.confirmAction = null;
  }

  confirmCancel() { this.showConfirm = false; this.confirmAction = null; }
}
