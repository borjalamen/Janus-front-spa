// src/app/documents/documents.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BuscadorComponent } from '../buscador/buscador';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { DocumentService } from '../document.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface BackendDocument {
  name: string;
  size: number;
  contentType: string;
  lastModified: string;
}

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

  // popup afegir
  projectId!: string | number;
  name = '';
  date = '';

  selectedFile?: File;

  // popup eliminar document
  deleteDocPopupOpen = false;
  docToDelete: { project: Project; document: BackendDocument} | null = null;

  // popup eliminar projecte
  deleteProjectPopupOpen = false;
  projectToDelete: Project | null = null;

  constructor(private documentService: DocumentService) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  // ===== CARREGAR PROJECTES + DOCUMENTS DEL BACK =====
  loadProjects() {
     this.documentService.getAllFolders().pipe(
      catchError(err => {
        console.error('Error carregant carpetes', err);
        return of([]); // Retorna array buit si hi ha error
      })
    ).subscribe(ids => {
     if (!ids || ids.length === 0) {
        this.projects = [];
        this.projectsFiltrats = [];
        return;
      }
        const requests = ids.map(id =>
        this.documentService.getAllFiles(id).pipe(
          map((files: any[]) => {
            const docs: BackendDocument[] = (files || []).map(file => ({
              name: file.name,
              size: file.size,
              contentType: file.contentType,
              lastModified: file.lastModified
            }));
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
        this.projects = projects;
        this.projectsFiltrats = [...projects];
      });
    });
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

  // filtre per id o nom
  filtrar(valor: string) {
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

  // ===== AFEGIR DOCUMENT (NO DUPLICA PROJECTES) =====
  addDocument() {
    console.log('ADD', this.projectId, this.selectedFile);

    if (!this.projectId || !this.selectedFile) {
      console.warn('Falten projectId o fitxer');
      return;
    }

    this.documentService.uploadDocument(this.projectId, this.selectedFile)
      .subscribe({
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

    this.documentService.deleteDocument(project.projectId, document.name)
      .subscribe({
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

    this.documentService.deleteProjectFiles(this.projectToDelete.projectId)
      .subscribe({
        next: () => {
            this.loadProjects();
          this.cancelDeleteProject();
        },
          
        error: err => console.error('Error esborrant projecte', err)
      });
  }
}
