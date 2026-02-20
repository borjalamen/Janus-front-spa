// src/app/documents/documents.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BuscadorComponent } from '../buscador/buscador';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { DocumentService, BackendDocument } from '../document.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { LocalStorageService } from '../local-storage.service';

interface Project {
  projectId: string | number;
  name: string;
  date: string;
  documents: BackendDocument[];
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    BuscadorComponent,
    TranslateModule
  ],
  templateUrl: './documents.html',
  styleUrls: ['./documents.css']
})
export class DocumentsComponent implements OnInit {
  title = 'Documentos';
  showAddPopup = false;

  projects: Project[] = [];
  projectsFiltrats: Project[] = [];

  // estat UI
  searchQuery = '';
  selectedProjectId: string | number | null = null;

  // claus localStorage
  private readonly STORAGE_KEY_FILTER = 'documents_filter_v1';
  private readonly STORAGE_KEY_SELECTED = 'documents_selected_project_v1';

  // popup afegir
  projectId!: string | number;
  name = '';
  date = '';

  selectedFile?: File;

  // popup eliminar document
  deleteDocPopupOpen = false;
  docToDelete: { project: Project; document: BackendDocument } | null = null;

  // popup eliminar projecte
  deleteProjectPopupOpen = false;
  projectToDelete: Project | null = null;

  constructor(
    private documentService: DocumentService,
    private storage: LocalStorageService
  ) {}

  ngOnInit(): void {
    const savedFilter = (this.storage.get(this.STORAGE_KEY_FILTER) as string) || '';
    const savedSelected = this.storage.get(this.STORAGE_KEY_SELECTED) as string | null;

    this.searchQuery = savedFilter || '';

    this.loadProjectsWithUiState(savedFilter, savedSelected);
  }

  // ===== CARREGAR PROJECTES + DOCUMENTS DEL BACK =====
  private loadProjectsWithUiState(savedFilter: string, savedSelected: string | null) {
    console.log('🔍 Carregant projectes...');
    this.documentService
      .getAllFolders()
      .pipe(
        catchError(err => {
          console.error('❌ Error carregant carpetes', err);
          return of([]); // Retorna array buit si hi ha error
        })
      )
      .subscribe(ids => {
        console.log('📁 Carpetes rebudes:', ids);
        if (!ids || ids.length === 0) {
          console.log('⚠️ No hi ha carpetes');
          this.projects = [];
          this.projectsFiltrats = [];
          this.selectedProjectId = null;
          return;
        }

        const requests = ids.map(id =>
          this.documentService.getAllFiles(id).pipe(
            map((files: BackendDocument[]) => {
              const docs: BackendDocument[] = files || [];
              return {
                projectId: id,
                name: `Project ${id}`,
                date: '',
                documents: docs
              } as Project;
            }),
            catchError(err => {
              console.error('Error carregant fitxers project', id, err);
              return of({
                projectId: id,
                name: `Project ${id}`,
                date: '',
                documents: []
              } as Project);
            })
          )
        );

        forkJoin(requests).subscribe(projects => {
          console.log('✅ Projectes carregats:', projects);
          this.projects = projects;
          this.projectsFiltrats = [...projects];

          // aplicar filtre guardat, si hi ha
          if (savedFilter && savedFilter.trim()) {
            this.filtrar(savedFilter);
          }

          // restaurar projecte seleccionat, si existeix
          if (savedSelected != null) {
            const found = this.projects.find(
              p => String(p.projectId) === String(savedSelected)
            );
            if (found) {
              this.selectedProjectId = found.projectId;
            } else {
              this.selectedProjectId = null;
              this.storage.set(this.STORAGE_KEY_SELECTED, '');
            }
          }
        });
      });
  }

  // accessible si vols refrescar sense perdre estat UI
  loadProjects() {
    this.loadProjectsWithUiState(
      this.searchQuery || '',
      this.selectedProjectId ? String(this.selectedProjectId) : null
    );
  }

  // ===== POPUP AFEGIR =====
  toggleAddPopup() {
    this.showAddPopup = !this.showAddPopup;
    if (!this.showAddPopup) {
      this.projectId = '';
      this.name = '';
      this.date = '';
      this.selectedFile = undefined;
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.name = file.name;
      console.log('FITXER SELECCIONAT', this.selectedFile);
    }
  }

  // filtre per id o nom (amb persistència)
  filtrar(valor: string) {
    this.searchQuery = valor || '';
    this.storage.set(this.STORAGE_KEY_FILTER, this.searchQuery);

    if (!valor) {
      this.projectsFiltrats = [...this.projects];
    } else {
      const lower = valor.toLowerCase();
      this.projectsFiltrats = this.projects.filter(
        p =>
          String(p.projectId).toLowerCase().includes(lower) ||
          p.name.toLowerCase().includes(lower)
      );
    }
  }

  // seleccionar projecte (per remarcar a la UI, opcional)
  selectProject(p: Project) {
    this.selectedProjectId = p.projectId;
    this.storage.set(this.STORAGE_KEY_SELECTED, String(p.projectId));
  }

  // ===== AFEGIR DOCUMENT =====
  addDocument() {
    console.log('ADD', this.projectId, this.selectedFile);

    if (!this.projectId || !this.selectedFile) {
      console.warn('Falten projectId o fitxer');
      return;
    }

    this.documentService.uploadDocument(this.projectId, this.selectedFile).subscribe({
      next: () => {
        this.loadProjects();
        this.toggleAddPopup();
      },
      error: err => console.error('Error pujant document', err)
    });
  }

  // ===== DOCUMENTS =====
  confirmDeleteDocument(project: Project, doc: BackendDocument) {
    this.docToDelete = { project, document: doc };
    this.deleteDocPopupOpen = true;
  }

  cancelDeleteDocument() {
    this.deleteDocPopupOpen = false;
    this.docToDelete = null;
  }

  deleteDocument() {
    if (!this.docToDelete) return;

    const { project, document } = this.docToDelete;

    console.log('DELETE DOC', project.projectId, document);

    this.documentService.deleteDocument(project.projectId, document).subscribe({
      next: () => {
        this.loadProjects();
        this.cancelDeleteDocument();
      },
      error: err => console.error('Error esborrant document', err)
    });
  }

  // ===== PROJECTES =====
  confirmDeleteProject(project: Project) {
    this.projectToDelete = project;
    this.deleteProjectPopupOpen = true;
  }

  cancelDeleteProject() {
    this.deleteProjectPopupOpen = false;
    this.projectToDelete = null;
  }

  deleteProject() {
    if (!this.projectToDelete) return;

    const id = this.projectToDelete.projectId;

    console.log('DELETE PROJECT', id);

    this.documentService.deleteProjectFiles(id).subscribe({
      next: () => {
        this.projects = this.projects.filter(p => p.projectId !== id);
        this.projectsFiltrats = this.projects.filter(p => p.projectId !== id);

        if (this.selectedProjectId && String(this.selectedProjectId) === String(id)) {
          this.selectedProjectId = null;
          this.storage.set(this.STORAGE_KEY_SELECTED, '');
        }

        this.cancelDeleteProject();
      },
      error: err => console.error('Error esborrant projecte', err)
    });
  }

  // ===== VISUALITZAR DOCUMENT =====
  viewDocument(project: Project, doc: BackendDocument) {
    console.log('📄 Visualitzant document:', project.projectId, doc);
    this.documentService.downloadFile(project.projectId, doc).subscribe({
      next: (blob: Blob) => {
        console.log('✅ Blob rebut:', blob.type, blob.size);
        const url = URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');
        if (!newWindow) {
          console.warn('⚠️ Popup bloquejat. Descarregant arxiu...');
          const link = document.createElement('a');
          link.href = url;
          // adapta això al teu tipus real de BackendDocument
          // @ts-ignore
          link.download = typeof doc === 'string' ? doc : (doc.name || 'document');
          link.click();
          URL.revokeObjectURL(url);
        }
      },
      error: (err: any) => console.error('❌ Error visualitzant document', err)
    });
  }
}
