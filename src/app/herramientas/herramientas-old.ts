import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BuscadorComponent } from '../buscador/buscador';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LocalStorageService } from '../local-storage.service';
import { ProjectService, Project } from '../project.service';
import { FormsModule } from '@angular/forms';

type Tool = {
  id: string;
  name: string;
  description?: string;
  functionality?: string;
  tags?: string[];
  installSteps?: string;
  projects?: string[];
};

const STORAGE_KEY = 'tools_v1';
const STORAGE_DRAFT_KEY = 'tools_draft_v1';

@Component({
  selector: 'app-herramientas',
  standalone: true,
  template: `
    <app-buscador (buscar)="filtrar($event)"></app-buscador>

    <div class="tools-root">
      <div class="tools-header">
        <h2>{{ 'MENU.TOOLS' | translate }}</h2>
        <button class="jenkins-add-btn" (click)="newTool()">
          <mat-icon inline="true">add</mat-icon>
          <span>{{ 'HERRAMIENTAS.NEW_TOOL' | translate }}</span>
        </button>
      </div>

      <div class="tools-container">
        <div class="tools-grid-container">
          <div class="tools-grid">
            <div class="tool-card"
                 *ngFor="let t of filteredTools"
                 (click)="selectTool(t)"
                 [class.selected]="selectedTool?.id===t.id">
              <div class="tool-card-header">
                <h3>{{ t.name }}</h3>
                <div class="card-actions">
                  <button class="card-icon-btn view"
                          [title]="('HERRAMIENTAS.VIEW'|translate)"
                          (click)="viewTool(t); $event.stopPropagation()">👁️</button>
                  <button class="card-icon-btn edit"
                          [title]="('HERRAMIENTAS.EDIT'|translate)"
                          (click)="editTool(t); $event.stopPropagation()">✏️</button>
                  <button class="card-icon-btn delete"
                          [title]="('HERRAMIENTAS.DELETE'|translate)"
                          (click)="confirmDeleteTool(t.id, t.name); $event.stopPropagation()">🗑️</button>
                </div>
              </div>
              <div class="tool-card-body">
                <p class="tool-desc">{{ t.description }}</p>
                <div class="tool-tags" *ngIf="t.tags && t.tags.length > 0">
                  <span *ngFor="let tag of t.tags" class="tag">{{ tag }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="empty-state" *ngIf="filteredTools.length === 0">
            <p>{{ lastSearch ? 'No se encontraron herramientas' : 'Sin herramientas aún' }}</p>
          </div>
        </div>

        <div class="tool-detail-container" *ngIf="selectedTool">
          <div class="tool-detail">
            <h2>{{ selectedTool.name }}</h2>
            <div class="detail-section">
              <strong>{{ 'HERRAMIENTAS.LABEL_DESCRIPTION' | translate }}</strong>
              <p>{{ selectedTool.description }}</p>
            </div>
            <div class="detail-section">
              <strong>{{ 'HERRAMIENTAS.LABEL_FUNCTIONALITY' | translate }}</strong>
              <p>{{ selectedTool.functionality }}</p>
            </div>
            <div class="detail-section" *ngIf="selectedTool.installSteps">
              <strong>{{ 'HERRAMIENTAS.LABEL_INSTALL' | translate }}</strong>
              <pre class="install-steps">{{ selectedTool.installSteps }}</pre>
            </div>
            <div class="detail-section" *ngIf="selectedTool.projects && selectedTool.projects.length > 0">
              <strong>{{ 'HERRAMIENTAS.LABEL_PROJECTS' | translate }}</strong>
              <p>{{ getProjectDisplayNames(selectedTool.projects).join(', ') }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tool modal -->
      <div class="modal-overlay" *ngIf="showToolModal">
        <div class="auth-card" (click)="$event.stopPropagation()">
          <h2 class="form-title" *ngIf="!editingTool.readonly">
            {{ editingTool.id ? ('HERRAMIENTAS.EDIT_TOOL'|translate) : ('HERRAMIENTAS.NEW_TOOL'|translate) }}
          </h2>
          <h2 class="form-title" *ngIf="editingTool.readonly">
            {{ 'HERRAMIENTAS.VIEW_TOOL' | translate }}
          </h2>
          <hr class="divider">

          <div class="form-content">
            <div class="input-field">
              <label>{{ 'HERRAMIENTAS.NAME' | translate }}</label>
              <input [(ngModel)]="editingTool.name"
                     [readonly]="editingTool.readonly"
                     (ngModelChange)="saveDraft()"
                     placeholder="{{ 'HERRAMIENTAS.NAME_PLACEHOLDER' | translate }}"/>
            </div>

            <div class="input-field">
              <label>{{ 'HERRAMIENTAS.DESCRIPTION' | translate }}</label>
              <textarea rows="3"
                        [(ngModel)]="editingTool.description"
                        [readonly]="editingTool.readonly"
                        (ngModelChange)="saveDraft()"
                        placeholder="{{ 'HERRAMIENTAS.DESCRIPTION_PLACEHOLDER' | translate }}"></textarea>
            </div>

            <div class="input-field">
              <label>{{ 'HERRAMIENTAS.FUNCTIONALITY' | translate }}</label>
              <textarea rows="3"
                        [(ngModel)]="editingTool.functionality"
                        [readonly]="editingTool.readonly"
                        (ngModelChange)="saveDraft()"
                        placeholder="{{ 'HERRAMIENTAS.FUNCTIONALITY_PLACEHOLDER' | translate }}"></textarea>
            </div>

            <div class="input-field">
              <label>{{ 'HERRAMIENTAS.TAGS' | translate }}</label>
              <input [(ngModel)]="editingTool.tagsString"
                     [readonly]="editingTool.readonly"
                     (ngModelChange)="saveDraft()"
                     placeholder="{{ 'HERRAMIENTAS.TAGS_PLACEHOLDER' | translate }}"/>
            </div>

            <div class="input-field">
              <label>{{ 'HERRAMIENTAS.INSTALL' | translate }}</label>
              <textarea rows="4"
                        [(ngModel)]="editingTool.installSteps"
                        [readonly]="editingTool.readonly"
                        (ngModelChange)="saveDraft()"
                        placeholder="{{ 'HERRAMIENTAS.INSTALL_PLACEHOLDER' | translate }}"></textarea>
            </div>

            <div class="input-field">
              <label>{{ 'HERRAMIENTAS.PROJECTS' | translate }}</label>
              <button class="projects-selector-btn"
                      *ngIf="!editingTool.readonly"
                      (click)="openProjectsModal()"
                      type="button">
                {{ getSelectedProjectsDisplay() }}
              </button>
              <div class="projects-selected-display" *ngIf="editingTool.readonly">
                {{ getProjectsListForDisplay() }}
              </div>
            </div>

            <hr class="divider">

            <div class="action-buttons">
              <button class="btn-emoji cancel"
                      (click)="closeModal()"
                      title="{{ 'HERRAMIENTAS.CLOSE' | translate }}">
                ✗
              </button>
              <button class="btn-emoji confirm"
                      *ngIf="!editingTool.readonly"
                      (click)="saveTool()"
                      title="{{ 'HERRAMIENTAS.SAVE' | translate }}">
                ✓
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Confirm delete modal -->
      <div class="modal-overlay" *ngIf="showConfirm">
        <div class="auth-card" (click)="$event.stopPropagation()">
          <h2 class="form-title">{{ 'HERRAMIENTAS.CONFIRM_TITLE' | translate }}</h2>
          <hr class="divider">
          <div class="form-content">
            <p class="modal-body">{{ confirmMessage }}</p>
            <hr class="divider">
            <div class="action-buttons">
              <button class="btn-emoji cancel"
                      (click)="confirmCancel()"
                      title="{{ 'HERRAMIENTAS.CONFIRM_CANCEL' | translate }}">
                ✗
              </button>
              <button class="btn-emoji confirm"
                      (click)="confirmOk()"
                      title="{{ 'HERRAMIENTAS.CONFIRM_OK' | translate }}">
                ✓
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Projects Selection Modal -->
      <div class="modal-overlay" *ngIf="showProjectsModal">
        <div class="auth-card projects-modal" (click)="$event.stopPropagation()">
          <h2 class="form-title">{{ 'HERRAMIENTAS.SELECT_PROJECTS' | translate }}</h2>
          <hr class="divider">
          
          <!-- Search bar usando el componente BuscadorComponent -->
          <div class="projects-search-container">
            <app-buscador #projectsSearchComponent (buscar)="buscarProyectos($event)"></app-buscador>
          </div>
          
          <div class="form-content projects-list-content">
            <div class="projects-mosaic-grid">
              <div class="project-card-selector"
                   *ngFor="let proj of filteredProjectsForModal"
                   [class.selected]="isProjectSelected(proj.codigoProyecto || '')"
                   (click)="toggleProjectSelection(proj)">
                <div class="project-card-checkbox">
                  <input type="checkbox" 
                         [checked]="isProjectSelected(proj.codigoProyecto || '')"
                         (change)="toggleProjectSelection(proj)"
                         (click)="$event.stopPropagation()"
                         class="hidden-checkbox">
                  <span class="checkbox-symbol">{{ isProjectSelected(proj.codigoProyecto || '') ? '✓' : '' }}</span>
                </div>
                <div class="project-card-content">
                  <div class="project-name">{{ proj.nombre || 'Sin nombre' }}</div>
                  <div class="project-code">{{ proj.codigoProyecto || '-' }}</div>
                  <div class="project-dept">{{ proj.departamento || '-' }}</div>
                </div>
              </div>
            </div>
            
            <div class="empty-projects" *ngIf="filteredProjectsForModal.length === 0">
              <p>{{ 'HERRAMIENTAS.NO_PROJECTS' | translate }}</p>
            </div>
          </div>
          
          <hr class="divider">
          <div class="action-buttons">
            <button class="btn-emoji cancel"
                    (click)="closeProjectsModal()"
                    title="{{ 'HERRAMIENTAS.CONFIRM_CANCEL' | translate }}">
              ✗
            </button>
            <button class="btn-emoji confirm"
                    (click)="confirmProjectsSelection()"
                    title="{{ 'HERRAMIENTAS.CONFIRM_OK' | translate }}">
              ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    /* ===== MAIN CONTAINER ===== */
    .tools-root { 
      padding: 16px; 
      display: flex;
      flex-direction: column;
      min-height: auto;
      gap: 16px;
      background: #101218;
      border-radius: 12px;
      box-shadow: 0 2px 8px #E53935, 0 0 20px rgba(229, 57, 53, 0.15);
    }

    /* ===== HEADER ===== */
    .tools-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      border-bottom: 2px solid rgba(251, 192, 45, 0.2);
      padding-bottom: 12px;
    }
    .tools-header h2 {
      margin: 0;
      font-size: 1.6rem;
      color: #ffd54f;
      flex: 1;
    }

    /* ===== ADD BUTTON ===== */
    .jenkins-add-btn {
      padding: 8px 16px;
      border-radius: 999px;
      border: 0;
      background: transparent;
      color: #E0E0E0;
      font-weight: bold;
      letter-spacing: 0.5px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 20px;
      transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
      white-space: nowrap;
    }
    .jenkins-add-btn:hover {
      background: rgba(255, 255, 255, 0.04);
      color: #ffd54f;
      transform: translateY(-2px);
      border: 2px solid #ffd54f;
      padding: 6px 14px;
    }
    .jenkins-add-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* ===== MAIN CONTENT CONTAINER ===== */
    .tools-container {
      display: flex;
      gap: 20px;
      flex: 1;
      min-height: 400px;
      overflow: hidden;
    }

    /* ===== TOOLS GRID ===== */
    .tools-grid-container {
      flex: 0 0 auto;
      min-width: 280px;
      max-width: 450px;
      overflow-y: auto;
      overflow-x: hidden;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 12px;
    }
    
    .tools-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .tool-card { 
      padding: 10px; 
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      color: #ddd;
      transition: all 0.2s ease;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow: hidden;
      min-height: 140px;
    }
    .tool-card:hover {
      background: linear-gradient(135deg, rgba(251, 192, 45, 0.12), rgba(251, 192, 45, 0.06));
      border-color: rgba(251, 192, 45, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(251, 192, 45, 0.15);
    }
    
    .tool-card.selected {
      background: linear-gradient(135deg, rgba(251, 192, 45, 0.2), rgba(251, 192, 45, 0.1));
      border-color: #ffd54f;
      box-shadow: 0 0 20px rgba(251, 192, 45, 0.3);
    }

    .tool-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 6px;
      min-width: 0;
      flex-shrink: 0;
    }
    .tool-card-header h3 {
      margin: 0;
      font-size: 13px;
      color: #ffd54f;
      font-weight: 600;
      flex: 1;
      min-width: 0;
      white-space: normal;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      line-height: 1.3;
    }

    .card-actions { 
      display: flex; 
      gap: 4px;
      flex-shrink: 0;
    }
    .card-icon-btn { 
      border: 0; 
      background: transparent; 
      cursor: pointer;
      font-size: 16px;
      padding: 4px 6px;
      transition: transform 0.2s ease, filter 0.2s ease;
      border-radius: 4px;
    }
    .card-icon-btn:hover {
      transform: scale(1.2);
      filter: brightness(1.4);
      background: rgba(255, 255, 255, 0.1);
    }

    .tool-card-body {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
      flex: 1;
      overflow: hidden;
    }
    .tool-desc {
      font-size: 11px;
      color: #b0b8c0;
      line-height: 1.4;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .tool-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      overflow: hidden;
      max-height: 20px;
    }
    .tag {
      display: inline-block;
      background: rgba(251, 192, 45, 0.15);
      color: #b0b0ff;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      color: #7c8084;
      text-align: center;
      padding: 20px;
    }

    /* ===== TOOL DETAIL PANEL ===== */
    .tool-detail-container {
      flex: 1;
      min-width: 0;
      overflow-y: auto;
      overflow-x: hidden;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .tool-detail { 
      padding: 24px;
      color: #e6e6e6;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      width: 100%;
      box-sizing: border-box;
    }
    .tool-detail h2 {
      margin: 0 0 16px 0;
      color: #ffd54f;
      font-size: 1.1rem;
      border-bottom: 2px solid rgba(251, 192, 45, 0.3);
      padding-bottom: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-shrink: 0;
    }

    .detail-section {
      margin-bottom: 18px;
      overflow: hidden;
    }
    .detail-section strong {
      color: #cfcfcf;
      display: block;
      margin-bottom: 8px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .detail-section p {
      margin: 0;
      color: #dcdcdc;
      line-height: 1.6;
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
      white-space: normal;
    }

    .install-steps { 
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 12px; 
      border-radius: 8px; 
      color: #b0e0e6;
      font-size: 11px;
      line-height: 1.3;
      font-family: 'Courier New', monospace;
      max-height: 200px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* ===== MODALS ===== */
    .modal-overlay {
      position: fixed;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483000;
      padding: 16px;
    }

    .auth-card {
      background: #0f1113;
      color: #eee;
      padding: 24px;
      border-radius: 14px;
      width: 100%;
      max-width: 500px;
      max-height: 85vh;
      overflow-y: auto;
      overflow-x: hidden;
      box-shadow: 0 0 30px rgba(251, 192, 45, 0.4), 0 0 50px rgba(251, 192, 45, 0.2);
      border: 2px solid #FBC02D;
      animation: slideIn 0.3s ease-out;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: scale(0.95) translateY(-20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .form-title {
      color: #FBC02D;
      margin: 0 0 16px 0;
      text-align: center;
      font-size: 1.3rem;
      font-weight: bold;
      word-break: break-word;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .divider {
      border: none;
      border-top: 1px solid #333;
      margin: 16px 0;
    }

    .form-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow: hidden;
    }

    .modal-body {
      text-align: center;
      color: #ccc;
      padding: 12px 0;
      line-height: 1.6;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 6;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }

    .input-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 8px;
    }

    .input-field label {
      color: #cfcfcf;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .input-field input,
    .input-field textarea {
      background: #141516;
      color: #eee;
      border: 1px solid #2e3236;
      padding: 12px;
      border-radius: 8px;
      font-size: 0.95rem;
      outline: none;
      transition: all 0.2s ease;
      font-family: inherit;
      box-sizing: border-box;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .input-field input:focus,
    .input-field textarea:focus {
      border-color: #FBC02D;
      box-shadow: 0 0 0 3px rgba(251, 192, 45, 0.2);
      background: #1a1d21;
    }

    .input-field input::placeholder,
    .input-field textarea::placeholder {
      color: #7c8084;
    }

    .input-field textarea {
      resize: vertical;
      min-height: 80px;
      max-height: 150px;
    }

    .project-input-wrapper {
      position: relative;
    }

    .projects-selector-btn {
      background: #141516;
      color: #eee;
      border: 1px solid #2e3236;
      padding: 12px;
      border-radius: 8px;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
      font-family: inherit;
      box-sizing: border-box;
    }

    .projects-selector-btn:hover {
      border-color: #FBC02D;
      background: #1a1d21;
      box-shadow: 0 0 0 3px rgba(251, 192, 45, 0.2);
    }

    .projects-selector-btn:active {
      transform: scale(0.98);
    }

    .projects-selected-display {
      background: #141516;
      color: #ddd;
      border: 1px solid #2e3236;
      padding: 12px;
      border-radius: 8px;
      font-size: 0.95rem;
      word-break: break-word;
    }

    .projects-modal {
      max-width: 800px;
      max-height: 75vh;
    }

    .projects-search-container {
      padding: 16px 24px;
      background: rgba(20, 21, 22, 0.5);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .projects-list-content {
      overflow-y: auto;
      max-height: 450px;
      padding: 12px;
    }

    .projects-mosaic-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 14px;
      padding: 0;
    }

    .project-card-selector {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 18px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
      border: 2px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      overflow: hidden;
      text-align: center;
      min-height: 160px;
    }

    .project-card-selector:hover {
      background: linear-gradient(135deg, rgba(251, 192, 45, 0.12), rgba(251, 192, 45, 0.06));
      border-color: rgba(251, 192, 45, 0.3);
      transform: translateY(-4px);
      box-shadow: 0 4px 12px rgba(251, 192, 45, 0.15);
    }

    .project-card-selector.selected {
      background: linear-gradient(135deg, rgba(251, 192, 45, 0.2), rgba(251, 192, 45, 0.1));
      border-color: #ffd54f;
      box-shadow: 0 0 20px rgba(251, 192, 45, 0.3);
    }

    .project-card-checkbox {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      min-width: 28px;
      flex-shrink: 0;
    }

    .hidden-checkbox {
      display: none;
    }

    .checkbox-symbol {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: 2px solid #7c8084;
      border-radius: 6px;
      color: #4CAF50;
      font-size: 16px;
      font-weight: bold;
      transition: all 0.2s ease;
      background: transparent;
    }

    .project-card-selector.selected .checkbox-symbol {
      background: #4CAF50;
      border-color: #4CAF50;
      color: #fff;
      box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
    }

    .project-card-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 0;
      width: 100%;
    }

    .project-name {
      font-size: 15px;
      color: #ffd54f;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
      line-height: 1.3;
    }

    .project-code {
      font-size: 13px;
      color: #b0b8c0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 500;
    }

    .project-dept {
      font-size: 13px;
      color: #9ca3af;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 500;
    }

    .empty-projects {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 150px;
      color: #7c8084;
      text-align: center;
      padding: 20px;
      grid-column: 1 / -1;
    }

    .hint-text {
      font-size: 11px;
      color: #7c8084;
      display: block;
      margin-top: 4px;
      font-style: italic;
    }

    /* ===== ACTION BUTTONS ===== */
    .action-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 8px;
    }

    .btn-emoji {
      background: transparent !important;
      color: #999 !important;
      border: 0 !important;
      padding: 10px 12px !important;
      border-radius: 10px !important;
      cursor: pointer;
      font-weight: 600;
      font-size: 24px;
      min-width: 48px;
      min-height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      box-shadow: none;
    }

    .btn-emoji:hover {
      transform: scale(1.15) translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5),
                  inset 0 1px 0 rgba(255, 255, 255, 0.3),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.3);
      background: linear-gradient(145deg, #555, #333) !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
    }

    .btn-emoji:active {
      transform: scale(0.95);
    }

    .btn-emoji.confirm {
      color: #4CAF50 !important;
    }

    .btn-emoji.confirm:hover {
      background: linear-gradient(145deg, #2e9e50, #1e7e3c) !important;
      color: #fff !important;
      box-shadow: 0 6px 16px rgba(76, 175, 80, 0.6),
                  inset 0 1px 0 rgba(255, 255, 255, 0.3),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.3),
                  0 0 20px rgba(76, 175, 80, 0.5) !important;
      border: 1px solid rgba(76, 175, 80, 0.5) !important;
    }

    .btn-emoji.cancel {
      color: #E53935 !important;
    }

    .btn-emoji.cancel:hover {
      background: linear-gradient(145deg, #E53935, #c62828) !important;
      color: #fff !important;
      box-shadow: 0 6px 16px rgba(229, 57, 53, 0.6),
                  inset 0 1px 0 rgba(255, 255, 255, 0.2),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.3),
                  0 0 20px rgba(229, 57, 53, 0.4) !important;
      border: 1px solid rgba(229, 57, 53, 0.5) !important;
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 1200px) {
      .tools-container {
        flex-direction: column;
        gap: 16px;
      }
      .tools-grid-container {
        flex: 0 0 auto;
        max-height: 300px;
        max-width: 100%;
      }
      .tool-detail-container {
        flex: 1;
        min-height: 250px;
      }
    }

    @media (max-width: 768px) {
      .tools-root {
        padding: 12px;
        gap: 12px;
      }
      .tools-header {
        flex-direction: column;
        align-items: stretch;
        border-bottom: none;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.02);
        padding: 12px;
        padding-bottom: 12px;
        gap: 12px;
      }
      .tools-header h2 {
        font-size: 1.3rem;
        flex: auto;
      }
      .jenkins-add-btn {
        width: 100%;
        justify-content: center;
      }
      .tools-container {
        flex-direction: column;
        gap: 12px;
      }
      .tools-grid-container {
        flex: 0 0 auto;
        max-height: 250px;
        max-width: 100%;
      }
      .tool-detail-container {
        flex: 1;
        min-height: 200px;
      }
      .auth-card {
        width: 95% !important;
        max-width: 95% !important;
        max-height: 85vh !important;
      }
    }

    @media (max-width: 480px) {
      .tools-root {
        padding: 8px;
      }
      .tools-header {
        padding: 8px;
      }
      .tools-header h2 {
        font-size: 1.1rem;
      }
      .tool-card {
        padding: 10px;
      }
      .tool-detail {
        padding: 12px;
      }
      .auth-card {
        padding: 16px;
      }
      .btn-emoji {
        font-size: 22px;
        min-width: 44px;
        min-height: 44px;
      }
      .tools-grid-container {
        max-height: 200px;
      }
    }
    `
  ],
  imports: [CommonModule, FormsModule, BuscadorComponent, TranslateModule, MatIconModule]
})
export class Herramientas {
  title = '';
  tools: Tool[] = [];
  filteredTools: Tool[] = [];
  lastSearch = '';

  selectedTool?: Tool;
  showToolModal = false;
  editingTool: Partial<Tool> & { tagsString?: string; projectsString?: string; readonly?: boolean } = {};

  showConfirm = false;
  confirmMessage = '';
  private confirmAction: (() => void) | null = null;

  // Popup de selección de proyectos
  showProjectsModal = false;
  availableProjects: Project[] = [];
  filteredProjectsForModal: Project[] = [];
  selectedProjectIds: Set<string> = new Set();
  projectsSearchQuery = '';
  @ViewChild('projectsSearchComponent') projectsSearchComponent?: BuscadorComponent;

  constructor(
    private translate: TranslateService,
    private storage: LocalStorageService,
    private projectService: ProjectService
  ) {
    this.load();
    this.title = this.translate.instant('MENU.TOOLS') || 'Herramientas';
    if (!this.selectedTool && this.tools.length) this.selectedTool = this.tools[0];
    this.restoreDraft();
    this.loadProjects();
  }

  private load() {
    try {
      const raw = this.storage.get(STORAGE_KEY);
      if (raw) this.tools = JSON.parse(raw) as Tool[];
    } catch {
      this.tools = [];
    }
    this.filteredTools = [...this.tools];
  }

  private save() {
    this.storage.setObject(STORAGE_KEY, this.tools);
    this.filteredTools = [...this.tools];
  }

  // draft popup
  saveDraft(): void {
    const draft = {
      showToolModal: this.showToolModal,
      editingTool: this.editingTool
    };
    this.storage.setObject(STORAGE_DRAFT_KEY, draft);
  }

  private restoreDraft(): void {
    const draft = this.storage.getObject<any>(STORAGE_DRAFT_KEY);
    if (!draft) return;
    this.showToolModal = !!draft.showToolModal;
    if (draft.editingTool) this.editingTool = draft.editingTool;
  }

  private clearDraft(): void {
    this.storage.remove(STORAGE_DRAFT_KEY);
  }

  filtrar(valor: string) {
    this.lastSearch = valor || '';
    const v = (valor || '').toLowerCase();
    if (!v) {
      this.filteredTools = [...this.tools];
      return;
    }
    this.filteredTools = this.tools.filter(t =>
      (t.name || '').toLowerCase().includes(v) ||
      (t.description || '').toLowerCase().includes(v) ||
      ((t.tags || []).join(' ').toLowerCase().includes(v)) ||
      ((t.projects || []).join(' ').toLowerCase().includes(v))
    );
  }

  selectTool(t: Tool) {
    this.selectedTool = t;
  }

  newTool() {
    this.editingTool = {
      name: '',
      description: '',
      functionality: '',
      tagsString: '',
      installSteps: '',
      projectsString: '',
      readonly: false
    };
    this.showToolModal = true;
    this.saveDraft();
  }

  editTool(t: Tool) {
    this.editingTool = {
      ...t,
      tagsString: (t.tags || []).join(','),
      projectsString: (t.projects || []).join(','),
      readonly: false
    } as any;
    this.showToolModal = true;
    this.saveDraft();
  }

  viewTool(t: Tool) {
    this.editingTool = { ...t, readonly: true } as any;
    this.showToolModal = true;
    this.saveDraft();
  }

  closeModal() {
    this.showToolModal = false;
    this.editingTool = {};
    this.clearDraft();
  }

  saveTool() {
    if ((this.editingTool as any).readonly) return;

    const partial = this.editingTool as Partial<Tool> & {
      tagsString?: string;
      projectsString?: string;
    };
    if (!partial.name || !partial.name.trim()) return;

    const tool: Tool = {
      id: partial.id || '',
      name: (partial.name || '').trim(),
      description: partial.description,
      functionality: partial.functionality,
      tags: (partial.tagsString || '').split(',').map(s => s.trim()).filter(Boolean),
      installSteps: partial.installSteps,
      projects: (partial.projectsString || '').split(',').map(s => s.trim()).filter(Boolean)
    };

    if (!tool.id) {
      tool.id = Math.random().toString(36).slice(2, 9);
      this.tools.push(tool);
    } else {
      const idx = this.tools.findIndex(x => x.id === tool.id);
      if (idx !== -1) this.tools[idx] = tool;
    }

    this.save();
    this.showToolModal = false;
    this.editingTool = {};
    this.clearDraft();
  }

  confirmDeleteTool(id: string, name?: string) {
    const msg =
      this.translate.instant('HERRAMIENTAS.CONFIRM_DELETE_MESSAGE', { name: name || '' }) ||
      `¿Eliminar herramienta "${name || ''}"?`;
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

  confirmCancel() {
    this.showConfirm = false;
    this.confirmAction = null;
  }

  // Métodos para el popup de selección de proyectos
  private loadProjects() {
    this.projectService.getAll().subscribe(
      (projects: Project[]) => {
        this.availableProjects = projects || [];
      },
      (error: any) => {
        console.error('Error loading projects:', error);
        this.availableProjects = [];
      }
    );
  }

  openProjectsModal() {
    // Cargar los proyectos ya seleccionados
    const projectsString = (this.editingTool as any).projectsString || '';
    this.selectedProjectIds = new Set(
      projectsString.split(',').map((s: string) => s.trim()).filter(Boolean)
    );
    this.projectsSearchQuery = '';
    this.filteredProjectsForModal = [...this.availableProjects];
    this.showProjectsModal = true;
  }

  closeProjectsModal() {
    this.showProjectsModal = false;
    this.selectedProjectIds.clear();
    this.projectsSearchQuery = '';
    this.filteredProjectsForModal = [];
  }

  buscarProyectos(query: string) {
    this.projectsSearchQuery = query;
    const q = query.toLowerCase();
    if (!q) {
      this.filteredProjectsForModal = [...this.availableProjects];
    } else {
      this.filteredProjectsForModal = this.availableProjects.filter(p =>
        (p.nombre || '').toLowerCase().includes(q) ||
        (p.codigoProyecto || '').toLowerCase().includes(q) ||
        (p.departamento || '').toLowerCase().includes(q)
      );
    }
  }

  isProjectSelected(projectId: string): boolean {
    return this.selectedProjectIds.has(projectId);
  }

  toggleProjectSelection(project: Project) {
    const id = project.codigoProyecto || '';
    if (this.selectedProjectIds.has(id)) {
      this.selectedProjectIds.delete(id);
    } else {
      this.selectedProjectIds.add(id);
    }
  }

  confirmProjectsSelection() {
    const selectedProjects = Array.from(this.selectedProjectIds);
    (this.editingTool as any).projectsString = selectedProjects.join(',');
    this.saveDraft();
    this.closeProjectsModal();
  }

  getSelectedProjectsDisplay(): string {
    const projectsString = (this.editingTool as any).projectsString || '';
    const projects = projectsString.split(',').map((s: string) => s.trim()).filter(Boolean);
    return this.translate.instant('HERRAMIENTAS.SELECT_PROJECT') || 'Selecciona el Proyecto';
  }

  getProjectDisplayNames(projectCodes: string[]): string[] {
    if (!projectCodes || projectCodes.length === 0) {
      return [];
    }
    return projectCodes.map(code => {
      const project = this.availableProjects.find(p => p.codigoProyecto === code);
      if (project) {
        return `${project.nombre || 'Sin nombre'} | ${project.codigoProyecto || code}`;
      }
      return code;
    });
  }

  getProjectsListForDisplay(): string {
    const projectsString = (this.editingTool as any).projectsString || '';
    const projects = projectsString.split(',').map((s: string) => s.trim()).filter(Boolean);
    return projects.length > 0 ? projects.join(', ') : 'Sin proyectos';
  }
}
