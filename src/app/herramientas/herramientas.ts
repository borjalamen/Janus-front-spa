import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { BuscadorComponent } from '../buscador/buscador';
import { LocalStorageService } from '../local-storage.service';
import { ProjectService, Project } from '../project.service';
import { HerramientasService } from './herramientas.service';

type Tool = {
  id: string;
  name: string;
  description?: string;
  functionality?: string;
  tags?: string[];
  installSteps?: ToolStep[];
  projects?: string[];
  projectsString?: string;
};

type ToolAttachment = {
  name: string;
  mimeType: string;
  dataUrl: string;
  size: number;
};

type ToolStep = {
  text: string;
  attachments: ToolAttachment[];
};

const STORAGE_DRAFT_KEY = 'tools_draft_v1';

@Component({
  selector: 'app-herramientas',
  standalone: true,
  imports: [CommonModule, FormsModule, BuscadorComponent, MatIconModule, TranslateModule],
  template: `
    <app-buscador (buscar)="filtrar($event)"></app-buscador>

    <div class="section-container">
      <div class="documents-header">
        <h2>{{ 'MENU.TOOLS' | translate }}</h2>
      </div>

      <div class="tabs">
        <button class="tab" [class.active]="activeTab==='crear'" (click)="setActiveTab('crear')">
          <mat-icon inline="true">add</mat-icon>
          {{ 'HERRAMIENTAS.TAB_CREATE' | translate }}
        </button>
        <button class="tab" [class.active]="activeTab==='listar'" (click)="setActiveTab('listar')">
          <mat-icon inline="true">list</mat-icon>
          {{ 'HERRAMIENTAS.TAB_LIST' | translate }}
        </button>
      </div>

      <div *ngIf="activeTab==='crear'" class="tab-panel">
        <div class="form-container">
          <h3>{{ (editingTool.id ? 'HERRAMIENTAS.EDIT_TOOL' : 'HERRAMIENTAS.NEW_TOOL') | translate }}</h3>

          <div class="form-field">
            <label>{{ 'HERRAMIENTAS.LABEL_NAME' | translate }}</label>
            <input type="text" [(ngModel)]="editingTool.name" [placeholder]="'HERRAMIENTAS.NAME_PLACEHOLDER' | translate" (ngModelChange)="saveDraft()" />
          </div>

          <div class="form-field">
            <label>{{ 'HERRAMIENTAS.LABEL_DESCRIPTION' | translate }}</label>
            <textarea rows="3" [(ngModel)]="editingTool.description" [placeholder]="'HERRAMIENTAS.DESCRIPTION_PLACEHOLDER' | translate" (ngModelChange)="saveDraft()"></textarea>
          </div>

          <div class="form-field">
            <label>{{ 'HERRAMIENTAS.LABEL_FUNCTIONALITY' | translate }}</label>
            <textarea rows="3" [(ngModel)]="editingTool.functionality" [placeholder]="'HERRAMIENTAS.FUNCTIONALITY_PLACEHOLDER' | translate" (ngModelChange)="saveDraft()"></textarea>
          </div>

          <div class="form-field solutions-field">
            <div class="solutions-header">
              <label>{{ 'HERRAMIENTAS.LABEL_INSTALL' | translate }}</label>
            </div>
            <div class="soluciones-container">
              <button type="button" class="guardar-btn agregar-solucion-btn" (click)="addStep()" [title]="'HERRAMIENTAS.STEP_ADD_TITLE' | translate">
                <mat-icon>add</mat-icon>
              </button>

              <div *ngIf="!editingTool.installSteps || editingTool.installSteps.length === 0" class="no-soluciones">
                <p>{{ 'HERRAMIENTAS.NO_STEPS' | translate }}</p>
              </div>

              <div *ngFor="let step of editingTool.installSteps; let i = index" class="solucion-item">
                <div class="solucion-header">
                  <span class="solucion-numero">{{ 'HERRAMIENTAS.STEP' | translate }} {{ i + 1 }}</span>
                  <button type="button" class="eliminar-solucion-btn" (click)="removeStep(i)" [title]="'HERRAMIENTAS.STEP_REMOVE_TITLE' | translate">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>

                <textarea rows="2" [(ngModel)]="step.text" [placeholder]="'HERRAMIENTAS.INSTALL_STEP_PLACEHOLDER' | translate" (ngModelChange)="saveDraft()"></textarea>

                <div class="step-files-toolbar">
                  <label class="step-upload-btn" [title]="'HERRAMIENTAS.STEP_ATTACH_TITLE' | translate">
                    <mat-icon>attach_file</mat-icon>
                    <span>{{ 'HERRAMIENTAS.STEP_ATTACH_FILES' | translate }}</span>
                    <input type="file" multiple (change)="onStepFilesSelected($event, i)">
                  </label>
                </div>

                <div class="step-attachments" *ngIf="step.attachments && step.attachments.length > 0">
                  <div class="step-attachment-item" *ngFor="let file of step.attachments; let j = index">
                    <ng-container *ngIf="isImageAttachment(file); else nonImageAttachmentTpl">
                      <img class="step-attachment-thumb" [src]="file.dataUrl" [alt]="file.name">
                    </ng-container>
                    <ng-template #nonImageAttachmentTpl>
                      <div class="step-attachment-fileicon">
                        <mat-icon>description</mat-icon>
                      </div>
                    </ng-template>

                    <a class="step-attachment-link" [href]="file.dataUrl" [download]="file.name" target="_blank" rel="noopener">
                      {{ file.name }}
                    </a>

                    <button type="button" class="step-attachment-remove" (click)="removeStepAttachment(i, j)" [title]="'HERRAMIENTAS.STEP_REMOVE_FILE' | translate">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="form-field">
            <label>{{ 'HERRAMIENTAS.LABEL_PROJECTS' | translate }}</label>
            <button type="button" class="projects-selector-btn" (click)="openProjectsModal()">
              {{ getSelectedProjectsDisplay() }}
            </button>
            <div class="projects-selected-display" *ngIf="getProjectsListForDisplay()">
              {{ getProjectsListForDisplay() }}
            </div>
          </div>

          <div class="form-field">
            <label>{{ 'HERRAMIENTAS.TAGS' | translate }}</label>
            <input type="text" [(ngModel)]="tagsInput" [placeholder]="'HERRAMIENTAS.TAGS_PLACEHOLDER' | translate" (ngModelChange)="saveDraft()" />
          </div>

          <div class="form-actions">
            <button class="cancelar-btn" (click)="clearForm()" [title]="'HERRAMIENTAS.CONFIRM_CANCEL' | translate">✗</button>
            <button class="guardar-btn" (click)="saveTool()" [title]="editingTool.id ? ('HERRAMIENTAS.ACTION_UPDATE' | translate) : ('HERRAMIENTAS.ACTION_SAVE' | translate)">✓</button>
          </div>
        </div>
      </div>

      <div *ngIf="activeTab==='listar'" class="tab-panel">
        <p>{{ 'HERRAMIENTAS.LIST_DESCRIPTION' | translate }}</p>
        <ng-container *ngIf="!showStepsDetail; else detallStepsTpl">
          <div class="bitacora-list" *ngIf="filteredTools.length > 0">
            <div *ngFor="let tool of toolsPaginadas" class="bitacora-row">
              <div class="bitacora-icon" [style.background]="'linear-gradient(135deg, rgba(251, 192, 45, 0.25), rgba(251, 192, 45, 0.12))'">
                <mat-icon>build</mat-icon>
              </div>

              <div class="bitacora-info">
                <div class="bitacora-title-row">
                  <strong class="bitacora-contexto">{{ tool.name }}</strong>
                  <span class="bitacora-fecha">ID: {{ tool.id }}</span>
                </div>

                <div class="bitacora-error">{{ tool.description || ('HERRAMIENTAS.EMPTY_DESCRIPTION' | translate) }}</div>

                <div class="bitacora-tags" *ngIf="tool.tags && tool.tags.length > 0">
                  <span class="tag" *ngFor="let tag of tool.tags">{{ tag }}</span>
                </div>

                <div class="bitacora-actions">
                  <button class="action-btn view-btn" (click)="openStepsView(tool)" [title]="'HERRAMIENTAS.VIEW' | translate" *ngIf="tool.installSteps && tool.installSteps.length > 0">👁️</button>
                  <button class="action-btn edit-btn" (click)="editTool(tool)" [title]="'HERRAMIENTAS.EDIT' | translate">✏️</button>
                  <button class="action-btn delete-btn" (click)="confirmDeleteTool(tool.id, tool.name)" [title]="'HERRAMIENTAS.DELETE' | translate">🗑️</button>
                </div>
              </div>
            </div>
          </div>

          <div class="no-results" *ngIf="filteredTools.length === 0">
            <mat-icon>search_off</mat-icon>
            <p>{{ lastSearch ? ('HERRAMIENTAS.EMPTY_SEARCH' | translate) : ('HERRAMIENTAS.EMPTY_STATE' | translate) }}</p>
          </div>

          <div class="pagination-bar" *ngIf="totalPaginasTools > 1">
            <button
              class="page-btn"
              (click)="cambiarPaginaTools(paginaActualTools - 1)"
              [disabled]="paginaActualTools === 1"
              aria-label="Anterior">
              ‹
            </button>

            <button
              class="page-btn"
              *ngFor="let p of paginasArrayTools"
              [class.active]="p === paginaActualTools"
              (click)="cambiarPaginaTools(p)">
              {{ p }}
            </button>

            <button
              class="page-btn"
              (click)="cambiarPaginaTools(paginaActualTools + 1)"
              [disabled]="paginaActualTools === totalPaginasTools"
              aria-label="Siguiente">
              ›
            </button>

            <span class="page-info">{{ paginaActualTools }} / {{ totalPaginasTools }}</span>
          </div>
        </ng-container>

        <ng-template #detallStepsTpl>
          <div class="bitacora-steps-detail-container" *ngIf="toolInDetail">
            <div class="bitacora-steps-detail-header">
              <button class="bitacora-detail-back-btn" (click)="closeStepsView()" [title]="'HERRAMIENTAS.DETAIL_BACK' | translate">
                <mat-icon>arrow_back</mat-icon>
              </button>
              <div class="bitacora-steps-detail-title">
                <div class="bitacora-steps-detail-title-row">
                  <h3>{{ toolInDetail.name || ('HERRAMIENTAS.EMPTY_NAME' | translate) }}</h3>
                  <span class="bitacora-fecha-pill">ID: {{ toolInDetail.id }}</span>
                  <span *ngFor="let tag of toolInDetail.tags" class="tag-pill">{{ tag }}</span>
                  <span
                    *ngFor="let p of getToolProjectNames(toolInDetail)"
                    class="bitacora-chip"
                    [style.backgroundColor]="'rgba(251, 192, 45, 0.12)'"
                    [style.borderColor]="'#FBC02D'">
                    <span>{{ p }}</span>
                  </span>
                </div>

                <div class="bitacora-detail-meta-block">
                  <h4>{{ 'HERRAMIENTAS.LABEL_DESCRIPTION' | translate }}</h4>
                  <p class="bitacora-steps-detail-sub">{{ toolInDetail.description || ('HERRAMIENTAS.EMPTY_DESCRIPTION' | translate) }}</p>
                </div>

                <div class="bitacora-detail-meta-block" *ngIf="toolInDetail.functionality">
                  <h4>{{ 'HERRAMIENTAS.LABEL_FUNCTIONALITY' | translate }}</h4>
                  <p class="bitacora-steps-detail-sub">{{ toolInDetail.functionality }}</p>
                </div>

                <div class="bitacora-detail-meta-block" *ngIf="getToolProjectNames(toolInDetail).length > 0">
                  <h4>{{ 'HERRAMIENTAS.DETAIL_PROJECTS' | translate }}</h4>
                  <p class="bitacora-steps-detail-sub">{{ getToolProjectNames(toolInDetail).join(', ') }}</p>
                </div>
              </div>
            </div>

            <div class="bitacora-steps-carousel" *ngIf="toolInDetail.installSteps && toolInDetail.installSteps.length > 0">
              <div class="bitacora-steps-carousel-wrapper">
                <button class="carousel-arrow left" (click)="prevStep()" [disabled]="currentStepIndex === 0">
                  <mat-icon>chevron_left</mat-icon>
                </button>

                <div class="bitacora-step-slide" [ngClass]="slideDirection">
                  <ng-container *ngIf="toolInDetail.installSteps[currentStepIndex] as stepObj; else noStep">
                    <div class="bitacora-step-detail-item">
                      <div class="bitacora-step-detail-header">
                        <div class="bitacora-step-env-cube" [style.background]="'linear-gradient(135deg, #FBC02D, #F9A825)'">
                          <span class="bitacora-step-env-number">{{ currentStepIndex + 1 }}</span>
                        </div>
                        <div class="bitacora-step-detail-title">
                          <strong>{{ 'HERRAMIENTAS.STEP' | translate }} {{ currentStepIndex + 1 }}</strong>
                        </div>
                      </div>

                      <div class="bitacora-step-detail-body">
                        <div class="bitacora-step-detail-text" *ngIf="stepObj.text">{{ stepObj.text }}</div>

                        <ng-container *ngFor="let file of stepObj.attachments">
                          <div class="step-file-preview step-file-image" *ngIf="isImageAttachment(file)">
                            <img
                              [src]="file.dataUrl"
                              [alt]="file.name"
                              (click)="openImagePopup(file.dataUrl)"
                              style="cursor:pointer"
                              [title]="'HERRAMIENTAS.IMAGE_CLICK_TO_ZOOM' | translate" />
                          </div>

                          <div class="step-file-preview step-file-other" *ngIf="!isImageAttachment(file)">
                            <div class="step-file-badge">
                              <mat-icon>description</mat-icon>
                              <span>{{ getExtension(file.name) }}</span>
                            </div>
                            <a [href]="file.dataUrl" [download]="file.name" class="step-file-download-btn" target="_blank" rel="noopener">
                              <mat-icon>download</mat-icon> {{ 'HERRAMIENTAS.DOWNLOAD' | translate }}
                            </a>
                          </div>
                        </ng-container>
                      </div>
                    </div>
                  </ng-container>
                  <ng-template #noStep>
                    <p>{{ 'HERRAMIENTAS.DETAIL_NO_STEPS' | translate }}</p>
                  </ng-template>
                </div>

                <button class="carousel-arrow right" (click)="nextStep()" [disabled]="toolInDetail.installSteps && currentStepIndex === toolInDetail.installSteps.length - 1">
                  <mat-icon>chevron_right</mat-icon>
                </button>
              </div>

              <div class="carousel-indicators">
                <span *ngFor="let s of toolInDetail.installSteps; let i = index" [class.active]="i === currentStepIndex" (click)="goToStep(i)"></span>
              </div>
            </div>
          </div>
        </ng-template>
      </div>

      <div class="modal-overlay" *ngIf="showProjectsModal" (click)="closeProjectsModal()">
        <div class="auth-card projects-modal" (click)="$event.stopPropagation()">
          <h2 class="form-title">{{ 'HERRAMIENTAS.SELECT_PROJECTS' | translate }}</h2>
          <hr class="divider">

          <div class="projects-search-container">
            <app-buscador (buscar)="buscarProyectos($event)"></app-buscador>
          </div>

          <div class="form-content projects-list-content">
            <div class="projects-mosaic-grid">
              <div class="project-card-selector" *ngFor="let proj of filteredProjectsForModal" [class.selected]="isProjectSelected(proj.codigoProyecto || '')" (click)="toggleProjectSelection(proj)">
                <div class="project-card-checkbox">
                  <input
                    type="checkbox"
                    [checked]="isProjectSelected(proj.codigoProyecto || '')"
                    (change)="toggleProjectSelection(proj)"
                    (click)="$event.stopPropagation()"
                    class="hidden-checkbox"
                  >
                  <span class="checkbox-symbol">{{ isProjectSelected(proj.codigoProyecto || '') ? '✓' : '' }}</span>
                </div>
                <div class="project-card-content">
                  <div class="project-name">{{ proj.nombre || ('HERRAMIENTAS.EMPTY_NAME' | translate) }}</div>
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
            <button class="btn-emoji cancel" (click)="closeProjectsModal()" [title]="'HERRAMIENTAS.CONFIRM_CANCEL' | translate">✗</button>
            <button class="btn-emoji confirm" (click)="confirmProjectsSelection()" [title]="'HERRAMIENTAS.CONFIRM_OK' | translate">✓</button>
          </div>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="confirmAction" (click)="cancelDelete()">
        <div class="auth-card" (click)="$event.stopPropagation()">
          <h2 class="form-title">{{ 'HERRAMIENTAS.CONFIRM_DELETE_TITLE' | translate }}</h2>
          <hr class="divider">
          <p class="modal-body">{{ 'HERRAMIENTAS.CONFIRM_DELETE_MESSAGE' | translate:{ name: confirmAction.name } }}</p>
          <hr class="divider">
          <div class="action-buttons">
            <button class="btn-emoji cancel" (click)="cancelDelete()" [title]="'HERRAMIENTAS.CONFIRM_CANCEL' | translate">✗</button>
            <button class="btn-emoji confirm" (click)="confirmDelete()" [title]="'HERRAMIENTAS.CONFIRM_OK' | translate">✓</button>
          </div>
        </div>
      </div>

      <div
        class="image-popup-backdrop"
        *ngIf="showImagePopup"
        (click)="closeImagePopup()">
        <div class="image-popup-container" (click)="$event.stopPropagation()">
          <button class="image-popup-close-btn" (click)="closeImagePopup()" [title]="'HERRAMIENTAS.CLOSE' | translate">
            ✕
          </button>
          <img
            *ngIf="imagePopupUrl"
            [src]="imagePopupUrl"
            [alt]="'HERRAMIENTAS.IMAGE_ENLARGED' | translate"
            class="image-popup-img" />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .section-container {
      padding: 24px;
      background: #101218;
      border-radius: 12px;
      border: 1px solid rgba(229, 57, 53, 0.45) !important;
      box-shadow: 0 2px 8px rgba(229, 57, 53, 0.5), 0 0 20px rgba(229, 57, 53, 0.22) !important;
      margin: 20px;
      color: #E0E0E0;
    }

    .documents-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .documents-header h2 {
      color: #FBC02D;
      font-weight: bold;
      margin: 0;
    }

    p {
      color: #E0E0E0;
    }

    .tabs {
      display: flex;
      gap: 8px;
      padding: 16px 0;
      border-bottom: 2px solid rgba(30, 136, 229, 0.3);
      margin-bottom: 20px;
    }

    .tab {
      background: transparent;
      border: 1px solid transparent;
      padding: 10px 18px;
      border-radius: 10px;
      color: rgba(207, 207, 207, 0.7);
      cursor: pointer;
      position: relative;
      font-weight: 600;
      transition: all 160ms ease;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .tab mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .tab:hover {
      color: #1E88E5 !important;
      background: rgba(30, 136, 229, 0.12) !important;
    }

    .tab:focus {
      outline: none;
      box-shadow: 0 0 0 4px rgba(30, 136, 229, 0.2);
    }

    .tab.active {
      background: linear-gradient(180deg, rgba(30, 136, 229, 0.22), rgba(30, 136, 229, 0.08)) !important;
      color: #1E88E5 !important;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
      transform: translateY(-2px);
    }

    .tab.active::after {
      content: '';
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: -2px;
      height: 4px;
      border-radius: 4px;
      background: linear-gradient(90deg, #1E88E5, #1565C0) !important;
      box-shadow: 0 6px 20px rgba(30, 136, 229, 0.35) !important;
    }

    .tab-panel {
      padding: 10px 0;
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .form-container {
      background: #14161d;
      padding: 24px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      box-shadow: 0 0 18px rgba(0, 0, 0, 0.6);
    }

    .form-container h3 {
      color: #FBC02D;
      margin-top: 0;
      margin-bottom: 20px;
      font-size: 1.4em;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 8px;
    }

    .form-field label {
      color: #cfcfcf;
      font-size: 13px;
      font-weight: 600;
    }

    .form-field input,
    .form-field textarea,
    .projects-selector-btn {
      background: #141516 !important;
      color: #eee !important;
      border: 1px solid #2e3236 !important;
      padding: 8px !important;
      border-radius: 4px !important;
      font-size: 0.95rem;
      outline: none;
      font-family: inherit;
      width: 100%;
    }

    .form-field input::placeholder,
    .form-field textarea::placeholder {
      color: #7c8084 !important;
    }

    .projects-selector-btn {
      cursor: pointer;
      text-align: left;
    }

    .projects-selected-display {
      color: #cfd8dc;
      font-size: 12px;
      margin-top: 6px;
    }

    .solutions-field {
      position: relative;
    }

    .solutions-header {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      margin-bottom: 12px;
    }

    .solutions-header label {
      margin: 0;
    }

    .soluciones-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px;
      background: rgba(20, 21, 22, 0.5);
      border-radius: 6px;
      border: 1px solid #2e3236;
      position: relative;
    }

    .no-soluciones {
      text-align: center;
      color: #7c8084;
      padding: 12px;
      font-style: italic;
    }

    .solucion-item {
      background: #0f1113;
      border: 1px solid #2e3236;
      border-left: 4px solid #2e3236;
      border-radius: 6px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: border-left-color 0.25s ease;
    }

    .step-files-toolbar {
      display: flex;
      align-items: center;
      margin-top: 2px;
    }

    .step-upload-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #FBC02D;
      font-weight: 600;
      border: 1px dashed rgba(251, 192, 45, 0.55);
      border-radius: 8px;
      padding: 5px 10px;
      cursor: pointer;
      background: rgba(251, 192, 45, 0.08);
      transition: all 0.2s ease;
      width: fit-content;
    }

    .step-upload-btn:hover {
      background: rgba(251, 192, 45, 0.18);
      box-shadow: 0 0 10px rgba(251, 192, 45, 0.25);
    }

    .step-upload-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .step-upload-btn input[type="file"] {
      display: none;
    }

    .step-attachments {
      margin-top: 6px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .step-attachments.detail {
      margin-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 10px;
    }

    .step-attachments-title {
      color: #ffd54f;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .step-attachment-item {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 6px 8px;
    }

    .step-attachment-thumb {
      width: 56px;
      height: 56px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      flex-shrink: 0;
      background: #0f1113;
    }

    .step-attachment-fileicon {
      width: 56px;
      height: 56px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #90CAF9;
      background: #131824;
      flex-shrink: 0;
    }

    .step-attachment-link {
      color: #cfd8dc;
      text-decoration: none;
      font-size: 13px;
      flex: 1;
      word-break: break-word;
    }

    .step-attachment-link:hover {
      color: #FBC02D;
      text-decoration: underline;
    }

    .step-attachment-remove {
      background: transparent;
      border: 0;
      color: #ff8a80;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      width: 26px;
      height: 26px;
      border-radius: 6px;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .step-attachment-remove:hover {
      background: rgba(229, 57, 53, 0.2);
      color: #ff5252;
    }

    .step-attachment-remove mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .solucion-header {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
    }

    .solucion-numero {
      font-weight: 600;
      color: #FBC02D;
      min-width: 80px;
    }

    .eliminar-solucion-btn {
      background: rgba(229, 57, 53, 0.2);
      color: #E53935;
      border: 1px solid rgba(229, 57, 53, 0.4);
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .eliminar-solucion-btn:hover {
      background: rgba(229, 57, 53, 0.4);
      color: #ff5252;
    }

    .eliminar-solucion-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .agregar-solucion-btn {
      min-width: 32px !important;
      min-height: 32px !important;
      width: 32px;
      height: 32px;
      padding: 0 !important;
      font-size: 18px !important;
    }

    .agregar-solucion-btn mat-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
    }

    .agregar-solucion-btn:hover {
      transform: scale(1.15) translateY(-2px) !important;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
      justify-content: flex-end;
    }

    .form-actions button {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .cancelar-btn,
    .guardar-btn,
    .btn-emoji {
      background: transparent !important;
      color: #999 !important;
      border: 0 !important;
      padding: 8px !important;
      border-radius: 8px !important;
      cursor: pointer;
      font-weight: 600;
      font-size: 28px;
      min-width: 48px;
      min-height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      box-shadow: none;
    }

    .cancelar-btn:hover,
    .guardar-btn:hover,
    .btn-emoji:hover {
      transform: scale(1.15) translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5),
                  inset 0 1px 0 rgba(255, 255, 255, 0.3),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.3);
      background: linear-gradient(145deg, #555, #333) !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
    }

    .guardar-btn,
    .btn-emoji.confirm {
      color: #4CAF50 !important;
    }

    .guardar-btn:hover,
    .btn-emoji.confirm:hover {
      background: linear-gradient(145deg, #2e9e50, #1e7e3c) !important;
      color: #fff !important;
      box-shadow: 0 6px 16px rgba(76, 175, 80, 0.6),
                  inset 0 1px 0 rgba(255, 255, 255, 0.3),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.3),
                  0 0 20px rgba(76, 175, 80, 0.5) !important;
      border: 1px solid rgba(76, 175, 80, 0.5) !important;
    }

    .cancelar-btn,
    .btn-emoji.cancel {
      color: #E53935 !important;
    }

    .cancelar-btn:hover,
    .btn-emoji.cancel:hover {
      background: linear-gradient(145deg, #E53935, #c62828) !important;
      color: #fff !important;
      box-shadow: 0 6px 16px rgba(229, 57, 53, 0.6),
                  inset 0 1px 0 rgba(255, 255, 255, 0.2),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.3),
                  0 0 20px rgba(229, 57, 53, 0.4) !important;
      border: 1px solid rgba(229, 57, 53, 0.5) !important;
    }

    .bitacora-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .bitacora-row {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px;
      background: #14161d;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      transition: all 0.2s ease;
    }

    .bitacora-row:hover {
      border-color: rgba(30, 136, 229, 0.55) !important;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 0 12px rgba(30, 136, 229, 0.3) !important;
      transform: translateY(-2px);
    }

    .bitacora-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 10px;
      flex-shrink: 0;
      transition: all 0.3s ease;
    }

    .bitacora-icon:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }

    .bitacora-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .bitacora-info {
      flex: 1;
      min-width: 0;
    }

    .bitacora-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .bitacora-contexto {
      font-size: 16px;
      font-weight: 700;
      color: #ffd54f;
    }

    .bitacora-fecha {
      font-size: 11px;
      padding: 3px 10px;
      border-radius: 999px;
      background: rgba(229, 57, 53, 0.15);
      color: #E53935;
      border: 1px solid rgba(229, 57, 53, 0.3);
      font-weight: 600;
    }

    .bitacora-error {
      color: #cfd8dc;
      font-size: 14px;
      margin-bottom: 8px;
      line-height: 1.5;
    }

    .bitacora-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .tag {
      background: rgba(251, 192, 45, 0.1);
      color: #FBC02D;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      border: 1px solid rgba(251, 192, 45, 0.3);
      font-weight: 500;
    }

    .bitacora-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      justify-content: flex-end;
    }

    .action-btn {
      padding: 8px 12px;
      border-radius: 6px;
      border: 0;
      background: transparent;
      cursor: pointer;
      font-size: 20px;
      transition: background 0.12s ease, transform 0.12s ease, color 0.12s ease;
      color: #E0E0E0;
    }

    .action-btn:hover {
      background: rgba(255, 255, 255, 0.04);
      transform: translateY(-2px);
    }

    .view-btn:hover {
      color: #66BB6A;
    }

    .edit-btn:hover {
      color: #ffd54f;
    }

    .delete-btn:hover {
      color: #ff5252;
    }

    .no-results {
      text-align: center;
      padding: 40px 20px;
      color: #666;
    }

    .no-results mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #444;
      margin-bottom: 16px;
    }

    .no-results p {
      color: #666;
    }

    .bitacora-steps-detail-container {
      background: #14161d;
      border-radius: 10px;
      padding: 14px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      box-shadow: 0 0 18px rgba(0, 0, 0, 0.7);
    }

    .bitacora-steps-detail-header {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 8px;
    }

    .bitacora-detail-back-btn {
      background: transparent;
      border: none;
      color: #FBC02D;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .bitacora-detail-back-btn mat-icon {
      font-size: 22px;
    }

    .bitacora-steps-detail-title {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }

    .bitacora-steps-detail-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .bitacora-steps-detail-title-row h3 {
      margin: 0;
      color: #FFE082;
    }

    .bitacora-fecha-pill {
      font-size: 11px;
      padding: 4px 12px;
      border-radius: 999px;
      background: rgba(229, 57, 53, 0.15);
      color: #E53935;
      border: 1px solid rgba(229, 57, 53, 0.3);
      font-weight: 600;
    }

    .tag-pill {
      background: rgba(251, 192, 45, 0.1);
      color: #FBC02D;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      border: 1px solid rgba(251, 192, 45, 0.3);
      font-weight: 500;
    }

    .bitacora-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 6px;
      border: 1px solid;
      font-size: 12px;
      font-weight: 600;
      color: #FBC02D;
    }

    .bitacora-steps-detail-sub {
      margin: 3px 0 0;
      font-size: 13px;
      color: #cfd8dc;
    }

    .bitacora-detail-meta-block {
      margin-top: 8px;
      padding-top: 4px;
    }

    .bitacora-detail-meta-block h4 {
      margin: 0;
      font-size: 12px;
      color: #FFE082;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 2px;
    }

    .bitacora-steps-carousel {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 8px 0 4px;
    }

    .bitacora-steps-carousel-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      gap: 10px;
    }

    .carousel-arrow {
      background: radial-gradient(circle at 30% 30%, rgba(251, 192, 45, 0.35), rgba(16, 18, 24, 1));
      border: 2px solid #FBC02D;
      color: #FBC02D;
      border-radius: 50%;
      width: 42px;
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
      flex-shrink: 0;
      padding: 0;
    }

    .carousel-arrow mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .carousel-arrow:hover:not([disabled]) {
      background: #FBC02D;
      color: #000;
      transform: translateY(-1px) scale(1.07);
      box-shadow: 0 0 14px rgba(251, 192, 45, 0.9);
    }

    .carousel-arrow[disabled] {
      opacity: 0.28;
      cursor: default;
      box-shadow: none;
    }

    .bitacora-step-slide {
      flex: 1;
      max-width: 1000px;
      width: 100%;
    }

    .bitacora-step-slide.left {
      animation: slideInLeft 0.4s ease-out;
    }

    .bitacora-step-slide.right {
      animation: slideInRight 0.4s ease-out;
    }

    @keyframes slideInLeft {
      from { opacity: 0; transform: translateX(-30px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(30px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    .bitacora-step-detail-item {
      background: #151822;
      border-radius: 8px;
      padding: 10px;
      border: 1px solid rgba(255, 255, 255, 0.04);
      max-width: 100%;
      overflow: hidden;
    }

    .bitacora-step-detail-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .bitacora-step-env-cube {
      width: 30px;
      height: 30px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
    }

    .bitacora-step-env-number {
      font-size: 13px;
      font-weight: 700;
    }

    .bitacora-step-detail-title {
      flex: 1;
    }

    .bitacora-step-detail-title strong {
      display: block;
      color: #FFE082;
    }

    .bitacora-step-detail-body {
      display: flex;
      flex-direction: row;
      gap: 20px;
      margin-top: 8px;
      align-items: flex-start;
    }

    .bitacora-step-detail-text {
      flex: 1;
      font-size: 13px;
      color: #CFD8DC;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: break-word;
      order: 1;
    }

    .step-file-preview {
      order: 2;
      display: flex;
      justify-content: center;
    }

    .step-file-image {
      display: flex;
      justify-content: center;
    }

    .step-file-image img {
      max-width: 100%;
      width: 240px;
      height: auto;
      border-radius: 6px;
      border: 1px solid #2e3236;
      object-fit: cover;
      cursor: pointer;
    }

    .step-file-other {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 20px;
      background: rgba(30, 132, 163, 0.12);
      border: 1px solid rgba(30, 132, 163, 0.3);
      border-radius: 10px;
      width: fit-content;
    }

    .step-file-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #4fc3f7;
      font-weight: 600;
    }

    .step-file-badge mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .step-file-download-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 8px;
      text-decoration: none;
      color: #cfd8dc;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.12);
      transition: all 0.2s ease;
    }

    .step-file-download-btn:hover {
      color: #FBC02D;
      border-color: #FBC02D;
      background: rgba(251, 192, 45, 0.1);
    }

    .carousel-indicators {
      display: flex;
      gap: 5px;
      justify-content: center;
    }

    .carousel-indicators span {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #555;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .carousel-indicators span.active {
      background: #FBC02D;
      transform: scale(1.25);
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85) !important;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483000 !important;
      padding: 16px;
    }

    .steps-detail-modal,
    .auth-card {
      background: #0f1113 !important;
      color: #eee !important;
      padding: 22px !important;
      border-radius: 8px !important;
      width: min(900px, 100%) !important;
      max-height: 80vh !important;
      overflow: auto !important;
      box-shadow: 0 0 30px rgba(251, 192, 45, 0.4), 0 0 50px rgba(251, 192, 45, 0.2) !important;
      border: 2px solid #FBC02D !important;
    }

    .steps-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    .back-btn,
    .nav-btn {
      border: 0;
      background: #202530;
      color: #fff;
      border-radius: 8px;
      width: 36px;
      height: 36px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .empty-placeholder {
      width: 36px;
    }

    .step-content {
      background: #10131a;
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .step-number {
      color: #FBC02D;
      font-size: 0.85rem;
      margin-bottom: 8px;
    }

    .step-text {
      color: #e0e0e0;
      white-space: pre-wrap;
    }

    .steps-navigation {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .nav-btn[disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .step-dots {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: center;
      flex: 1;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #6a7180;
      cursor: pointer;
    }

    .dot.active {
      background: #FBC02D;
    }

    .divider {
      border: 0;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      margin: 12px 0;
    }

    .projects-modal {
      max-height: 90vh;
      overflow: auto;
    }

    .projects-mosaic-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 10px;
    }

    .project-card-selector {
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 10px;
      cursor: pointer;
      display: flex;
      gap: 8px;
      background: #12151d;
    }

    .project-card-selector.selected {
      border-color: #FBC02D;
      background: #1c212c;
    }

    .hidden-checkbox {
      display: none;
    }

    .checkbox-symbol {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border: 1px solid #70798d;
      border-radius: 4px;
      color: #FBC02D;
      font-size: 13px;
    }

    .project-name {
      font-weight: 700;
      color: #fff;
      margin-bottom: 3px;
    }

    .project-code,
    .project-dept {
      color: #b7bdc8;
      font-size: 0.8rem;
    }

    .action-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .modal-body {
      text-align: center;
      color: #ccc;
      padding: 12px 0;
      line-height: 1.6;
    }

    .image-popup-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }

    .image-popup-container {
      position: relative;
      max-width: 90vw;
      max-height: 90vh;
      background: #111;
      border-radius: 8px;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .image-popup-img {
      max-width: 100%;
      max-height: 85vh;
      object-fit: contain;
      border-radius: 4px;
    }

    .image-popup-close-btn {
      position: absolute;
      top: 4px;
      right: 4px;
      border: none;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 16px;
      line-height: 30px;
      text-align: center;
      transition: background 0.2s;
    }

    .image-popup-close-btn:hover {
      background: rgba(200, 0, 0, 0.7);
    }

    .pagination-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      justify-content: center;
      margin-top: 16px;
      flex-wrap: wrap;
    }

    .page-btn {
      background: #14161d;
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #90a4ae;
      border-radius: 6px;
      padding: 5px 10px;
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
      transition: border-color 0.15s, color 0.15s, background 0.15s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      height: 32px;
    }

    .page-btn:hover:not(:disabled) {
      border-color: rgba(255, 213, 79, 0.4);
      color: #ffd54f;
    }

    .page-btn.active {
      background: rgba(255, 213, 79, 0.15);
      border-color: #ffd54f;
      color: #ffd54f;
      font-weight: 700;
    }

    .page-btn:disabled {
      opacity: 0.3;
      cursor: default;
    }

    .page-info {
      font-size: 12px;
      color: #546e7a;
      margin-left: 4px;
    }

    @media (max-width: 768px) {
      .section-container {
        padding: 12px;
        margin: 12px;
      }

      .bitacora-row {
        flex-direction: column;
      }

      .projects-mosaic-grid {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      }
    }
  `]
})
export class HerramientasComponent implements OnInit {
  tools: Tool[] = [];
  filteredTools: Tool[] = [];
  availableProjects: Project[] = [];
  filteredProjectsForModal: Project[] = [];

  activeTab: 'crear' | 'listar' = 'listar';
  showProjectsModal = false;
  showStepsDetail = false;

  editingTool: Tool = this.getEmptyTool();
  toolInDetail: Tool | null = null;
  currentStepIndex = 0;
  slideDirection: 'left' | 'right' = 'right';
  tagsInput = '';
  lastSearch = '';

  paginaActualTools = 1;
  readonly toolsPorPagina = 10;

  selectedProjectIds = new Set<string>();
  projectsSearchQuery = '';

  confirmAction: { id: string; name: string } | null = null;

  showImagePopup = false;
  imagePopupUrl = '';

  constructor(
    private localStorage: LocalStorageService,
    private projectService: ProjectService,
    private herramientasService: HerramientasService,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.loadTools();
    this.loadProjects();
  }

  get toolsPaginadas(): Tool[] {
    const inicio = (this.paginaActualTools - 1) * this.toolsPorPagina;
    return this.filteredTools.slice(inicio, inicio + this.toolsPorPagina);
  }

  get totalPaginasTools(): number {
    return Math.ceil(this.filteredTools.length / this.toolsPorPagina);
  }

  get paginasArrayTools(): number[] {
    return Array.from({ length: this.totalPaginasTools }, (_, i) => i + 1);
  }

  cambiarPaginaTools(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginasTools) {
      this.paginaActualTools = pagina;
    }
  }

  private loadTools() {
    this.herramientasService.getAll().subscribe({
      next: (data) => {
        this.tools = (data || []).map((t: any) => ({
          ...t,
          id: t?.id || '',
          installSteps: this.normalizeInstallSteps(t?.installSteps)
        }));
        this.filteredTools = [...this.tools];
        this.paginaActualTools = 1;
      },
      error: (error) => {
        console.error('Error loading herramientas:', error);
        this.tools = [];
        this.filteredTools = [];
        this.paginaActualTools = 1;
      }
    });
  }

  private loadProjects() {
    this.projectService.getAll().subscribe(
      (projects: Project[]) => {
        this.availableProjects = projects || [];
      },
      (error: any) => {
        console.error('Error loading projects:', error);
      }
    );
  }

  filtrar(query: string) {
    this.lastSearch = query;
    const q = query.toLowerCase();
    this.filteredTools = this.tools.filter(t => {
      const stepsText = (t.installSteps || [])
        .map(s => `${s.text || ''} ${(s.attachments || []).map(a => `${a.name || ''} ${a.mimeType || ''} ${a.size || ''}`).join(' ')}`)
        .join(' ');

      const haystack = `${t.id || ''} ${t.name || ''} ${t.description || ''} ${t.functionality || ''} ${(t.tags || []).join(' ')} ${stepsText} ${(t.projects || []).join(' ')} ${t.projectsString || ''}`
        .toLowerCase();

      return haystack.includes(q);
    });
    this.paginaActualTools = 1;
  }

  setActiveTab(tab: 'crear' | 'listar') {
    this.activeTab = tab;
    if (tab === 'crear' && !this.editingTool.id && !this.editingTool.name.trim()) {
      this.clearForm();
    }
  }

  editTool(tool: Tool) {
    this.editingTool = {
      ...tool,
      installSteps: this.cloneSteps(this.normalizeInstallSteps((tool as any).installSteps))
    };
    this.tagsInput = (tool.tags || []).join(', ');

    const projectsString = tool.projectsString || '';
    this.selectedProjectIds = new Set(
      projectsString.split(',').map((s: string) => s.trim()).filter(Boolean)
    );

    this.activeTab = 'crear';
  }

  saveTool() {
    if (!this.editingTool.name?.trim()) {
      alert(this.translate.instant('HERRAMIENTAS.VALIDATION_NAME_REQUIRED'));
      return;
    }

    const tags = this.tagsInput.split(',').map(t => t.trim()).filter(t => t);
    const projectsString = Array.from(this.selectedProjectIds).join(',');

    const toolToSave: Tool = {
      ...this.editingTool,
      tags,
      projectsString
    };

    const afterSave = () => {
      this.localStorage.remove(STORAGE_DRAFT_KEY);
      this.loadTools();
      this.clearForm();
      this.activeTab = 'listar';
    };

    if (this.editingTool.id) {
      this.herramientasService.update(this.editingTool.id, toolToSave as any).subscribe({
        next: () => afterSave(),
        error: (error) => {
          console.error('Error updating herramienta:', error);
          alert(this.translate.instant('HERRAMIENTAS.ERROR_SAVE') || 'No se ha podido guardar la herramienta.');
        }
      });
      return;
    }

    const createPayload: any = { ...toolToSave };
    delete createPayload.id;

    this.herramientasService.create(createPayload).subscribe({
      next: () => afterSave(),
      error: (error) => {
        console.error('Error creating herramienta:', error);
        alert(this.translate.instant('HERRAMIENTAS.ERROR_SAVE') || 'No se ha podido guardar la herramienta.');
      }
    });
  }

  clearForm() {
    this.editingTool = this.getEmptyTool();
    this.tagsInput = '';
    this.selectedProjectIds.clear();
  }

  saveDraft() {
    const tags = this.tagsInput.split(',').map(t => t.trim()).filter(t => t);
    this.editingTool.tags = tags;

    const projectsString = Array.from(this.selectedProjectIds).join(',');
    const draft = {
      ...this.editingTool,
      projectsString
    };

    this.localStorage.set(STORAGE_DRAFT_KEY, JSON.stringify(draft));
  }

  confirmDeleteTool(id: string, name: string) {
    this.confirmAction = { id, name };
  }

  confirmDelete() {
    if (!this.confirmAction) return;

    const id = this.confirmAction.id;
    this.herramientasService.delete(id).subscribe({
      next: () => {
        this.loadTools();
        this.confirmAction = null;
      },
      error: (error) => {
        console.error('Error deleting herramienta:', error);
        this.confirmAction = null;
      }
    });
  }

  cancelDelete() {
    this.confirmAction = null;
  }

  openStepsView(tool: Tool) {
    this.toolInDetail = {
      ...tool,
      installSteps: this.cloneSteps(this.normalizeInstallSteps((tool as any).installSteps))
    };
    this.currentStepIndex = 0;
    this.slideDirection = 'right';
    this.showStepsDetail = true;
  }

  closeStepsView() {
    this.showStepsDetail = false;
    this.toolInDetail = null;
    this.currentStepIndex = 0;
    this.slideDirection = 'right';
  }

  nextStep() {
    if (this.toolInDetail && this.currentStepIndex < (this.toolInDetail.installSteps?.length || 0) - 1) {
      this.slideDirection = 'right';
      this.currentStepIndex++;
    }
  }

  prevStep() {
    if (this.currentStepIndex > 0) {
      this.slideDirection = 'left';
      this.currentStepIndex--;
    }
  }

  goToStep(index: number) {
    if (!this.toolInDetail?.installSteps || index < 0 || index >= this.toolInDetail.installSteps.length) {
      return;
    }
    this.slideDirection = index > this.currentStepIndex ? 'right' : 'left';
    this.currentStepIndex = index;
  }

  addStep() {
    if (!this.editingTool.installSteps) {
      this.editingTool.installSteps = [];
    }
    this.editingTool.installSteps.push({ text: '', attachments: [] });
    this.saveDraft();
  }

  removeStep(index: number) {
    if (this.editingTool.installSteps) {
      this.editingTool.installSteps.splice(index, 1);
      this.saveDraft();
    }
  }

  async onStepFilesSelected(event: Event, stepIndex: number) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) {
      return;
    }

    const step = this.editingTool.installSteps?.[stepIndex];
    if (!step) {
      input.value = '';
      return;
    }

    const attachments = await Promise.all(Array.from(files).map(file => this.fileToAttachment(file)));
    step.attachments = [...(step.attachments || []), ...attachments];
    this.saveDraft();
    input.value = '';
  }

  removeStepAttachment(stepIndex: number, attachmentIndex: number) {
    const step = this.editingTool.installSteps?.[stepIndex];
    if (!step?.attachments) {
      return;
    }
    step.attachments.splice(attachmentIndex, 1);
    this.saveDraft();
  }

  openImagePopup(url: string): void {
    this.imagePopupUrl = url;
    this.showImagePopup = true;
  }

  closeImagePopup(): void {
    this.showImagePopup = false;
    this.imagePopupUrl = '';
  }

  isImageAttachment(file: ToolAttachment): boolean {
    return (file?.mimeType || '').startsWith('image/');
  }

  getExtension(fileName?: string): string {
    if (!fileName) {
      return 'FILE';
    }

    const idx = fileName.lastIndexOf('.');
    if (idx < 0 || idx === fileName.length - 1) {
      return 'FILE';
    }

    return fileName.slice(idx + 1).toUpperCase();
  }

  openProjectsModal() {
    this.projectsSearchQuery = '';
    this.filteredProjectsForModal = [...this.availableProjects];
    this.showProjectsModal = true;
  }

  closeProjectsModal() {
    this.showProjectsModal = false;
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

  toggleProjectSelection(project: Project) {
    const id = project.codigoProyecto || '';
    if (this.selectedProjectIds.has(id)) {
      this.selectedProjectIds.delete(id);
    } else {
      this.selectedProjectIds.add(id);
    }
  }

  isProjectSelected(projectId: string): boolean {
    return this.selectedProjectIds.has(projectId);
  }

  confirmProjectsSelection() {
    this.saveDraft();
    this.closeProjectsModal();
  }

  getSelectedProjectsDisplay(): string {
    return this.translate.instant('HERRAMIENTAS.SELECT_PROJECT');
  }

  getProjectsListForDisplay(): string {
    if (this.selectedProjectIds.size === 0) {
      return '';
    }

    return Array.from(this.selectedProjectIds)
      .map(code => {
        const project = this.availableProjects.find(p => p.codigoProyecto === code);
        return this.formatProjectLabel(project, code);
      })
      .join(', ');
  }

  getToolProjectNames(tool: Tool): string[] {
    if (!tool) {
      return [];
    }

    const raw = (tool.projectsString || '').split(',').map(code => code.trim()).filter(Boolean);
    if (raw.length === 0 && Array.isArray(tool.projects) && tool.projects.length > 0) {
      return tool.projects;
    }

    return raw.map(code => {
      const project = this.availableProjects.find(p => p.codigoProyecto === code);
      return this.formatProjectLabel(project, code);
    });
  }

  private normalizeInstallSteps(steps: any): ToolStep[] {
    if (!Array.isArray(steps)) {
      return [];
    }

    return steps.map((step: any) => {
      if (typeof step === 'string') {
        return { text: step, attachments: [] };
      }

      const attachments = Array.isArray(step?.attachments)
        ? step.attachments
            .filter((a: any) => a && typeof a.dataUrl === 'string' && typeof a.name === 'string')
            .map((a: any) => ({
              name: a.name,
              mimeType: a.mimeType || 'application/octet-stream',
              dataUrl: a.dataUrl,
              size: Number(a.size) || 0
            }))
        : [];

      return {
        text: typeof step?.text === 'string' ? step.text : '',
        attachments
      };
    });
  }

  private cloneSteps(steps: ToolStep[]): ToolStep[] {
    return steps.map(s => ({
      text: s.text,
      attachments: (s.attachments || []).map(a => ({ ...a }))
    }));
  }

  private fileToAttachment(file: File): Promise<ToolAttachment> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          dataUrl: String(reader.result || ''),
          size: file.size || 0
        });
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private formatProjectLabel(project: Project | undefined, fallbackCode: string): string {
    const code = (project?.codigoProyecto || fallbackCode || '').trim();
    const name = (project?.nombre || '').trim();

    if (name && code) {
      return `${name} | ${code}`;
    }
    return name || code || '-';
  }
  

  private getEmptyTool(): Tool {
    return {
      id: '',
      name: '',
      description: '',
      functionality: '',
      tags: [],
      installSteps: [],
      projects: [],
      projectsString: ''
    };
  }
  
}

export { HerramientasComponent as Herramientas };
